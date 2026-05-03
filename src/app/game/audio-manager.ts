export class AudioManager {
  private static instance: AudioManager;
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;
  private volume = 1;
  private bgmGain: GainNode | null = null;
  private bgmScheduler: ReturnType<typeof setTimeout> | null = null;
  private bgmOscillators: OscillatorNode[] = [];
  private bgmPlaying = false;

  private static readonly BGM_VOLUME = 0.12;
  private static readonly PENTATONIC = [
    261.63, 293.66, 329.63, 392.00, 440.00,
    523.25, 587.33, 659.25, 783.99, 880.00,
  ];
  private static readonly BGM_MELODY = [
    0, 2, 4, 3, 2, 4, 3, 1,
    0, 1, 2, 4, 3, 2, 1, 0,
    4, 3, 2, 3, 4, 6, 5, 4,
    3, 2, 1, 0, 1, 2, 3, 2,
  ];

  private constructor() {}

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private ensureContext(): { context: AudioContext; masterGain: GainNode } {
    if (!this.context) {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.context.destination);
    }
    return { context: this.context, masterGain: this.masterGain! };
  }

  play(buffer: AudioBuffer): AudioBufferSourceNode {
    const { context, masterGain } = this.ensureContext();
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(masterGain);
    source.start();
    return source;
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.masterGain && !this.muted) {
      this.masterGain.gain.value = this.volume;
    }
  }

  getVolume(): number {
    return this.volume;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
    }
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  getContext(): AudioContext | null {
    return this.context;
  }

  playCardPlay(): void {
    if (!this.context) return;
    const { context, masterGain } = this.ensureContext();
    const t = context.currentTime;
    const osc = context.createOscillator();
    const env = context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.15);
    env.gain.setValueAtTime(0.4, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(env);
    env.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  playAttack(): void {
    if (!this.context) return;
    const { context, masterGain } = this.ensureContext();
    const t = context.currentTime;
    const osc = context.createOscillator();
    const env = context.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.3);
    env.gain.setValueAtTime(0.5, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(env);
    env.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  playDamage(): void {
    if (!this.context) return;
    const { context, masterGain } = this.ensureContext();
    const t = context.currentTime;
    const osc = context.createOscillator();
    const env = context.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.2);
    env.gain.setValueAtTime(0.3, t);
    env.gain.linearRampToValueAtTime(0.5, t + 0.05);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(env);
    env.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  playHeroPower(): void {
    if (!this.context) return;
    const { context, masterGain } = this.ensureContext();
    const t = context.currentTime;
    const osc = context.createOscillator();
    const env = context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(330, t);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.15);
    osc.frequency.exponentialRampToValueAtTime(990, t + 0.4);
    env.gain.setValueAtTime(0.3, t);
    env.gain.setValueAtTime(0.3, t + 0.3);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(env);
    env.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  playTurnStart(): void {
    if (!this.context) return;
    const { context, masterGain } = this.ensureContext();
    const t = context.currentTime;
    const osc = context.createOscillator();
    const env = context.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523, t);
    osc.frequency.setValueAtTime(659, t + 0.15);
    osc.frequency.setValueAtTime(784, t + 0.3);
    env.gain.setValueAtTime(0.35, t);
    env.gain.setValueAtTime(0.35, t + 0.35);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc.connect(env);
    env.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.6);
  }

  playVictory(): void {
    if (!this.context) return;
    const { context, masterGain } = this.ensureContext();
    const t = context.currentTime;
    const notes = [523, 659, 784, 1047, 1319];
    const noteDuration = 0.25;
    for (let i = 0; i < notes.length; i++) {
      const osc = context.createOscillator();
      const env = context.createGain();
      osc.type = 'triangle';
      const start = t + i * noteDuration;
      osc.frequency.setValueAtTime(notes[i], start);
      env.gain.setValueAtTime(0, start);
      env.gain.linearRampToValueAtTime(0.35, start + 0.05);
      env.gain.setValueAtTime(0.35, start + noteDuration * 0.6);
      env.gain.exponentialRampToValueAtTime(0.001, start + noteDuration);
      osc.connect(env);
      env.connect(masterGain);
      osc.start(start);
      osc.stop(start + noteDuration);
    }
    const chordStart = t + notes.length * noteDuration;
    const chordFreqs = [523, 659, 784, 1047];
    for (const freq of chordFreqs) {
      const osc = context.createOscillator();
      const env = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, chordStart);
      env.gain.setValueAtTime(0, chordStart);
      env.gain.linearRampToValueAtTime(0.2, chordStart + 0.1);
      env.gain.setValueAtTime(0.2, chordStart + 0.8);
      env.gain.exponentialRampToValueAtTime(0.001, chordStart + 1.2);
      osc.connect(env);
      env.connect(masterGain);
      osc.start(chordStart);
      osc.stop(chordStart + 1.2);
    }
  }

  playDefeat(): void {
    if (!this.context) return;
    const { context, masterGain } = this.ensureContext();
    const t = context.currentTime;
    const notes = [392, 349, 294, 262, 220];
    const noteDuration = 0.35;
    for (let i = 0; i < notes.length; i++) {
      const osc = context.createOscillator();
      const env = context.createGain();
      osc.type = 'sine';
      const start = t + i * noteDuration;
      osc.frequency.setValueAtTime(notes[i], start);
      env.gain.setValueAtTime(0, start);
      env.gain.linearRampToValueAtTime(0.3, start + 0.05);
      env.gain.setValueAtTime(0.3, start + noteDuration * 0.5);
      env.gain.exponentialRampToValueAtTime(0.001, start + noteDuration);
      osc.connect(env);
      env.connect(masterGain);
      osc.start(start);
      osc.stop(start + noteDuration);
    }
    const droneStart = t + notes.length * noteDuration;
    const osc = context.createOscillator();
    const env = context.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, droneStart);
    osc.frequency.exponentialRampToValueAtTime(55, droneStart + 1.0);
    env.gain.setValueAtTime(0, droneStart);
    env.gain.linearRampToValueAtTime(0.15, droneStart + 0.1);
    env.gain.setValueAtTime(0.15, droneStart + 0.6);
    env.gain.exponentialRampToValueAtTime(0.001, droneStart + 1.0);
    osc.connect(env);
    env.connect(masterGain);
    osc.start(droneStart);
    osc.stop(droneStart + 1.0);
  }

  playCardDraw(): void {
    if (!this.context) return;
    const { context, masterGain } = this.ensureContext();
    const t = context.currentTime;
    const osc = context.createOscillator();
    const env = context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.1);
    env.gain.setValueAtTime(0.25, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(env);
    env.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  startBGM(): void {
    if (this.bgmPlaying) return;
    const { context, masterGain } = this.ensureContext();
    this.bgmPlaying = true;

    this.bgmGain = context.createGain();
    this.bgmGain.gain.value = AudioManager.BGM_VOLUME;
    this.bgmGain.connect(masterGain);

    const melody = AudioManager.BGM_MELODY;
    const scale = AudioManager.PENTATONIC;
    const noteDuration = 0.35;
    const phraseLength = melody.length * noteDuration;

    const schedulePhrase = () => {
      if (!this.bgmPlaying || !this.context || !this.bgmGain) return;
      const t = this.context.currentTime + 0.05;

      for (let i = 0; i < melody.length; i++) {
        const osc = this.context.createOscillator();
        const env = this.context.createGain();
        osc.type = i % 4 === 0 ? 'triangle' : 'sine';
        const freq = scale[melody[i]];
        const start = t + i * noteDuration;

        osc.frequency.setValueAtTime(freq, start);
        env.gain.setValueAtTime(0, start);
        env.gain.linearRampToValueAtTime(1, start + 0.03);
        env.gain.setValueAtTime(1, start + noteDuration * 0.6);
        env.gain.exponentialRampToValueAtTime(0.001, start + noteDuration * 0.95);

        osc.connect(env);
        env.connect(this.bgmGain!);
        osc.start(start);
        osc.stop(start + noteDuration);
        this.bgmOscillators.push(osc);

        osc.onended = () => {
          const idx = this.bgmOscillators.indexOf(osc);
          if (idx !== -1) this.bgmOscillators.splice(idx, 1);
        };
      }

      const drone = this.context.createOscillator();
      const droneEnv = this.context.createGain();
      drone.type = 'sine';
      drone.frequency.setValueAtTime(scale[0] / 2, t);
      droneEnv.gain.setValueAtTime(0.3, t);
      droneEnv.gain.setValueAtTime(0.3, t + phraseLength - 0.1);
      droneEnv.gain.exponentialRampToValueAtTime(0.001, t + phraseLength);
      drone.connect(droneEnv);
      droneEnv.connect(this.bgmGain!);
      drone.start(t);
      drone.stop(t + phraseLength);
      this.bgmOscillators.push(drone);

      drone.onended = () => {
        const idx = this.bgmOscillators.indexOf(drone);
        if (idx !== -1) this.bgmOscillators.splice(idx, 1);
      };

      this.bgmScheduler = setTimeout(schedulePhrase, (phraseLength - 0.1) * 1000);
    };

    schedulePhrase();
  }

  stopBGM(): void {
    this.bgmPlaying = false;

    if (this.bgmScheduler !== null) {
      clearTimeout(this.bgmScheduler);
      this.bgmScheduler = null;
    }

    if (this.bgmGain && this.context) {
      const t = this.context.currentTime;
      this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, t);
      this.bgmGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    }

    setTimeout(() => {
      for (const osc of this.bgmOscillators) {
        try { osc.stop(); } catch (_) { /* already stopped */ }
      }
      this.bgmOscillators = [];
      if (this.bgmGain) {
        this.bgmGain.disconnect();
        this.bgmGain = null;
      }
    }, 350);
  }

  isBGMPlaying(): boolean {
    return this.bgmPlaying;
  }
}
