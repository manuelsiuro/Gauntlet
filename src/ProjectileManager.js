import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { textureGenerator } from './TextureGenerator';
import { soundManager } from './SoundManager';

// Collision Filter Groups (Bitwise)
export const COLLISION_GROUPS = {
  PLAYER: 1,
  ENEMY: 2,
  WALL: 4,
  SPAWNER: 8,
  PROJECTILE: 16,
  ENEMY_PROJECTILE: 32
};

/**
 * ProjectileManager handles player projectile instantiation, physics velocity,
 * collision filter grouping, and hit detection callback loops.
 */
export class ProjectileManager {
  /**
   * @param {THREE.Scene} scene
   * @param {CANNON.World} physicsWorld
   */
  constructor(scene, physicsWorld) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.projectiles = [];
    this.speed = 18.0; // Fly fast
  }

  /**
   * Fire a new bullet
   * @param {THREE.Vector3} position - spawn origin
   * @param {THREE.Vector3} direction - normalized flying direction
   * @param {number} damage - damage score of hero
   */
  spawnProjectile(position, direction, damage) {
    const proj = new Projectile(this.scene, this.physicsWorld, position, direction, damage, this.speed);
    this.projectiles.push(proj);
    soundManager.playShoot();
  }

  /**
   * Fire a new enemy fireball projectile
   * @param {THREE.Vector3} position - spawn origin
   * @param {THREE.Vector3} direction - normalized flying direction
   * @param {number} damage - damage of demon
   */
  spawnEnemyProjectile(position, direction, damage) {
    const proj = new EnemyProjectile(this.scene, this.physicsWorld, position, direction, damage, this.speed * 0.55);
    this.projectiles.push(proj);
    soundManager.playShoot();
  }

  /**
   * Sync active projectiles and check distance against destructible pickups
   * @param {number} dt 
   * @param {Array} collectibles
   * @param {Function} removeCollectibleCallback
   */
  update(dt, collectibles, removeCollectibleCallback) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.update(dt);

      // Proximity check for hitting destructible food (5) or poison (9)
      if (collectibles && removeCollectibleCallback && !proj.isDead) {
        for (let j = collectibles.length - 1; j >= 0; j--) {
          const col = collectibles[j];
          if (col.type === 5 || col.type === 9) {
            const dist = proj.group.position.distanceTo(col.mesh.position);
            if (dist < 0.8) {
              proj.isDead = true;
              removeCollectibleCallback(col);
              soundManager.playHit();
              break;
            }
          }
        }
      }

      if (proj.isDead) {
        proj.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  clearAll() {
    this.projectiles.forEach(p => p.destroy());
    this.projectiles = [];
  }
}

/**
 * Individual Projectile Entity
 */
class Projectile {
  constructor(scene, physicsWorld, position, direction, damage, speed) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.damage = damage;
    this.lifetime = 1800; // 1.8 seconds max lifetime
    this.elapsed = 0;
    this.isDead = false;

    // 1. Mesh & Light
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.scene.add(this.group);

    // Glowing particle billboard sprite
    const mat = new THREE.SpriteMaterial({
      map: textureGenerator.getProjectileTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    this.sprite = new THREE.Sprite(mat);
    this.sprite.scale.set(0.6, 0.6, 1.0);
    this.group.add(this.sprite);

    // Small light to illuminate surrounding walls as it flies
    this.light = new THREE.PointLight(0xffaa00, 1.5, 4);
    this.group.add(this.light);

    // 2. Physics Body
    const radius = 0.25;
    this.body = new CANNON.Body({
      mass: 0.05,
      shape: new CANNON.Sphere(radius),
      position: new CANNON.Vec3(position.x, position.y, position.z),
      collisionFilterGroup: COLLISION_GROUPS.PROJECTILE,
      // Collide with Walls, Spawners, and Enemies. DO NOT collide with player.
      collisionFilterMask: COLLISION_GROUPS.WALL | COLLISION_GROUPS.SPAWNER | COLLISION_GROUPS.ENEMY
    });
    
    // Fly in direction
    this.body.velocity.set(
      direction.x * speed,
      0, // strictly horizontal plane flight
      direction.z * speed
    );

    this.body.userData = { entity: this };
    this.physicsWorld.addBody(this.body);

    // Setup collision listener
    this.body.addEventListener('collide', (e) => this.handleCollision(e));
  }

  /**
   * Handle Cannon.js physics collisions
   * @param {Object} event 
   */
  handleCollision(event) {
    if (this.isDead) return;

    const targetBody = event.body;
    if (targetBody && targetBody.userData) {
      const type = targetBody.userData.type;
      const entity = targetBody.userData.entity;

      if (entity && typeof entity.takeDamage === 'function') {
        entity.takeDamage(this.damage);
      }
    }

    // Explode on hit
    this.isDead = true;
  }

  update(dt) {
    this.elapsed += dt;
    if (this.elapsed >= this.lifetime) {
      this.isDead = true;
    }

    // Sync three.js mesh position
    this.group.position.set(
      this.body.position.x,
      this.body.position.y,
      this.body.position.z
    );
  }

  destroy() {
    this.scene.remove(this.group);
    this.physicsWorld.removeBody(this.body);
  }
}

/**
 * Individual Enemy Projectile Entity
 */
class EnemyProjectile {
  constructor(scene, physicsWorld, position, direction, damage, speed) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.damage = damage;
    this.lifetime = 2000; // 2 seconds max lifetime
    this.elapsed = 0;
    this.isDead = false;

    // 1. Mesh & Light
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.scene.add(this.group);

    // Glowing red-orange sprite
    const mat = new THREE.SpriteMaterial({
      map: textureGenerator.getProjectileTexture(),
      color: 0xff3300,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    this.sprite = new THREE.Sprite(mat);
    this.sprite.scale.set(0.5, 0.5, 1.0);
    this.group.add(this.sprite);

    // Small red light source
    this.light = new THREE.PointLight(0xff3300, 1.5, 4);
    this.group.add(this.light);

    // 2. Physics Body
    const radius = 0.25;
    this.body = new CANNON.Body({
      mass: 0.05,
      shape: new CANNON.Sphere(radius),
      position: new CANNON.Vec3(position.x, position.y, position.z),
      collisionFilterGroup: COLLISION_GROUPS.ENEMY_PROJECTILE,
      // Collide with Walls and Player. DO NOT collide with other enemies or spawners.
      collisionFilterMask: COLLISION_GROUPS.WALL | COLLISION_GROUPS.PLAYER
    });
    
    this.body.velocity.set(
      direction.x * speed,
      0, // strictly horizontal
      direction.z * speed
    );

    this.body.userData = { entity: this };
    this.physicsWorld.addBody(this.body);

    // Setup collision listener
    this.body.addEventListener('collide', (e) => this.handleCollision(e));
  }

  handleCollision(event) {
    if (this.isDead) return;

    const targetBody = event.body;
    if (targetBody && targetBody.userData) {
      const type = targetBody.userData.type;
      const entity = targetBody.userData.entity;

      if (type === 'player' && entity && typeof entity.takeDamage === 'function') {
        entity.takeDamage(this.damage);
      }
    }

    this.isDead = true;
  }

  update(dt) {
    this.elapsed += dt;
    if (this.elapsed >= this.lifetime) {
      this.isDead = true;
    }

    // Sync three.js mesh position
    this.group.position.set(
      this.body.position.x,
      this.body.position.y,
      this.body.position.z
    );
  }

  destroy() {
    this.scene.remove(this.group);
    this.physicsWorld.removeBody(this.body);
  }
}
