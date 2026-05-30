import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Hero } from './Hero';
import { Enemy } from './Enemy';
import { DungeonManager } from './DungeonManager';
import { ProjectileManager } from './ProjectileManager';
import { PlayerController } from './PlayerController';
import { soundManager } from './SoundManager';
import { getLevelMap, getLevelTheme } from './DungeonMaps';
import { textureGenerator } from './TextureGenerator';

/**
 * GameLoop coordinates Three.js and Cannon.js simulation stepping,
 * entities updates, item pickup detection, camera-follow logic,
 * level changes up to 30 levels, and handles UI update events.
 */
export class GameLoop {
  /**
   * @param {HTMLElement} container - DOM parent for canvas
   * @param {Function} updateHudCallback - UI sync callback
   * @param {Function} onGameOverCallback - Game over transition
   * @param {Function} onVictoryCallback - Game victory transition
   */
  constructor(container, updateHudCallback, onGameOverCallback, onVictoryCallback) {
    this.container = container;
    this.updateHud = updateHudCallback;
    this.onGameOver = onGameOverCallback;
    this.onVictory = onVictoryCallback;

    this.isRunning = false;
    this.enemies = [];
    this.timer = new THREE.Timer();
    
    this.fixedTimeStep = 1 / 60; // 60hz physics
    this.maxSubSteps = 3;

    this.currentLevel = 1;
    this.classType = 'warrior';

    // Idle safeties triggers
    this.idleDoorsOpened = false;
    this.idleExitsOpened = false;

    // Special mob spawns timers
    this.deathSpawnTimer = 0;
    this.thiefSpawnTimer = 0;

    this.buildScene();
    this.buildPhysics();

    // Event listener for magic potions
    this.potionUseRef = () => {
      if (this.hero) this.hero.usePotion(this.enemies, this.dungeonManager.spawners);
    };
    window.addEventListener('request-potion-use', this.potionUseRef);

    // Event listener for window resizing
    this.resizeRef = () => this.handleResize();
    window.addEventListener('resize', this.resizeRef);
  }

  buildScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05050a);
    this.scene.fog = new THREE.FogExp2(0x05050a, 0.05); // Atmospheric dark fog

    // Setup camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    this.cameraOffset = new THREE.Vector3(0, 16, 9);
    this.camera.position.copy(this.cameraOffset);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x111122, 1.2);
    this.scene.add(ambientLight);

    // Directional light
    const dirLight = new THREE.DirectionalLight(0x223355, 0.8);
    dirLight.position.set(10, 25, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    this.scene.add(dirLight);
  }

  buildPhysics() {
    this.physicsWorld = new CANNON.World();
    this.physicsWorld.gravity.set(0, -25.0, 0); // Stiffer gravity keeps characters glued to the ground
    this.physicsWorld.solver.iterations = 10;
    this.physicsWorld.solver.tolerance = 0.001;

    // Eliminate default friction to ensure smooth sliding along walls and entities
    this.physicsWorld.defaultContactMaterial.friction = 0.0;
    this.physicsWorld.defaultContactMaterial.restitution = 0.0;
    this.physicsWorld.defaultContactMaterial.contactEquationRelaxation = 4;
    this.physicsWorld.defaultContactMaterial.contactEquationStiffness = 1e6;
  }

  /**
   * Boots the selected class level state
   * @param {string} classType 
   * @param {number} level
   */
  start(classType, level = 1) {
    this.isRunning = true;
    this.classType = classType;
    this.currentLevel = level;

    this.idleDoorsOpened = false;
    this.idleExitsOpened = false;
    this.deathSpawnTimer = 0;
    this.thiefSpawnTimer = 0;

    // Load any fresh texture overrides
    textureGenerator.loadOverridesFromStorage();
    this.timer = new THREE.Timer(); // Reset timer

    this.isPlaytesting = false;
    const playtestMapStr = localStorage.getItem('gauntlet_playtest_map');

    // 1. Build Dungeon using map grid
    this.dungeonManager = new DungeonManager(this.scene, this.physicsWorld);
    let activeTheme = 'classic';

    if (playtestMapStr) {
      try {
        const playtestMap = JSON.parse(playtestMapStr);
        this.dungeonManager.setMapData(playtestMap);
        this.isPlaytesting = true;
        activeTheme = localStorage.getItem('gauntlet_playtest_theme') || 'classic';
        console.log("Playtest sandbox: custom level map loaded. Theme: " + activeTheme);
      } catch (e) {
        console.error("Failed to parse playtest map", e);
        this.dungeonManager.setMapData(getLevelMap(this.currentLevel));
        activeTheme = getLevelTheme(this.currentLevel);
      }
    } else {
      this.dungeonManager.setMapData(getLevelMap(this.currentLevel));
      activeTheme = getLevelTheme(this.currentLevel);
    }
    
    // Apply theme parameters to Three.js environment and DungeonManager materials
    this.applyTheme(activeTheme);
    this.dungeonManager.setTheme(activeTheme);
    this.dungeonManager.buildDungeon();

    // 2. Instantiate Hero
    this.hero = new Hero(this.scene, this.physicsWorld, this.classType, this.dungeonManager.playerStart);

    // 3. Projectiles
    this.projectileManager = new ProjectileManager(this.scene, this.physicsWorld);

    // 4. Input Controller
    this.controller = new PlayerController(this.camera, this.renderer, this.hero, this.projectileManager);

    // Run animation frame
    this.animate(performance.now());
  }

  /**
   * Transition to next level while carrying over player stats and inventory
   */
  loadNextLevel(levelOffset = 1) {
    // Preserve stats
    const stats = {
      health: this.hero.health,
      keys: this.hero.keys,
      potions: this.hero.potions,
      score: this.hero.score
    };

    // Clean up current entities and grid
    if (this.controller) this.controller.destroy();
    if (this.projectileManager) this.projectileManager.clearAll();
    this.enemies.forEach(e => e.destroy());
    this.enemies = [];

    this.dungeonManager.clear();

    // Increment level
    this.currentLevel += levelOffset;
    this.idleDoorsOpened = false;
    this.idleExitsOpened = false;
    this.deathSpawnTimer = 0;
    this.thiefSpawnTimer = 0;

    // Set theme and apply tints
    const nextTheme = getLevelTheme(this.currentLevel);
    this.applyTheme(nextTheme);
    this.dungeonManager.setTheme(nextTheme);

    // Set new map grid
    this.dungeonManager.setMapData(getLevelMap(this.currentLevel));
    this.dungeonManager.buildDungeon();

    // Re-instantiate player at start
    this.hero = new Hero(this.scene, this.physicsWorld, this.classType, this.dungeonManager.playerStart);
    
    // Carry over stats & add small completion bonus (+150 health!)
    this.hero.health = Math.min(9999, stats.health + 150);
    this.hero.keys = stats.keys;
    this.hero.potions = stats.potions;
    this.hero.score = stats.score + 250; // Level completion bonus score

    // Re-bind input
    this.controller = new PlayerController(this.camera, this.renderer, this.hero, this.projectileManager);

    soundManager.speak(`Entering Level ${this.currentLevel}`, true);
  }

  /**
   * Main game tick
   */
  animate(timestamp) {
    if (!this.isRunning) return;

    requestAnimationFrame((t) => this.animate(t));

    this.timer.update(timestamp);
    const dt = Math.min(this.timer.getDelta() * 1000, 100); // Cap frame delta
    const time = this.timer.getElapsed();

    // 1. Step Physics
    if (!this.isRunning) return;
    this.physicsWorld.step(this.fixedTimeStep, dt / 1000, this.maxSubSteps);

    // 2. Update Controller & Player
    if (!this.isRunning) return;
    if (this.controller) this.controller.update(dt);
    if (this.hero) this.hero.update(dt);

    // 3. Update Projectiles (including checking food/poison hits)
    if (!this.isRunning) return;
    if (this.projectileManager && this.dungeonManager) {
      this.projectileManager.update(
        dt, 
        this.dungeonManager.collectibles, 
        (col) => this.dungeonManager.removeCollectible(col)
      );
    }

    // 4. Update Spawners
    if (!this.isRunning) return;
    const playerPos = this.hero ? this.hero.group.position : new THREE.Vector3();
    this.dungeonManager.spawners.forEach(spawner => {
      spawner.update(dt, playerPos, (pos, type, lvl) => this.spawnEnemy(pos, type, lvl));
    });

    // Clean dead spawners
    if (!this.isRunning) return;
    for (let i = this.dungeonManager.spawners.length - 1; i >= 0; i--) {
      const spawner = this.dungeonManager.spawners[i];
      if (spawner.isDead) {
        this.dungeonManager.removeSpawner(spawner);
      }
    }

    // 5. Update & check Enemy entities
    if (!this.isRunning) return;
    const exitPortalPos = this.dungeonManager.exitPortal ? this.dungeonManager.exitPortal.position : null;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (!this.isRunning) break;
      const enemy = this.enemies[i];
      if (!enemy) continue; // Safety guard if array was mutated
      enemy.update(dt, playerPos, exitPortalPos, this.hero, this.projectileManager);

      // Proximity contact damage
      if (this.hero && !this.hero.isDead && !enemy.isDead) {
        const dist = enemy.group.position.distanceTo(playerPos);
        if (dist < 0.9) {
          if (this.hero.specialActive && this.hero.classType === 'valkyrie') {
            // Valkyrie Aegis thorns reflection damage to the enemy
            enemy.takeDamage(120 * (dt / 1000));
          } else {
            const dmg = enemy.damageRate * (dt / 1000);
            this.hero.takeDamage(dmg);
            
            // If Death drains health, track it to check self-vanishing triggers
            if (enemy.isDeathClass) {
              enemy.drainedHealth += dmg;
            }
          }
        }
      }

      // Warrior Iron Spin AoE damage & knockback
      if (this.hero && this.hero.specialActive && this.hero.classType === 'warrior' && !enemy.isDead) {
        const dist = enemy.group.position.distanceTo(playerPos);
        const maxRange = 0.5 + (this.hero.specialActiveTimer / this.hero.specialDuration) * 5.5;
        if (dist < maxRange) {
          enemy.takeDamage(150 * (dt / 1000));
          
          // Apply physical knockback velocity away from player
          const kbDir = new THREE.Vector3().subVectors(enemy.group.position, playerPos);
          kbDir.y = 0;
          kbDir.normalize();
          enemy.body.velocity.x = kbDir.x * 9.5;
          enemy.body.velocity.z = kbDir.z * 9.5;
        }
      }

      // Elf Dash Rush path damage
      if (this.hero && this.hero.specialActive && this.hero.classType === 'elf' && !enemy.isDead) {
        const dist = enemy.group.position.distanceTo(playerPos);
        if (dist < 1.3) {
          enemy.takeDamage(220 * (dt / 1000));
        }
      }

      if (enemy.isDead) {
        enemy.destroy();
        this.enemies.splice(i, 1);
        if (this.hero) {
          this.hero.addCombo();
          const baseReward = enemy.isDeathClass ? 200 : enemy.isThiefClass ? 500 : 10;
          const comboMult = this.hero.getScoreMultiplier();
          this.hero.score += Math.round(baseReward * comboMult);

          // If Thief is killed before escaping, recover the item immediately!
          if (enemy.isThiefClass && enemy.hasStolen && enemy.stolenItem) {
            this.hero.recoverItem(enemy.stolenItem);
          }
        }
      }
    }

    // 6. Spawn Dynamic Special Mobs (Death & Thief) to heighten tension
    if (!this.isRunning) return;
    this.updateSpecialSpawns(dt);

    // 7. Update dungeon traps & collectibles floating animation
    if (!this.isRunning) return;
    this.dungeonManager.update(time, playerPos);

    if (this.hero && !this.hero.isDead) {
      this.checkCollectiblePickups(playerPos);
      this.checkExitPortalReach(playerPos);
      this.checkLockedDoorTouches(playerPos);
      this.checkInactivitySafeguards(dt);
    }

    // 8. Dynamic Camera Follow
    if (!this.isRunning) return;
    if (this.hero) {
      const targetCamPos = playerPos.clone().add(this.cameraOffset);
      this.camera.position.lerp(targetCamPos, 0.08);
      this.camera.lookAt(playerPos.clone().add(new THREE.Vector3(0, 0.5, 0)));
    }

    // 9. Sync HUD UI
    if (!this.isRunning) return;
    if (this.hero) {
      this.updateHud({
        health: Math.max(0, Math.ceil(this.hero.health)),
        keys: this.hero.keys,
        potions: this.hero.potions,
        potionType: this.hero.potionInventory.length > 0 ? this.hero.potionInventory[0] : null,
        score: this.hero.score,
        level: this.currentLevel,
        specialTimer: this.hero.specialTimer,
        specialCooldown: this.hero.specialCooldown,
        specialActive: this.hero.specialActive,
        comboCount: this.hero.comboCount,
        comboMult: this.hero.getScoreMultiplier()
      });
    }

    // 10. Render WebGL
    if (!this.isRunning) return;
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Spawns an enemy into the active room
   */
  spawnEnemy(position, type = 'ghost', spawnerLvl = 1) {
    const enemy = new Enemy(this.scene, this.physicsWorld, position, type, spawnerLvl);
    this.enemies.push(enemy);
  }

  /**
   * Triggers random Death and Thief spawns based on active level and elapsed time
   */
  updateSpecialSpawns(dt) {
    if (this.hero && this.hero.isDead) return;

    // Death Spawns: triggers on Level 4+ every 14 seconds if player is in room
    if (this.currentLevel >= 4) {
      this.deathSpawnTimer += dt;
      if (this.deathSpawnTimer >= 14000) {
        this.deathSpawnTimer = 0;
        
        // Spawn Death offset from player
        const spawnOffset = new THREE.Vector3(
          (Math.random() > 0.5 ? 1 : -1) * (6 + Math.random() * 4),
          0.5,
          (Math.random() > 0.5 ? 1 : -1) * (6 + Math.random() * 4)
        );
        const spawnPos = this.hero.group.position.clone().add(spawnOffset);
        spawnPos.y = 0.5;

        this.spawnEnemy(spawnPos, 'death');
        soundManager.speak("Death has entered the room!", true);
      }
    }

    // Thief Spawns: triggers on Level 6+ every 18 seconds
    if (this.currentLevel >= 6) {
      this.thiefSpawnTimer += dt;
      if (this.thiefSpawnTimer >= 18000) {
        this.thiefSpawnTimer = 0;

        const spawnOffset = new THREE.Vector3(
          (Math.random() > 0.5 ? 1 : -1) * (8 + Math.random() * 4),
          0.5,
          (Math.random() > 0.5 ? 1 : -1) * (8 + Math.random() * 4)
        );
        const spawnPos = this.hero.group.position.clone().add(spawnOffset);
        spawnPos.y = 0.5;

        this.spawnEnemy(spawnPos, 'thief');
        soundManager.speak("The Thief is in the room!", true);
      }
    }
  }

  checkLockedDoorTouches(playerPos) {
    for (let i = this.dungeonManager.doors.length - 1; i >= 0; i--) {
      const door = this.dungeonManager.doors[i];
      const dist = door.position.distanceTo(playerPos);
      if (dist < 1.7) {
        if (this.hero.keys > 0) {
          this.hero.keys -= 1;
          this.dungeonManager.openDoor(door);
          soundManager.speak("Door unlocked.", true);
        }
      }
    }
  }

  /**
   * Triggers safety fallback gates if the player remains completely idle
   */
  checkInactivitySafeguards(dt) {
    if (!this.controller) return;

    const idleMs = this.controller.idleTime;

    // 1. Idle Doors open safeguard: 25 seconds
    if (idleMs >= 25000 && !this.idleDoorsOpened) {
      this.idleDoorsOpened = true;
      this.dungeonManager.openAllDoors();
      soundManager.speak("All doors are now open.", true);
    }

    // 2. Idle Exits open safeguard: 150 seconds
    if (idleMs >= 150000 && !this.idleExitsOpened) {
      this.idleExitsOpened = true;
      this.dungeonManager.convertWallsToExits();
      soundManager.speak("The walls have turned into exits.", true);
    }
  }

  /**
   * Check distance to collect items (Food, keys, potions, chests, poison)
   */
  checkCollectiblePickups(playerPos) {
    for (let i = this.dungeonManager.collectibles.length - 1; i >= 0; i--) {
      const col = this.dungeonManager.collectibles[i];
      const dist = col.position.distanceTo(playerPos);
      if (dist < 1.0) {
        if (col.type === 5) {
          this.hero.heal(400);
        } else if (col.type === 6) {
          this.hero.collectKey();
        } else if (col.type === 7 || col.type === 31 || col.type === 32 || col.type === 33 || col.type === 34) {
          this.hero.collectPotion(col.type);
        } else if (col.type === 9) {
          // Poison! hurts
          this.hero.takePoisonDamage();
        } else if (col.type === 10) {
          // Treasure
          this.hero.collectChest();
        }

        this.dungeonManager.removeCollectible(col);
      }
    }
  }

  /**
   * Checks exit portal reach and triggers level change / skips
   */
  checkExitPortalReach(playerPos) {
    // If playtesting, any exit immediately completes the playtest and triggers victory
    if (this.isPlaytesting) {
      if (this.dungeonManager.allWallsAreExits) {
        this.dungeonManager.wallInstances.forEach(wall => {
          if (wall.position.distanceTo(playerPos) < 1.2) {
            this.triggerVictoryTransition();
          }
        });
        return;
      }
      if (this.dungeonManager.exitPortal) {
        if (this.dungeonManager.exitPortal.position.distanceTo(playerPos) < 1.2) {
          this.triggerVictoryTransition();
        }
      }
      return;
    }

    // If all walls were converted to exits, proximity to any hidden wall position triggers victory
    if (this.dungeonManager.allWallsAreExits) {
      this.dungeonManager.wallInstances.forEach(wall => {
        const dist = wall.position.distanceTo(playerPos);
        if (dist < 1.2) {
          this.triggerVictoryTransition();
        }
      });
      return;
    }

    // Normal exit portals check
    if (this.dungeonManager.exitPortal) {
      const dist = this.dungeonManager.exitPortal.position.distanceTo(playerPos);
      if (dist < 1.2) {
        const portal = this.dungeonManager.exitPortal;
        
        if (portal.isSkip) {
          // Skip exit: skip 2 levels (+3 levels)
          if (this.currentLevel + 3 <= 30) {
            this.loadNextLevel(3);
          } else {
            this.triggerVictoryTransition();
          }
        } else {
          // Normal exit
          if (this.currentLevel + 1 <= 30) {
            this.loadNextLevel(1);
          } else {
            this.triggerVictoryTransition();
          }
        }
      }
    }
  }

  triggerVictoryTransition() {
    this.isRunning = false;
    soundManager.playVictory();
    if (this.onVictory && this.hero) {
      // Pass isPlaytest flag as secondary argument so UI can adapt
      this.onVictory(this.hero.score, this.isPlaytesting);
    }
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  stop() {
    this.isRunning = false;
    
    // Cleanup listeners
    window.removeEventListener('request-potion-use', this.potionUseRef);
    window.removeEventListener('resize', this.resizeRef);

    if (this.controller) this.controller.destroy();
    if (this.projectileManager) this.projectileManager.clearAll();
    if (this.hero) this.hero.destroy();

    this.enemies.forEach(e => e.destroy());
    this.enemies = [];

    if (this.dungeonManager) this.dungeonManager.clear();

    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }

    if (this.renderer && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }

  applyTheme(theme) {
    this.activeTheme = theme;
    
    const themeConfigs = {
      classic: { bg: 0x05050a, fog: 0x05050a, fogDensity: 0.05, light: 0x223355 },
      lava: { bg: 0x150505, fog: 0x150505, fogDensity: 0.06, light: 0xff4422 },
      ice: { bg: 0x050f15, fog: 0x050f15, fogDensity: 0.045, light: 0x66aacc },
      toxic: { bg: 0x051505, fog: 0x051505, fogDensity: 0.055, light: 0x33aa44 }
    };
    
    const config = themeConfigs[theme] || themeConfigs['classic'];
    
    // Update scene properties
    this.scene.background = new THREE.Color(config.bg);
    
    if (this.scene.fog) {
      this.scene.fog.color = new THREE.Color(config.fog);
      this.scene.fog.density = config.fogDensity;
    }
    
    // Find directional light and update color
    this.scene.children.forEach(child => {
      if (child.isDirectionalLight) {
        child.color = new THREE.Color(config.light);
      }
    });
  }
}
