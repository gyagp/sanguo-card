import { describe, it, expect, beforeEach } from "vitest";
import {
  initializeNewPlayer,
  savePlayer,
  loadPlayer,
  addGold,
  addXP,
  addCards,
  getOwnedCards,
} from "./player-store";
import { STARTER_CARDS, XP_THRESHOLDS } from "./progression";

const STORAGE_KEY = "sanguo-card-player";

beforeEach(() => {
  localStorage.clear();
});

describe("initializeNewPlayer", () => {
  it("returns gold 0, xp 0, level 1 with starter cards", () => {
    const p = initializeNewPlayer();
    expect(p.gold).toBe(0);
    expect(p.xp).toBe(0);
    expect(p.level).toBe(1);
    expect(p.ownedCards).toHaveLength(STARTER_CARDS.length);
    for (const card of p.ownedCards) {
      expect(STARTER_CARDS).toContain(card.cardName);
      expect(card.count).toBe(2);
      expect(card.upgradeLevel).toBe(1);
    }
  });
});

describe("savePlayer / loadPlayer", () => {
  it("persists to localStorage key sanguo-card-player", () => {
    const p = initializeNewPlayer();
    savePlayer(p);
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual(p);
  });

  it("loadPlayer returns saved data when valid", () => {
    const p = initializeNewPlayer();
    p.gold = 42;
    savePlayer(p);
    const loaded = loadPlayer();
    expect(loaded.gold).toBe(42);
  });

  it("loadPlayer initializes new player when no data", () => {
    const loaded = loadPlayer();
    expect(loaded.level).toBe(1);
    expect(loaded.gold).toBe(0);
    expect(loaded.ownedCards.length).toBeGreaterThan(0);
    // also persists the new player
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it("loadPlayer re-initializes on corrupted data", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ bad: true }));
    const loaded = loadPlayer();
    expect(loaded.level).toBe(1);
    expect(loaded.gold).toBe(0);
  });
});

describe("addGold", () => {
  it("adds gold and persists", () => {
    loadPlayer(); // init
    const p = addGold(50);
    expect(p.gold).toBe(50);
    expect(loadPlayer().gold).toBe(50);
  });

  it("accumulates across calls", () => {
    loadPlayer();
    addGold(10);
    const p = addGold(25);
    expect(p.gold).toBe(35);
  });
});

describe("addXP", () => {
  it("adds XP and persists", () => {
    loadPlayer();
    const p = addXP(50);
    expect(p.xp).toBe(50);
    expect(loadPlayer().xp).toBe(50);
  });

  it("triggers level-up when XP threshold reached", () => {
    loadPlayer();
    // XP_THRESHOLDS[1] = 100 → level 2
    const p = addXP(XP_THRESHOLDS[1]);
    expect(p.level).toBe(2);
  });

  it("handles multi-level jump", () => {
    loadPlayer();
    // enough XP for level 5 (700)
    const p = addXP(XP_THRESHOLDS[4]);
    expect(p.level).toBe(5);
  });

  it("stays at level 1 below first threshold", () => {
    loadPlayer();
    const p = addXP(XP_THRESHOLDS[1] - 1);
    expect(p.level).toBe(1);
  });
});

describe("addCards", () => {
  it("increments count of existing card", () => {
    loadPlayer();
    const starter = STARTER_CARDS[0];
    const p = addCards([{ cardName: starter, count: 3 }]);
    const card = p.ownedCards.find((c) => c.cardName === starter);
    expect(card!.count).toBe(5); // 2 starter + 3
  });

  it("adds new card not in starter set", () => {
    loadPlayer();
    const p = addCards([{ cardName: "关羽", count: 1 }]);
    const card = p.ownedCards.find((c) => c.cardName === "关羽");
    expect(card).toBeDefined();
    expect(card!.count).toBe(1);
    expect(card!.upgradeLevel).toBe(1);
  });

  it("handles multiple cards at once", () => {
    loadPlayer();
    const p = addCards([
      { cardName: "关羽", count: 2 },
      { cardName: STARTER_CARDS[1], count: 1 },
    ]);
    expect(p.ownedCards.find((c) => c.cardName === "关羽")!.count).toBe(2);
    expect(p.ownedCards.find((c) => c.cardName === STARTER_CARDS[1])!.count).toBe(3);
  });

  it("persists changes", () => {
    loadPlayer();
    addCards([{ cardName: "关羽", count: 1 }]);
    const reloaded = loadPlayer();
    expect(reloaded.ownedCards.find((c) => c.cardName === "关羽")).toBeDefined();
  });
});

describe("getOwnedCards", () => {
  it("returns owned cards from current profile", () => {
    loadPlayer();
    const cards = getOwnedCards();
    expect(cards).toHaveLength(STARTER_CARDS.length);
  });

  it("reflects mutations", () => {
    loadPlayer();
    addCards([{ cardName: "张飞", count: 1 }]);
    const cards = getOwnedCards();
    expect(cards.find((c) => c.cardName === "张飞")).toBeDefined();
  });
});
