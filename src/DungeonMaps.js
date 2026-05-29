/**
 * DungeonMaps contains the base grid layouts and generates 30 distinct room maps
 * with increasing difficulty, scaling spawner levels, enemy layouts, and item counts.
 * 
 * Grid Key:
 * 0 = Floor
 * 1 = Wall
 * 2 = Ghost Spawner (Level 1)
 * 3 = Player Start
 * 4 = Exit Portal
 * 5 = Destructible Food (+400 Health)
 * 6 = Key
 * 7 = Potion (Detonates screen)
 * 8 = Locked Door (Consumes key)
 * 9 = Poison (Green food, -200 Health)
 * 10 = Treasure Chest (+150 Score)
 * 11 = Trap Plate (Opens hidden walls in 3x3 radius)
 * 12 = Ghost Spawner (Level 2)
 * 13 = Ghost Spawner (Level 3)
 * 14 = Exit Portal (Level Skip - skips 2 levels)
 * 15 = Wall Torch (flickering fire light)
 * 16 = Floor Blood (blood splat decal)
 * 17 = Floor Skulls (skulls debris decal)
 * 18 = Wall Banner (medieval hanging banner)
 * 19 = Floor Grate (rusty iron grate decal)
 * 20 = Floor Cobweb (sticky cobweb decal)
 * 21 = Floor Bones (ribcage/bone debris decal)
 * 22-24 = Grunt Spawner (Levels 1-3)
 * 25-27 = Demon Spawner (Levels 1-3)
 * 28-30 = Sorcerer Spawner (Levels 1-3)
 */

// Base Room Layout 1: The Tutorial / Entry Gates
const mapBase1 = [
  [1, 1, 15, 1, 1, 18, 1, 1, 1, 1, 1, 1, 15, 1, 1, 18, 1, 1, 1, 1],
  [1, 3, 0, 16, 1, 20, 0, 0, 0, 1, 6, 0, 0, 17, 1, 21, 0, 0, 5, 1],
  [1, 0, 15, 0, 8, 0, 1, 1, 0, 8, 1, 1, 1, 0, 8, 0, 1, 1, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 2, 0, 1, 0, 2, 1, 0, 1, 0, 1, 7, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 16, 19, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 15, 1, 1, 8, 1, 1, 0, 1, 0, 1, 0, 1, 1, 8, 1, 15, 0, 1, 1],
  [1, 6, 0, 1, 16, 1, 0, 0, 0, 11,0, 0, 0, 1, 0, 6, 1, 0, 2, 1],
  [1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1],
  [1, 1, 0, 8, 0, 0, 0, 1, 5, 2, 9, 1, 0, 0, 0, 0, 0, 8, 0, 1],
  [1, 5, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1],
  [1, 17, 0, 0, 20, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 0, 1, 1, 1, 1, 8, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 1, 0, 0, 19, 0, 15, 0, 1, 0, 0, 0, 1, 6, 0, 1, 0, 1],
  [1, 0, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1],
  [1, 2, 16, 0, 0, 21, 1, 0, 1, 0, 1, 0, 1, 2, 1, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
  [1, 7, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 4, 1],
  [1, 0, 10,0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

// Base Room Layout 2: The Maze / Narrow Paths
const mapBase2 = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 3, 0, 1, 6, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 6, 1],
  [1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 8, 1],
  [1, 2, 6, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 8, 0, 1, 5, 0, 1],
  [1, 1, 1, 0, 1, 1, 1, 8, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 1, 5, 1, 0, 1, 2, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 8, 0, 1],
  [1, 0, 8, 0, 0, 0, 0, 0, 8, 0, 0, 0, 8, 0, 1, 6, 0, 1, 1, 1],
  [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 7, 1],
  [1, 10,0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 0, 2, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 8, 0, 8, 0, 1, 0, 8, 0, 0, 1, 0, 8, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 8, 1],
  [1, 0, 0, 0, 2, 1, 6, 0, 0, 0, 0, 1, 0, 1, 9, 0, 0, 1, 0, 1],
  [1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 1, 0, 1, 10,9, 5, 1, 0, 1, 0, 8, 0, 0, 0, 1, 0, 1],
  [1, 1, 0, 8, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
  [1, 2, 0, 1, 0, 0, 0, 0, 0, 1, 11,0, 0, 0, 0, 0, 0, 0, 4, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

// Base Room Layout 3: The Cross Gates
const mapBase3 = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 3, 0, 6, 0, 0, 1, 10,5, 1, 1, 6, 10,0, 1, 0, 0, 0, 5, 1],
  [1, 0, 1, 1, 1, 0, 1, 1, 8, 1, 1, 8, 1, 0, 1, 0, 1, 1, 1, 1],
  [1, 0, 1, 2, 1, 0, 1, 6, 0, 1, 1, 0, 1, 0, 1, 0, 1, 2, 6, 1],
  [1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
  [1, 0, 8, 0, 8, 0, 0, 8, 0, 8, 8, 0, 8, 0, 0, 0, 8, 0, 8, 1],
  [1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1],
  [1, 0, 1, 0, 1, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 1, 0, 1, 1],
  [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1],
  [1, 7, 8, 0, 8, 0, 0, 0, 8, 0, 0, 8, 0, 0, 0, 8, 0, 0, 7, 1],
  [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1],
  [1, 0, 1, 0, 1, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 1, 0, 1, 1],
  [1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1],
  [1, 0, 8, 0, 8, 0, 0, 8, 0, 8, 8, 0, 8, 0, 0, 0, 8, 0, 8, 1],
  [1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 0, 1, 1],
  [1, 0, 1, 2, 1, 0, 1, 1, 8, 1, 1, 8, 1, 1, 1, 0, 1, 2, 1, 1],
  [1, 0, 1, 1, 1, 0, 1, 5, 0, 1, 1, 0, 5, 6, 1, 0, 1, 1, 1, 1],
  [1, 5, 0, 0, 0, 0, 1, 10,9, 1, 1, 10,9, 0, 1, 0, 0, 0, 14, 1], // Level skip exits!
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

// Base Room Layout 4: The Arena Onslaught
const mapBase4 = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 3, 0, 0, 6, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 5, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 8, 1, 0, 1, 1, 0, 1, 8, 1, 1, 1, 1, 0, 1],
  [1, 0, 1, 2, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 2, 1, 0, 1],
  [1, 0, 1, 0, 1, 1, 0, 1, 1, 8, 8, 1, 1, 0, 1, 1, 0, 1, 0, 1],
  [1, 0, 8, 0, 8, 1, 0, 8, 0, 0, 0, 0, 8, 0, 1, 8, 0, 8, 0, 1],
  [1, 0, 1, 0, 1, 1, 0, 1, 0, 2, 2, 0, 1, 0, 1, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1],
  [1, 6, 1, 1, 8, 1, 1, 1, 6, 0, 0, 6, 1, 1, 1, 8, 1, 1, 6, 1],
  [1, 0, 1, 1, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 1, 8, 8, 1, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 1, 0, 1, 5, 2, 2, 5, 1, 0, 1, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 8, 1, 0, 8, 0, 0, 0, 0, 8, 0, 1, 8, 0, 8, 0, 1],
  [1, 0, 1, 2, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 2, 1, 0, 1],
  [1, 0, 1, 1, 1, 1, 0, 1, 10,9, 9, 10,1, 0, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 7, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 4, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

// Base Room Layout 5: The Spiral Labyrinth
const mapBase5 = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 3, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 5, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1],
  [1, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10,1, 0, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
  [1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 2, 1, 0, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1],
  [1, 7, 0, 0, 0, 0, 0, 1, 0, 1, 10,1, 0, 1, 6, 0, 1, 0, 1, 1],
  [1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 8, 1, 0, 1, 1, 8, 1, 0, 1, 1],
  [1, 5, 0, 0, 1, 0, 1, 2, 0, 1, 4, 1, 0, 1, 0, 0, 1, 0, 1, 1],
  [1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1],
  [1, 10,1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1],
  [1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 8, 1, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 0, 1, 1],
  [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 8, 1],
  [1, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

// Base Room Layout 6: The Treasury / Trap Plates (Bonus Room)
const mapBase6 = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 3, 0, 6, 1, 10,10,10,1, 10,10,10,1, 10,10,10,1, 0, 5, 1],
  [1, 0, 1, 0, 1, 1, 8, 1, 1, 1, 8, 1, 1, 1, 8, 1, 1, 0, 1, 1],
  [1, 0, 1, 0, 1, 6, 0, 6, 1, 6, 0, 6, 1, 6, 0, 6, 1, 0, 1, 1],
  [1, 0, 1, 0, 1, 1, 8, 1, 1, 1, 8, 1, 1, 1, 8, 1, 1, 0, 1, 1],
  [1, 11,1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11,1, 1],
  [1, 1, 1, 1, 1, 1, 8, 1, 1, 1, 8, 1, 1, 1, 8, 1, 1, 1, 1, 1],
  [1, 10,10,10,1, 6, 0, 6, 1, 6, 0, 6, 1, 6, 0, 6, 1, 10,10,1],
  [1, 1, 8, 1, 1, 1, 8, 1, 1, 1, 8, 1, 1, 1, 8, 1, 1, 1, 8, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 8, 1, 1, 1, 8, 1, 1, 1, 8, 1, 1, 1, 8, 1, 1, 1, 8, 1],
  [1, 10,10,10,1, 6, 0, 6, 1, 6, 0, 6, 1, 6, 0, 6, 1, 10,10,1],
  [1, 1, 1, 1, 1, 1, 8, 1, 1, 1, 8, 1, 1, 1, 8, 1, 1, 1, 1, 1],
  [1, 11,1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11,1, 1],
  [1, 0, 1, 0, 1, 1, 8, 1, 1, 1, 8, 1, 1, 1, 8, 1, 1, 0, 1, 1],
  [1, 0, 1, 0, 1, 6, 0, 6, 1, 6, 0, 6, 1, 6, 0, 6, 1, 0, 1, 1],
  [1, 0, 1, 0, 1, 1, 8, 1, 1, 1, 8, 1, 1, 1, 8, 1, 1, 0, 1, 1],
  [1, 7, 0, 0, 1, 10,10,10,1, 10,10,10,1, 10,10,10,1, 0, 4, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

export const BASE_MAPS = [mapBase1, mapBase2, mapBase3, mapBase4, mapBase5, mapBase6];

/**
 * Returns a cloned level map grid for the given level number (1 to 30)
 * Scales enemy spawner levels, item placements, and introduces special entities.
 * @param {number} level 
 */
export function getLevelMap(level) {
  // Clamp level between 1 and 30
  const lvl = Math.max(1, Math.min(30, level));
  
  // Pick layout base (loops index)
  const baseIndex = (lvl - 1) % BASE_MAPS.length;
  const original = BASE_MAPS[baseIndex];

  // Deep clone grid array
  const mapGrid = original.map(row => [...row]);

  // Adjust placements dynamically based on level progression
  for (let r = 0; r < mapGrid.length; r++) {
    for (let c = 0; c < mapGrid[r].length; c++) {
      let cell = mapGrid[r][c];

      if (cell === 2) {
        // Upgrade normal spawner (Level 1) to Level 2 or Level 3 on higher levels
        let spawnerLvl = 1;
        if (lvl > 18) {
          spawnerLvl = Math.random() > 0.4 ? 3 : 2;
        } else if (lvl > 8) {
          spawnerLvl = Math.random() > 0.5 ? 2 : 1;
        }
        
        // Randomize enemy type based on level progression
        let enemyType = 'ghost';
        const rand = Math.random();
        if (lvl >= 10) {
          // Ghost (40%), Grunt (20%), Demon (20%), Sorcerer (20%)
          if (rand < 0.4) enemyType = 'ghost';
          else if (rand < 0.6) enemyType = 'grunt';
          else if (rand < 0.8) enemyType = 'demon';
          else enemyType = 'sorcerer';
        } else if (lvl >= 6) {
          // Ghost (50%), Grunt (25%), Demon (25%)
          if (rand < 0.5) enemyType = 'ghost';
          else if (rand < 0.75) enemyType = 'grunt';
          else enemyType = 'demon';
        } else if (lvl >= 3) {
          // Ghost (70%), Grunt (30%)
          if (rand < 0.7) enemyType = 'ghost';
          else enemyType = 'grunt';
        }

        // Map to correct grid code
        if (enemyType === 'ghost') {
          mapGrid[r][c] = spawnerLvl === 3 ? 13 : spawnerLvl === 2 ? 12 : 2;
        } else if (enemyType === 'grunt') {
          mapGrid[r][c] = spawnerLvl === 3 ? 24 : spawnerLvl === 2 ? 23 : 22;
        } else if (enemyType === 'demon') {
          mapGrid[r][c] = spawnerLvl === 3 ? 27 : spawnerLvl === 2 ? 26 : 25;
        } else if (enemyType === 'sorcerer') {
          mapGrid[r][c] = spawnerLvl === 3 ? 30 : spawnerLvl === 2 ? 29 : 28;
        }
      }

      // Proactively spawn dynamic special enemies directly on the map start
      // Note: Thief (value 16) and Death (value 15) are instantiated dynamically by the game loop, 
      // but we can spawn initial ones on random floor tiles in higher levels
      if (cell === 0 && Math.random() < 0.015) {
        // Add random items as levels scale up
        if (lvl > 5 && Math.random() < 0.3) {
          mapGrid[r][c] = 10; // Extra Chests
        }
      }
    }
  }

  return mapGrid;
}

/**
 * Returns the designated visual theme name for the campaign level.
 * @param {number} level
 */
export function getLevelTheme(level) {
  const lvl = Math.max(1, Math.min(30, level));
  if (lvl <= 5) return 'classic';
  if (lvl <= 10) return 'toxic';
  if (lvl <= 15) return 'ice';
  if (lvl <= 20) return 'lava';
  if (lvl <= 25) return 'toxic';
  return 'lava';
}
