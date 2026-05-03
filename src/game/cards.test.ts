import { describe, it, expect } from "vitest";
import { cards } from "./cards";
import { Card, CardType, Rarity } from "./types";

describe("cards acceptance criteria", () => {
  it("has at least 30 cards", () => {
    expect(cards.length).toBeGreaterThanOrEqual(30);
  });

  it("includes minions, spells, and weapons", () => {
    const types = new Set(cards.map((c) => c.type));
    expect(types).toContain("minion");
    expect(types).toContain("spell");
    expect(types).toContain("weapon");
  });

  it("spans all rarities (common, rare, epic, legendary)", () => {
    const rarities = new Set(cards.map((c) => c.rarity));
    for (const r of ["common", "rare", "epic", "legendary"] as Rarity[]) {
      expect(rarities).toContain(r);
    }
  });

  it("every card has a unique, non-empty ability description", () => {
    const descriptions = cards.map((c) => c.description);
    for (const d of descriptions) {
      expect(d.length).toBeGreaterThan(0);
    }
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it("every card has a unique name", () => {
    const names = cards.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("cards are balanced across mana costs 1-10", () => {
    const costs = new Set(cards.map((c) => c.cost));
    for (let i = 1; i <= 10; i++) {
      expect(costs, `missing mana cost ${i}`).toContain(i);
    }
  });

  it("all cards conform to the Card interface", () => {
    for (const c of cards) {
      expect(typeof c.name).toBe("string");
      expect(typeof c.cost).toBe("number");
      expect(typeof c.attack).toBe("number");
      expect(typeof c.health).toBe("number");
      expect(typeof c.description).toBe("string");
      expect(["common", "rare", "epic", "legendary"]).toContain(c.rarity);
      expect(["minion", "spell", "weapon"]).toContain(c.type);
    }
  });
});
