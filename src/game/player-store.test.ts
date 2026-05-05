import { describe, it, expect, beforeEach } from "vitest";
import {
  initializeNewPlayer,
  savePlayer,
  loadPlayer,
  addGold,
  addXP,
  addCards,
  getOwnedCards,
  openCardPack,
} from "./player-store";
import { STARTER_CARDS, XP_THRESHOLDS, PACK_PRICE } from "./progression";
import { vi } from "vitest";

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

describe("openCardPack", () => {
  it("fails if player has insufficient gold", () => {
    const result = openCardPack();
    expect(result.success).toBe(false);
    expect(result.cards).toHaveLength(0);
    expect(result.player.gold).toBe(0);
  });

  it("deducts pack price from gold on success", () => {
    addGold(PACK_PRICE);
    const result = openCardPack();
    expect(result.success).toBe(true);
    expect(result.player.gold).toBe(0);
  });

  it("returns exactly 5 cards", () => {
    addGold(PACK_PRICE);
    const result = openCardPack();
    expect(result.cards).toHaveLength(5);
  });

  it("each card has a valid rarity", () => {
    addGold(PACK_PRICE);
    const result = openCardPack();
    const validRarities = ["common", "rare", "epic", "legendary"];
    for (const card of result.cards) {
      expect(validRarities).toContain(card.rarity);
    }
  });

  it("each card has a non-empty cardName", () => {
    addGold(PACK_PRICE);
    const result = openCardPack();
    for (const card of result.cards) {
      expect(card.cardName).toBeTruthy();
    }
  });

  it("guarantees at least 1 rare or above (pity)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    addGold(PACK_PRICE);
    const result = openCardPack();
    const hasRarePlus = result.cards.some(
      (c) => c.rarity === "rare" || c.rarity === "epic" || c.rarity === "legendary"
    );
    expect(hasRarePlus).toBe(true);
    vi.restoreAllMocks();
  });

  it("adds opened cards to player collection", () => {
    addGold(PACK_PRICE);
    const result = openCardPack();
    for (const card of result.cards) {
      const owned = result.player.ownedCards.find((c) => c.cardName === card.cardName);
      expect(owned).toBeDefined();
      expect(owned!.count).toBeGreaterThanOrEqual(1);
    }
  });

  it("can open multiple packs spending gold each time", () => {
    addGold(PACK_PRICE * 3);
    const r1 = openCardPack();
    expect(r1.success).toBe(true);
    expect(r1.player.gold).toBe(PACK_PRICE * 2);
    const r2 = openCardPack();
    expect(r2.success).toBe(true);
    expect(r2.player.gold).toBe(PACK_PRICE);
    const r3 = openCardPack();
    expect(r3.success).toBe(true);
    expect(r3.player.gold).toBe(0);
    const r4 = openCardPack();
    expect(r4.success).toBe(false);
  });

  it("respects rarity weights statistically", () => {
    addGold(PACK_PRICE * 100);
    const counts = { common: 0, rare: 0, epic: 0, legendary: 0 };
    for (let i = 0; i < 100; i++) {
      const result = openCardPack();
      for (const card of result.cards) {
        counts[card.rarity]++;
      }
    }
    expect(counts.common).toBeGreaterThan(200);
    expect(counts.rare).toBeGreaterThan(50);
    expect(counts.legendary).toBeLessThan(50);
  });

  it("persists gold deduction to localStorage", () => {
    addGold(PACK_PRICE);
    openCardPack();
    const loaded = loadPlayer();
    expect(loaded.gold).toBe(0);
  });
});
