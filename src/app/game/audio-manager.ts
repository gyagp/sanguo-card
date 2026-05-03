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
}
