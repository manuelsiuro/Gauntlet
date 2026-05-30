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
    this.potionInventory = [];

    // Shield Potion states
    this.shieldPotionActive = false;
    this.shieldPotionTimer = 0;

    // Time accumulators for health drain
    this.healthDrainTimer = 0;
    this.lowHealthVoiceTimer = 0;

    // Special Ability properties
    this.specialCooldown = 8000; // 8 seconds cooldown
    this.specialTimer = 8000; // Ready at start
    this.specialActive = false;
    this.specialActiveTimer = 0;
    this.specialDuration = this.classType === 'warrior' ? 1000 :
                           this.classType === 'wizard' ? 4500 :
                           this.classType === 'valkyrie' ? 3500 : 400; // Elf dash is quick
    
    // Combo multiplier system
    this.comboCount = 0;
    this.comboTimer = 0;
    this.comboCooldown = 3000; // 3 seconds chain duration

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

    // 3. Special Ability timers update
    if (this.specialTimer < this.specialCooldown) {
      this.specialTimer += dt;
    }

    if (this.specialActive) {
      this.specialActiveTimer += dt;
      
      // Warrior spin animation scaling
      if (this.classType === 'warrior' && this.spinRing) {
        const progress = this.specialActiveTimer / this.specialDuration;
        const size = 0.5 + progress * 5.5; // Grows up to 6x scale
        this.spinRing.scale.set(size, size, 1.0);
        this.spinRing.material.opacity = 0.8 * (1.0 - progress);
      }
      
      // Elf dash speed injection
      if (this.classType === 'elf' && this.dashDir) {
        this.body.velocity.x = this.dashDir.x * this.baseSpeed * 3.2;
        this.body.velocity.z = this.dashDir.z * this.baseSpeed * 3.2;
        this.createDashTrailParticles();
      }

      if (this.specialActiveTimer >= this.specialDuration) {
        this.endSpecialAbility();
      }
    }

    // 4. Combo Multiplier timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
      }
    }

    // 5. Shield Potion timer
    if (this.shieldPotionActive) {
      this.shieldPotionTimer -= dt;
      
      const pulseVal = Math.sin(Date.now() * 0.015) * 0.5 + 0.5;
      if (this.sprite) {
        this.sprite.material.color.setRGB(1.0, 0.4 + pulseVal * 0.4, 0.0);
      }
      if (this.ringMesh) {
        this.ringMesh.material.color.setRGB(1.0, 0.4 + pulseVal * 0.4, 0.0);
        this.ringMesh.material.opacity = 0.8;
      }
      
      if (this.shieldPotionTimer <= 0) {
        this.shieldPotionActive = false;
        if (this.sprite) this.sprite.material.color.setHex(0xffffff);
        
        // Restore original ring color
        const origColor = this.classType === 'warrior' ? 0xff3366 :
                          this.classType === 'wizard' ? 0x33ccff :
                          this.classType === 'valkyrie' ? 0xffcc00 : 0x33ff66;
        if (this.ringMesh) {
          this.ringMesh.material.color.setHex(origColor);
          this.ringMesh.material.opacity = 0.4;
        }
      }
    }
  }

  /**
   * Inflict damage on player
   */
  takeDamage(amount) {
    if (this.isDead) return;

    // Shield Potion invincibility check
    if (this.shieldPotionActive) {
      this.sprite.material.color.setHex(0xffffff);
      setTimeout(() => {
        if (this.sprite && this.shieldPotionActive) {
          const pulseVal = Math.sin(Date.now() * 0.015) * 0.5 + 0.5;
          this.sprite.material.color.setRGB(1.0, 0.4 + pulseVal * 0.4, 0.0);
        }
      }, 100);
      return;
    }
    
    // Valkyrie Aegis invincibility check
    if (this.specialActive && this.classType === 'valkyrie') {
      this.sprite.material.color.setHex(0xffffff);
      setTimeout(() => {
        if (this.sprite && this.specialActive) this.sprite.material.color.setHex(0xffcc00);
      }, 100);
      return;
    }

    // Elf Dash invincibility check
    if (this.specialActive && this.classType === 'elf') {
      return;
    }
    
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

  collectPotion(potionType = 7) {
    this.potionInventory.push(potionType);
    this.potions = this.potionInventory.length;
    soundManager.playPickup();
    
    const potionNames = {
      7: 'Bomb Potion',
      31: 'Freeze Potion',
      32: 'Thunder Potion',
      33: 'Shield Potion',
      34: 'Heal Potion'
    };
    const name = potionNames[potionType] || 'Potion';
    soundManager.speak(`${this.className} found a ${name}.`);
    this.score += 100;
  }

  collectChest() {
    this.score += 150;
    soundManager.playPickup();
    soundManager.speak(`${this.className} found treasure.`);
  }

  stealItem() {
    if (this.potionInventory.length > 0 && (Math.random() > 0.5 || this.keys === 0)) {
      const stolenPotion = this.potionInventory.pop();
      this.potions = this.potionInventory.length;
      soundManager.speak(`The Thief stole a potion!`, true);
      return { type: 'potion', potionType: stolenPotion };
    } else if (this.keys > 0) {
      this.keys -= 1;
      soundManager.speak(`The Thief stole a key!`, true);
      return { type: 'key' };
    }
    return null;
  }

  recoverItem(stolen) {
    if (!stolen) return;
    if (stolen.type === 'key') {
      this.keys += 1;
      soundManager.speak(`Recovered key!`, true);
    } else if (stolen.type === 'potion') {
      this.potionInventory.push(stolen.potionType);
      this.potions = this.potionInventory.length;
      soundManager.speak(`Recovered potion!`, true);
    }
    soundManager.playPickup();
  }

  usePotion(enemies, spawners) {
    if (this.potionInventory.length <= 0) return;
    const potionType = this.potionInventory.shift();
    this.potions = this.potionInventory.length;
    
    soundManager.playSpawnerDestroy(); // Magic flash sound
    
    const potionNames = {
      7: 'Bomb',
      31: 'Freeze',
      32: 'Thunder',
      33: 'Shield',
      34: 'Heal'
    };
    const pName = potionNames[potionType] || 'Potion';
    soundManager.speak(`${this.className} cast a ${pName} magic spell!`, true);

    const killRadius = 15.0;
    const playerPos = this.group.position;

    if (potionType === 7) {
      // 1. Bomb Potion: Deals massive damage
      enemies.forEach(enemy => {
        const dist = playerPos.distanceTo(enemy.group.position);
        if (dist < killRadius) {
          enemy.takeDamage(999);
        }
      });
      spawners.forEach(spawner => {
        const dist = playerPos.distanceTo(spawner.group.position);
        if (dist < killRadius) {
          spawner.takeDamage(50);
        }
      });
      this.createPotionRingEffect(0xcc33ff); // Purple ring

    } else if (potionType === 31) {
      // 2. Freeze Potion: Freezes all enemies for 5 seconds
      enemies.forEach(enemy => {
        const dist = playerPos.distanceTo(enemy.group.position);
        if (dist < killRadius) {
          enemy.freeze(5000);
        }
      });
      this.createPotionRingEffect(0x33ccff); // Cyan ring

    } else if (potionType === 32) {
      // 3. Thunder Potion: Strikes 5 random targets within 16 units with lightning
      const targets = [];
      enemies.forEach(e => {
        if (playerPos.distanceTo(e.group.position) < 16) {
          targets.push({ type: 'enemy', entity: e, pos: e.group.position });
        }
      });
      spawners.forEach(s => {
        if (playerPos.distanceTo(s.group.position) < 16) {
          targets.push({ type: 'spawner', entity: s, pos: s.group.position });
        }
      });
      
      const shuffled = targets.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 5);
      
      selected.forEach(target => {
        this.triggerLightningStrike(target.pos);
        if (target.type === 'enemy') {
          target.entity.takeDamage(400);
        } else {
          target.entity.takeDamage(100);
        }
      });
      this.createPotionRingEffect(0xffff33); // Yellow ring

    } else if (potionType === 33) {
      // 4. Shield Potion: Grants 6.0s speed and invincibility
      this.triggerShieldPotion(6000);
      this.createPotionRingEffect(0xff9900); // Orange ring

    } else if (potionType === 34) {
      // 5. Heal Potion: Restores 800 health
      this.heal(800);
      this.createPotionRingEffect(0xff3366); // Pink/Red ring
    }
  }

  createPotionRingEffect(colorHex) {
    const ringGeo = new THREE.RingGeometry(0.1, 1.0, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(this.group.position);
    ring.position.y = 0.06;
    this.scene.add(ring);

    const startTime = Date.now();
    const duration = 500;
    const anim = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) {
        this.scene.remove(ring);
      } else {
        const t = elapsed / duration;
        const scale = 1.0 + t * 14.0;
        ring.scale.set(scale, scale, 1.0);
        ringMat.opacity = 0.9 * (1.0 - t);
        requestAnimationFrame(anim);
      }
    };
    anim();
  }

  triggerLightningStrike(targetPos) {
    const points = [];
    const segments = 6;
    const startY = 8.0;
    const endY = targetPos.y;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = startY - t * (startY - endY);
      const displ = (1.0 - t) * 0.35;
      const dx = (Math.random() - 0.5) * displ;
      const dz = (Math.random() - 0.5) * displ;
      points.push(new THREE.Vector3(targetPos.x + dx, y, targetPos.z + dz));
    }
    
    const curve = new THREE.CatmullRomCurve3(points);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(20));
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    const glowMat = new THREE.LineBasicMaterial({ color: 0xffff33, transparent: true, opacity: 0.7 });
    
    const mainLine = new THREE.Line(lineGeo, lineMat);
    const glowLine = new THREE.Line(lineGeo, glowMat);
    glowLine.scale.set(1.2, 1.0, 1.2);
    
    this.scene.add(mainLine);
    this.scene.add(glowLine);
    
    const strikeLight = new THREE.PointLight(0xffff33, 3.0, 6.0);
    strikeLight.position.copy(targetPos);
    strikeLight.position.y = 1.0;
    this.scene.add(strikeLight);

    const startTime = Date.now();
    const anim = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > 200) {
        this.scene.remove(mainLine);
        this.scene.remove(glowLine);
        this.scene.remove(strikeLight);
      } else {
        const opacity = 1.0 - (elapsed / 200);
        glowMat.opacity = 0.7 * opacity;
        lineMat.color.setHex(Math.random() > 0.5 ? 0xffffff : 0xffff00);
        requestAnimationFrame(anim);
      }
    };
    anim();
  }

  triggerShieldPotion(duration) {
    this.shieldPotionActive = true;
    this.shieldPotionTimer = duration;
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

  useSpecial(projectileManager, scene) {
    if (this.isDead || this.specialTimer < this.specialCooldown || this.specialActive) return;

    this.specialActive = true;
    this.specialActiveTimer = 0;
    this.specialTimer = 0;

    soundManager.speak(`${this.className} special ability activated!`, true);
    soundManager.playSpawnerDestroy(); // Activation thump sound

    if (this.classType === 'warrior') {
      // Create Golden ring shockwave mesh
      const ringGeo = new THREE.RingGeometry(0.1, 1.0, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffcc00,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      this.spinRing = new THREE.Mesh(ringGeo, ringMat);
      this.spinRing.rotation.x = -Math.PI / 2;
      this.spinRing.position.y = 0.05;
      this.group.add(this.spinRing);

    } else if (this.classType === 'wizard') {
      // Wizard blue shield tint visual
      this.sprite.material.color.setHex(0x33ccff);

    } else if (this.classType === 'valkyrie') {
      // Valkyrie invincibility golden visual
      this.sprite.material.color.setHex(0xffcc00);
      this.ringMesh.material.color.setHex(0xffcc00);
      this.ringMesh.material.opacity = 0.9;

    } else if (this.classType === 'elf') {
      // Save dash direction from body velocity
      const vel = new THREE.Vector3(this.body.velocity.x, 0, this.body.velocity.z);
      if (vel.lengthSq() > 0.01) {
        vel.normalize();
        this.dashDir = vel;
      } else {
        // Dash in direction facing
        this.dashDir = new THREE.Vector3(this.sprite.scale.x > 0 ? 1 : -1, 0, 0);
      }
    }
  }

  endSpecialAbility() {
    this.specialActive = false;
    this.specialActiveTimer = 0;

    this.sprite.material.color.setHex(0xffffff);

    if (this.classType === 'warrior' && this.spinRing) {
      this.group.remove(this.spinRing);
      this.spinRing = null;
    } else if (this.classType === 'valkyrie') {
      const origColor = this.classType === 'warrior' ? 0xff3366 :
                         this.classType === 'wizard' ? 0x33ccff :
                         this.classType === 'valkyrie' ? 0xffcc00 : 0x33ff66;
      this.ringMesh.material.color.setHex(origColor);
      this.ringMesh.material.opacity = 0.4;
    }
  }

  createDashTrailParticles() {
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const mat = new THREE.MeshBasicMaterial({ color: 0x33ff66, transparent: true, opacity: 0.8 });
    const trail = new THREE.Mesh(geo, mat);
    
    // Position offset behind player
    trail.position.copy(this.group.position);
    trail.position.y += 0.4 + (Math.random() - 0.5) * 0.2;
    this.scene.add(trail);

    const startTime = Date.now();
    const pAnim = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > 350) {
        this.scene.remove(trail);
      } else {
        trail.scale.multiplyScalar(0.92);
        requestAnimationFrame(pAnim);
      }
    };
    pAnim();
  }

  addCombo() {
    this.comboCount++;
    this.comboTimer = this.comboCooldown;
  }

  getScoreMultiplier() {
    return Math.min(5.0, 1.0 + Math.floor(this.comboCount / 5) * 0.5);
  }

  destroy() {
    if (this.spinRing) {
      this.group.remove(this.spinRing);
      this.spinRing = null;
    }
    this.scene.remove(this.group);
    this.physicsWorld.removeBody(this.body);
  }
}
