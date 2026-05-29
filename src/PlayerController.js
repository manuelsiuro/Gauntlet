import * as THREE from 'three';

/**
 * PlayerController handles mouse & keyboard input, translates it into physics velocities,
 * projects the mouse to 3D space for precision firing, and handles firing cooldowns.
 */
export class PlayerController {
  /**
   * @param {THREE.Camera} camera
   * @param {THREE.WebGLRenderer} renderer
   * @param {Hero} hero
   * @param {ProjectileManager} projectileManager
   */
  constructor(camera, renderer, hero, projectileManager) {
    this.camera = camera;
    this.renderer = renderer;
    this.hero = hero;
    this.projectileManager = projectileManager;

    // Keys state
    this.keys = {
      w: false, a: false, s: false, d: false,
      ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
      space: false
    };

    // Shooting cooldown (class-specific)
    this.fireTimer = 0;
    this.fireCooldown = this.hero.classType === 'elf' ? 180 :
                        this.hero.classType === 'wizard' ? 240 :
                        this.hero.classType === 'warrior' ? 280 : 320; // Valkyrie slowest but hard hits

    // Mouse targeting setup
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5); // Plane at y=0.5
    this.lastMoveDir = new THREE.Vector3(0, 0, 1); // Default facing down (towards screen)
    
    // Inactivity / Idle Time Tracker (for safety exit gates)
    this.idleTime = 0;

    // Binding events
    this.onKeyDownRef = (e) => this.handleKeyDown(e);
    this.onKeyUpRef = (e) => this.handleKeyUp(e);
    this.onMouseMoveRef = (e) => this.handleMouseMove(e);
    this.onMouseDownRef = (e) => this.handleMouseDown(e);
    this.onContextMenuRef = (e) => {
      if (!this.hero.isDead) e.preventDefault();
    };

    window.addEventListener('keydown', this.onKeyDownRef);
    window.addEventListener('keyup', this.onKeyUpRef);
    window.addEventListener('mousemove', this.onMouseMoveRef);
    window.addEventListener('mousedown', this.onMouseDownRef);
    window.addEventListener('contextmenu', this.onContextMenuRef);
  }

  handleKeyDown(e) {
    if (this.hero.isDead) return;

    if (e.key === 'w' || e.key === 'W') this.keys.w = true;
    if (e.key === 'a' || e.key === 'A') this.keys.a = true;
    if (e.key === 's' || e.key === 'S') this.keys.s = true;
    if (e.key === 'd' || e.key === 'D') this.keys.d = true;

    if (e.key === 'ArrowUp') this.keys.ArrowUp = true;
    if (e.key === 'ArrowDown') this.keys.ArrowDown = true;
    if (e.key === 'ArrowLeft') this.keys.ArrowLeft = true;
    if (e.key === 'ArrowRight') this.keys.ArrowRight = true;

    if (e.key === ' ') this.keys.space = true;
    
    // Potion activation
    if (e.key === 'e' || e.key === 'E' || e.key === 'Shift') {
      this.triggerPotionUse();
    }

    // Special Ability activation
    if (e.key === 'q' || e.key === 'Q') {
      this.triggerSpecialAbility();
    }
  }

  handleKeyUp(e) {
    if (e.key === 'w' || e.key === 'W') this.keys.w = false;
    if (e.key === 'a' || e.key === 'A') this.keys.a = false;
    if (e.key === 's' || e.key === 'S') this.keys.s = false;
    if (e.key === 'd' || e.key === 'D') this.keys.d = false;

    if (e.key === 'ArrowUp') this.keys.ArrowUp = false;
    if (e.key === 'ArrowDown') this.keys.ArrowDown = false;
    if (e.key === 'ArrowLeft') this.keys.ArrowLeft = false;
    if (e.key === 'ArrowRight') this.keys.ArrowRight = false;

    if (e.key === ' ') this.keys.space = false;
  }

  handleMouseMove(e) {
    // Convert screen coordinates to normalized device coordinates (-1 to +1)
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  handleMouseDown(e) {
    if (this.hero.isDead) return;
    if (e.button === 0) { // Left-click to shoot
      this.shootTowardsMouse();
    } else if (e.button === 2) { // Right-click to trigger Special
      e.preventDefault();
      this.triggerSpecialAbility();
    }
  }

  /**
   * Get target 3D coordinate on plane from current screen cursor position
   */
  getMouseWorldPosition() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const target = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, target);
    return target;
  }

  shootTowardsMouse() {
    if (this.fireTimer < this.fireCooldown) return;
    
    const mousePos = this.getMouseWorldPosition();
    const playerPos = this.hero.group.position.clone();
    playerPos.y = 0.5; // Fire from waist level

    const dir = new THREE.Vector3().subVectors(mousePos, playerPos);
    dir.y = 0; // Move strictly horizontal
    dir.normalize();

    if (dir.lengthSq() > 0) {
      this.fireTimer = 0;
      this.projectileManager.spawnProjectile(playerPos, dir, this.hero.damage);
    }
  }

  shootInMovementDirection() {
    if (this.fireTimer < this.fireCooldown) return;

    this.fireTimer = 0;
    const playerPos = this.hero.group.position.clone();
    playerPos.y = 0.5;

    // Use current facing direction
    this.projectileManager.spawnProjectile(playerPos, this.lastMoveDir, this.hero.damage);
  }

  triggerPotionUse() {
    // Query active entities in game loop context via custom event or global accessor
    const event = new CustomEvent('request-potion-use');
    window.dispatchEvent(event);
  }

  triggerSpecialAbility() {
    if (this.hero && typeof this.hero.useSpecial === 'function') {
      this.hero.useSpecial(this.projectileManager, this.hero.scene);
    }
  }

  /**
   * Translates active inputs to physical velocities and tracks player idle state
   * @param {number} dt - delta time in milliseconds
   */
  update(dt) {
    this.fireTimer += dt;

    if (this.hero.isDead) return;

    // 1. Calculate horizontal movement vectors
    let moveX = 0;
    let moveZ = 0;

    if (this.keys.w || this.keys.ArrowUp) moveZ -= 1;
    if (this.keys.s || this.keys.ArrowDown) moveZ += 1;
    if (this.keys.a || this.keys.ArrowLeft) moveX -= 1;
    if (this.keys.d || this.keys.ArrowRight) moveX += 1;

    const moveVec = new THREE.Vector3(moveX, 0, moveZ);
    const isMoving = moveVec.lengthSq() > 0;
    const isShooting = this.keys.space;

    // Reset idle timer if player performs an action, otherwise accumulate
    if (isMoving || isShooting) {
      this.idleTime = 0;
    } else {
      this.idleTime += dt;
    }
    
    if (isMoving) {
      moveVec.normalize();
      
      // Save last movement vector to face correct direction when idle / firing spacebar
      this.lastMoveDir.copy(moveVec);
      
      // Apply movement speed directly to Cannon.js velocity
      this.hero.body.velocity.x = moveVec.x * this.hero.baseSpeed;
      this.hero.body.velocity.z = moveVec.z * this.hero.baseSpeed;

      // Anim flipping: flip sprite scale based on walk direction
      if (moveVec.x > 0.05) {
        this.hero.sprite.scale.x = 1.5; // Normal right
      } else if (moveVec.x < -0.05) {
        this.hero.sprite.scale.x = -1.5; // Flip left
      }
    } else {
      // Apply deceleration slide friction
      this.hero.body.velocity.x *= 0.75;
      this.hero.body.velocity.z *= 0.75;
    }

    // 2. Keyboard Spacebar firing mechanism (continuous shooting while held)
    if (this.keys.space) {
      this.shootInMovementDirection();
    }
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDownRef);
    window.removeEventListener('keyup', this.onKeyUpRef);
    window.removeEventListener('mousemove', this.onMouseMoveRef);
    window.removeEventListener('mousedown', this.onMouseDownRef);
    window.removeEventListener('contextmenu', this.onContextMenuRef);
  }
}
