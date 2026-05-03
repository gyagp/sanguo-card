export class AudioManager {
  private static instance: AudioManager;
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;
  private volume = 1;

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
}
