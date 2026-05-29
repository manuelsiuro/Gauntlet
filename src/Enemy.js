import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { textureGenerator } from './TextureGenerator';
import { soundManager } from './SoundManager';
import { COLLISION_GROUPS } from './ProjectileManager';

/**
 * Enemy represents the mobile mobs in the Gauntlet.
 * Types:
 * - 'ghost': Default mob.
 * - 'death': Indestructible by normal shots. Drains health rapidly. Dies from potions or after draining 250hp.
 * - 'thief': Very fast. Steals a key or potion and runs to the exit.
 */
export class Enemy {
  /**
   * @param {THREE.Scene} scene
   * @param {CANNON.World} physicsWorld
   * @param {THREE.Vector3} position
   * @param {string} enemyType - 'ghost', 'death', or 'thief'
   * @param {number} spawnerLvl - Difficulty scale multiplier (1, 2, or 3)
   */
  constructor(scene, physicsWorld, position, enemyType = 'ghost', spawnerLvl = 1) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.enemyType = enemyType;
    this.spawnerLvl = spawnerLvl;

    this.isDeathClass = (enemyType === 'death');
    this.isThiefClass = (enemyType === 'thief');

    this.setupTypeStats();

    // Create 3D group container
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.scene.add(this.group);

    this.buildSprite();
    this.buildPhysics(position);
  }

  setupTypeStats() {
    // Scale stats based on enemy type and spawner tier
    if (this.isDeathClass) {
      this.health = 999; // Practically immune to normal attacks
      this.speed = 4.0;
      this.damageRate = 350; // Drains player health extremely fast!
      this.drainedHealth = 0; // Tracks total health stolen
      this.maxDrainedHealth = 250; // Vanishes after eating this much health
      this.spriteTexture = textureGenerator.getDeathTexture();
    } else if (this.isThiefClass) {
      this.health = 60;
      this.speed = 6.2; // Runs very fast
      this.damageRate = 30; // Thief doesn't hit hard, he wants to steal!
      this.hasStolen = false;
      this.stolenItem = null;
      this.spriteTexture = textureGenerator.getThiefTexture();
    } else {
      // Normal Ghost
      const multiplier = this.spawnerLvl === 3 ? 1.5 :
                         this.spawnerLvl === 2 ? 1.2 : 1.0;
      
      this.health = 25 * multiplier;
      this.speed = (3.5 + Math.random() * 1.5) * (this.spawnerLvl === 3 ? 1.3 : 1.0);
      this.damageRate = 120 * multiplier;
      this.spriteTexture = textureGenerator.getEnemyTexture();
    }
  }

  buildSprite() {
    const mat = new THREE.SpriteMaterial({
      map: this.spriteTexture,
      transparent: true
    });
    this.sprite = new THREE.Sprite(mat);
    
    // Scale Death slightly larger for intimidation
    const scale = this.isDeathClass ? 1.6 : this.isThiefClass ? 1.3 : 1.2;
    this.sprite.scale.set(scale, scale, 1.0);
    this.sprite.position.y = 0.6;
    
    // Glowing red eyes visual pointlight for Death
    if (this.isDeathClass) {
      this.deathLight = new THREE.PointLight(0xff0000, 1.5, 4);
      this.deathLight.position.set(0, 0.8, 0);
      this.group.add(this.deathLight);
    }
    
    this.group.add(this.sprite);
  }

  buildPhysics(position) {
    const radius = this.isDeathClass ? 0.6 : 0.45;
    this.body = new CANNON.Body({
      mass: this.isDeathClass ? 2.0 : 0.5,
      shape: new CANNON.Sphere(radius),
      position: new CANNON.Vec3(position.x, position.y, position.z),
      fixedRotation: true,
      collisionFilterGroup: COLLISION_GROUPS.ENEMY,
      collisionFilterMask: COLLISION_GROUPS.PLAYER | COLLISION_GROUPS.WALL | COLLISION_GROUPS.PROJECTILE | COLLISION_GROUPS.ENEMY
    });

    this.body.linearDamping = 0.1;
    this.body.angularDamping = 0.9;
    
    this.body.userData = { entity: this, type: 'enemy' };
    this.physicsWorld.addBody(this.body);
  }

  /**
   * Tracks target coordinates (either player, or escape exit portals)
   */
  update(dt, playerPos, exitPortalPos, playerObject) {
    // Sync mesh position
    this.group.position.set(
      this.body.position.x,
      this.body.position.y - 0.2,
      this.body.position.z
    );

    // Height locking
    if (this.body.position.y > 1.0) {
      this.body.position.y = 0.5;
      this.body.velocity.y = 0;
    }

    if (this.isDead) return;

    let targetPos = playerPos;

    // Thief Flee AI Logic
    if (this.isThiefClass && this.hasStolen) {
      if (exitPortalPos) {
        targetPos = exitPortalPos; // Head to exit!
        
        // Escape check
        const distToExit = this.group.position.distanceTo(exitPortalPos);
        if (distToExit < 0.9) {
          this.isDead = true;
          soundManager.playSpawnerDestroy(); // metallic escape sound
          soundManager.speak(`The Thief has escaped with your ${this.stolenItem}!`, true);
          this.stolenItem = null; // Stolen forever
          return;
        }
      } else {
        // No exit found, just run away from the player
        const runAwayDir = new THREE.Vector3().subVectors(this.group.position, playerPos);
        runAwayDir.y = 0;
        runAwayDir.normalize();
        this.body.velocity.x = runAwayDir.x * this.speed;
        this.body.velocity.z = runAwayDir.z * this.speed;
        return;
      }
    }

    // AI Pathfinding velocity setter
    const direction = new THREE.Vector3().subVectors(targetPos, this.group.position);
    direction.y = 0;
    
    const distance = direction.length();
    
    if (distance > 0.1) {
      direction.normalize();
      this.body.velocity.x = direction.x * this.speed;
      this.body.velocity.z = direction.z * this.speed;

      // Flip sprite X depending on walk direction
      if (direction.x > 0.05) {
        this.sprite.scale.x = -Math.abs(this.sprite.scale.x);
      } else if (direction.x < -0.05) {
        this.sprite.scale.x = Math.abs(this.sprite.scale.x);
      }
    }

    // Thief Touch Stealing Mechanism
    if (this.isThiefClass && !this.hasStolen && playerObject && !playerObject.isDead) {
      const distToPlayer = this.group.position.distanceTo(playerPos);
      if (distToPlayer < 0.9) {
        const stolen = playerObject.stealItem();
        if (stolen) {
          this.hasStolen = true;
          this.stolenItem = stolen;
          this.speed = 7.5; // Flee speed multiplier
          
          // Flash green bag success highlight
          this.sprite.material.color.setHex(0x33ff33);
          setTimeout(() => {
            if (this.sprite) this.sprite.material.color.setHex(0xffffff);
          }, 400);
        }
      }
    }

    // Death Self-Vanish Mechanism
    if (this.isDeathClass && this.drainedHealth >= this.maxDrainedHealth) {
      this.isDead = true;
      soundManager.speak("Death has vanished.", true);
    }
  }

  /**
   * Inflict damage on enemy
   */
  takeDamage(amount) {
    // Death is immune to normal shots (which deal small amounts of damage like < 100)
    // Only potions deal high damage (999) which bypasses this immunity
    if (this.isDeathClass && amount < 900) {
      // Immune clink visual flash
      this.sprite.material.color.setHex(0x999999);
      setTimeout(() => {
        if (this.sprite) this.sprite.material.color.setHex(0xffffff);
      }, 100);
      return;
    }

    this.health -= amount;

    // Visual flash
    const flashColor = this.isDeathClass ? 0xff0000 : this.isThiefClass ? 0x00ff00 : 0xff00ff;
    this.sprite.material.color.setHex(flashColor);
    
    setTimeout(() => {
      if (this.sprite) {
        this.sprite.material.color.setHex(0xffffff);
      }
    }, 120);

    soundManager.playHit();

    if (this.health <= 0) {
      this.isDead = true;
    }
  }

  destroy() {
    this.createDeathParticles();
    this.scene.remove(this.group);
    this.physicsWorld.removeBody(this.body);
  }

  createDeathParticles() {
    const pCount = this.isDeathClass ? 24 : this.isThiefClass ? 14 : 8;
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const colorHex = this.isDeathClass ? 0x222222 : this.isThiefClass ? 0x33ff66 : 0xcc33ff;
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    
    for (let i = 0; i < pCount; i++) {
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(this.group.position);
      p.position.y += 0.4;
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 4 + 1.5,
        (Math.random() - 0.5) * 4
      );

      this.scene.add(p);
      
      const startTime = Date.now();
      const lifeTime = 400 + Math.random() * 400;
      
      const pAnim = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed > lifeTime) {
          this.scene.remove(p);
        } else {
          const t = elapsed / 1000;
          p.position.x += velocity.x * 0.016;
          p.position.z += velocity.z * 0.016;
          p.position.y += (velocity.y - 9.8 * t) * 0.016;
          requestAnimationFrame(pAnim);
        }
      };
      pAnim();
    }
  }
}
