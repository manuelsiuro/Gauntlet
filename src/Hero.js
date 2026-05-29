import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { textureGenerator } from './TextureGenerator';
import { soundManager } from './SoundManager';
import { COLLISION_GROUPS } from './ProjectileManager';

/**
 * Hero represents the player character, containing state (health, keys, score)
 * and physical Cannon.js rigid body representation.
 */
export class Hero {
  /**
   * @param {THREE.Scene} scene
   * @param {CANNON.World} physicsWorld
   * @param {string} classType - 'warrior', 'wizard', 'valkyrie', or 'elf'
   * @param {THREE.Vector3} startPos
   */
  constructor(scene, physicsWorld, classType, startPos) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.classType = classType;

    // Base stats depending on selection
    this.setupClassStats();

    // Game stats
    this.health = 2000;
    this.score = 0;
    this.keys = 0;
    this.potions = 0;

    // Time accumulators for health drain
    this.healthDrainTimer = 0;
    this.lowHealthVoiceTimer = 0;

    // Create 3D group container
    this.group = new THREE.Group();
    this.group.position.copy(startPos);
    this.scene.add(this.group);

    this.buildSprite();
    this.buildPhysics(startPos);
    this.buildTorchlight();
    
    // Play spawn sound & narrate entry
    soundManager.speak(`${this.className} is now playing!`, true);
  }

  /**
   * Configure character class attributes
   */
  setupClassStats() {
    switch (this.classType) {
      case 'warrior':
        this.className = 'Warrior';
        this.baseSpeed = 7.0;
        this.damage = 35;
        this.defense = 0.35; // Absorbs 35% damage
        this.spriteTexture = textureGenerator.getWarriorTexture();
        break;
      case 'wizard':
        this.className = 'Wizard';
        this.baseSpeed = 7.5;
        this.damage = 50;
        this.defense = 0.15;
        this.spriteTexture = textureGenerator.getWizardTexture();
        break;
      case 'valkyrie':
        this.className = 'Valkyrie';
        this.baseSpeed = 7.0;
        this.damage = 25;
        this.defense = 0.50; // Tanky
        this.spriteTexture = textureGenerator.getValkyrieTexture();
        break;
      case 'elf':
        this.className = 'Elf';
        this.baseSpeed = 9.0; // Very fast
        this.damage = 20;
        this.defense = 0.20;
        this.spriteTexture = textureGenerator.getElfTexture();
        break;
      default:
        this.className = 'Hero';
        this.baseSpeed = 7.0;
        this.damage = 25;
        this.defense = 0.20;
        this.spriteTexture = textureGenerator.getWarriorTexture();
    }
  }

  buildSprite() {
    const mat = new THREE.SpriteMaterial({
      map: this.spriteTexture,
      transparent: true
    });
    this.sprite = new THREE.Sprite(mat);
    this.sprite.scale.set(1.5, 1.5, 1.0);
    this.sprite.position.y = 0.75; // Align vertical center
    this.group.add(this.sprite);
  }

  buildPhysics(startPos) {
    // Dynamic sphere shape for movement and wall-sliding
    const radius = 0.5;
    this.body = new CANNON.Body({
      mass: 1.0,
      shape: new CANNON.Sphere(radius),
      position: new CANNON.Vec3(startPos.x, startPos.y, startPos.z),
      fixedRotation: true, // Prevent rolling around like a ball
      collisionFilterGroup: COLLISION_GROUPS.PLAYER,
      collisionFilterMask: COLLISION_GROUPS.WALL | COLLISION_GROUPS.SPAWNER | COLLISION_GROUPS.ENEMY | COLLISION_GROUPS.ENEMY_PROJECTILE
    });
    
    // Sliders don't friction lock against walls
    this.body.linearDamping = 0.1;
    this.body.angularDamping = 0.9;
    
    // Tag body for identification in physics loop
    this.body.userData = { entity: this, type: 'player' };
    this.physicsWorld.addBody(this.body);
  }

  buildTorchlight() {
    // Torch light source that illuminates the dark dungeon as the player moves
    this.torchlight = new THREE.PointLight(0xffeaad, 3.5, 16);
    this.torchlight.position.set(0, 1.5, 0);
    this.torchlight.castShadow = true;
    this.torchlight.shadow.mapSize.width = 512;
    this.torchlight.shadow.mapSize.height = 512;
    this.torchlight.shadow.camera.near = 0.5;
    this.torchlight.shadow.camera.far = 20;
    this.torchlight.shadow.bias = -0.005; // Fix shadows acne
    this.group.add(this.torchlight);

    // Subtle colored floor ring indicator
    const ringGeo = new THREE.RingGeometry(0.5, 0.6, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: this.classType === 'warrior' ? 0xff3366 :
             this.classType === 'wizard' ? 0x33ccff :
             this.classType === 'valkyrie' ? 0xffcc00 : 0x33ff66,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4
    });
    this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.ringMesh.rotation.x = -Math.PI / 2;
    this.ringMesh.position.y = 0.02;
    this.group.add(this.ringMesh);
  }

  /**
   * Processes player state updates: health drain, syncing meshes
   * @param {number} dt - delta time in milliseconds
   */
  update(dt) {
    // Sync Three.js Group position with Cannon.js body position
    this.group.position.set(
      this.body.position.x,
      this.body.position.y - 0.4, // Align visual sprite closer to the ground
      this.body.position.z
    );

    // Keep height locked close to ground (avoid floating or falling infinitely)
    if (this.body.position.y > 1.0) {
      this.body.position.y = 0.8;
      this.body.velocity.y = 0;
    }

    if (this.isDead) return;

    // 1. Health Drain as Time mechanic (1 health per 1000ms, frame-rate independent)
    this.healthDrainTimer += dt;
    if (this.healthDrainTimer >= 1000) {
      this.healthDrainTimer -= 1000;
      this.health -= 1;
      if (this.health <= 0) {
        this.health = 0;
        this.die("DIED FOR LACK OF FOOD");
      }
    }

    // 2. Alarm triggers when health drops low
    if (this.health > 0 && this.health < 500) {
      this.lowHealthVoiceTimer += dt;
      if (this.lowHealthVoiceTimer >= 6000) { // Speak warning every 6s
        this.lowHealthVoiceTimer = 0;
        soundManager.speak(`${this.className} needs food, badly!`);
        this.flashRedUI();
      }
    }
  }

  /**
   * Inflict damage on player
   */
  takeDamage(amount) {
    if (this.isDead) return;
    
    // Apply defense mitigation
    const mitigated = Math.max(1, Math.round(amount * (1.0 - this.defense)));
    this.health -= mitigated;
    
    soundManager.playHit();
    this.flashRedUI();

    if (this.health <= 0) {
      this.health = 0;
      this.die("WAS DEFEATED BY THE HORDE");
    }
  }

  flashRedUI() {
    // Visual flash of red on the sprite
    this.sprite.material.color.setHex(0xff3333);
    setTimeout(() => {
      if (this.sprite) this.sprite.material.color.setHex(0xffffff);
    }, 150);
  }

  /**
   * Health recovery
   */
  heal(amount) {
    if (this.isDead) return;
    this.health += amount;
    soundManager.playPickup();
    soundManager.speak(`${this.className} found food.`);
  }

  takePoisonDamage() {
    if (this.isDead) return;
    this.health = Math.max(0, this.health - 200);
    soundManager.playHit();
    this.flashRedUI();
    soundManager.speak(`${this.className} was poisoned!`, true);
    if (this.health <= 0) {
      this.die("DIED OF POISONING");
    }
  }

  collectKey() {
    this.keys += 1;
    soundManager.playPickup();
    soundManager.speak(`${this.className} found a key.`);
    this.score += 50;
  }

  collectPotion() {
    this.potions += 1;
    soundManager.playPickup();
    soundManager.speak(`${this.className} found a potion.`);
    this.score += 100;
  }

  collectChest() {
    this.score += 150;
    soundManager.playPickup();
    soundManager.speak(`${this.className} found treasure.`);
  }

  stealItem() {
    if (this.potions > 0 && (Math.random() > 0.5 || this.keys === 0)) {
      this.potions -= 1;
      soundManager.speak(`The Thief stole a potion!`, true);
      return 'potion';
    } else if (this.keys > 0) {
      this.keys -= 1;
      soundManager.speak(`The Thief stole a key!`, true);
      return 'key';
    }
    return null;
  }

  recoverItem(itemType) {
    if (itemType === 'key') {
      this.keys += 1;
      soundManager.speak(`Recovered key!`, true);
    } else if (itemType === 'potion') {
      this.potions += 1;
      soundManager.speak(`Recovered potion!`, true);
    }
    soundManager.playPickup();
  }

  usePotion(enemies, spawners) {
    if (this.potions <= 0) return;
    this.potions -= 1;
    soundManager.playSpawnerDestroy(); // Magic flash sound
    soundManager.speak(`${this.className} cast a potion magic spell!`, true);

    // Destroy all enemies within a large radius
    const killRadius = 15.0;
    
    // Kill nearby enemies
    enemies.forEach(enemy => {
      const dist = this.group.position.distanceTo(enemy.group.position);
      if (dist < killRadius) {
        enemy.takeDamage(999); // Instakill both normal enemies and Death
      }
    });

    // Damage spawners in range
    spawners.forEach(spawner => {
      const dist = this.group.position.distanceTo(spawner.group.position);
      if (dist < killRadius) {
        spawner.takeDamage(50);
      }
    });
  }

  die(reason) {
    this.isDead = true;
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    
    // Death sequence
    soundManager.playGameOver();
    soundManager.speak(`${this.className} is dead!`, true);

    // Fade sprite out
    this.sprite.material.opacity = 0.5;
    this.sprite.material.color.setHex(0x333333);

    // Trigger game-over dispatch
    const event = new CustomEvent('player-dead', { detail: { score: this.score, reason: `${this.className.toUpperCase()} ${reason}` } });
    window.dispatchEvent(event);
  }

  destroy() {
    this.scene.remove(this.group);
    this.physicsWorld.removeBody(this.body);
  }
}
