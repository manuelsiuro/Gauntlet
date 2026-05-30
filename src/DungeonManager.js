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
 * 2 = Ghost Spawner (Level 1)
 * 3 = Player Start
 * 4 = Exit Portal
 * 5 = Destructible Food (+400 Health)
 * 6 = Key
 * 7 = Potion (Clears screen)
 * 8 = Locked Door (Consumes key)
 * 9 = Poison (Green food, -200 Health)
 * 10 = Treasure Chest (+150 Score)
 * 11 = Trap Plate (Opens hidden walls)
 * 12 = Ghost Spawner (Level 2)
 * 13 = Ghost Spawner (Level 3)
 * 14 = Exit Portal (Level Skip - skips 2 levels)
 * 22-24 = Grunt Spawner (Levels 1-3)
 * 25-27 = Demon Spawner (Levels 1-3)
 * 28-30 = Sorcerer Spawner (Levels 1-3)
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
    this.torches = []; // Array of { sprite, light, baseIntensity, timeOffset }
    this.decals = []; // Array of decal meshes

    // Initial dummy map data. Main level maps will load via DungeonMaps.getLevelMap()
    this.mapData = [
      [1, 1, 1, 1, 1],
      [1, 3, 0, 4, 1],
      [1, 1, 1, 1, 1]
    ];
    this.theme = 'classic';
  }

  /**
   * Sets new map grid layout data
   * @param {number[][]} mapData 
   */
  setMapData(mapData) {
    this.mapData = mapData;
  }

  /**
   * Sets the active level theme
   * @param {string} theme
   */
  setTheme(theme) {
    this.theme = theme;
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
    
    // Choose colors based on active theme
    const themeColors = {
      classic: { floor: 0xffffff, wall: 0xffffff },
      lava: { floor: 0xff8866, wall: 0xff5533 },
      ice: { floor: 0x88ccff, wall: 0xaaddff },
      toxic: { floor: 0x88ff88, wall: 0x66dd66 }
    };
    const colors = themeColors[this.theme] || themeColors['classic'];

    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTexture,
      roughness: 0.8,
      metalness: 0.2,
      color: colors.wall
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
      metalness: 0.1,
      color: colors.floor
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

        if (type === 1 || type === 15 || type === 18) {
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

          if (type === 15) {
            this.createWallTorch(c, r, worldPos);
          } else if (type === 18) {
            this.createWallBanner(c, r, worldPos);
          }

        } else if (type === 2 || type === 12 || type === 13 || (type >= 22 && type <= 30)) {
          // Spawners: Ghost (2, 12, 13), Grunt (22-24), Demon (25-27), Sorcerer (28-30)
          let lvl = 1;
          let enemyType = 'ghost';
          
          if (type === 2) { lvl = 1; enemyType = 'ghost'; }
          else if (type === 12) { lvl = 2; enemyType = 'ghost'; }
          else if (type === 13) { lvl = 3; enemyType = 'ghost'; }
          else if (type === 22) { lvl = 1; enemyType = 'grunt'; }
          else if (type === 23) { lvl = 2; enemyType = 'grunt'; }
          else if (type === 24) { lvl = 3; enemyType = 'grunt'; }
          else if (type === 25) { lvl = 1; enemyType = 'demon'; }
          else if (type === 26) { lvl = 2; enemyType = 'demon'; }
          else if (type === 27) { lvl = 3; enemyType = 'demon'; }
          else if (type === 28) { lvl = 1; enemyType = 'sorcerer'; }
          else if (type === 29) { lvl = 2; enemyType = 'sorcerer'; }
          else if (type === 30) { lvl = 3; enemyType = 'sorcerer'; }
          
          const spawner = new Spawner(this.scene, this.physicsWorld, worldPos, lvl, enemyType);
          this.spawners.push(spawner);

        } else if (type === 3) {
          // Player Spawn Position
          this.playerStart.copy(worldPos);
          this.playerStart.y = 0.8; // Floating height

        } else if (type === 4 || type === 14) {
          // Exits: 4 = Normal exit, 14 = Skip exit
          this.createExitPortal(worldPos, type === 14);

        } else if (type === 5 || type === 6 || type === 7 || type === 9 || type === 10 || (type >= 31 && type <= 34)) {
          // Items: 5=Food, 6=Key, 7=Potion (Bomb), 9=Poison, 10=Chest, 31-34=Freeze/Thunder/Shield/Heal Potions
          this.spawnCollectible(type, worldPos);

        } else if (type === 8) {
          // Locked Door
          this.spawnDoor(worldPos);

        } else if (type === 11) {
          // Trap Plate
          this.spawnTrap(worldPos);
        } else if (type === 16) {
          // Floor Blood
          this.spawnFloorDecal('blood', worldPos);
        } else if (type === 17) {
          // Floor Skulls
          this.spawnFloorDecal('skulls', worldPos);
        } else if (type === 19) {
          // Floor Grate
          this.spawnFloorDecal('grate', worldPos);
        } else if (type === 20) {
          // Floor Cobweb
          this.spawnFloorDecal('web', worldPos);
        } else if (type === 21) {
          // Floor Bones
          this.spawnFloorDecal('bones', worldPos);
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
    } else if (type === 7 || type === 31 || type === 32 || type === 33 || type === 34) {
      texture = textureGenerator.getPotionTexture();
      // Apply different colors to differentiate them visually
      if (type === 7) colorHex = 0xcc33ff; // purple bomb
      else if (type === 31) colorHex = 0x33ccff; // cyan freeze
      else if (type === 32) colorHex = 0xffff33; // yellow thunder
      else if (type === 33) colorHex = 0xff9900; // orange shield
      else if (type === 34) colorHex = 0xff3366; // pink/red heal
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

  isTileWalkable(col, row) {
    if (row < 0 || row >= this.mapData.length || col < 0 || col >= this.mapData[0].length) {
      return false;
    }
    const type = this.mapData[row][col];
    return type !== 1 && type !== 15 && type !== 18 && type !== 8;
  }

  createWallTorch(col, row, worldPos) {
    const halfSize = this.gridSize / 2;
    const offset = halfSize + 0.02;
    const neighbors = [
      { dCol: -1, dRow: 0, dx: -offset, dz: 0 },
      { dCol: 1, dRow: 0, dx: offset, dz: 0 },
      { dCol: 0, dRow: -1, dx: 0, dz: -offset },
      { dCol: 0, dRow: 1, dx: 0, dz: offset }
    ];

    neighbors.forEach(n => {
      if (this.isTileWalkable(col + n.dCol, row + n.dRow)) {
        const torchTex = textureGenerator.getTorchTexture();
        const mat = new THREE.SpriteMaterial({
          map: torchTex,
          transparent: true
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(0.65, 0.65, 1.0);
        
        const torchPos = new THREE.Vector3(
          worldPos.x + n.dx,
          1.2,
          worldPos.z + n.dz
        );
        sprite.position.copy(torchPos);
        this.scene.add(sprite);

        const torchColors = {
          classic: 0xffaa44,
          lava: 0xff5500,
          ice: 0x33ccff,
          toxic: 0x33ff55
        };
        const torchColor = torchColors[this.theme] || torchColors['classic'];
        const light = new THREE.PointLight(torchColor, 1.8, 4.5);
        light.position.set(torchPos.x + n.dx * 0.1, 1.4, torchPos.z + n.dz * 0.1);
        this.scene.add(light);

        this.torches.push({
          sprite: sprite,
          light: light,
          baseIntensity: 1.8,
          timeOffset: Math.random() * 100
        });
      }
    });
  }

  createWallBanner(col, row, worldPos) {
    const halfSize = this.gridSize / 2;
    const offset = halfSize + 0.015;
    const neighbors = [
      { dCol: -1, dRow: 0, dx: -offset, dz: 0, rotY: -Math.PI / 2 },
      { dCol: 1, dRow: 0, dx: offset, dz: 0, rotY: Math.PI / 2 },
      { dCol: 0, dRow: -1, dx: 0, dz: -offset, rotY: Math.PI },
      { dCol: 0, dRow: 1, dx: 0, dz: offset, rotY: 0 }
    ];

    neighbors.forEach(n => {
      if (this.isTileWalkable(col + n.dCol, row + n.dRow)) {
        const bannerTex = textureGenerator.getBannerTexture();
        const bannerGeo = new THREE.PlaneGeometry(1.0, 1.5);
        const bannerMat = new THREE.MeshStandardMaterial({
          map: bannerTex,
          transparent: true,
          side: THREE.DoubleSide,
          roughness: 0.8,
          metalness: 0.1
        });
        const mesh = new THREE.Mesh(bannerGeo, bannerMat);
        mesh.position.set(
          worldPos.x + n.dx,
          1.15,
          worldPos.z + n.dz
        );
        mesh.rotation.y = n.rotY;
        this.scene.add(mesh);
        this.decals.push(mesh);
      }
    });
  }

  spawnFloorDecal(assetName, position) {
    const size = 1.2;
    const geo = new THREE.PlaneGeometry(size, size);
    
    let texture;
    if (assetName === 'blood') {
      texture = textureGenerator.getBloodTexture();
    } else if (assetName === 'skulls') {
      texture = textureGenerator.getSkullsTexture();
    } else if (assetName === 'grate') {
      texture = textureGenerator.getGrateTexture();
    } else if (assetName === 'web') {
      texture = textureGenerator.getWebTexture();
    } else if (assetName === 'bones') {
      texture = textureGenerator.getBonesTexture();
    }
    
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = Math.random() * Math.PI * 2;
    mesh.position.set(position.x, 0.015, position.z);
    
    this.scene.add(mesh);
    this.decals.push(mesh);
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

    // 4. Torch flickering animation
    this.torches.forEach(t => {
      t.light.intensity = t.baseIntensity * (0.8 + Math.sin(time * 12 + t.timeOffset) * 0.15 + (Math.random() - 0.5) * 0.05);
      const scaleWobble = 0.65 * (0.92 + Math.sin(time * 18 + t.timeOffset) * 0.08);
      t.sprite.scale.set(scaleWobble, scaleWobble, 1.0);
    });
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

    this.decals.forEach(d => this.scene.remove(d));
    this.decals = [];

    this.torches.forEach(t => {
      this.scene.remove(t.sprite);
      this.scene.remove(t.light);
    });
    this.torches = [];
  }
}
