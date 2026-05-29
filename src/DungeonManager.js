import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { textureGenerator } from './TextureGenerator';
import { Spawner } from './Spawner';
import { COLLISION_GROUPS } from './ProjectileManager';
import { soundManager } from './SoundManager';

/**
 * DungeonManager parses a 2D grid and builds the 3D scene (walls, floor, exit, items)
 * and corresponding physical representation in Cannon.js.
 * 
 * Grid mapping:
 * 0 = Floor
 * 1 = Wall
 * 2 = Spawner (Level 1)
 * 3 = Player Start
 * 4 = Exit Portal
 * 5 = Destructible Food (+400 Health)
 * 6 = Key
 * 7 = Potion (Clears screen)
 * 8 = Locked Door (Consumes key)
 * 9 = Poison (Green food, -200 Health)
 * 10 = Treasure Chest (+150 Score)
 * 11 = Trap Plate (Opens hidden walls)
 * 12 = Spawner (Level 2)
 * 13 = Spawner (Level 3)
 * 14 = Exit Portal (Level Skip - skips 2 levels)
 */
export class DungeonManager {
  constructor(scene, physicsWorld) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.gridSize = 2; // Size of each grid block in units

    this.spawners = [];
    this.collectibles = []; // Array of { type, mesh, position }
    this.doors = []; // Array of { mesh, body, position }
    this.traps = []; // Array of { mesh, position, triggered }
    
    this.wallInstances = []; // Stores { position, index, body }
    this.wallInstanced = null;
    this.allWallsAreExits = false;
    
    this.exitPortal = null;
    this.playerStart = new THREE.Vector3(0, 0.5, 0);

    // Initial dummy map data. Main level maps will load via DungeonMaps.getLevelMap()
    this.mapData = [
      [1, 1, 1, 1, 1],
      [1, 3, 0, 4, 1],
      [1, 1, 1, 1, 1]
    ];
  }

  /**
   * Sets new map grid layout data
   * @param {number[][]} mapData 
   */
  setMapData(mapData) {
    this.mapData = mapData;
  }

  /**
   * Translates grid coordinate to 3D world position
   */
  gridToWorld(col, row) {
    const halfWidth = (this.mapData[0].length * this.gridSize) / 2;
    const halfHeight = (this.mapData.length * this.gridSize) / 2;
    return new THREE.Vector3(
      col * this.gridSize - halfWidth + this.gridSize / 2,
      0,
      row * this.gridSize - halfHeight + this.gridSize / 2
    );
  }

  /**
   * Generates 3D meshes and physics bodies
   */
  buildDungeon() {
    const wallIndices = [];
    const wallTexture = textureGenerator.getWallTexture();
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTexture,
      roughness: 0.8,
      metalness: 0.2
    });
    
    // Setup ground floor plane
    const floorWidth = this.mapData[0].length * this.gridSize;
    const floorHeight = this.mapData.length * this.gridSize;
    const floorTex = textureGenerator.getFloorTexture();
    floorTex.repeat.set(this.mapData[0].length, this.mapData.length);
    
    const floorGeo = new THREE.PlaneGeometry(floorWidth, floorHeight);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.9,
      metalness: 0.1
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, 0, 0);
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);

    // Physics ground body
    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
      collisionFilterGroup: COLLISION_GROUPS.WALL,
      collisionFilterMask: COLLISION_GROUPS.PLAYER | COLLISION_GROUPS.ENEMY
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.physicsWorld.addBody(groundBody);

    const wallBodies = [];

    // Gather wall positions and spawn obstacles
    for (let r = 0; r < this.mapData.length; r++) {
      for (let c = 0; c < this.mapData[r].length; c++) {
        const type = this.mapData[r][c];
        const worldPos = this.gridToWorld(c, r);

        if (type === 1) {
          // Wall
          wallIndices.push(worldPos);
          
          // Physics box body for this wall block
          const halfSize = this.gridSize / 2;
          const wallBody = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Box(new CANNON.Vec3(halfSize * 0.98, 1.25, halfSize * 0.98)),
            position: new CANNON.Vec3(worldPos.x, 1.25, worldPos.z),
            collisionFilterGroup: COLLISION_GROUPS.WALL,
            collisionFilterMask: COLLISION_GROUPS.PLAYER | COLLISION_GROUPS.ENEMY | COLLISION_GROUPS.PROJECTILE
          });
          this.physicsWorld.addBody(wallBody);
          wallBodies.push(wallBody);

        } else if (type === 2 || type === 12 || type === 13) {
          // Spawners: 2 = Level 1, 12 = Level 2, 13 = Level 3
          let lvl = 1;
          if (type === 12) lvl = 2;
          if (type === 13) lvl = 3;
          
          const spawner = new Spawner(this.scene, this.physicsWorld, worldPos, lvl);
          this.spawners.push(spawner);

        } else if (type === 3) {
          // Player Spawn Position
          this.playerStart.copy(worldPos);
          this.playerStart.y = 0.8; // Floating height

        } else if (type === 4 || type === 14) {
          // Exits: 4 = Normal exit, 14 = Skip exit
          this.createExitPortal(worldPos, type === 14);

        } else if (type === 5 || type === 6 || type === 7 || type === 9 || type === 10) {
          // Items: 5=Food, 6=Key, 7=Potion, 9=Poison, 10=Chest
          this.spawnCollectible(type, worldPos);

        } else if (type === 8) {
          // Locked Door
          this.spawnDoor(worldPos);

        } else if (type === 11) {
          // Trap Plate
          this.spawnTrap(worldPos);
        }
      }
    }

    // Build the wall InstancedMesh for maximum efficiency
    const wallGeo = new THREE.BoxGeometry(this.gridSize, 2.5, this.gridSize);
    this.wallInstanced = new THREE.InstancedMesh(wallGeo, wallMat, wallIndices.length);
    this.wallInstanced.castShadow = true;
    this.wallInstanced.receiveShadow = true;

    const dummy = new THREE.Object3D();
    wallIndices.forEach((pos, idx) => {
      dummy.position.set(pos.x, 1.25, pos.z);
      dummy.updateMatrix();
      this.wallInstanced.setMatrixAt(idx, dummy.matrix);
      
      // Cache instance trace mapping for trap destruction
      this.wallInstances.push({
        position: pos.clone(),
        index: idx,
        body: wallBodies[idx],
        active: true
      });
    });
    
    this.scene.add(this.wallInstanced);
  }

  /**
   * Spawns a locked gate block
   */
  spawnDoor(position) {
    const size = this.gridSize;
    const geo = new THREE.BoxGeometry(size, 2.5, size);
    const tex = textureGenerator.getDoorTexture();
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.6,
      metalness: 0.4
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(position.x, 1.25, position.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const halfSize = size / 2;
    const body = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(halfSize * 0.98, 1.25, halfSize * 0.98)),
      position: new CANNON.Vec3(position.x, 1.25, position.z),
      collisionFilterGroup: COLLISION_GROUPS.WALL,
      collisionFilterMask: COLLISION_GROUPS.PLAYER | COLLISION_GROUPS.ENEMY | COLLISION_GROUPS.PROJECTILE
    });
    
    const doorObj = { mesh, body, position: position.clone() };
    body.userData = { type: 'door', entity: doorObj };
    this.physicsWorld.addBody(body);

    this.doors.push(doorObj);
  }

  /**
   * Spawns a trap plate on the floor
   */
  spawnTrap(position) {
    const geo = new THREE.RingGeometry(0, 0.7, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff3300,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(position.x, 0.03, position.z);
    this.scene.add(mesh);

    this.traps.push({
      mesh: mesh,
      position: position.clone(),
      triggered: false
    });
  }

  /**
   * Spawns an exit portal (normal or orange skip level)
   */
  createExitPortal(position, isSkip = false) {
    const size = 1.6;
    const portalColor = isSkip ? 0xffcc33 : 0xffffff;
    const lightColor = isSkip ? 0xffaa00 : 0xcc33ff;

    const spriteMaterial = new THREE.SpriteMaterial({
      map: textureGenerator.getExitTexture(),
      color: portalColor,
      transparent: true
    });
    const portal = new THREE.Sprite(spriteMaterial);
    portal.position.set(position.x, 0.8, position.z);
    portal.scale.set(size, size, 1);
    this.scene.add(portal);
    
    const light = new THREE.PointLight(lightColor, 2.0, 6);
    light.position.set(position.x, 1.2, position.z);
    this.scene.add(light);
    
    this.exitPortal = {
      sprite: portal,
      light: light,
      position: position.clone(),
      isSkip: isSkip
    };
  }

  /**
   * Spawns a grid collectible item
   */
  spawnCollectible(type, position) {
    let texture;
    let size = 0.8;
    let colorHex = 0xffffff;

    if (type === 5) {
      texture = textureGenerator.getFoodTexture();
    } else if (type === 6) {
      texture = textureGenerator.getKeyTexture();
    } else if (type === 7) {
      texture = textureGenerator.getPotionTexture();
    } else if (type === 9) {
      // Poison: looks like green chicken leg
      texture = textureGenerator.getFoodTexture();
      colorHex = 0x33ff33; // bright green tint!
    } else if (type === 10) {
      // Chest
      texture = textureGenerator.getChestTexture();
      size = 0.85;
    }

    const mat = new THREE.SpriteMaterial({
      map: texture,
      color: colorHex,
      transparent: true
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(position.x, 0.4, position.z);
    sprite.scale.set(size, size, 1);
    
    sprite.userData = {
      startY: 0.4,
      floatPhase: Math.random() * Math.PI * 2
    };

    this.scene.add(sprite);

    this.collectibles.push({
      type: type,
      mesh: sprite,
      position: position.clone()
    });
  }

  /**
   * Removes a locked door
   */
  openDoor(door) {
    const idx = this.doors.indexOf(door);
    if (idx !== -1) {
      this.scene.remove(door.mesh);
      this.physicsWorld.removeBody(door.body);
      this.doors.splice(idx, 1);
      soundManager.playSpawnerDestroy(); // heavy thud unlock sound
    }
  }

  /**
   * Fallback - Opens all locked gates in the room
   */
  openAllDoors() {
    this.doors.forEach(door => {
      this.scene.remove(door.mesh);
      this.physicsWorld.removeBody(door.body);
    });
    this.doors = [];
    soundManager.playSpawnerDestroy();
  }

  /**
   * Triggers a trap: opens hidden wall blocks within proximity
   */
  triggerTrap(trap) {
    trap.triggered = true;
    
    // Visual flash animation on trap plate
    trap.mesh.material.color.setHex(0x33ff33); // Flash green
    
    setTimeout(() => {
      this.scene.remove(trap.mesh);
    }, 600);

    soundManager.playHit(); // metal thud

    // Find and remove walls within 4.5 units of the trap plate
    const trapPos = trap.position;
    const triggerRadius = 4.5;
    const dummy = new THREE.Object3D();
    dummy.position.set(0, -100, 0); // Sinks hidden blocks below floor level
    dummy.updateMatrix();

    let wallRemoved = false;

    this.wallInstances.forEach(wallInst => {
      if (wallInst.active) {
        const dist = wallInst.position.distanceTo(trapPos);
        if (dist < triggerRadius) {
          wallInst.active = false;
          
          // Disable physical body collision
          if (wallInst.body) {
            this.physicsWorld.removeBody(wallInst.body);
          }
          
          // Hide visually from GPU InstancedMesh
          this.wallInstanced.setMatrixAt(wallInst.index, dummy.matrix);
          wallRemoved = true;
        }
      }
    });

    if (wallRemoved) {
      this.wallInstanced.instanceMatrix.needsUpdate = true;
      soundManager.playSpawnerDestroy(); // sound of grinding rocks
    }
  }

  /**
   * Fallback - safety trigger converting all solid walls to Exit Portals
   */
  convertWallsToExits() {
    this.allWallsAreExits = true;
    const dummy = new THREE.Object3D();
    dummy.position.set(0, -100, 0);
    dummy.updateMatrix();

    this.wallInstances.forEach(wallInst => {
      if (wallInst.active) {
        wallInst.active = false;
        
        // Remove physics bodies
        if (wallInst.body) {
          this.physicsWorld.removeBody(wallInst.body);
        }

        // Hide wall visually
        this.wallInstanced.setMatrixAt(wallInst.index, dummy.matrix);

        // Spawn a mini exit portal sprite in its place
        const size = 1.0;
        const spriteMaterial = new THREE.SpriteMaterial({
          map: textureGenerator.getExitTexture(),
          color: 0xcc33ff,
          transparent: true
        });
        const miniPortal = new THREE.Sprite(spriteMaterial);
        miniPortal.position.set(wallInst.position.x, 0.5, wallInst.position.z);
        miniPortal.scale.set(size, size, 1);
        this.scene.add(miniPortal);
      }
    });

    this.wallInstanced.instanceMatrix.needsUpdate = true;
    soundManager.playVictory();
  }

  /**
   * Removes a spawner from the array
   */
  removeSpawner(spawner) {
    const idx = this.spawners.indexOf(spawner);
    if (idx !== -1) {
      spawner.destroy();
      this.spawners.splice(idx, 1);
    }
  }

  /**
   * Removes a collectible mesh
   */
  removeCollectible(collectible) {
    const idx = this.collectibles.indexOf(collectible);
    if (idx !== -1) {
      this.scene.remove(collectible.mesh);
      this.collectibles.splice(idx, 1);
    }
  }

  /**
   * updates trap triggers, portal rotations, and collectibles floating animations
   */
  update(time, playerPos) {
    // 1. Proximity check for step-on traps
    if (playerPos) {
      this.traps.forEach(trap => {
        if (!trap.triggered) {
          const dist = trap.position.distanceTo(playerPos);
          if (dist < 0.8) {
            this.triggerTrap(trap);
          }
        }
      });
    }

    // 2. Pickup floating animation
    this.collectibles.forEach(col => {
      col.mesh.position.y = col.mesh.userData.startY + Math.sin(time * 3 + col.mesh.userData.floatPhase) * 0.1;
    });

    // 3. Exit portal spin animation
    if (this.exitPortal) {
      this.exitPortal.sprite.material.rotation = time * 2;
    }
  }

  /**
   * Cleanup everything for level reload
   */
  clear() {
    this.spawners.forEach(s => s.destroy());
    this.spawners = [];
    
    this.collectibles.forEach(c => this.scene.remove(c.mesh));
    this.collectibles = [];

    this.doors.forEach(d => {
      this.scene.remove(d.mesh);
      this.physicsWorld.removeBody(d.body);
    });
    this.doors = [];

    this.traps.forEach(t => this.scene.remove(t.mesh));
    this.traps = [];

    this.wallInstances.forEach(w => {
      if (w.active && w.body) {
        this.physicsWorld.removeBody(w.body);
      }
    });
    this.wallInstances = [];

    if (this.wallInstanced) {
      this.scene.remove(this.wallInstanced);
      this.wallInstanced = null;
    }

    this.exitPortal = null;
    this.allWallsAreExits = false;
  }
}
