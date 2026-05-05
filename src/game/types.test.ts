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
  Faction,
  CardType,
  GameEventType,
  GameEvent,
  EffectContext,
  Effect,
  createDeck,
  shuffleDeck,
  drawCard,
  MAX_DECK_SIZE,
  MAX_COPIES_PER_CARD,
  MAX_COPIES_LEGENDARY,
  MAX_HAND_SIZE,
  MAX_MANA,
  STARTING_HP,
  MAX_BOARD_SIZE,
  DrawResult,
  createPlayerState,
  initializeGame,
  startTurn,
  endTurn,
  playCard,
  attackMinion,
  attackHero,
  useHeroPower,
  removeDeadMinions,
  checkWinCondition,
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
    faction: "neutral",
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
    weapon: null,
    heroPowerUsed: false,
    heroHasAttacked: false,
    heroWindfuryAttacksLeft: 0,
    deckFaction: "neutral" as Faction,
    hasDeckFactionBonus: false,
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
      turnPhase: "play",
      activePlayer: 0,
      spellsPlayed: [[], []],
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
        turnPhase: "play",
        activePlayer: 0,
        spellsPlayed: [[], []],
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

describe("initializeGame", () => {
  it("creates game with both players at 30 HP and 0 mana crystals", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    expect(state.players[0].hero.health).toBe(STARTING_HP);
    expect(state.players[1].hero.health).toBe(STARTING_HP);
    expect(state.players[0].maxMana).toBe(0);
    expect(state.players[1].maxMana).toBe(0);
    expect(state.players[0].hero.mana).toBe(0);
    expect(state.players[1].hero.mana).toBe(0);
    expect(state.turn).toBe(0);
    expect(state.phase).toBe("playing");
  });
});

describe("startTurn", () => {
  it("increases maxMana by 1 and refills mana", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    startTurn(state);
    const player = state.players[0];
    expect(player.maxMana).toBe(1);
    expect(player.hero.mana).toBe(1);
  });

  it("increments turn counter", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    startTurn(state);
    expect(state.turn).toBe(1);
  });

  it("draws a card", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    const result = startTurn(state);
    expect(result.drawn).not.toBeNull();
    expect(state.players[0].hand).toHaveLength(4);
  });

  it("sets turnPhase to play after start", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    startTurn(state);
    expect(state.turnPhase).toBe("play");
  });

  it("caps mana at 10", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].maxMana = 10;
    startTurn(state);
    expect(state.players[0].maxMana).toBe(10);
    expect(state.players[0].hero.mana).toBe(10);
  });

  it("mana increases each turn up to 10", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    for (let i = 1; i <= 12; i++) {
      startTurn(state);
      const expected = Math.min(i, MAX_MANA);
      expect(state.players[0].maxMana).toBe(expected);
      expect(state.players[0].hero.mana).toBe(expected);
      endTurn(state);
      // Skip opponent turn
      startTurn(state);
      endTurn(state);
    }
  });
});

describe("endTurn", () => {
  it("switches active player", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    expect(state.activePlayer).toBe(0);
    startTurn(state);
    endTurn(state);
    expect(state.activePlayer).toBe(1);
    startTurn(state);
    endTurn(state);
    expect(state.activePlayer).toBe(0);
  });

  it("sets turnPhase to end", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    startTurn(state);
    endTurn(state);
    expect(state.turnPhase).toBe("end");
  });
});

describe("playCard", () => {
  function setupGame(mana: number, handCards: Card[]): GameState {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].hero.mana = mana;
    state.players[0].maxMana = mana;
    state.players[0].hand = [...handCards];
    return state;
  }

  it("plays a minion card, deducting mana and placing on board", () => {
    const minion = makeCard({ name: "Warrior", cost: 3, attack: 4, health: 5, type: "minion" });
    const state = setupGame(5, [minion]);
    const result = playCard(state, 0);
    expect(result.success).toBe(true);
    expect(state.players[0].hero.mana).toBe(2);
    expect(state.players[0].hand).toHaveLength(0);
    expect(state.players[0].board).toHaveLength(1);
    expect(state.players[0].board[0].name).toBe("Warrior");
    expect(state.players[0].board[0].currentAttack).toBe(4);
    expect(state.players[0].board[0].currentHealth).toBe(5);
  });

  it("minions have summoning sickness when played", () => {
    const minion = makeCard({ cost: 1, type: "minion" });
    const state = setupGame(1, [minion]);
    playCard(state, 0);
    expect(state.players[0].board[0].summoningSickness).toBe(true);
  });

  it("summoning sickness is removed at start of next turn", () => {
    const minion = makeCard({ cost: 1, type: "minion" });
    const state = setupGame(1, [minion]);
    playCard(state, 0);
    endTurn(state);
    startTurn(state);
    endTurn(state);
    startTurn(state);
    expect(state.players[0].board[0].summoningSickness).toBe(false);
  });

  it("rejects playing a card with insufficient mana", () => {
    const minion = makeCard({ cost: 5, type: "minion" });
    const state = setupGame(3, [minion]);
    const result = playCard(state, 0);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Not enough mana");
    expect(state.players[0].hand).toHaveLength(1);
    expect(state.players[0].hero.mana).toBe(3);
  });

  it("rejects playing when board is full (7 minions)", () => {
    const minion = makeCard({ cost: 1, type: "minion" });
    const state = setupGame(1, [minion]);
    state.players[0].board = Array.from({ length: MAX_BOARD_SIZE }, () =>
      makeBoardMinion({ currentAttack: 1, currentHealth: 1 })
    );
    const result = playCard(state, 0);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Board is full");
  });

  it("rejects invalid hand index", () => {
    const state = setupGame(5, [makeCard()]);
    expect(playCard(state, -1).success).toBe(false);
    expect(playCard(state, 5).success).toBe(false);
  });

  it("plays a spell card and removes it from hand", () => {
    const spell = makeCard({ name: "Fireball", cost: 4, type: "spell" });
    const state = setupGame(5, [spell]);
    const result = playCard(state, 0);
    expect(result.success).toBe(true);
    expect(state.players[0].hero.mana).toBe(1);
    expect(state.players[0].hand).toHaveLength(0);
    expect(state.players[0].board).toHaveLength(0);
  });

  it("plays a weapon card and equips it to hero", () => {
    const weapon = makeCard({ name: "Axe", cost: 2, attack: 3, health: 2, type: "weapon" });
    const state = setupGame(5, [weapon]);
    const result = playCard(state, 0);
    expect(result.success).toBe(true);
    expect(state.players[0].hero.mana).toBe(3);
    expect(state.players[0].hand).toHaveLength(0);
    expect(state.players[0].weapon).toEqual({ name: "Axe", attack: 3, durability: 2, windfury: undefined });
  });

  it("MAX_BOARD_SIZE is 7", () => {
    expect(MAX_BOARD_SIZE).toBe(7);
  });
});

function makeBoardMinion(overrides: Partial<BoardMinion> = {}): BoardMinion {
  return {
    ...makeCard({ type: "minion" }),
    currentAttack: 2,
    currentHealth: 3,
    summoningSickness: false,
    hasAttacked: false,
    hasDivineShield: false,
    isStealth: false,
    isFrozen: false,
    freezeTurnsLeft: 0,
    isImmune: false,
    windfuryAttacksLeft: 1,
    enrageActive: false,
    enrageBonus: 0, factionAttackBonus: 0, factionHealthBonus: 0,
    ...overrides,
  };
}

describe("attackMinion", () => {
  function setupCombat(): GameState {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].board = [makeBoardMinion({ name: "Attacker", currentAttack: 3, currentHealth: 4 })];
    state.players[1].board = [makeBoardMinion({ name: "Defender", currentAttack: 2, currentHealth: 3 })];
    return state;
  }

  it("both minions take damage equal to opponent's attack", () => {
    const state = setupCombat();
    const result = attackMinion(state, 0, 0);
    expect(result.success).toBe(true);
    expect(state.players[0].board[0].currentHealth).toBe(2); // 4 - 2
    expect(state.players[1].board).toHaveLength(0); // 3 - 3 = 0, removed
  });

  it("removes minions with 0 or less health", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].board = [makeBoardMinion({ currentAttack: 5, currentHealth: 1 })];
    state.players[1].board = [makeBoardMinion({ currentAttack: 5, currentHealth: 1 })];
    attackMinion(state, 0, 0);
    expect(state.players[0].board).toHaveLength(0);
    expect(state.players[1].board).toHaveLength(0);
  });

  it("rejects attack with summoning sickness", () => {
    const state = setupCombat();
    state.players[0].board[0].summoningSickness = true;
    const result = attackMinion(state, 0, 0);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Minion has summoning sickness");
  });

  it("rejects attack if minion already attacked", () => {
    const state = setupCombat();
    state.players[0].board[0].hasAttacked = true;
    const result = attackMinion(state, 0, 0);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Minion has already attacked this turn");
  });

  it("rejects invalid attacker index", () => {
    const state = setupCombat();
    expect(attackMinion(state, 5, 0).success).toBe(false);
  });

  it("rejects invalid defender index", () => {
    const state = setupCombat();
    expect(attackMinion(state, 0, 5).success).toBe(false);
  });
});

describe("attackHero", () => {
  it("deals damage to enemy hero", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].board = [makeBoardMinion({ currentAttack: 5 })];
    const result = attackHero(state, 0);
    expect(result.success).toBe(true);
    expect(state.players[1].hero.health).toBe(25);
  });

  it("rejects attack with summoning sickness", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].board = [makeBoardMinion({ summoningSickness: true })];
    const result = attackHero(state, 0);
    expect(result.success).toBe(false);
  });

  it("sets game to ended when hero health reaches 0", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].board = [makeBoardMinion({ currentAttack: 30 })];
    attackHero(state, 0);
    expect(state.players[1].hero.health).toBe(0);
    expect(state.phase).toBe("ended");
  });

  it("rejects attack from minion with 0 attack", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].board = [makeBoardMinion({ currentAttack: 0 })];
    const result = attackHero(state, 0);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Minion has 0 attack");
  });

  it("marks minion as having attacked", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].board = [makeBoardMinion({ currentAttack: 1 })];
    attackHero(state, 0);
    expect(state.players[0].board[0].hasAttacked).toBe(true);
  });
});

describe("checkWinCondition", () => {
  it("returns null when both heroes alive", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    expect(checkWinCondition(state)).toBeNull();
  });

  it("returns 0 when player 2 hero dies", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[1].hero.health = 0;
    expect(checkWinCondition(state)).toBe(0);
  });

  it("returns 1 when player 1 hero dies", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].hero.health = 0;
    expect(checkWinCondition(state)).toBe(1);
  });

  it("returns 'draw' when both heroes die simultaneously", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].hero.health = 0;
    state.players[1].hero.health = 0;
    expect(checkWinCondition(state)).toBe("draw");
  });
});

describe("useHeroPower", () => {
  it("costs 2 mana by default", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].hero.mana = 5;
    const result = useHeroPower(state);
    expect(result.success).toBe(true);
    expect(state.players[0].hero.mana).toBe(3);
  });

  it("cannot be used twice per turn", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].hero.mana = 5;
    useHeroPower(state);
    const result = useHeroPower(state);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Hero power already used this turn");
  });

  it("rejects when not enough mana", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].hero.mana = 1;
    const result = useHeroPower(state);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Not enough mana");
  });

  it("resets at start of turn", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].hero.mana = 5;
    useHeroPower(state);
    expect(state.players[0].heroPowerUsed).toBe(true);
    endTurn(state);
    startTurn(state);
    endTurn(state);
    startTurn(state);
    expect(state.players[0].heroPowerUsed).toBe(false);
  });
});

describe("Card keyword fields", () => {
  it("all keyword fields are optional and default to undefined", () => {
    const card = makeCard();
    expect(card.taunt).toBeUndefined();
    expect(card.charge).toBeUndefined();
    expect(card.divineShield).toBeUndefined();
    expect(card.deathrattle).toBeUndefined();
    expect(card.battlecry).toBeUndefined();
    expect(card.stealth).toBeUndefined();
    expect(card.windfury).toBeUndefined();
    expect(card.enrage).toBeUndefined();
    expect(card.spellDamage).toBeUndefined();
    expect(card.freeze).toBeUndefined();
    expect(card.immune).toBeUndefined();
  });

  it("accepts boolean keyword fields", () => {
    const card = makeCard({
      taunt: true,
      charge: true,
      divineShield: true,
      stealth: true,
      windfury: true,
      freeze: true,
      immune: true,
    });
    expect(card.taunt).toBe(true);
    expect(card.charge).toBe(true);
    expect(card.divineShield).toBe(true);
    expect(card.stealth).toBe(true);
    expect(card.windfury).toBe(true);
    expect(card.freeze).toBe(true);
    expect(card.immune).toBe(true);
  });

  it("accepts spellDamage as a number", () => {
    const card = makeCard({ spellDamage: 2 });
    expect(card.spellDamage).toBe(2);
  });

  it("accepts Effect functions for deathrattle, battlecry, enrage", () => {
    const effect: Effect = (state, _context) => state;
    const card = makeCard({ deathrattle: effect, battlecry: effect, enrage: effect });
    expect(card.deathrattle).toBeTypeOf("function");
    expect(card.battlecry).toBeTypeOf("function");
    expect(card.enrage).toBeTypeOf("function");
  });
});

describe("BoardMinion runtime state", () => {
  it("has all runtime keyword fields", () => {
    const minion = makeBoardMinion();
    expect(minion.hasDivineShield).toBe(false);
    expect(minion.isStealth).toBe(false);
    expect(minion.isFrozen).toBe(false);
    expect(minion.isImmune).toBe(false);
    expect(minion.windfuryAttacksLeft).toBe(1);
    expect(minion.enrageActive).toBe(false);
  });

  it("playCard initializes runtime state from card keywords", () => {
    const card = makeCard({
      cost: 1,
      type: "minion",
      divineShield: true,
      stealth: true,
      windfury: true,
      immune: true,
      charge: true,
    });
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].hero.mana = 10;
    state.players[0].hand = [card];
    playCard(state, 0);
    const minion = state.players[0].board[0];
    expect(minion.hasDivineShield).toBe(true);
    expect(minion.isStealth).toBe(true);
    expect(minion.isImmune).toBe(true);
    expect(minion.windfuryAttacksLeft).toBe(2);
    expect(minion.summoningSickness).toBe(false); // charge
    expect(minion.isFrozen).toBe(false);
    expect(minion.enrageActive).toBe(false);
  });

  it("playCard defaults runtime state for cards without keywords", () => {
    const card = makeCard({ cost: 1, type: "minion" });
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].hero.mana = 10;
    state.players[0].hand = [card];
    playCard(state, 0);
    const minion = state.players[0].board[0];
    expect(minion.hasDivineShield).toBe(false);
    expect(minion.isStealth).toBe(false);
    expect(minion.isImmune).toBe(false);
    expect(minion.windfuryAttacksLeft).toBe(1);
    expect(minion.summoningSickness).toBe(true);
  });
});

describe("GameEvent types", () => {
  it("GameEventType covers all required event types", () => {
    const events: GameEventType[] = [
      "minion_played",
      "minion_died",
      "turn_start",
      "turn_end",
      "spell_played",
      "attack",
      "hero_damaged",
    ];
    events.forEach((e) => {
      const event: GameEvent = { type: e, player: 0 };
      expect(event.type).toBe(e);
    });
  });

  it("GameEvent has optional source, target, value fields", () => {
    const event: GameEvent = {
      type: "attack",
      player: 0,
      source: makeBoardMinion(),
      target: { kind: "hero", player: 1 },
      value: 5,
    };
    expect(event.source).toBeDefined();
    expect(event.target).toBeDefined();
    expect(event.value).toBe(5);
  });
});

describe("Effect function type", () => {
  it("Effect takes (GameState, EffectContext) and returns GameState", () => {
    const effect: Effect = (state, _context) => {
      return { ...state, turn: state.turn + 1 };
    };
    const state = initializeGame(makeDeck(), makeDeck());
    const context: EffectContext = {
      event: { type: "minion_played", player: 0 },
      sourceCard: makeCard(),
      player: 0,
    };
    const result = effect(state, context);
    expect(result.turn).toBe(state.turn + 1);
  });

  it("EffectContext has event, sourceCard, and player", () => {
    const context: EffectContext = {
      event: { type: "minion_played", player: 0 },
      sourceCard: makeCard({ name: "Test" }),
      player: 0,
    };
    expect(context.event.type).toBe("minion_played");
    expect(context.sourceCard.name).toBe("Test");
    expect(context.player).toBe(0);
  });
});

describe("Battlecry execution in playCard", () => {
  function setupGame(mana: number, handCards: Card[]): GameState {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].hero.mana = mana;
    state.players[0].maxMana = mana;
    state.players[0].hand = [...handCards];
    return state;
  }

  it("calls battlecry when a minion with battlecry is played", () => {
    let called = false;
    const card = makeCard({
      cost: 1,
      type: "minion",
      battlecry: (state: GameState, _context: EffectContext) => {
        called = true;
        return state;
      },
    });
    const state = setupGame(5, [card]);
    playCard(state, 0);
    expect(called).toBe(true);
  });

  it("does not call battlecry for cards without one", () => {
    const card = makeCard({ cost: 1, type: "minion" });
    const state = setupGame(5, [card]);
    const result = playCard(state, 0);
    expect(result.success).toBe(true);
  });

  it("battlecry receives correct EffectContext", () => {
    let receivedContext: EffectContext | null = null;
    const card = makeCard({
      name: "TestBattlecry",
      cost: 1,
      type: "minion",
      battlecry: (state: GameState, context: EffectContext) => {
        receivedContext = context;
        return state;
      },
    });
    const state = setupGame(5, [card]);
    playCard(state, 0);
    expect(receivedContext).not.toBeNull();
    expect(receivedContext!.player).toBe(0);
    expect(receivedContext!.sourceCard.name).toBe("TestBattlecry");
    expect(receivedContext!.event.type).toBe("minion_played");
  });

  it("张飞 battlecry grants taunt", () => {
    const card = makeCard({
      name: "张飞",
      cost: 5,
      attack: 5,
      health: 5,
      type: "minion",
      charge: true,
      battlecry: (state: GameState, context: EffectContext) => {
        const board = state.players[context.player].board;
        const self = board[board.length - 1];
        self.taunt = true;
        return state;
      },
    });
    const state = setupGame(10, [card]);
    playCard(state, 0);
    expect(state.players[0].board[0].taunt).toBe(true);
  });

  it("孙权 battlecry grants +2/+2 and divine shield to friendly minions", () => {
    const state = setupGame(10, []);
    state.players[0].board = [
      makeBoardMinion({ name: "Soldier", currentAttack: 2, currentHealth: 3 }),
    ];
    const sunquan = makeCard({
      name: "孙权",
      cost: 7,
      attack: 5,
      health: 7,
      type: "minion",
      battlecry: (st: GameState, ctx: EffectContext) => {
        const board = st.players[ctx.player].board;
        for (const minion of board) {
          if (minion.name !== "孙权") {
            minion.currentAttack += 2;
            minion.currentHealth += 2;
            minion.hasDivineShield = true;
          }
        }
        return st;
      },
    });
    state.players[0].hand = [sunquan];
    playCard(state, 0);
    const soldier = state.players[0].board[0];
    expect(soldier.currentAttack).toBe(4);
    expect(soldier.currentHealth).toBe(5);
    expect(soldier.hasDivineShield).toBe(true);
  });

  it("运粮车 battlecry heals hero for 2", () => {
    const card = makeCard({
      name: "运粮车",
      cost: 2,
      attack: 1,
      health: 4,
      type: "minion",
      battlecry: (state: GameState, context: EffectContext) => {
        state.players[context.player].hero.health += 2;
        return state;
      },
    });
    const state = setupGame(5, [card]);
    state.players[0].hero.health = 20;
    playCard(state, 0);
    expect(state.players[0].hero.health).toBe(22);
  });

  it("damage battlecry removes dead minions (弓弩手 deals 1 damage)", () => {
    const card = makeCard({
      name: "弓弩手",
      cost: 2,
      attack: 3,
      health: 2,
      type: "minion",
      battlecry: (state: GameState, context: EffectContext) => {
        const enemy = context.player === 0 ? 1 : 0;
        const targets = state.players[enemy].board;
        if (targets.length > 0) {
          targets[0].currentHealth -= 1;
        }
        return state;
      },
    });
    const state = setupGame(5, [card]);
    state.players[1].board = [makeBoardMinion({ name: "Weak", currentAttack: 1, currentHealth: 1 })];
    playCard(state, 0);
    expect(state.players[1].board).toHaveLength(0);
  });

  it("太史慈 battlecry mutual combat removes dead minions", () => {
    const card = makeCard({
      name: "太史慈",
      cost: 5,
      attack: 4,
      health: 6,
      type: "minion",
      battlecry: (state: GameState, context: EffectContext) => {
        const enemy = context.player === 0 ? 1 : 0;
        const enemyBoard = state.players[enemy].board;
        if (enemyBoard.length > 0) {
          const board = state.players[context.player].board;
          const self = board[board.length - 1];
          const target = enemyBoard[0];
          self.currentHealth -= target.currentAttack;
          target.currentHealth -= self.currentAttack;
        }
        return state;
      },
    });
    const state = setupGame(10, [card]);
    state.players[1].board = [makeBoardMinion({ name: "Weak", currentAttack: 2, currentHealth: 3 })];
    playCard(state, 0);
    expect(state.players[1].board).toHaveLength(0);
    expect(state.players[0].board[0].currentHealth).toBe(4);
  });
});
