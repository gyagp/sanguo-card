import { describe, it, expect, beforeEach } from "vitest";
import {
  AdventureProgress,
  loadAdventureProgress,
  saveAdventureProgress,
  isStageUnlocked,
  completeStage,
} from "./player-store";

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  for (const key of Object.keys(mockStorage)) delete mockStorage[key];
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (k: string) => mockStorage[k] ?? null,
      setItem: (k: string, v: string) => { mockStorage[k] = v; },
      removeItem: (k: string) => { delete mockStorage[k]; },
    },
    writable: true,
    configurable: true,
  });
});

describe("AdventureProgress type and persistence", () => {
  it("initializes with chapter 1 unlocked and empty stages", () => {
    const progress = loadAdventureProgress();
    expect(progress.chaptersUnlocked).toContain("ch1");
    expect(Object.keys(progress.stages)).toHaveLength(0);
  });

  it("saves and loads progress from localStorage", () => {
    const progress: AdventureProgress = {
      stages: { "ch1-1": { completed: true, stars: 3 } },
      chaptersUnlocked: ["ch1"],
    };
    saveAdventureProgress(progress);
    const loaded = loadAdventureProgress();
    expect(loaded.stages["ch1-1"]).toEqual({ completed: true, stars: 3 });
    expect(loaded.chaptersUnlocked).toEqual(["ch1"]);
  });

  it("falls back to default on corrupt JSON", () => {
    mockStorage["sanguo-card-adventure"] = "{{not valid json";
    const progress = loadAdventureProgress();
    expect(progress.chaptersUnlocked).toContain("ch1");
    expect(Object.keys(progress.stages)).toHaveLength(0);
  });

  it("falls back to default on invalid shape", () => {
    mockStorage["sanguo-card-adventure"] = JSON.stringify({ foo: "bar" });
    const progress = loadAdventureProgress();
    expect(progress.chaptersUnlocked).toContain("ch1");
  });
});

describe("Sequential stage unlocking", () => {
  it("first stage of unlocked chapter is always unlocked", () => {
    expect(isStageUnlocked("ch1-1")).toBe(true);
  });

  it("second stage is locked until first is completed", () => {
    expect(isStageUnlocked("ch1-2")).toBe(false);
    completeStage("ch1-1", 2);
    expect(isStageUnlocked("ch1-2")).toBe(true);
  });

  it("stage in locked chapter is not unlocked", () => {
    expect(isStageUnlocked("ch2-1")).toBe(false);
  });

  it("accepts progress parameter to avoid redundant loads", () => {
    const progress = loadAdventureProgress();
    expect(isStageUnlocked("ch1-1", progress)).toBe(true);
    expect(isStageUnlocked("ch1-2", progress)).toBe(false);
  });
});

describe("Chapter unlocking via boss clear", () => {
  it("clears all ch1 stages then boss unlocks ch2", () => {
    let p = completeStage("ch1-1", 3);
    p = completeStage("ch1-2", 3, p);
    p = completeStage("ch1-3", 3, p);
    p = completeStage("ch1-4", 3, p);
    p = completeStage("ch1-5", 3, p);
    p = completeStage("ch1-boss", 3, p);
    expect(p.chaptersUnlocked).toContain("ch2");
    expect(isStageUnlocked("ch2-1", p)).toBe(true);
  });

  it("non-boss stage completion does not unlock next chapter", () => {
    const p = completeStage("ch1-3", 3);
    expect(p.chaptersUnlocked).not.toContain("ch2");
  });
});

describe("Star ratings", () => {
  it("stores star rating on completion", () => {
    const p = completeStage("ch1-1", 2);
    expect(p.stages["ch1-1"].stars).toBe(2);
  });

  it("keeps higher star rating on replay", () => {
    completeStage("ch1-1", 3);
    const p = completeStage("ch1-1", 1);
    expect(p.stages["ch1-1"].stars).toBe(3);
  });

  it("upgrades star rating when replayed with better score", () => {
    completeStage("ch1-1", 1);
    const p = completeStage("ch1-1", 3);
    expect(p.stages["ch1-1"].stars).toBe(3);
  });
});
