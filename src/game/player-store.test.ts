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

beforeEach(() => {
  localStorage.clear();
});

describe("initializeNewPlayer", () => {
  it("creates a player with 10 starter cards", () => {
    const player = initializeNewPlayer();
    expect(player.ownedCards).toHaveLength(10);
    expect(player.ownedCards.map((c) => c.cardName)).toEqual(STARTER_CARDS);
  });

  it("each starter card has count 2 and upgradeLevel 1", () => {
    const player = initializeNewPlayer();
    for (const card of player.ownedCards) {
      expect(card.count).toBe(2);
      expect(card.upgradeLevel).toBe(1);
    }
  });

  it("starts with 0 gold, 0 xp, level 1", () => {
    const player = initializeNewPlayer();
    expect(player.gold).toBe(0);
    expect(player.xp).toBe(0);
    expect(player.level).toBe(1);
  });
});

describe("savePlayer / loadPlayer", () => {
  it("round-trips without data loss", () => {
    const player = initializeNewPlayer();
    player.gold = 500;
    player.xp = 300;
    player.level = 4;
    player.ownedCards[0].count = 5;
    player.ownedCards[0].upgradeLevel = 3;
    savePlayer(player);
    const loaded = loadPlayer();
    expect(loaded).toEqual(player);
  });

  it("returns a new player when nothing is stored", () => {
    const player = loadPlayer();
    expect(player.level).toBe(1);
    expect(player.gold).toBe(0);
    expect(player.ownedCards).toHaveLength(10);
  });

  it("returns a new player when stored data is invalid", () => {
    localStorage.setItem("sanguo-card-player", JSON.stringify({ bad: true }));
    const player = loadPlayer();
    expect(player.level).toBe(1);
    expect(player.ownedCards).toHaveLength(10);
  });
});

describe("addGold", () => {
  it("adds gold correctly", () => {
    const p1 = addGold(100);
    expect(p1.gold).toBe(100);
    const p2 = addGold(50);
    expect(p2.gold).toBe(150);
  });

  it("handles negative amounts (spending)", () => {
    addGold(200);
    const p = addGold(-75);
    expect(p.gold).toBe(125);
  });
});

describe("addXP", () => {
  it("accumulates xp", () => {
    const p = addXP(50);
    expect(p.xp).toBe(50);
    const p2 = addXP(30);
    expect(p2.xp).toBe(80);
  });

  it("levels up at threshold", () => {
    const p = addXP(100);
    expect(p.level).toBe(2);
    expect(p.xp).toBe(100);
  });

  it("skips levels when xp exceeds multiple thresholds", () => {
    const p = addXP(700);
    expect(p.level).toBe(5);
  });

  it("reaches max level at highest threshold", () => {
    const p = addXP(XP_THRESHOLDS[XP_THRESHOLDS.length - 1]);
    expect(p.level).toBe(XP_THRESHOLDS.length);
  });

  it("stays at level 1 below first threshold", () => {
    const p = addXP(99);
    expect(p.level).toBe(1);
  });
});

describe("addCards", () => {
  it("increments count for existing cards", () => {
    addCards([{ cardName: "乡勇", count: 3 }]);
    const cards = getOwnedCards();
    const card = cards.find((c) => c.cardName === "乡勇")!;
    expect(card.count).toBe(5);
  });

  it("adds new cards not in starter set", () => {
    addCards([{ cardName: "关羽", count: 1 }]);
    const cards = getOwnedCards();
    const card = cards.find((c) => c.cardName === "关羽")!;
    expect(card.count).toBe(1);
    expect(card.upgradeLevel).toBe(1);
  });
});

describe("getOwnedCards", () => {
  it("returns starter cards for a fresh player", () => {
    const cards = getOwnedCards();
    expect(cards).toHaveLength(10);
  });
});
