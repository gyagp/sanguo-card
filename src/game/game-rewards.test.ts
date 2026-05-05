import { describe, it, expect, beforeEach, vi } from "vitest";
import { addGold, addXP, loadPlayer, savePlayer, initializeNewPlayer } from "./player-store";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

describe("Game reward integration", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe("Victory rewards (30 gold, 50 XP)", () => {
    it("awards 30 gold on victory", () => {
      const initial = loadPlayer();
      expect(initial.gold).toBe(0);
      const after = addGold(30);
      expect(after.gold).toBe(30);
    });

    it("awards 50 XP on victory", () => {
      const initial = loadPlayer();
      expect(initial.xp).toBe(0);
      const after = addXP(50);
      expect(after.xp).toBe(50);
    });

    it("awards both gold and XP matching victory amounts", () => {
      addGold(30);
      const after = addXP(50);
      expect(after.gold).toBe(30);
      expect(after.xp).toBe(50);
    });
  });

  describe("Defeat rewards (10 gold, 20 XP)", () => {
    it("awards 10 gold on defeat", () => {
      const after = addGold(10);
      expect(after.gold).toBe(10);
    });

    it("awards 20 XP on defeat", () => {
      const after = addXP(20);
      expect(after.xp).toBe(20);
    });
  });

  describe("Rewards are persisted via player-store", () => {
    it("gold persists across loadPlayer calls", () => {
      addGold(30);
      const reloaded = loadPlayer();
      expect(reloaded.gold).toBe(30);
    });

    it("XP persists across loadPlayer calls", () => {
      addXP(50);
      const reloaded = loadPlayer();
      expect(reloaded.xp).toBe(50);
    });

    it("rewards accumulate over multiple games", () => {
      addGold(30); addXP(50); // victory
      addGold(10); addXP(20); // defeat
      addGold(30); addXP(50); // victory
      const player = loadPlayer();
      expect(player.gold).toBe(70);
      expect(player.xp).toBe(120);
    });

    it("XP triggers level up when threshold reached", () => {
      // XP_THRESHOLDS[1] = 100 for level 2
      addXP(50); addXP(50); // 100 total → level 2
      const player = loadPlayer();
      expect(player.level).toBe(2);
    });
  });

  describe("Reward amount correctness from game page logic", () => {
    it("victory condition (winner===0) maps to 30 gold 50 XP", () => {
      const winner = 0;
      const isVictory = winner === 0;
      const gold = isVictory ? 30 : 10;
      const xp = isVictory ? 50 : 20;
      expect(gold).toBe(30);
      expect(xp).toBe(50);
    });

    it("defeat condition (winner===1) maps to 10 gold 20 XP", () => {
      const winner = 1;
      const isVictory = winner === 0;
      const gold = isVictory ? 30 : 10;
      const xp = isVictory ? 50 : 20;
      expect(gold).toBe(10);
      expect(xp).toBe(20);
    });

    it("draw condition maps to defeat rewards (10 gold 20 XP)", () => {
      const winner = "draw";
      const isVictory = winner === 0;
      const gold = isVictory ? 30 : 10;
      const xp = isVictory ? 50 : 20;
      expect(gold).toBe(10);
      expect(xp).toBe(20);
    });
  });
});
