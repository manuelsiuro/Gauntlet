import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { textureGenerator } from './TextureGenerator';
import { soundManager } from './SoundManager';
import { COLLISION_GROUPS } from './ProjectileManager';

/**
 * Spawner represents an enemy generator pillar.
 * It periodically instantiates Enemy entities when the player is within range.
 * It is destructible by player projectiles.
 */
export class Spawner {
  /**
   * @param {THREE.Scene} scene
   * @param {CANNON.World} physicsWorld
   * @param {THREE.Vector3} position
   * @param {number} spawnerLvl - 1, 2, or 3
   */
  constructor(scene, physicsWorld, position, spawnerLvl = 1) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.position = position.clone();
    this.position.y = 1.0; // Rest on ground
    this.level = spawnerLvl;

    // Adjust spawner stats and emissive light colors based on level tier
    if (this.level === 3) {
      this.health = 180;
      this.spawnInterval = 1500; // continuous onslaught (every 1.5 seconds)
      this.lightColor = 0xff0033; // red
    } else if (this.level === 2) {
      this.health = 120;
      this.spawnInterval = 2300; // fast (every 2.3 seconds)
      this.lightColor = 0xff8800; // orange
    } else {
      this.health = 80;
      this.spawnInterval = 3200; // normal (every 3.2 seconds)
      this.lightColor = 0xcc33ff; // purple
    }

    this.maxHealth = this.health;
    this.spawnTimer = Math.random() * 1000; // Offset spawns slightly
    this.activationRange = 14.0; // Distance to player to activate spawning

    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    this.scene.add(this.group);

    this.buildMesh();
    this.buildPhysics();
  }

  buildMesh() {
    // A square pillar design
    const geo = new THREE.BoxGeometry(1.2, 2.0, 1.2);
    const tex = textureGenerator.getSpawnerTexture();
    const emissiveHex = this.level === 3 ? 0x660000 : 
                        this.level === 2 ? 0x552200 : 0x330033;

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.5,
      metalness: 0.8,
      emissive: new THREE.Color(emissiveHex),
      emissiveMap: tex
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);

    // Glowing crystal atop the pillar matching level tier color
    const lightGeo = new THREE.OctahedronGeometry(0.3, 0);
    const lightMat = new THREE.MeshBasicMaterial({ color: this.lightColor });
    this.topLightMesh = new THREE.Mesh(lightGeo, lightMat);
    this.topLightMesh.position.set(0, 1.2, 0);
    this.group.add(this.topLightMesh);

    // Local glowing light source
    this.light = new THREE.PointLight(this.lightColor, 1.0, 4);
    this.light.position.set(0, 1.2, 0);
    this.group.add(this.light);
  }

  buildPhysics() {
    this.body = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(0.6, 1.0, 0.6)),
      position: new CANNON.Vec3(this.position.x, this.position.y, this.position.z),
      collisionFilterGroup: COLLISION_GROUPS.SPAWNER,
      collisionFilterMask: COLLISION_GROUPS.PLAYER | COLLISION_GROUPS.PROJECTILE
    });
    
    // Store reference for collision callbacks
    this.body.userData = { entity: this, type: 'spawner' };
    this.physicsWorld.addBody(this.body);
  }

  /**
   * Spawner receives damage when shot by player projectiles
   */
  takeDamage(amount) {
    this.health -= amount;
    
    // Flash red visual effect
    const origColor = this.topLightMesh.material.color.getHex();
    this.topLightMesh.material.color.setHex(0xff0033);
    this.light.color.setHex(0xff0033);
    
    setTimeout(() => {
      if (this.topLightMesh) {
        this.topLightMesh.material.color.setHex(origColor);
        this.light.color.setHex(origColor);
      }
    }, 100);

    soundManager.playHit();

    if (this.health <= 0) {
      this.isDead = true;
    }
  }

  /**
   * Periodic update. Handles timer and spawner rotation effects.
   * @param {number} dt - delta time in ms
   * @param {THREE.Vector3} playerPos - current position of player
   * @param {Function} spawnCallback - method in game loop to instantiate an Enemy
   */
  update(dt, playerPos, spawnCallback) {
    if (this.isDead) return;

    // Rotate top crystal
    this.topLightMesh.rotation.y += 0.02;
    this.topLightMesh.position.y = 1.2 + Math.sin(Date.now() * 0.005) * 0.05;

    // Check distance to player
    const dist = this.position.distanceTo(playerPos);
    if (dist < this.activationRange) {
      // Pulsate glowing intensity
      this.light.intensity = 1.0 + Math.sin(Date.now() * 0.01) * 0.5;

      this.spawnTimer += dt;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        
        // Spawn enemy slightly offset from the pillar base
        const spawnOffset = new THREE.Vector3(
          (Math.random() - 0.5) * 1.5,
          0.5,
          (Math.random() - 0.5) * 1.5
        );
        const enemySpawnPos = this.position.clone().add(spawnOffset);
        enemySpawnPos.y = 0.5; // Rest on floor
        
        spawnCallback(enemySpawnPos, this.level);
      }
    } else {
      this.light.intensity = 0.5; // Idle glow
    }
  }

  destroy() {
    soundManager.playSpawnerDestroy();
    
    // Spawn simple disintegration particles
    this.createExplosionParticles();

    this.scene.remove(this.group);
    this.physicsWorld.removeBody(this.body);
  }

  /**
   * Helper to spawn beautiful mesh explosion particles
   */
  createExplosionParticles() {
    const pCount = 15;
    const geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const mat = new THREE.MeshBasicMaterial({ color: 0xcc33ff });
    
    for (let i = 0; i < pCount; i++) {
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(this.position);
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 5 + 2,
        (Math.random() - 0.5) * 4
      );

      this.scene.add(p);
      
      const startTime = Date.now();
      const lifeTime = 500 + Math.random() * 500;
      
      const pAnim = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed > lifeTime) {
          this.scene.remove(p);
        } else {
          // Physics step for particles
          const t = elapsed / 1000;
          p.position.x += velocity.x * 0.016;
          p.position.z += velocity.z * 0.016;
          p.position.y += (velocity.y - 9.8 * t) * 0.016; // gravity
          requestAnimationFrame(pAnim);
        }
      };
      pAnim();
    }
  }
}
