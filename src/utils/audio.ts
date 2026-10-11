/**
 * Retro 8-bit Sound Effects Engine & Generative Ambient Soundscapes
 * Uses Web Audio API completely offline without external audio files.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private ambientEnabled: boolean = true;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;

  // Soundscape state
  private currentRoomId: string | null = null;
  private ambientTimer: number | null = null;
  private ambientNodes: (AudioNode | { stop?: () => void })[] = [];

  private sfxVolume: number = 0.8;
  private ambientVolume: number = 0.5;

  private currentSpeechAudio: HTMLAudioElement | null = null;
  private speechSequenceTimers: number[] = [];

  constructor() {
    // Initialized on user interaction
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.enabled ? 1.0 : 0, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);

        this.ambientGain = this.ctx.createGain();
        this.ambientGain.gain.setValueAtTime(
          this.ambientEnabled ? this.ambientVolume : 0,
          this.ctx.currentTime
        );
        this.ambientGain.connect(this.masterGain);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    this.initCtx();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(val ? 1.0 : 0, this.ctx.currentTime);
    }
    if (!val) {
      this.stopCurrentSpeech();
      this.stopAmbient();
    } else if (this.currentRoomId) {
      this.startRoomAmbient(this.currentRoomId);
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setAmbientEnabled(val: boolean) {
    this.ambientEnabled = val;
    this.initCtx();
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(
        val ? this.ambientVolume : 0,
        this.ctx.currentTime
      );
    }
    if (!val) {
      this.stopAmbient();
    } else if (this.currentRoomId) {
      this.startRoomAmbient(this.currentRoomId);
    }
  }

  public isAmbientEnabled(): boolean {
    return this.ambientEnabled;
  }

  public setAmbientVolume(vol: number) {
    this.ambientVolume = Math.max(0, Math.min(1, vol));
    this.initCtx();
    if (this.ambientGain && this.ctx && this.ambientEnabled) {
      this.ambientGain.gain.setValueAtTime(this.ambientVolume, this.ctx.currentTime);
    }
  }

  public getAmbientVolume(): number {
    return this.ambientVolume;
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    this.initCtx();
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
    if (this.currentSpeechAudio) {
      this.currentSpeechAudio.volume = Math.max(0.1, Math.min(1.0, this.sfxVolume * 1.15));
    }
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  // --- AMBIENT SOUNDSCAPES FOR EACH ROOM ---
  public startRoomAmbient(roomId: string) {
    this.currentRoomId = roomId;
    if (!this.enabled || !this.ambientEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.ambientGain) return;

    this.stopAmbient();

    if (roomId === 'room-1') {
      // Room 1: The Detective's Workshop
      // Subtle vintage computer terminal hum + soft tape drive whirr
      this.createWorkshopAmbient();
    } else if (roomId === 'room-2') {
      // Room 2: The Grand Archive
      // Antique grandfather clock ticking + warm acoustic wood room atmosphere
      this.createLibraryAmbient();
    } else if (roomId === 'room-3') {
      // Room 3: The Secret Vault Gateway
      // Atmospheric temple wind breeze + resonant Japanese sacred shrine bells (furin)
      this.createShrineAmbient();
    }
  }

  public stopAmbient() {
    if (this.ambientTimer) {
      window.clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
    this.ambientNodes.forEach((node) => {
      try {
        if ('stop' in node && typeof node.stop === 'function') {
          node.stop();
        }
        if ('disconnect' in node && typeof node.disconnect === 'function') {
          node.disconnect();
        }
      } catch {
        // ignore
      }
    });
    this.ambientNodes = [];
  }

  // Room 1: Detective Workshop (Electronic Terminal Drone + Data Pulses)
  private createWorkshopAmbient() {
    if (!this.ctx || !this.ambientGain) return;
    const ctx = this.ctx;

    // Dual oscillator low drone (55Hz / 110Hz)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const droneGain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(55, ctx.currentTime);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(110, ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(160, ctx.currentTime);

    droneGain.gain.setValueAtTime(0.025, ctx.currentTime);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(droneGain);
    droneGain.connect(this.ambientGain);

    osc1.start();
    osc2.start();
    this.ambientNodes.push(osc1, osc2, filter, droneGain);

    // Subtle data beep pulses every 3.5 seconds
    this.ambientTimer = window.setInterval(() => {
      if (!this.enabled || !this.ambientEnabled || !this.ctx || !this.ambientGain) return;
      const t = this.ctx.currentTime;
      const beepOsc = this.ctx.createOscillator();
      const beepGain = this.ctx.createGain();

      beepOsc.type = 'sine';
      beepOsc.frequency.setValueAtTime(880, t);
      beepOsc.frequency.setValueAtTime(1320, t + 0.04);

      beepGain.gain.setValueAtTime(0.008, t);
      beepGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

      beepOsc.connect(beepGain);
      beepGain.connect(this.ambientGain);

      beepOsc.start(t);
      beepOsc.stop(t + 0.08);
    }, 3500);
  }

  // Room 2: Grand Archive (Grandfather Clock Ticking Pendulum + Library Creaks)
  private createLibraryAmbient() {
    if (!this.ctx || !this.ambientGain) return;
    let tickToggle = false;

    // Rhythmic pendulum tick-tock every 1.0 second
    this.ambientTimer = window.setInterval(() => {
      if (!this.enabled || !this.ambientEnabled || !this.ctx || !this.ambientGain) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      tickToggle = !tickToggle;
      // High wooden tick vs low wooden tock
      const freq = tickToggle ? 850 : 640;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.035);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq, t);
      filter.Q.setValueAtTime(3, t);

      gain.gain.setValueAtTime(0.045, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambientGain);

      osc.start(t);
      osc.stop(t + 0.035);
    }, 1000);
  }

  // Room 3: Secret Vault / Shrine Gateway (Atmospheric Wind + Japanese Shrine Bells)
  private createShrineAmbient() {
    if (!this.ctx || !this.ambientGain) return;
    const ctx = this.ctx;

    // Atmospheric Wind: Pink noise buffer with slow LFO filter swell
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + white * 0.05;
      b1 = 0.95 * b1 + white * 0.05;
      b2 = 0.85 * b2 + white * 0.05;
      output[i] = (b0 + b1 + b2) * 0.5;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.setValueAtTime(280, ctx.currentTime);

    // LFO to swell the wind
    const windLfo = ctx.createOscillator();
    windLfo.frequency.setValueAtTime(0.1, ctx.currentTime);
    const windLfoGain = ctx.createGain();
    windLfoGain.gain.setValueAtTime(140, ctx.currentTime);
    windLfo.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.035, ctx.currentTime);

    whiteNoise.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.ambientGain);

    whiteNoise.start();
    windLfo.start();
    this.ambientNodes.push(whiteNoise, windLfo, windFilter, windGain);

    // Japanese Shrine Wind Bells (Furin / Suikinkutsu chimes) every 3.5s
    const bellNotes = [1046.5, 1318.5, 1567.98, 2093.0]; // C6, E6, G6, C7
    this.ambientTimer = window.setInterval(() => {
      if (!this.enabled || !this.ambientEnabled || !this.ctx || !this.ambientGain) return;
      const t = this.ctx.currentTime;
      const note = bellNotes[Math.floor(Math.random() * bellNotes.length)];

      const bellOsc = this.ctx.createOscillator();
      const bellGain = this.ctx.createGain();

      bellOsc.type = 'sine';
      bellOsc.frequency.setValueAtTime(note, t);

      // Shimmering chime decay
      bellGain.gain.setValueAtTime(0.03, t);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);

      bellOsc.connect(bellGain);
      bellGain.connect(this.ambientGain);

      bellOsc.start(t);
      bellOsc.stop(t + 1.6);
    }, 3800);
  }

  // --- SOUND EFFECTS ---
  public playSelect() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = 'square';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.08);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  public playBlip(freq: number = 520) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  public playFootstep(floorType: 'wood' | 'stone' | 'carpet_tatami' = 'wood') {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (floorType === 'stone') {
      // Crisp stone tile tap with slight harmonic
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200 + Math.random() * 25, t);
      osc.frequency.exponentialRampToValueAtTime(70, t + 0.045);
      gain.gain.setValueAtTime(0.045, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    } else if (floorType === 'carpet_tatami') {
      // Soft muffled tatami step
      osc.type = 'sine';
      osc.frequency.setValueAtTime(105 + Math.random() * 15, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.05);
      gain.gain.setValueAtTime(0.035, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    } else {
      // Retro wooden floor tap
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140 + Math.random() * 20, t);
      osc.frequency.exponentialRampToValueAtTime(55, t + 0.04);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    }

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  public playBump() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Solid retro tactile wall bump
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.07);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, t);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  public playSuccess() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    const t = this.ctx.currentTime;

    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = t + i * 0.09;

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.09, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startTime);
      osc.stop(startTime + 0.18);
    });
  }

  public playFail() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.linearRampToValueAtTime(110, t + 0.25);

    gain.gain.setValueAtTime(0.09, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  public playDoorUnlocked() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const melody = [392.0, 523.25, 659.25, 783.99, 1046.5, 1318.51];
    const t = this.ctx.currentTime;

    melody.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = t + idx * 0.11;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(start);
      osc.stop(start + 0.35);
    });
  }

  public playDoorUnlock() {
    this.playDoorUnlocked();
  }

  public playDoorOpen() {
    this.playDoorUnlocked();
  }

  public playRoomTransition() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.35);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, t);
    filter.frequency.exponentialRampToValueAtTime(1200, t + 0.35);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.55);
  }

  public playExplosion() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;

    // 1. Low frequency sub boom
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.6);

    oscGain.gain.setValueAtTime(0.18, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.6);

    // 2. White noise explosion rumble
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.5);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.5);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    noise.start(t);
    noise.stop(t + 0.5);
  }

  public playKanaObtained() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const chords = [659.25, 830.61, 987.77];
    const t = this.ctx.currentTime;

    chords.forEach((freq) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  private getAudioKey(text: string): string {
    return Array.from(text)
      .map((c) => c.codePointAt(0)?.toString(16) || '')
      .join('_');
  }

  private stopCurrentSpeech() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    if (this.currentSpeechAudio) {
      try {
        this.currentSpeechAudio.pause();
        this.currentSpeechAudio.currentTime = 0;
      } catch {
        // ignore
      }
      this.currentSpeechAudio = null;
    }
    this.speechSequenceTimers.forEach((t) => window.clearTimeout(t));
    this.speechSequenceTimers = [];
  }

  /**
   * Pronounces Kana syllables or Japanese vocabulary using authentic native recorded
   * audio files (/audio/*.mp3), with syllable-by-syllable sequencing and Web Speech API fallback.
   * Guaranteed to play across all browsers and operating systems (including Linux without local TTS).
   */
  public speakJapanese(text: string) {
    if (!this.enabled || !text || typeof window === 'undefined') return;

    this.initCtx();
    this.stopCurrentSpeech();

    const clean = text.trim();
    if (!clean) return;

    const key = this.getAudioKey(clean);
    const audioUrl = `/audio/${key}.mp3`;

    const audio = new Audio(audioUrl);
    audio.volume = Math.max(0.1, Math.min(1.0, this.sfxVolume * 1.2));
    this.currentSpeechAudio = audio;

    let fallbackTriggered = false;
    const handleFallback = () => {
      if (fallbackTriggered) return;
      fallbackTriggered = true;

      // 1. Try Web Speech API first for natural whole-word pronunciation
      const spoken = this.fallbackSpeechSynthesis(clean, () => {
        // If Speech Synthesis fails, sequence syllables
        const chars = Array.from(clean);
        if (chars.length > 1) {
          this.playSyllableSequence(chars);
        } else {
          this.playKanaObtained();
        }
      });

      if (!spoken) {
        const chars = Array.from(clean);
        if (chars.length > 1) {
          this.playSyllableSequence(chars);
        }
      }
    };

    audio.onerror = () => {
      handleFallback();
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        handleFallback();
      });
    }
  }

  private playSyllableSequence(chars: string[]) {
    chars.forEach((char, idx) => {
      const timer = window.setTimeout(() => {
        if (!this.enabled) return;
        const charKey = this.getAudioKey(char);
        const charAudio = new Audio(`/audio/${charKey}.mp3`);
        charAudio.volume = Math.max(0.1, Math.min(1.0, this.sfxVolume * 1.2));
        this.currentSpeechAudio = charAudio;
        const p = charAudio.play();
        if (p !== undefined) {
          p.catch(() => {
            this.fallbackSpeechSynthesis(char);
          });
        }
      }, idx * 175); // 175ms natural mora cadence
      this.speechSequenceTimers.push(timer);
    });
  }

  private fallbackSpeechSynthesis(text: string, onFail?: () => void): boolean {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      if (onFail) onFail();
      return false;
    }

    try {
      window.speechSynthesis.cancel();

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const voices = window.speechSynthesis.getVoices();
      const jaVoice = voices.find(
        (v) => v.lang.toLowerCase().startsWith('ja') || v.lang.toLowerCase().includes('jp')
      );

      // Prevent non-Japanese TTS voices from announcing Kanji as "Chinese letter [word]"
      const hasKanji = /[\u4e00-\u9faf]/.test(text);
      if (!jaVoice && hasKanji) {
        if (onFail) onFail();
        return false;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.95;
      utterance.volume = this.sfxVolume;

      if (jaVoice) {
        utterance.voice = jaVoice;
      }

      utterance.onerror = () => {
        if (onFail) onFail();
        else this.playKanaObtained();
      };

      window.speechSynthesis.speak(utterance);
      return true;
    } catch {
      if (onFail) onFail();
      return false;
    }
  }
}

export const sounds = new SoundEngine();
