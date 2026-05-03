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
  shuffleDeck,
  drawCard,
  MAX_DECK_SIZE,
  MAX_COPIES_PER_CARD,
  MAX_COPIES_LEGENDARY,
  MAX_HAND_SIZE,
  DrawResult,
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
    expect(shuffleDeck).toBeTypeOf("function");
    expect(drawCard).toBeTypeOf("function");
    expect(MAX_DECK_SIZE).toBeTypeOf("number");
    expect(MAX_COPIES_PER_CARD).toBe(2);
    expect(MAX_COPIES_LEGENDARY).toBe(1);
    expect(MAX_HAND_SIZE).toBe(10);
  });
});

describe("Deck copy validation", () => {
  it("allows 2 copies of non-legendary cards", () => {
    const cards: Card[] = [];
    for (let i = 0; i < 15; i++) {
      cards.push(makeCard({ name: `Card ${i}`, rarity: "common" }));
      cards.push(makeCard({ name: `Card ${i}`, rarity: "common" }));
    }
    expect(() => createDeck(cards)).not.toThrow();
  });

  it("rejects 3 copies of a non-legendary card", () => {
    const cards: Card[] = [];
    cards.push(makeCard({ name: "Dup", rarity: "common" }));
    cards.push(makeCard({ name: "Dup", rarity: "common" }));
    cards.push(makeCard({ name: "Dup", rarity: "common" }));
    for (let i = 0; i < 27; i++) {
      cards.push(makeCard({ name: `Filler ${i}` }));
    }
    expect(() => createDeck(cards)).toThrow('Card "Dup" appears 3 times (max 2 for common)');
  });

  it("allows 1 copy of a legendary card", () => {
    const cards: Card[] = [];
    cards.push(makeCard({ name: "Legend", rarity: "legendary" }));
    for (let i = 0; i < 29; i++) {
      cards.push(makeCard({ name: `Card ${i}` }));
    }
    expect(() => createDeck(cards)).not.toThrow();
  });

  it("rejects 2 copies of a legendary card", () => {
    const cards: Card[] = [];
    cards.push(makeCard({ name: "Legend", rarity: "legendary" }));
    cards.push(makeCard({ name: "Legend", rarity: "legendary" }));
    for (let i = 0; i < 28; i++) {
      cards.push(makeCard({ name: `Card ${i}` }));
    }
    expect(() => createDeck(cards)).toThrow('Card "Legend" appears 2 times (max 1 for legendary)');
  });
});

describe("shuffleDeck", () => {
  it("returns a deck with the same cards", () => {
    const deck = makeDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled).toHaveLength(30);
    const originalNames = [...deck].map((c) => c.name).sort();
    const shuffledNames = [...shuffled].map((c) => c.name).sort();
    expect(shuffledNames).toEqual(originalNames);
  });

  it("does not mutate the original deck", () => {
    const deck = makeDeck();
    const originalFirst = deck[0].name;
    shuffleDeck(deck);
    expect(deck[0].name).toBe(originalFirst);
  });
});

describe("drawCard", () => {
  it("draws the top card from deck to hand", () => {
    const player = makePlayerState();
    const topCard = player.deck[0];
    const result = drawCard(player);
    expect(result.drawn).toBe(topCard);
    expect(result.burned).toBeNull();
    expect(player.hand).toContain(topCard);
    expect(player.deck).toHaveLength(29);
  });

  it("returns null when deck is empty", () => {
    const player = makePlayerState();
    (player.deck as unknown as Card[]).length = 0;
    const result = drawCard(player);
    expect(result.drawn).toBeNull();
    expect(result.burned).toBeNull();
  });

  it("burns the card when hand is full (10 cards)", () => {
    const player = makePlayerState();
    player.hand = Array.from({ length: 10 }, (_, i) => makeCard({ name: `Hand ${i}` }));
    const topCard = player.deck[0];
    const result = drawCard(player);
    expect(result.drawn).toBeNull();
    expect(result.burned).toBe(topCard);
    expect(player.hand).toHaveLength(10);
    expect(player.deck).toHaveLength(29);
  });
});
