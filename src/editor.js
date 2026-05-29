import { BASE_MAPS } from './DungeonMaps';
import { DEFAULT_TEXTURES } from './TextureGenerator';

// Active editor navigation state
let activeTab = 'level'; // 'level' or 'texture'

// LEVEL EDITOR STATE
let gridCols = 20;
let gridRows = 20;
let mapGrid = [];
let selectedBrush = 1; // Default to Wall (1)
let isDrawingMap = false;

const BRUSHES = {
  0: { name: 'Floor / Erase', color: '#0f0f1c', text: '' },
  1: { name: 'Solid Wall', color: '#44445c', text: 'W' },
  2: { name: 'Ghost Spawner L1', color: '#5b21b6', text: 'S1' },
  12: { name: 'Ghost Spawner L2', color: '#7c3aed', text: 'S2' },
  13: { name: 'Ghost Spawner L3', color: '#a78bfa', text: 'S3' },
  22: { name: 'Grunt Spawner L1', color: '#991b1b', text: 'G1' },
  23: { name: 'Grunt Spawner L2', color: '#dc2626', text: 'G2' },
  24: { name: 'Grunt Spawner L3', color: '#f87171', text: 'G3' },
  25: { name: 'Demon Spawner L1', color: '#c2410c', text: 'D1' },
  26: { name: 'Demon Spawner L2', color: '#f97316', text: 'D2' },
  27: { name: 'Demon Spawner L3', color: '#fdba74', text: 'D3' },
  28: { name: 'Sorcerer Spawner L1', color: '#065f46', text: 'M1' },
  29: { name: 'Sorcerer Spawner L2', color: '#0d9488', text: 'M2' },
  30: { name: 'Sorcerer Spawner L3', color: '#2dd4bf', text: 'M3' },
  3: { name: 'Hero Start', color: '#eab308', text: 'H' },
  4: { name: 'Exit Portal', color: '#1e1b4b', text: 'X' },
  14: { name: 'Skip Exit', color: '#db2777', text: 'XS' },
  5: { name: 'Food (+400 HP)', color: '#b45309', text: 'F' },
  6: { name: 'Key', color: '#d97706', text: 'K' },
  7: { name: 'Potion (Bomb)', color: '#06b6d4', text: 'P' },
  8: { name: 'Locked Door', color: '#78350f', text: 'D' },
  9: { name: 'Poison Food', color: '#22c55e', text: 'PS' },
  10: { name: 'Treasure Chest', color: '#ca8a04', text: 'C' },
  11: { name: 'Trap Plate', color: '#10b981', text: 'T' },
  15: { name: 'Wall Torch', color: '#f97316', text: 'TL' },
  16: { name: 'Floor Blood', color: '#dc2626', text: 'BL' },
  17: { name: 'Floor Skulls', color: '#9ca3af', text: 'SK' },
  18: { name: 'Wall Banner', color: '#ec4899', text: 'BN' },
  19: { name: 'Floor Grate', color: '#6b7280', text: 'GR' },
  20: { name: 'Floor Cobweb', color: '#cbd5e1', text: 'WB' },
  21: { name: 'Floor Bones', color: '#e5e7eb', text: 'BO' }
};

// TEXTURE EDITOR STATE
let selectedTextureName = 'wall';
let customTextures = {}; // Maps name -> { grid, colorMap }
let activePixelColorChar = '#'; // Active color character selector
let isDrawingPixel = false;

// ----------------------------------------------------
// INITIALIZATION
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Load custom textures from localStorage
  try {
    const stored = localStorage.getItem('gauntlet_custom_textures');
    if (stored) {
      customTextures = JSON.parse(stored);
    }
  } catch (e) {
    console.warn("Failed to load custom textures from localStorage", e);
  }

  // Setup tabs
  const tabLevel = document.getElementById('tab-level-editor');
  const tabTexture = document.getElementById('tab-texture-editor');
  const viewLevel = document.getElementById('level-workspace');
  const viewTexture = document.getElementById('texture-workspace');

  tabLevel.addEventListener('click', () => {
    activeTab = 'level';
    tabLevel.classList.add('active');
    tabTexture.classList.remove('active');
    viewLevel.classList.add('active');
    viewTexture.classList.remove('active');
  });

  tabTexture.addEventListener('click', () => {
    activeTab = 'texture';
    tabTexture.classList.add('active');
    tabLevel.classList.remove('active');
    viewTexture.classList.add('active');
    viewLevel.classList.remove('active');
    // Initialize first load
    loadTexture(selectedTextureName);
  });

  // Init systems
  initLevelEditor();
  initTextureEditor();
});

// ----------------------------------------------------
// LEVEL EDITOR LOGIC
// ----------------------------------------------------
function initLevelEditor() {
  // Populate brush palette UI
  const paletteContainer = document.getElementById('palette-brushes');
  paletteContainer.innerHTML = '';
  
  Object.keys(BRUSHES).forEach(key => {
    const code = parseInt(key);
    const brush = BRUSHES[code];
    
    const div = document.createElement('button');
    div.className = `brush-item ${code === selectedBrush ? 'active' : ''}`;
    div.dataset.code = code;
    
    const colorBlock = document.createElement('div');
    colorBlock.className = 'brush-color';
    colorBlock.style.background = brush.color;
    
    const label = document.createElement('span');
    label.textContent = brush.name;
    
    div.appendChild(colorBlock);
    div.appendChild(label);
    
    div.addEventListener('click', () => {
      document.querySelectorAll('.brush-item').forEach(b => b.classList.remove('active'));
      div.classList.add('active');
      selectedBrush = code;
      
      const activeDesc = document.getElementById('active-tile-desc');
      if (activeDesc) activeDesc.textContent = brush.name;
    });
    
    paletteContainer.appendChild(div);
  });

  // Create default map grid with solid wall borders
  generateDefaultMapGrid(20, 20);

  // Resize button
  document.getElementById('btn-resize-grid').addEventListener('click', () => {
    const colsInput = document.getElementById('grid-cols');
    const rowsInput = document.getElementById('grid-rows');
    const newCols = Math.max(10, Math.min(50, parseInt(colsInput.value) || 20));
    const newRows = Math.max(10, Math.min(50, parseInt(rowsInput.value) || 20));
    
    // Clamp values back in text fields
    colsInput.value = newCols;
    rowsInput.value = newRows;

    resizeGrid(newCols, newRows);
  });

  // File loading
  document.getElementById('btn-load-preset').addEventListener('click', () => {
    const select = document.getElementById('base-map-select');
    const val = select.value;
    if (val) {
      loadPresetMap(parseInt(val) - 1);
    }
  });

  document.getElementById('btn-clear-map').addEventListener('click', () => {
    if (confirm("Are you sure you want to clear the entire grid?")) {
      generateDefaultMapGrid(gridCols, gridRows);
    }
  });

  document.getElementById('btn-generate-maze').addEventListener('click', () => {
    if (confirm("This will clear the grid and generate a random playable maze. Continue?")) {
      generateRandomMaze();
    }
  });

  // Export JSON
  document.getElementById('btn-export-json').addEventListener('click', () => {
    const levelName = document.getElementById('meta-level-name').value || "Custom Dungeon";
    const levelNum = parseInt(document.getElementById('meta-level-num').value) || 1;
    const theme = document.getElementById('meta-theme').value || "classic";

    const data = {
      name: levelName,
      number: levelNum,
      spawnerSpeed: spawnerSpeed,
      theme: theme,
      cols: gridCols,
      rows: gridRows,
      grid: mapGrid
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${levelName.toLowerCase().replace(/\s+/g, '_')}_lvl${levelNum}.json`;
    a.click();
  });

  // Import JSON
  document.getElementById('file-import-json').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (data.grid && data.cols && data.rows) {
          document.getElementById('meta-level-name').value = data.name || "Imported Level";
          document.getElementById('meta-level-num').value = data.number || 1;
          document.getElementById('meta-spawner-speed').value = (data.spawnerSpeed || 1.0).toString();
          
          document.getElementById('grid-cols').value = data.cols;
          document.getElementById('grid-rows').value = data.rows;
          
          if (data.theme) {
            document.getElementById('meta-theme').value = data.theme;
          }
          
          gridCols = data.cols;
          gridRows = data.rows;
          mapGrid = data.grid;

          renderLevelGrid();
        } else {
          alert("Invalid level JSON file structure.");
        }
      } catch (err) {
        alert("Error parsing level JSON file: " + err.message);
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  });

  // Copy JS Array Code
  document.getElementById('btn-copy-code').addEventListener('click', () => {
    let codeStr = "[\n";
    for (let r = 0; r < gridRows; r++) {
      codeStr += `  [${mapGrid[r].join(', ')}]${r < gridRows - 1 ? ',' : ''}\n`;
    }
    codeStr += "]";

    navigator.clipboard.writeText(codeStr).then(() => {
      alert("Grid Javascript 2D array copied to clipboard!");
    });
  });

  // Playtest sandbox launcher
  document.getElementById('btn-playtest').addEventListener('click', () => {
    // Check if player start is present on the grid
    let hasStart = false;
    for (let r = 0; r < gridRows; r++) {
      if (mapGrid[r].includes(3)) {
        hasStart = true;
        break;
      }
    }

    if (!hasStart) {
      alert("Cannot playtest: You must place at least one Player Start (H) tile on the map first!");
      return;
    }

    // Save grid and flags to localStorage
    localStorage.setItem('gauntlet_playtest_map', JSON.stringify(mapGrid));
    localStorage.setItem('gauntlet_playtest_active', 'true');
    
    const playtestClass = document.getElementById('playtest-class').value;
    localStorage.setItem('gauntlet_playtest_class', playtestClass);

    const theme = document.getElementById('meta-theme').value || 'classic';
    localStorage.setItem('gauntlet_playtest_theme', theme);

    // Redirect to main game with playtest flag in query
    window.location.href = 'index.html?playtest=true';
  });

  // Setup grid dragging safety listeners
  document.addEventListener('mouseup', () => {
    isDrawingMap = false;
  });
}

function generateDefaultMapGrid(cols, rows) {
  gridCols = cols;
  gridRows = rows;
  mapGrid = [];

  for (let r = 0; r < gridRows; r++) {
    const row = [];
    for (let c = 0; c < gridCols; c++) {
      // Put walls around borders by default for sandbox safety
      if (r === 0 || r === gridRows - 1 || c === 0 || c === gridCols - 1) {
        row.push(1); // Wall
      } else {
        row.push(0); // Floor
      }
    }
    mapGrid.push(row);
  }

  // Pre-fill a start and exit in center for convenience
  if (gridRows > 4 && gridCols > 4) {
    mapGrid[2][2] = 3; // Hero start
    mapGrid[gridRows - 3][gridCols - 3] = 4; // Exit Portal
  }

  renderLevelGrid();
}

function renderLevelGrid() {
  const container = document.getElementById('level-grid-container');
  container.innerHTML = '';
  container.style.gridTemplateColumns = `repeat(${gridCols}, 26px)`;
  container.style.gridTemplateRows = `repeat(${gridRows}, 26px)`;

  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      const cellValue = mapGrid[r][c];
      const brush = BRUSHES[cellValue] || BRUSHES[0];
      
      const div = document.createElement('div');
      div.className = 'grid-cell';
      div.style.background = brush.color;
      div.textContent = brush.text;
      div.dataset.r = r;
      div.dataset.c = c;
      
      // Paint actions
      div.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDrawingMap = true;
        
        // Right click erases (sets to floor 0)
        if (e.button === 2) {
          applyTileValue(r, c, 0);
        } else {
          applyTileValue(r, c, selectedBrush);
        }
      });
      
      div.addEventListener('mouseenter', () => {
        // Coordinate footer HUD sync
        const coordsSpan = document.getElementById('hover-coords');
        if (coordsSpan) coordsSpan.textContent = `X: ${c}, Y: ${r}`;

        if (isDrawingMap) {
          applyTileValue(r, c, selectedBrush);
        }
      });

      // Disable default right-click menu on the canvas grid
      div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        applyTileValue(r, c, 0);
      });

      container.appendChild(div);
    }
  }
}

function applyTileValue(r, c, value) {
  // If we are placing Player Start (3), remove any other Player Starts to keep it unique
  if (value === 3) {
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        if (mapGrid[row][col] === 3) {
          mapGrid[row][col] = 0;
          updateGridCellVisual(row, col, 0);
        }
      }
    }
  }

  mapGrid[r][c] = value;
  updateGridCellVisual(r, c, value);
}

function updateGridCellVisual(r, c, value) {
  const cell = document.querySelector(`.grid-cell[data-r="${r}"][data-c="${c}"]`);
  if (cell) {
    const brush = BRUSHES[value] || BRUSHES[0];
    cell.style.background = brush.color;
    cell.textContent = brush.text;
  }
}

function resizeGrid(newCols, newRows) {
  const oldGrid = mapGrid;
  mapGrid = [];

  for (let r = 0; r < newRows; r++) {
    const row = [];
    for (let c = 0; c < newCols; c++) {
      // Check if we can copy from the old grid
      if (r < gridRows && c < gridCols) {
        row.push(oldGrid[r][c]);
      } else {
        // Border walls or floors
        if (r === 0 || r === newRows - 1 || c === 0 || c === newCols - 1) {
          row.push(1); // Wall
        } else {
          row.push(0); // Floor
        }
      }
    }
    mapGrid.push(row);
  }

  // If resizing removed walls, ensure borders are intact
  for (let c = 0; c < newCols; c++) {
    mapGrid[0][c] = 1;
    mapGrid[newRows - 1][c] = 1;
  }
  for (let r = 0; r < newRows; r++) {
    mapGrid[r][0] = 1;
    mapGrid[r][newCols - 1] = 1;
  }

  gridCols = newCols;
  gridRows = newRows;
  renderLevelGrid();
}

function loadPresetMap(presetIdx) {
  const preset = BASE_MAPS[presetIdx];
  if (!preset) return;

  gridRows = preset.length;
  gridCols = preset[0].length;

  document.getElementById('grid-cols').value = gridCols;
  document.getElementById('grid-rows').value = gridRows;

  // Deep clone
  mapGrid = preset.map(row => [...row]);
  renderLevelGrid();
}


// ----------------------------------------------------
// TEXTURE EDITOR LOGIC
// ----------------------------------------------------
function initTextureEditor() {
  const select = document.getElementById('texture-select');
  select.innerHTML = '';

  // Populate selection dropdown
  Object.keys(DEFAULT_TEXTURES).forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name.toUpperCase();
    select.appendChild(option);
  });

  select.value = selectedTextureName;

  select.addEventListener('change', (e) => {
    selectedTextureName = e.target.value;
    loadTexture(selectedTextureName);
  });

  // Drawing mouse bindings
  document.addEventListener('mouseup', () => {
    isDrawingPixel = false;
  });

  // Action buttons
  document.getElementById('btn-texture-new').addEventListener('click', () => {
    createNewTexture();
  });

  document.getElementById('btn-texture-save').addEventListener('click', () => {
    saveTextureToStorage();
  });

  document.getElementById('btn-texture-reset').addEventListener('click', () => {
    resetTextureToDefault();
  });

  document.getElementById('btn-texture-export-json').addEventListener('click', () => {
    saveTextureAsJSON();
  });

  document.getElementById('file-texture-import-json').addEventListener('change', (e) => {
    loadTextureFromJSON(e);
  });

  document.getElementById('btn-texture-copy-code').addEventListener('click', () => {
    copyTextureGeneratorCode();
  });

  document.getElementById('btn-palette-add-color').addEventListener('click', () => {
    addPaletteColor();
  });
}

function loadTexture(name) {
  // If overridden exists, load it, otherwise clone default
  let asset = customTextures[name];
  if (!asset) {
    const def = DEFAULT_TEXTURES[name];
    asset = {
      grid: def.grid.map(row => row),
      colorMap: Object.assign({}, def.colorMap)
    };
  }

  // Update DOM active indicators
  const activeName = document.getElementById('active-asset-name');
  const activeDims = document.getElementById('active-asset-dims');
  if (activeName) activeName.textContent = name.toUpperCase();
  
  const rows = asset.grid.length;
  const cols = asset.grid[0].length;
  if (activeDims) activeDims.textContent = `${cols} x ${rows}`;

  // Populate palette editor lists
  renderPaletteEditor(asset.colorMap);

  // Set first color active by default
  const colorKeys = Object.keys(asset.colorMap);
  if (colorKeys.length > 0) {
    activePixelColorChar = colorKeys[0];
  }

  // Build grid canvas
  renderPixelEditorGrid(asset);
  drawPreviewCanvas(asset);
}

function renderPixelEditorGrid(asset) {
  const container = document.getElementById('texture-grid-container');
  container.innerHTML = '';
  
  const rows = asset.grid.length;
  const cols = asset.grid[0].length;

  container.style.gridTemplateColumns = `repeat(${cols}, 20px)`;
  container.style.gridTemplateRows = `repeat(${rows}, 20px)`;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const char = asset.grid[r][c];
      const color = asset.colorMap[char] || 'transparent';
      
      const div = document.createElement('div');
      div.className = 'pixel-cell';
      div.style.background = color;
      div.dataset.r = r;
      div.dataset.c = c;

      div.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDrawingPixel = true;
        if (e.button === 2) {
          // Erase
          applyPixelValue(asset, r, c, ' ');
        } else {
          applyPixelValue(asset, r, c, activePixelColorChar);
        }
      });

      div.addEventListener('mouseenter', () => {
        if (isDrawingPixel) {
          applyPixelValue(asset, r, c, activePixelColorChar);
        }
      });

      div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        applyPixelValue(asset, r, c, ' ');
      });

      container.appendChild(div);
    }
  }
}

function applyPixelValue(asset, r, c, colorChar) {
  // Update grid representation
  const rowArr = asset.grid[r].split('');
  rowArr[c] = colorChar;
  asset.grid[r] = rowArr.join('');

  // Update cell visually
  const cell = document.querySelector(`.pixel-cell[data-r="${r}"][data-c="${c}"]`);
  if (cell) {
    cell.style.background = asset.colorMap[colorChar] || 'transparent';
  }

  // Re-draw canvas preview
  drawPreviewCanvas(asset);
}

function renderPaletteEditor(colorMap) {
  const container = document.getElementById('texture-palette-list');
  container.innerHTML = '';

  Object.keys(colorMap).forEach(char => {
    const color = colorMap[char];

    const row = document.createElement('div');
    row.className = 'palette-row';
    if (char === activePixelColorChar) {
      row.style.borderColor = 'rgb(168, 85, 247)';
      row.style.background = 'rgba(147, 51, 234, 0.15)';
    }

    const charSpan = document.createElement('span');
    charSpan.className = 'char-indicator';
    charSpan.textContent = char;

    const inputColor = document.createElement('input');
    inputColor.type = 'color';
    inputColor.className = 'color-picker-input';
    inputColor.value = color;

    const textHex = document.createElement('span');
    textHex.className = 'color-hex-val';
    textHex.textContent = color.toUpperCase();

    // Select this color to draw
    row.addEventListener('click', (e) => {
      // Prevent selection trigger on color click
      if (e.target === inputColor) return;

      activePixelColorChar = char;
      document.querySelectorAll('.palette-row').forEach(pr => {
        pr.style.borderColor = 'rgba(147, 51, 234, 0.2)';
        pr.style.background = 'rgba(0, 0, 0, 0.3)';
      });
      row.style.borderColor = 'rgb(168, 85, 247)';
      row.style.background = 'rgba(147, 51, 234, 0.15)';
    });

    // Update color selection
    inputColor.addEventListener('input', (e) => {
      const newVal = e.target.value;
      textHex.textContent = newVal.toUpperCase();
      colorMap[char] = newVal;
      
      // Update cell backgrounds dynamically
      const activeAsset = getActiveAsset();
      renderPixelEditorGrid(activeAsset);
      drawPreviewCanvas(activeAsset);
    });

    row.appendChild(charSpan);
    row.appendChild(inputColor);
    row.appendChild(textHex);

    container.appendChild(row);
  });
}

function getActiveAsset() {
  let asset = customTextures[selectedTextureName];
  if (!asset) {
    const def = DEFAULT_TEXTURES[selectedTextureName];
    asset = {
      grid: def.grid.map(row => row),
      colorMap: Object.assign({}, def.colorMap)
    };
    customTextures[selectedTextureName] = asset;
  }
  return asset;
}

function drawPreviewCanvas(asset) {
  const canvas = document.getElementById('preview-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  const rows = asset.grid.length;
  const cols = asset.grid[0].length;
  const pixelW = canvas.width / cols;
  const pixelH = canvas.height / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const char = asset.grid[r][c];
      const color = asset.colorMap[char];
      if (char !== ' ' && color) {
        ctx.fillStyle = color;
        ctx.fillRect(c * pixelW, r * pixelH, pixelW, pixelH);
      }
    }
  }
}

function saveTextureToStorage() {
  const asset = getActiveAsset();
  customTextures[selectedTextureName] = asset;

  try {
    localStorage.setItem('gauntlet_custom_textures', JSON.stringify(customTextures));
    alert(`Success: Texture "${selectedTextureName.toUpperCase()}" committed to game overrides!`);
  } catch (e) {
    alert("Error saving custom textures: " + e.message);
  }
}

function resetTextureToDefault() {
  if (confirm(`Reset texture "${selectedTextureName.toUpperCase()}" back to the default game asset?`)) {
    delete customTextures[selectedTextureName];
    try {
      localStorage.setItem('gauntlet_custom_textures', JSON.stringify(customTextures));
    } catch (e) {}
    loadTexture(selectedTextureName);
    alert("Asset reset to defaults.");
  }
}

function addPaletteColor() {
  const asset = getActiveAsset();
  
  // Prompt user for a character symbol representing the color
  const char = prompt("Enter a single character symbol to represent this color in the grid layout (e.g. 'r', 'g', 'x'):");
  if (!char || char.length !== 1) {
    alert("Invalid symbol. Character must be exactly 1 character long.");
    return;
  }

  if (char === ' ' || asset.colorMap[char]) {
    alert("Symbol already exists in the palette or is reserved!");
    return;
  }

  // Prompt color hex
  const hex = prompt("Enter a CSS hex color code (e.g. '#ff0033'):", "#ffffff");
  if (!hex || !hex.match(/^#[0-9a-fA-F]{6}$/)) {
    alert("Invalid Hex Code. Format must be '#RRGGBB'.");
    return;
  }

  // Register
  asset.colorMap[char] = hex.toLowerCase();
  activePixelColorChar = char;

  renderPaletteEditor(asset.colorMap);
  renderPixelEditorGrid(asset);
  drawPreviewCanvas(asset);
}

function createNewTexture() {
  const name = prompt("Enter a unique name for your custom texture override (e.g. 'lava_wall', 'spawner_mod'):");
  if (!name) return;

  const width = parseInt(prompt("Enter texture width (e.g., 16):", "16")) || 16;
  const height = parseInt(prompt("Enter texture height (e.g., 16):", "16")) || 16;

  // Build blank grid of space characters
  const grid = [];
  for (let r = 0; r < height; r++) {
    grid.push(" ".repeat(width));
  }

  // Default black palette character
  const colorMap = {
    '#': '#000000'
  };

  // Register
  customTextures[name] = { grid, colorMap };

  // Add option to dropdown if not present
  const select = document.getElementById('texture-select');
  let optionExists = false;
  for (let i = 0; i < select.options.length; i++) {
    if (select.options[i].value === name) {
      optionExists = true;
      break;
    }
  }

  if (!optionExists) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name.toUpperCase();
    select.appendChild(option);
  }

  selectedTextureName = name;
  select.value = name;

  loadTexture(name);
}

function saveTextureAsJSON() {
  const asset = getActiveAsset();
  const blob = new Blob([JSON.stringify(asset, null, 2)], { type: 'application/json' });
  
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `texture_${selectedTextureName.toLowerCase()}.json`;
  a.click();
}

function loadTextureFromJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const data = JSON.parse(evt.target.result);
      if (data.grid && data.colorMap) {
        const asset = getActiveAsset();
        asset.grid = data.grid;
        asset.colorMap = data.colorMap;
        
        renderPaletteEditor(asset.colorMap);
        renderPixelEditorGrid(asset);
        drawPreviewCanvas(asset);
        alert("Texture imported successfully.");
      } else {
        alert("Invalid texture JSON schema.");
      }
    } catch (err) {
      alert("Error parsing texture JSON: " + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function copyTextureGeneratorCode() {
  const asset = getActiveAsset();
  
  let code = `const grid = [\n`;
  asset.grid.forEach((row, idx) => {
    code += `  "${row}"${idx < asset.grid.length - 1 ? ',' : ''}\n`;
  });
  code += `];\n`;
  
  code += `const colorMap = {\n`;
  const keys = Object.keys(asset.colorMap);
  keys.forEach((key, idx) => {
    code += `  '${key}': '${asset.colorMap[key]}'${idx < keys.length - 1 ? ',' : ''}\n`;
  });
  code += `};\n`;
  
  code += `return this.createPixelTexture(grid, colorMap);`;

  navigator.clipboard.writeText(code).then(() => {
    alert("Texture code segment copied to clipboard!");
  });
}

function generateRandomMaze() {
  // Clear the grid to walls
  for (let r = 0; r < gridRows; r++) {
    const row = [];
    for (let c = 0; c < gridCols; c++) {
      mapGrid[r][c] = 1; // Start all wall
    }
  }

  // Backtracking DFS to carve out floor paths (cells are carved in 2x2 steps)
  const stack = [];
  const startR = 2;
  const startC = 2;
  mapGrid[startR][startC] = 0;
  stack.push([startR, startC]);

  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1];
    
    // Find unvisited neighbors in distance 2
    const neighbors = [];
    const dirs = [
      [-2, 0], [2, 0], [0, -2], [0, 2]
    ];
    
    dirs.forEach(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;
      if (nr > 0 && nr < gridRows - 1 && nc > 0 && nc < gridCols - 1) {
        if (mapGrid[nr][nc] === 1) {
          neighbors.push([nr, nc, dr, dc]);
        }
      }
    });

    if (neighbors.length > 0) {
      // Pick random neighbor
      const [nr, nc, dr, dc] = neighbors[Math.floor(Math.random() * neighbors.length)];
      // Carve floor through the wall
      mapGrid[r + dr / 2][c + dc / 2] = 0;
      mapGrid[nr][nc] = 0;
      stack.push([nr, nc]);
    } else {
      stack.pop();
    }
  }

  // Ensure start and exit exist
  mapGrid[2][2] = 3; // Hero start
  
  // Make exit area open and place Exit portal
  const exitR = gridRows - 3;
  const exitC = gridCols - 3;
  mapGrid[exitR][exitC] = 4; // Exit
  mapGrid[exitR][exitC - 1] = 0;
  mapGrid[exitR - 1][exitC] = 0;
  mapGrid[exitR - 1][exitC - 1] = 0;

  // Let's populate the carved paths with spawners and items
  for (let r = 1; r < gridRows - 1; r++) {
    for (let c = 1; c < gridCols - 1; c++) {
      if (mapGrid[r][c] === 0) {
        // Don't place next to start
        if (Math.abs(r - 2) + Math.abs(c - 2) < 3) continue;
        // Don't place next to exit
        if (Math.abs(r - exitR) + Math.abs(c - exitC) < 3) continue;

        const rand = Math.random();
        if (rand < 0.05) {
          // Place a spawner. Randomize spawner types: Ghost (2, 12, 13), Grunt (22-24), Demon (25-27), Sorcerer (28-30)
          const spawnerTypes = [2, 12, 13, 22, 23, 24, 25, 26, 27, 28, 29, 30];
          mapGrid[r][c] = spawnerTypes[Math.floor(Math.random() * spawnerTypes.length)];
        } else if (rand < 0.10) {
          // Place random collectible
          const items = [5, 6, 7, 10, 9, 11, 16, 17, 19, 20, 21];
          mapGrid[r][c] = items[Math.floor(Math.random() * items.length)];
        } else if (rand < 0.14) {
          // Put a locked door
          mapGrid[r][c] = 8;
        }
      }
    }
  }

  // Ensure at least one key is spawned if doors exist
  let hasKey = false;
  let hasDoor = false;
  for (let r = 1; r < gridRows - 1; r++) {
    for (let c = 1; c < gridCols - 1; c++) {
      if (mapGrid[r][c] === 6) hasKey = true;
      if (mapGrid[r][c] === 8) hasDoor = true;
    }
  }
  if (hasDoor && !hasKey) {
    // Force spawn key in a random floor cell
    let attempts = 0;
    while (attempts < 100) {
      const r = Math.floor(Math.random() * (gridRows - 2)) + 1;
      const c = Math.floor(Math.random() * (gridCols - 2)) + 1;
      if (mapGrid[r][c] === 0) {
        mapGrid[r][c] = 6;
        break;
      }
      attempts++;
    }
  }

  renderLevelGrid();
}
