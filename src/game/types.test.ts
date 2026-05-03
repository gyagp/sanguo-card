import { describe, it, expect } from "vitest";
import {
  Card,
  Hero,
  HeroPower,
  GameState,
  PlayerState,
  BoardMinion,
  Deck,
  GamePhase,
  Rarity,
  CardType,
  createDeck,
  MAX_DECK_SIZE,
} from "./types";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    name: "Test Card",
    cost: 1,
    attack: 2,
    health: 3,
    description: "A test card",
    rarity: "common",
    type: "minion",
    ...overrides,
  };
}

function makeHero(): Hero {
  return {
    health: 30,
    mana: 0,
    heroPower: { name: "Fireblast", cost: 2, description: "Deal 1 damage" },
  };
}

function makeDeck(): Deck {
  return createDeck(Array.from({ length: 30 }, (_, i) => makeCard({ name: `Card ${i}` })));
}

function makePlayerState(): PlayerState {
  return {
    hero: makeHero(),
    deck: makeDeck(),
    hand: [],
    board: [],
    maxMana: 0,
  };
}

describe("Card interface", () => {
  it("has all required fields", () => {
    const card = makeCard();
    expect(card).toHaveProperty("name");
    expect(card).toHaveProperty("cost");
    expect(card).toHaveProperty("attack");
    expect(card).toHaveProperty("health");
    expect(card).toHaveProperty("description");
    expect(card).toHaveProperty("rarity");
    expect(card).toHaveProperty("type");
  });

  it("accepts all rarity values", () => {
    const rarities: Rarity[] = ["common", "rare", "epic", "legendary"];
    rarities.forEach((rarity) => {
      expect(makeCard({ rarity }).rarity).toBe(rarity);
    });
  });

  it("accepts all card type values", () => {
    const types: CardType[] = ["minion", "spell", "weapon"];
    types.forEach((type) => {
      expect(makeCard({ type }).type).toBe(type);
    });
  });
});

describe("Hero interface", () => {
  it("has health, mana, and heroPower", () => {
    const hero = makeHero();
    expect(hero).toHaveProperty("health");
    expect(hero).toHaveProperty("mana");
    expect(hero).toHaveProperty("heroPower");
    expect(hero.heroPower).toHaveProperty("name");
    expect(hero.heroPower).toHaveProperty("cost");
    expect(hero.heroPower).toHaveProperty("description");
  });
});

describe("Deck", () => {
  it("createDeck succeeds with exactly 30 cards", () => {
    const deck = makeDeck();
    expect(deck).toHaveLength(30);
  });

  it("createDeck throws with fewer than 30 cards", () => {
    expect(() => createDeck([makeCard()])).toThrow("Deck must contain exactly 30 cards");
  });

  it("createDeck throws with more than 30 cards", () => {
    const cards = Array.from({ length: 31 }, () => makeCard());
    expect(() => createDeck(cards)).toThrow("Deck must contain exactly 30 cards");
  });

  it("MAX_DECK_SIZE is 30", () => {
    expect(MAX_DECK_SIZE).toBe(30);
  });
});

describe("GameState interface", () => {
  it("has players, board, turn, and phase", () => {
    const state: GameState = {
      players: [makePlayerState(), makePlayerState()],
      board: [[], []],
      turn: 1,
      phase: "playing",
    };
    expect(state.players).toHaveLength(2);
    expect(state.board).toHaveLength(2);
    expect(state.turn).toBe(1);
    expect(state.phase).toBe("playing");
  });

  it("accepts all game phases", () => {
    const phases: GamePhase[] = ["mulligan", "playing", "ended"];
    phases.forEach((phase) => {
      const state: GameState = {
        players: [makePlayerState(), makePlayerState()],
        board: [[], []],
        turn: 1,
        phase,
      };
      expect(state.phase).toBe(phase);
    });
  });
});

describe("All types exported from src/game/types.ts", () => {
  it("exports all required types and interfaces", () => {
    expect(createDeck).toBeTypeOf("function");
    expect(MAX_DECK_SIZE).toBeTypeOf("number");
    // Type-only exports (Card, Hero, GameState, etc.) are verified
    // by the TypeScript compiler through usage above.
  });
});
