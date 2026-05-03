import { describe, it, expect, beforeEach, vi } from "vitest";
import { AudioManager } from "./audio-manager";

// Mock Web Audio API
const mockGainNode = {
  gain: { value: 1 },
  connect: vi.fn(),
};

const mockSourceNode = {
  buffer: null as AudioBuffer | null,
  connect: vi.fn(),
  start: vi.fn(),
};

const mockAudioContext = {
  createGain: vi.fn(() => mockGainNode),
  createBufferSource: vi.fn(() => mockSourceNode),
  destination: {},
};

vi.stubGlobal("AudioContext", vi.fn(() => mockAudioContext));

function resetSingleton() {
  // Reset the singleton between tests
  (AudioManager as any).instance = undefined;
}

describe("AudioManager", () => {
  beforeEach(() => {
    resetSingleton();
    vi.clearAllMocks();
    mockGainNode.gain.value = 1;
    mockSourceNode.buffer = null;
  });

  describe("singleton", () => {
    it("returns the same instance", () => {
      const a = AudioManager.getInstance();
      const b = AudioManager.getInstance();
      expect(a).toBe(b);
    });
  });

  describe("lazy AudioContext creation", () => {
    it("does not create AudioContext on getInstance", () => {
      const mgr = AudioManager.getInstance();
      expect(mgr.getContext()).toBeNull();
      expect(AudioContext).not.toHaveBeenCalled();
    });

    it("creates AudioContext on first play()", () => {
      const mgr = AudioManager.getInstance();
      mgr.play({} as AudioBuffer);
      expect(AudioContext).toHaveBeenCalledTimes(1);
      expect(mgr.getContext()).toBe(mockAudioContext);
    });

    it("reuses AudioContext on subsequent play() calls", () => {
      const mgr = AudioManager.getInstance();
      mgr.play({} as AudioBuffer);
      mgr.play({} as AudioBuffer);
      expect(AudioContext).toHaveBeenCalledTimes(1);
    });
  });

  describe("master volume via GainNode", () => {
    it("initializes gain to 1", () => {
      const mgr = AudioManager.getInstance();
      mgr.play({} as AudioBuffer);
      expect(mockGainNode.gain.value).toBe(1);
    });

    it("setVolume clamps to 0-1 range", () => {
      const mgr = AudioManager.getInstance();
      mgr.play({} as AudioBuffer);

      mgr.setVolume(0.5);
      expect(mockGainNode.gain.value).toBe(0.5);
      expect(mgr.getVolume()).toBe(0.5);

      mgr.setVolume(-1);
      expect(mockGainNode.gain.value).toBe(0);
      expect(mgr.getVolume()).toBe(0);

      mgr.setVolume(2);
      expect(mockGainNode.gain.value).toBe(1);
      expect(mgr.getVolume()).toBe(1);
    });

    it("setVolume before play() stores value for later", () => {
      const mgr = AudioManager.getInstance();
      mgr.setVolume(0.3);
      expect(mgr.getVolume()).toBe(0.3);

      mgr.play({} as AudioBuffer);
      expect(mockGainNode.gain.value).toBe(0.3);
    });

    it("connects masterGain to destination", () => {
      const mgr = AudioManager.getInstance();
      mgr.play({} as AudioBuffer);
      expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
    });
  });

  describe("mute toggle", () => {
    it("toggleMute sets gain to 0 when muted", () => {
      const mgr = AudioManager.getInstance();
      mgr.play({} as AudioBuffer);
      mgr.setVolume(0.7);

      const muted = mgr.toggleMute();
      expect(muted).toBe(true);
      expect(mgr.isMuted()).toBe(true);
      expect(mockGainNode.gain.value).toBe(0);
    });

    it("toggleMute restores volume when unmuted", () => {
      const mgr = AudioManager.getInstance();
      mgr.play({} as AudioBuffer);
      mgr.setVolume(0.7);

      mgr.toggleMute(); // mute
      mgr.toggleMute(); // unmute
      expect(mgr.isMuted()).toBe(false);
      expect(mockGainNode.gain.value).toBe(0.7);
    });

    it("setVolume does not change gain while muted", () => {
      const mgr = AudioManager.getInstance();
      mgr.play({} as AudioBuffer);
      mgr.toggleMute();
      mgr.setVolume(0.5);
      expect(mockGainNode.gain.value).toBe(0);
      // but volume is stored
      mgr.toggleMute();
      expect(mockGainNode.gain.value).toBe(0.5);
    });

    it("toggleMute before play() works without error", () => {
      const mgr = AudioManager.getInstance();
      expect(() => mgr.toggleMute()).not.toThrow();
      expect(mgr.isMuted()).toBe(true);
    });
  });

  describe("play()", () => {
    it("creates source, sets buffer, connects to masterGain, and starts", () => {
      const mgr = AudioManager.getInstance();
      const buf = {} as AudioBuffer;
      const source = mgr.play(buf);

      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      expect(mockSourceNode.buffer).toBe(buf);
      expect(mockSourceNode.connect).toHaveBeenCalledWith(mockGainNode);
      expect(mockSourceNode.start).toHaveBeenCalled();
      expect(source).toBe(mockSourceNode);
    });
  });
});
