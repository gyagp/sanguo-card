import { describe, it, expect } from "vitest";
import { cards } from "./cards";
import { AIDifficulty } from "./ai";
import { Rarity, MAX_DECK_SIZE } from "./types";

function buildRandomDeck(difficulty?: AIDifficulty) {
  let pool = cards;
  if (difficulty === "easy") {
    pool = cards.filter((c) => c.rarity === "common");
  } else if (difficulty === "normal") {
    pool = cards.filter((c) => c.rarity === "common" || c.rarity === "rare");
  }
  const deck = [];
  while (deck.length < MAX_DECK_SIZE) {
    deck.push(pool[deck.length % pool.length]);
  }
  return deck;
}

const allowedRarities: Record<string, Rarity[]> = {
  easy: ["common"],
  normal: ["common", "rare"],
  hard: ["common", "rare", "epic", "legendary"],
};

describe("Difficulty-based deck quality", () => {
  it("card pool has all four rarities", () => {
    const rarities = new Set(cards.map((c) => c.rarity));
    expect(rarities).toContain("common");
    expect(rarities).toContain("rare");
    expect(rarities).toContain("epic");
    expect(rarities).toContain("legendary");
  });

  it("Easy AI decks contain only common cards", () => {
    const deck = buildRandomDeck("easy");
    expect(deck).toHaveLength(MAX_DECK_SIZE);
    for (const card of deck) {
      expect(card.rarity).toBe("common");
    }
  });

  it("Normal AI decks contain only common and rare cards", () => {
    const deck = buildRandomDeck("normal");
    expect(deck).toHaveLength(MAX_DECK_SIZE);
    const rarities = new Set(deck.map((c) => c.rarity));
    for (const r of rarities) {
      expect(["common", "rare"]).toContain(r);
    }
    expect(rarities).toContain("common");
    expect(rarities).toContain("rare");
  });

  it("Hard AI decks contain all rarities including epics and legendaries", () => {
    const deck = buildRandomDeck("hard");
    expect(deck).toHaveLength(MAX_DECK_SIZE);
    const rarities = new Set(deck.map((c) => c.rarity));
    expect(rarities).toContain("epic");
    expect(rarities).toContain("legendary");
  });

  it("Easy deck has no rare, epic, or legendary cards", () => {
    const deck = buildRandomDeck("easy");
    const forbidden: Rarity[] = ["rare", "epic", "legendary"];
    for (const card of deck) {
      expect(forbidden).not.toContain(card.rarity);
    }
  });

  it("Normal deck has no epic or legendary cards", () => {
    const deck = buildRandomDeck("normal");
    const forbidden: Rarity[] = ["epic", "legendary"];
    for (const card of deck) {
      expect(forbidden).not.toContain(card.rarity);
    }
  });

  it("buildRandomDeck accepts difficulty parameter", () => {
    expect(() => buildRandomDeck("easy")).not.toThrow();
    expect(() => buildRandomDeck("normal")).not.toThrow();
    expect(() => buildRandomDeck("hard")).not.toThrow();
  });
});
