import { describe, it, expect, beforeEach, vi } from "vitest";
import { AudioManager } from "./audio-manager";

// Mock Web Audio API
const mockGainNode = {
  gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  connect: vi.fn(),
};

const mockSourceNode = {
  buffer: null as AudioBuffer | null,
  connect: vi.fn(),
  start: vi.fn(),
};

const mockOscillatorNode = {
  type: 'sine' as OscillatorType,
  frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
};

function createMockGain() {
  return {
    gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

const mockAudioContext = {
  createGain: vi.fn(() => mockGainNode),
  createBufferSource: vi.fn(() => mockSourceNode),
  createOscillator: vi.fn(() => mockOscillatorNode),
  currentTime: 0,
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
    mockOscillatorNode.type = 'sine';
    mockAudioContext.createGain.mockImplementation(() => createMockGain());
    mockAudioContext.createGain.mockReturnValueOnce(mockGainNode);
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

  describe("procedural sound effects", () => {
    const soundMethods = [
      'playCardPlay',
      'playAttack',
      'playDamage',
      'playHeroPower',
      'playTurnStart',
      'playCardDraw',
    ] as const;

    for (const method of soundMethods) {
      it(`${method}() is a no-op when AudioContext not initialized`, () => {
        const mgr = AudioManager.getInstance();
        expect(mgr.getContext()).toBeNull();
        expect(() => mgr[method]()).not.toThrow();
        expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
      });

      it(`${method}() creates oscillator and envelope when context exists`, () => {
        const mgr = AudioManager.getInstance();
        mgr.play({} as AudioBuffer); // initialize context
        vi.clearAllMocks();
        mockAudioContext.createGain.mockImplementation(() => createMockGain());

        mgr[method]();

        expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(1);
        expect(mockAudioContext.createGain).toHaveBeenCalledTimes(1);
      });
    }

    it("playVictory() is a no-op when AudioContext not initialized", () => {
      const mgr = AudioManager.getInstance();
      expect(mgr.getContext()).toBeNull();
      expect(() => mgr.playVictory()).not.toThrow();
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });

    it("playVictory() creates 9 oscillators when context exists (5 ascending notes + 4 chord)", () => {
      const mgr = AudioManager.getInstance();
      mgr.play({} as AudioBuffer);
      vi.clearAllMocks();
      mockAudioContext.createGain.mockImplementation(() => createMockGain());

      mgr.playVictory();

      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(9);
      expect(mockAudioContext.createGain).toHaveBeenCalledTimes(9);
    });

    it("playDefeat() is a no-op when AudioContext not initialized", () => {
      const mgr = AudioManager.getInstance();
      expect(mgr.getContext()).toBeNull();
      expect(() => mgr.playDefeat()).not.toThrow();
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });

    it("playDefeat() creates 6 oscillators when context exists (5 descending notes + 1 drone)", () => {
      const mgr = AudioManager.getInstance();
      mgr.play({} as AudioBuffer);
      vi.clearAllMocks();
      mockAudioContext.createGain.mockImplementation(() => createMockGain());

      mgr.playDefeat();

      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(6);
      expect(mockAudioContext.createGain).toHaveBeenCalledTimes(6);
    });
  });

  describe("BGM", () => {
    it("startBGM() initializes context and sets bgmPlaying", () => {
      const mgr = AudioManager.getInstance();
      mgr.startBGM();
      expect(mgr.isBGMPlaying()).toBe(true);
      expect(mgr.getContext()).toBe(mockAudioContext);
    });

    it("startBGM() is idempotent when already playing", () => {
      const mgr = AudioManager.getInstance();
      mgr.startBGM();
      vi.clearAllMocks();
      mgr.startBGM();
      expect(mockAudioContext.createGain).not.toHaveBeenCalled();
    });

    it("startBGM() creates oscillators for melody and drone", () => {
      const mgr = AudioManager.getInstance();
      mockAudioContext.createGain.mockImplementation(() => createMockGain());
      mgr.startBGM();
      // 32 melody notes + 1 drone = 33
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(33);
    });

    it("stopBGM() sets bgmPlaying to false", () => {
      const mgr = AudioManager.getInstance();
      mgr.startBGM();
      mgr.stopBGM();
      expect(mgr.isBGMPlaying()).toBe(false);
    });

    it("stopBGM() is safe to call when not playing", () => {
      const mgr = AudioManager.getInstance();
      expect(() => mgr.stopBGM()).not.toThrow();
    });

    it("isBGMPlaying() returns false initially", () => {
      const mgr = AudioManager.getInstance();
      expect(mgr.isBGMPlaying()).toBe(false);
    });

    it("BGM uses Chinese pentatonic scale frequencies (C-D-E-G-A)", () => {
      const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00];
      const scale = (AudioManager as any).PENTATONIC as number[];
      for (const freq of pentatonic) {
        expect(scale).toContain(freq);
      }
    });

    it("BGM volume is lower than sound effects (master gain defaults to 1)", () => {
      const bgmVol = (AudioManager as any).BGM_VOLUME as number;
      expect(bgmVol).toBeLessThan(1);
      expect(bgmVol).toBeGreaterThan(0);
      expect(bgmVol).toBeLessThanOrEqual(0.15);
    });

    it("BGM creates a dedicated gain node with reduced volume", () => {
      const mgr = AudioManager.getInstance();
      const gains: any[] = [];
      mockAudioContext.createGain.mockReset();
      mockAudioContext.createGain.mockImplementation(() => {
        const g = createMockGain();
        gains.push(g);
        return g;
      });
      mgr.startBGM();
      // First gain is master, second is BGM gain
      expect(gains.length).toBeGreaterThanOrEqual(2);
      const bgmGain = gains[1];
      expect(bgmGain.gain.value).toBe(0.12);
    });

    it("BGM schedules next phrase via setTimeout for looping", () => {
      vi.useFakeTimers();
      const mgr = AudioManager.getInstance();
      mockAudioContext.createGain.mockImplementation(() => createMockGain());
      mgr.startBGM();
      const initialCalls = mockAudioContext.createOscillator.mock.calls.length;

      // Advance past phrase duration to trigger next scheduling
      vi.advanceTimersByTime(12000);
      expect(mockAudioContext.createOscillator.mock.calls.length).toBeGreaterThan(initialCalls);

      mgr.stopBGM();
      vi.useRealTimers();
    });

    it("stopBGM() applies fade-out ramp before disconnecting", () => {
      vi.useFakeTimers();
      const bgmGainNode = createMockGain();
      let gainCallCount = 0;
      mockAudioContext.createGain.mockImplementation(() => {
        gainCallCount++;
        if (gainCallCount === 2) return bgmGainNode;
        return createMockGain();
      });

      const mgr = AudioManager.getInstance();
      mgr.startBGM();
      mgr.stopBGM();

      // Should apply exponential ramp for fade-out
      expect(bgmGainNode.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, expect.any(Number));

      // Oscillators cleaned up after delay
      vi.advanceTimersByTime(400);
      expect(bgmGainNode.connect).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it("stopBGM() prevents further phrase scheduling", () => {
      vi.useFakeTimers();
      const mgr = AudioManager.getInstance();
      mockAudioContext.createGain.mockImplementation(() => createMockGain());
      mgr.startBGM();
      mgr.stopBGM();

      const callsAfterStop = mockAudioContext.createOscillator.mock.calls.length;
      vi.advanceTimersByTime(20000);
      // No new oscillators should be created after stop
      expect(mockAudioContext.createOscillator.mock.calls.length).toBe(callsAfterStop);

      vi.useRealTimers();
    });
  });
});
