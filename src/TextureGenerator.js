import * as THREE from 'three';

/**
 * Default textures defined as grids of characters and color maps.
 * Exported so that the level/texture editor can inspect, edit, and load them.
 */
export const DEFAULT_TEXTURES = {
  warrior: {
    grid: [
      "      ....      ",
      "     .xxxx.     ",
      "    .xxxxxx.    ",
      "    .RxxxxR.    ",
      "    .RRxxRR.    ",
      "    .RRRRRR.    ",
      "     .o  o.     ",
      "    .R====R.    ",
      "   .RRR==RRR.   ",
      "  .RRRR==RRRR.  ",
      "  .RRR.SS.RRR.  ",
      "   .R.SSSS.R.   ",
      "     .SSSS.     ",
      "     .s..s.     ",
      "     .s  s.     ",
      "     ss  ss     "
    ],
    colorMap: {
      '.': '#220000', // Border
      'x': '#ff3366', // Red Armor Accent
      'R': '#cc0033', // Deep Red Plate
      'o': '#ffcc99', // Face Skin
      '=': '#ffffff', // Steel Visor
      'S': '#888899', // Shield
      's': '#443333'  // Boots
    }
  },
  wizard: {
    grid: [
      "      ....      ",
      "      .bb.      ",
      "     .bbbb.     ",
      "     .bbbb.     ",
      "    .bbbbbb.    ",
      "   .bbbbbbbb.   ",
      "     .o  o.     ",
      "    .bbbbbb.    ",
      "   .Wbbbbbb.    ",
      "  .WWbbbbbb.    ",
      "  .W.bbbbbb.    ",
      "   .bbbbbb.     ",
      "    .bbbb.      ",
      "    .s..s.      ",
      "    .s  s.      ",
      "    ss  ss      "
    ],
    colorMap: {
      '.': '#000022', // Border
      'b': '#33ccff', // Light Blue Robe
      'o': '#ffcc99', // Face Skin
      'W': '#ffcc00', // Gold Staff
      's': '#332244'  // Shoes
    }
  },
  valkyrie: {
    grid: [
      "      ....      ",
      "     .yyyy.     ",
      "    .yyyyyy.    ",
      "    .wyyyyw.    ",
      "    .wwyyww.    ",
      "     .o  o.     ",
      "    .yyyyyy.    ",
      "   .Syyyyyy.    ",
      "  .SSyyyyyy.    ",
      "  .S.yyyyyy.    ",
      "   .yyyyyy.     ",
      "    .yyyy.      ",
      "    .s..s.      ",
      "    .s  s.      ",
      "    ss  ss      "
    ],
    colorMap: {
      '.': '#222200', // Border
      'y': '#ffcc00', // Gold Armor
      'w': '#ffffff', // Winged Helmet accents
      'o': '#ffcc99', // Face Skin
      'S': '#cccccc', // Shield/Sword Steel
      's': '#444433'  // Boots
    }
  },
  elf: {
    grid: [
      "      ....      ",
      "     .gggg.     ",
      "     .gggg.     ",
      "    .gggggg.    ",
      "    .gggggg.    ",
      "     .o  o.     ",
      "    .gggggg.    ",
      "   .gggggggg.   ",
      "  .Bgggggggg.   ",
      "  .BBggggggg.   ",
      "   .ggggggg.    ",
      "    .ggggg.     ",
      "    .s..s.      ",
      "    .s  s.      ",
      "    ss  ss      "
    ],
    colorMap: {
      '.': '#002200', // Border
      'g': '#33ff66', // Green Cloak
      'o': '#ffcc99', // Skin
      'B': '#996633', // Wooden Bow
      's': '#223311'  // Shoes
    }
  },
  enemy: {
    grid: [
      "     ......     ",
      "    .pppppp.    ",
      "   .pppppppp.   ",
      "  .pppppppppp.  ",
      "  .p r  r  p.  ",
      "  .pppppppppp.  ",
      "  .pppppppppp.  ",
      "  .pppppppppp.  ",
      "   .pppppppp.   ",
      "   .p.p.p.p.    ",
      "   .p p p p.    ",
      "   .p p p p.    ",
      "   .  . .  .    ",
      "   .  . .  .    ",
      "   .  . .  .    ",
      "    ..   ..     "
    ],
    colorMap: {
      '.': '#110022', // Border
      'p': '#cc33ff', // Purple ghost body
      'r': '#ff0033'  // Glowing red eyes
    }
  },
  key: {
    grid: [
      "      ....      ",
      "     .yyyy.     ",
      "    .y    y.    ",
      "    .y    y.    ",
      "     .yyyy.     ",
      "      .yy.      ",
      "      .yy.      ",
      "      .yy.      ",
      "      .yyy.     ",
      "      .yy.      ",
      "      .yyy.     ",
      "      .yy.      ",
      "      ....      ",
      "                ",
      "                ",
      "                "
    ],
    colorMap: {
      '.': '#443300',
      'y': '#ffcc00'
    }
  },
  potion: {
    grid: [
      "      ....      ",
      "      .ww.      ",
      "      .ww.      ",
      "     .wwww.     ",
      "    .wbbbbw.    ",
      "   .wbbbbbbw.   ",
      "   .wbbbbbbw.   ",
      "   .wbbbbbbw.   ",
      "   .wbbbbbbw.   ",
      "    .wwwwww.    ",
      "     ......     ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                "
    ],
    colorMap: {
      '.': '#001122',
      'w': '#ffffff', // Glass frame
      'b': '#33ccff'  // Blue magic elixir
    }
  },
  food: {
    grid: [
      "      ....      ",
      "     .bbbb.     ",
      "    .bbbbbb.    ",
      "    .bbbbbb.    ",
      "    .bbbbbb.    ",
      "     .bbbb.     ",
      "      .ww.      ",
      "      .ww.      ",
      "     .wwww.     ",
      "     .w  w.     ",
      "      ....      ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                "
    ],
    colorMap: {
      '.': '#331100',
      'b': '#996633', // Brown roasted meat
      'w': '#ffffff'  // Bone
    }
  },
  wall: {
    grid: [
      "################",
      "#bbbbbbbbbbbbbb#",
      "#bbbbbbbbbbbbbb#",
      "################",
      "#bbbbbb#bbbbbbb#",
      "#bbbbbb#bbbbbbb#",
      "################",
      "#bbbbbbbbbbbbbb#",
      "#bbbbbbbbbbbbbb#",
      "################",
      "#bbbbbb#bbbbbbb#",
      "#bbbbbb#bbbbbbb#",
      "################",
      "#bbbbbbbbbbbbbb#",
      "#bbbbbbbbbbbbbb#",
      "################"
    ],
    colorMap: {
      '#': '#222233', // Mortar lines
      'b': '#44445c'  // Stone bricks
    }
  },
  floor: {
    grid: [
      "################",
      "#ffffffffffffff#",
      "#ffffffffffffff#",
      "#ffffffffffffff#",
      "#ffffffffffffff#",
      "#ffffffffffffff#",
      "#ffffffffffffff#",
      "#ffffffffffffff#",
      "#ffffffffffffff#",
      "#ffffffffffffff#",
      "#ffffffffffffff#",
      "#ffffffffffffff#",
      "#ffffffffffffff#",
      "#ffffffffffffff#",
      "#ffffffffffffff#",
      "################"
    ],
    colorMap: {
      '#': '#0f0f1c', // Grid borders
      'f': '#17172b'  // Stone tile face
    }
  },
  spawner: {
    grid: [
      "################",
      "#bbbbbbbbbbbbbb#",
      "#bbgbbbbbbgbbbb#",
      "#bgggbbbbgggbbb#",
      "#bbgbbbbbbgbbbb#",
      "#bbbbbbbbbbbbbb#",
      "#bbbbbbbbbbbbbb#",
      "################",
      "#bbbbbbbbbbbbbb#",
      "#bbgbbbbbbgbbbb#",
      "#bgggbbbbgggbbb#",
      "#bbgbbbbbbgbbbb#",
      "#bbbbbbbbbbbbbb#",
      "#bbbbbbbbbbbbbb#",
      "################",
      "################"
    ],
    colorMap: {
      '#': '#331133', // Outer metal
      'b': '#552255', // Purple dark column
      'g': '#ff33ff'  // Glowing purple glyphs
    }
  },
  door: {
    grid: [
      "################",
      "#dddddddddddddd#",
      "#d  dd d d d  d#",
      "#dddddddddddddd#",
      "#d  d   g   d  d#",
      "#d  d  ggg  d  d#",
      "#d  d   g   d  d#",
      "#dddddddddddddd#",
      "#d  d       d  d#",
      "#d  d       d  d#",
      "################"
    ],
    colorMap: {
      '#': '#332211',
      'd': '#8b5a2b', // Wood color
      'g': '#ffcc00'  // Gold lock
    }
  },
  chest: {
    grid: [
      "      ....      ",
      "     .yyyy.     ",
      "    .ybbbbby.    ",
      "    .yBgbBby.    ",
      "    .ybbbbby.    ",
      "    .yyyyyyy.    ",
      "    .y     y.    ",
      "    .y     y.    ",
      "     .......     "
    ],
    colorMap: {
      '.': '#221100',
      'y': '#ffcc00', // Gold trim
      'b': '#a0522d', // Wood body
      'B': '#4a2511', // Shadows
      'g': '#ffcc00'  // Gold lock latch
    }
  },
  death: {
    grid: [
      "     ......     ",
      "    .kkkkkk.    ",
      "   .kkwwkkkk.   ",
      "  .kkwWwWwkkk.  ",
      "  .kkWwWwWkkk.  ",
      "  .kkkrrrkkkk.  ",
      "  .kkkwwkkkkk.  ",
      "   .kkkkkkkk.   ",
      "   .kkkkkkkk.   ",
      "    ..kkkk..    ",
      "      ....      "
    ],
    colorMap: {
      '.': '#000000',
      'k': '#1a1a1a', // Black cowl
      'w': '#ffffff', // Skull bone
      'W': '#bbbbbb', // Skull shading
      'r': '#ff0033'  // Crimson eyes
    }
  },
  thief: {
    grid: [
      "      ....      ",
      "     .gggg.     ",
      "    .goooog.    ",
      "    .gogggog.   ",
      "     .oooo.     ",
      "    .bbbbbb.    ",
      "   .bbLbbLbb.   ",
      "  .bbbLLLLbbb.  ",
      "   .bbbbbbbb.   ",
      "    .s.  .s.    ",
      "    ss    ss    "
    ],
    colorMap: {
      '.': '#051105',
      'g': '#2e5c1e', // Thief hood
      'o': '#ffcc99', // Skin
      'b': '#693f1d', // Leather vest
      'L': '#a0522d', // Sack of loot
      's': '#111111'  // Shoes
    }
  },
  exit: {
    grid: [
      "      ....      ",
      "    ..vvvv..    ",
      "   .vvvvvvvv.   ",
      "  .vvvVVVVvvv.  ",
      " .vvVVVVVVVVvv. ",
      " .vVVVXXXXVVVv. ",
      ".vVVVXX  XXVVVv.",
      ".vVVVX    XVVVv.",
      ".vVVVX    XVVVv.",
      ".vVVVXX  XXVVVv.",
      " .vVVVXXXXVVVv. ",
      " .vvVVVVVVVVvv. ",
      "  .vvvVVVVvvv.  ",
      "   .vvvvvvvv.   ",
      "    ..vvvv..    ",
      "      ....      "
    ],
    colorMap: {
      '.': '#000000',
      'v': '#330066', // Deep purple
      'V': '#cc33ff', // Bright purple
      'X': '#ffccff'  // Center white glow
    }
  },
  torch: {
    grid: [
      "    ..ffff..    ",
      "   .ffYYYYff.   ",
      "  .ffYYYYYYff.  ",
      "  .fYYWWWWYYf.  ",
      "  .fYYWwwWYYf.  ",
      "  .fYYWwwWYYf.  ",
      "  .ffYWWWWYff.  ",
      "   .ffYYYYff.   ",
      "    ..ffff..    ",
      "     .ssss.     ",
      "     .ssss.     ",
      "     .ssss.     ",
      "      .ss.      ",
      "      .ss.      ",
      "      .ss.      ",
      "      ....      "
    ],
    colorMap: {
      '.': '#110500',
      'f': '#ff3300',
      'Y': '#ff9900',
      'W': '#ffcc00',
      'w': '#ffffff',
      's': '#665544'
    }
  },
  blood: {
    grid: [
      "                ",
      "     ..         ",
      "    .rr.   ..   ",
      "   .rrrr. .r.   ",
      "  .rrdddrr.rr.  ",
      "  .rdddddrr.    ",
      "   .rddddr.     ",
      "   .rrddrr.     ",
      "    .rrrrr.     ",
      "     .rrr.      ",
      "   .. .r.       ",
      "  .r.  .        ",
      "  ..            ",
      "                ",
      "                ",
      "                "
    ],
    colorMap: {
      '.': '#330000',
      'r': '#990000',
      'd': '#dd0808'
    }
  },
  skulls: {
    grid: [
      "    ........    ",
      "   .wwwwwwww.   ",
      "  .wwwwwwwwww.  ",
      " .wwxxwwxxwwww. ",
      " .wwxxwwxxwwww. ",
      " .wwwwwwwwwwww. ",
      "  .wwwxxwwwxx.  ",
      "   .w w w w.    ",
      "    ........    ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                "
    ],
    colorMap: {
      '.': '#222222',
      'w': '#e5e5d8',
      'x': '#050505'
    }
  },
  banner: {
    grid: [
      "    ........    ",
      "   .yyyyyyyy.   ",
      "  .yrrrrrrrry.  ",
      "  .yrryyyyrry.  ",
      "  .yrryyyyrry.  ",
      "  .yrryyyyrry.  ",
      "  .yrryyyyrry.  ",
      "  .yrrrrrrrry.  ",
      "  .yrrrrrrrry.  ",
      "  .yrrrrrrrry.  ",
      "  .yrrrrrrrry.  ",
      "  .yrrrrrrrry.  ",
      "   .yrrrrrry.   ",
      "    .yrrrry.    ",
      "     .yrry.     ",
      "      ....      "
    ],
    colorMap: {
      '.': '#111111',
      'y': '#ffcc00',
      'r': '#990022'
    }
  },
  grate: {
    grid: [
      "################",
      "#dddddddddddddd#",
      "#d============d#",
      "#d#d#d#d#d#d#d#d#",
      "#d#d#d#d#d#d#d#d#",
      "#d============d#",
      "#d#d#d#d#d#d#d#d#",
      "#d#d#d#d#d#d#d#d#",
      "#d============d#",
      "#d#d#d#d#d#d#d#d#",
      "#d#d#d#d#d#d#d#d#",
      "#d============d#",
      "#d#d#d#d#d#d#d#d#",
      "#d#d#d#d#d#d#d#d#",
      "#dddddddddddddd#",
      "################"
    ],
    colorMap: {
      '#': '#222222',
      'd': '#443322',
      '=': '#8b5a2b'
    }
  },
  web: {
    grid: [
      "w      w      w ",
      " w     w     w  ",
      "  w    w    w   ",
      "   w   w   w    ",
      "    w  w  w     ",
      "     w w w      ",
      "      www       ",
      "wwwwwwwwwwwwwwww",
      "      www       ",
      "     w w w      ",
      "    w  w  w     ",
      "   w   w   w    ",
      "  w    w    w   ",
      " w     w     w  ",
      "w      w      w ",
      "                "
    ],
    colorMap: {
      'w': 'rgba(200, 200, 210, 0.45)'
    }
  },
  bones: {
    grid: [
      "                ",
      "    ..     ..   ",
      "   .ww.   .ww.  ",
      "   .w.w. .w.w.  ",
      "    .w.www.w.   ",
      "     .wwwww.    ",
      "    .w.www.w.   ",
      "   .w.w. .w.w.  ",
      "   .ww.   .ww.  ",
      "    ..     ..   ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                ",
      "                "
    ],
    colorMap: {
      '.': '#333333',
      'w': '#f3f4f6'
    }
  },
  grunt: {
    grid: [
      "      ....      ",
      "     .gggg.     ",
      "    .gggggg.    ",
      "   .ggo  ogg.   ",
      "   .gggggggg.   ",
      "    .ggrrgg.    ",
      "   ..rrrrrr..   ",
      "  .r.rrrrrr.r.  ",
      "  .r.rrrrrr.r.  ",
      "   .rrrrrrrr.   ",
      "    .rrrrrr.    ",
      "    .bb..bb.    ",
      "    .b    b.    ",
      "    bb    bb    "
    ],
    colorMap: {
      '.': '#112200',
      'g': '#33aa33',
      'o': '#ff3300',
      'r': '#995522',
      'b': '#222222'
    }
  },
  demon: {
    grid: [
      "    .      .    ",
      "    ..    ..    ",
      "   .rr.  .rr.   ",
      "  .rrrr..rrrr.  ",
      " .rrrrrrrrrrrr. ",
      " .rr y  y  rrr. ",
      " .rrrrrrrrrrrr. ",
      "  .rrrrrrrrrr.  ",
      "   .rrrrrrrr.   ",
      "  .wwrrrrrrww.  ",
      " .wwwrrrrrrwww. ",
      " .ww.rrrrrr.ww. ",
      "     .rrrr.     ",
      "     .s..s.     ",
      "     ss  ss     "
    ],
    colorMap: {
      '.': '#220000',
      'r': '#ff3300',
      'y': '#ffcc00',
      'w': '#550000',
      's': '#111111'
    }
  },
  sorcerer: {
    grid: [
      "     ......     ",
      "    .cccccc.    ",
      "   .ccwccwcc.   ",
      "  .cccwccwccc.  ",
      "  .cccssssccc.  ",
      "   .ccoooccc.   ",
      "   .cccssscc.   ",
      "  .cccssssccc.  ",
      " .ccccsssscccc. ",
      " .ccc.ssss.ccc. ",
      "  .c.ssssss.c.  ",
      "     .ssss.     ",
      "     .bb..bb.   ",
      "     bb    bb   "
    ],
    colorMap: {
      '.': '#002222',
      'c': '#00ffff',
      'w': '#ffffff',
      's': '#4b0082',
      'o': '#ffcc99',
      'bb': '#111111'
    }
  }
};

class TextureGenerator {
  constructor() {
    this.overrides = {};
    this.loadOverridesFromStorage();
  }

  /**
   * Load customized textures from local storage if present
   */
  loadOverridesFromStorage() {
    try {
      const stored = localStorage.getItem('gauntlet_custom_textures');
      if (stored) {
        this.overrides = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Could not parse gauntlet_custom_textures from localStorage", e);
    }
  }

  /**
   * Get the active texture configuration (override or default)
   */
  getTextureConfig(name) {
    if (this.overrides[name]) {
      return this.overrides[name];
    }
    return DEFAULT_TEXTURES[name];
  }

  /**
   * Helper to convert a pixel-string grid into a texture
   * @param {string[]} grid - Array of strings representing pixel rows
   * @param {Object} colorMap - Maps characters to CSS color values
   * @param {number} size - Resolution of the canvas (default 64x64)
   */
  createPixelTexture(grid, colorMap, size = 64) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const rows = grid.length;
    const cols = grid[0].length;
    const pixelWidth = size / cols;
    const pixelHeight = size / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const char = grid[r][c];
        if (char !== ' ' && colorMap[char]) {
          ctx.fillStyle = colorMap[char];
          ctx.fillRect(c * pixelWidth, r * pixelHeight, pixelWidth + 0.5, pixelHeight + 0.5);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  getWarriorTexture() {
    const config = this.getTextureConfig('warrior');
    return this.createPixelTexture(config.grid, config.colorMap);
  }

  getWizardTexture() {
    const config = this.getTextureConfig('wizard');
    return this.createPixelTexture(config.grid, config.colorMap);
  }

  getValkyrieTexture() {
    const config = this.getTextureConfig('valkyrie');
    return this.createPixelTexture(config.grid, config.colorMap);
  }

  getElfTexture() {
    const config = this.getTextureConfig('elf');
    return this.createPixelTexture(config.grid, config.colorMap);
  }

  getEnemyTexture() {
    const config = this.getTextureConfig('enemy');
    return this.createPixelTexture(config.grid, config.colorMap);
  }

  getKeyTexture() {
    const config = this.getTextureConfig('key');
    return this.createPixelTexture(config.grid, config.colorMap);
  }

  getPotionTexture() {
    const config = this.getTextureConfig('potion');
    return this.createPixelTexture(config.grid, config.colorMap);
  }

  getFoodTexture() {
    const config = this.getTextureConfig('food');
    return this.createPixelTexture(config.grid, config.colorMap);
  }

  getWallTexture() {
    const config = this.getTextureConfig('wall');
    return this.createPixelTexture(config.grid, config.colorMap);
  }

  getFloorTexture() {
    const config = this.getTextureConfig('floor');
    const texture = this.createPixelTexture(config.grid, config.colorMap);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  getSpawnerTexture() {
    const config = this.getTextureConfig('spawner');
    return this.createPixelTexture(config.grid, config.colorMap);
  }

  getDoorTexture() {
    const config = this.getTextureConfig('door');
    return this.createPixelTexture(config.grid, config.colorMap);
  }

  getChestTexture() {
    const config = this.getTextureConfig('chest');
    return this.createPixelTexture(config.grid, config.colorMap);
  }

  getDeathTexture() {
    const config = this.getTextureConfig('death');
    return this.createPixelTexture(config.grid, config.colorMap);
  }

  getThiefTexture() {
    const config = this.getTextureConfig('thief');
    return this.createPixelTexture(config.grid, config.colorMap);
  }

  getExitTexture() {
    const config = this.getTextureConfig('exit');
    return this.createPixelTexture(config.grid, config.colorMap);
  }

  getTorchTexture() {
    const config = this.getTextureConfig('torch');
    return this.createPixelTexture(config.grid, config.colorMap);
  }

  getBloodTexture() {
    const config = this.getTextureConfig('blood');
    return this.createPixelTexture(config.grid, config.colorMap);
  }

  getSkullsTexture() {
    const config = this.getTextureConfig('skulls');
    return this.createPixelTexture(config.grid, config.colorMap);
  }

  getBannerTexture() {
    const config = this.getTextureConfig('banner');
    return this.createPixelTexture(config.grid, config.colorMap);
  }

  getGrateTexture() {
    const config = this.getTextureConfig('grate');
    return this.createPixelTexture(config.grid, config.colorMap);
  }

  getWebTexture() {
    const config = this.getTextureConfig('web');
    return this.createPixelTexture(config.grid, config.colorMap);
  }

  getBonesTexture() {
    const config = this.getTextureConfig('bones');
    return this.createPixelTexture(config.grid, config.colorMap);
  }

  getGruntTexture() {
    const config = this.getTextureConfig('grunt');
    return this.createPixelTexture(config.grid, config.colorMap);
  }

  getDemonTexture() {
    const config = this.getTextureConfig('demon');
    return this.createPixelTexture(config.grid, config.colorMap);
  }

  getSorcererTexture() {
    const config = this.getTextureConfig('sorcerer');
    return this.createPixelTexture(config.grid, config.colorMap);
  }

  getProjectileTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#ffcc00');
    grad.addColorStop(0.7, '#ff3300');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }
}

export const textureGenerator = new TextureGenerator();
