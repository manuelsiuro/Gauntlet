/**
 * SoundManager handles all retro game synthesizer sound effects using the Web Audio API
 * and narrator voice announcements using the SpeechSynthesis API.
 * It initializes lazily on first user interaction to comply with browser audio policies.
 */
class SoundManager {
  constructor() {
    this.ctx = null;
    this.speechEnabled = 'speechSynthesis' in window;
    this.lastNarrationTime = 0;
    this.narrationCooldown = 4000; // Prevent spamming speech
    this.muted = false;
  }

  /**
   * Initializes the AudioContext on user interaction
   */
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  /**
   * Resumes the audio context if suspended
   */
  async resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /**
   * Narrates a string using SpeechSynthesis
   * @param {string} text 
   * @param {boolean} force - if true, bypasses cooldown
   */
  speak(text, force = false) {
    if (!this.speechEnabled || this.muted) return;
    
    const now = Date.now();
    if (!force && (now - this.lastNarrationTime < this.narrationCooldown)) {
      return;
    }
    
    // Cancel any ongoing speech to keep narrator crisp and responsive
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = 1.0;
    utterance.rate = 1.0; // Retro, slightly fast computer voice style
    utterance.pitch = 0.8; // Deep arcade-like tone
    
    // Choose a male voice if available to mimic the original Gauntlet arcade cabinet
    const voices = window.speechSynthesis.getVoices();
    const systemVoice = voices.find(voice => voice.name.toLowerCase().includes('google US English') || voice.name.toLowerCase().includes('male') || voice.lang.startsWith('en'));
    if (systemVoice) {
      utterance.voice = systemVoice;
    }
    
    window.speechSynthesis.speak(utterance);
    this.lastNarrationTime = now;
  }

  /**
   * Synthesizes a retro shoot/laser sound effect
   */
  playShoot() {
    this.resume();
    if (!this.ctx || this.muted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle'; // Retro feel
    osc.frequency.setValueAtTime(880, this.ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.15); // Slide down
    
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.16);
  }

  /**
   * Synthesizes an impact/explosion sound effect
   */
  playHit() {
    this.resume();
    if (!this.ctx || this.muted) return;

    const duration = 0.1;
    // Create white noise buffer
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter noise to sound like a thud
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
    noise.stop(this.ctx.currentTime + duration);
  }

  /**
   * Synthesizes a high-pitch chime sound for item pickup
   */
  playPickup() {
    this.resume();
    if (!this.ctx || this.muted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    // Arpeggio chime effect
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
    osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + 0.36);
  }

  /**
   * Synthesizes a low metallic explosion sound when a spawner is destroyed
   */
  playSpawnerDestroy() {
    this.resume();
    if (!this.ctx || this.muted) return;

    const duration = 0.4;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass filter to make it sound metallic/hollow
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(150, this.ctx.currentTime);
    filter.Q.setValueAtTime(5, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
    noise.stop(this.ctx.currentTime + duration);
  }

  /**
   * Synthesizes a game over jingle
   */
  playGameOver() {
    this.resume();
    if (!this.ctx || this.muted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now); // A3
    osc.frequency.setValueAtTime(207.65, now + 0.2); // G#3
    osc.frequency.setValueAtTime(196, now + 0.4); // G3
    osc.frequency.exponentialRampToValueAtTime(110, now + 1.0); // A2 slide down

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + 1.0);
  }

  /**
   * Synthesizes a victory fanfare
   */
  playVictory() {
    this.resume();
    if (!this.ctx || this.muted) return;

    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C Major scale arpeggio
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.value = freq;
      
      const noteStart = now + idx * 0.12;
      const noteDuration = 0.3;
      
      gain.gain.setValueAtTime(0.0, now);
      gain.gain.setValueAtTime(0.1, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.005, noteStart + noteDuration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(noteStart);
      osc.stop(noteStart + noteDuration);
    });
  }
}

// Export single instance for global usage
export const soundManager = new SoundManager();
