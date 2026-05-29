import './style.css';
import { GameLoop } from './GameLoop';
import { soundManager } from './SoundManager';

// Cache DOM elements
const container = document.getElementById('game-container');
const startScreen = document.getElementById('start-screen');
const hud = document.getElementById('hud');
const gameOverScreen = document.getElementById('game-over-screen');
const victoryScreen = document.getElementById('victory-screen');

// HUD elements
const hudLevelVal = document.getElementById('hud-level-val');
const hudClassVal = document.getElementById('hud-class-val');
const hudHealthVal = document.getElementById('hud-health-val');
const hudKeysVal = document.getElementById('hud-keys-val');
const hudPotionsVal = document.getElementById('hud-potions-val');
const hudScoreVal = document.getElementById('hud-score-val');

// End screen elements
const finalScoreVal = document.getElementById('final-score');
const victoryScoreVal = document.getElementById('victory-score');
const narrationBox = document.getElementById('narration-box');

// Class selection cards / buttons
const btnWarrior = document.getElementById('btn-select-warrior');
const btnWizard = document.getElementById('btn-select-wizard');
const btnValkyrie = document.getElementById('btn-select-valkyrie');
const btnElf = document.getElementById('btn-select-elf');

// Restart buttons
const btnRestart = document.getElementById('btn-restart');
const btnRestartVictory = document.getElementById('btn-restart-victory');

// Global game controller instance
let currentGame = null;

/**
 * Sync HUD values with player state
 */
function updateHud(state) {
  if (hudLevelVal) hudLevelVal.textContent = state.level.toString().padStart(2, '0');
  if (hudHealthVal) hudHealthVal.textContent = state.health.toString().padStart(4, '0');
  if (hudKeysVal) hudKeysVal.textContent = state.keys.toString();
  if (hudPotionsVal) hudPotionsVal.textContent = state.potions.toString();
  if (hudScoreVal) hudScoreVal.textContent = state.score.toString().padStart(5, '0');

  // Pulse health red if critically low
  if (state.health < 500) {
    hudHealthVal.classList.add('blink');
  } else {
    hudHealthVal.classList.remove('blink');
  }
}

/**
 * Boots the game with selected character
 */
async function launchGame(classType) {
  // 1. Resume Audio Context on interaction
  await soundManager.resume();

  // 2. Hide selectors, display HUD
  startScreen.classList.remove('active');
  gameOverScreen.classList.remove('active');
  victoryScreen.classList.remove('active');
  
  hud.classList.remove('hidden');
  
  let prettyClassName = '';
  switch(classType) {
    case 'warrior': prettyClassName = 'WARRIOR'; break;
    case 'wizard': prettyClassName = 'WIZARD'; break;
    case 'valkyrie': prettyClassName = 'VALKYRIE'; break;
    case 'elf': prettyClassName = 'ELF'; break;
  }
  hudClassVal.textContent = prettyClassName;

  // 3. Clear existing game instance
  if (currentGame) {
    currentGame.stop();
  }

  // 4. Initialize GameLoop
  currentGame = new GameLoop(
    container,
    updateHud,
    handleGameOver,
    handleVictory
  );

  // 5. Start Game
  currentGame.start(classType);
}

/**
 * Handle game over sequence
 */
function handleGameOver(score, reason) {
  hud.classList.add('hidden');
  gameOverScreen.classList.add('active');
  
  if (finalScoreVal) finalScoreVal.textContent = score.toString();
  if (narrationBox) narrationBox.textContent = `"${reason}"`;
  
  // Speak the exact demise reason
  setTimeout(() => {
    soundManager.speak(reason, true);
  }, 1000);

  const isPlaytest = currentGame && currentGame.isPlaytesting;
  const btnEditor = document.getElementById('btn-return-editor');
  if (btnEditor) {
    if (isPlaytest) {
      btnEditor.classList.remove('hidden');
    } else {
      btnEditor.classList.add('hidden');
    }
  }

  if (currentGame) {
    currentGame.stop();
    currentGame = null;
  }
}

/**
 * Handle victory sequence
 */
function handleVictory(score, isPlaytesting) {
  hud.classList.add('hidden');
  victoryScreen.classList.add('active');
  
  if (victoryScoreVal) victoryScoreVal.textContent = score.toString();

  const btnEditorVic = document.getElementById('btn-return-editor-victory');
  const vicTitle = document.getElementById('victory-title');
  const vicReport = document.querySelector('.victory-report');
  
  if (isPlaytesting) {
    if (btnEditorVic) btnEditorVic.classList.remove('hidden');
    if (vicTitle) vicTitle.textContent = "PLAYTEST SUCCESS";
    if (vicReport) vicReport.textContent = "YOUR CUSTOM LEVEL WORKS!";
  } else {
    if (btnEditorVic) btnEditorVic.classList.add('hidden');
    if (vicTitle) vicTitle.textContent = "VICTORY";
    if (vicReport) vicReport.textContent = "YOU ESCAPED THE GAUNTLET!";
  }
  
  if (currentGame) {
    currentGame.stop();
    currentGame = null;
  }
}

/**
 * Reset layout back to start menu
 */
function resetToStartMenu() {
  if (currentGame) {
    currentGame.stop();
    currentGame = null;
  }

  gameOverScreen.classList.remove('active');
  victoryScreen.classList.remove('active');
  startScreen.classList.add('active');
  hud.classList.add('hidden');
}

// Bind Selectors
btnWarrior.addEventListener('click', () => launchGame('warrior'));
btnWizard.addEventListener('click', () => launchGame('wizard'));
btnValkyrie.addEventListener('click', () => launchGame('valkyrie'));
btnElf.addEventListener('click', () => launchGame('elf'));

// Bind Restarts
btnRestart.addEventListener('click', resetToStartMenu);
btnRestartVictory.addEventListener('click', resetToStartMenu);

// Return to Editor bindings
const btnReturnEditor = document.getElementById('btn-return-editor');
const btnReturnEditorVic = document.getElementById('btn-return-editor-victory');
const toEditor = () => {
  localStorage.removeItem('gauntlet_playtest_active');
  window.location.href = 'editor.html';
};
if (btnReturnEditor) btnReturnEditor.addEventListener('click', toEditor);
if (btnReturnEditorVic) btnReturnEditorVic.addEventListener('click', toEditor);

// Global death event listener dispatched from Hero.js
window.addEventListener('player-dead', (e) => {
  const detail = e.detail;
  handleGameOver(detail.score, detail.reason);
});

// Auto-run playtest mode if launched from editor
const urlParams = new URLSearchParams(window.location.search);
const isPlaytestActive = urlParams.get('playtest') === 'true' || localStorage.getItem('gauntlet_playtest_active') === 'true';
if (isPlaytestActive) {
  const playtestClass = localStorage.getItem('gauntlet_playtest_class') || 'warrior';
  localStorage.removeItem('gauntlet_playtest_active');
  // Auto-launch after menu assets and layout settle
  setTimeout(() => {
    launchGame(playtestClass);
  }, 300);
}

