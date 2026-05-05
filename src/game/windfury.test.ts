import { describe, it, expect, beforeEach } from "vitest";
import {
  Card,
  Deck,
  GameState,
  BoardMinion,
  createDeck,
  initializeGame,
  startTurn,
  endTurn,
  attackMinion,
  attackHero,
  heroAttack,
  playCard,
  gameEventBus,
} from "./types";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    name: "Test",
    cost: 1,
    attack: 2,
    health: 3,
    description: "",
    rarity: "common",
    type: "minion",
    faction: "neutral",
    ...overrides,
  };
}

function makeDeck(): Deck {
  return createDeck(Array.from({ length: 30 }, (_, i) => makeCard({ name: `Card ${i}` })));
}

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
    enrageBonus: 0, factionAttackBonus: 0, factionHealthBonus: 0, shuAdjacencyAtkBonus: 0, shuAdjacencyHpBonus: 0, brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0,
    ...overrides,
  };
}

function makeState(): GameState {
  return initializeGame(makeDeck(), makeDeck());
}

beforeEach(() => {
  gameEventBus.clear();
});

describe("Windfury minion - attackMinion", () => {
  it("windfury minion can attack twice per turn", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].board = [makeBoardMinion({ currentAttack: 2, currentHealth: 10, windfury: true, windfuryAttacksLeft: 2 })];
    state.players[1].board = [makeBoardMinion({ currentAttack: 1, currentHealth: 20 })];

    const r1 = attackMinion(state, 0, 0);
    expect(r1.success).toBe(true);
    expect(state.players[0].board[0].windfuryAttacksLeft).toBe(1);
    expect(state.players[0].board[0].hasAttacked).toBe(false);

    const r2 = attackMinion(state, 0, 0);
    expect(r2.success).toBe(true);
    expect(state.players[0].board[0].windfuryAttacksLeft).toBe(0);
    expect(state.players[0].board[0].hasAttacked).toBe(true);
  });

  it("windfury minion cannot attack a third time", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].board = [makeBoardMinion({ currentAttack: 1, currentHealth: 20, windfury: true, windfuryAttacksLeft: 2 })];
    state.players[1].board = [makeBoardMinion({ currentAttack: 1, currentHealth: 20 })];

    attackMinion(state, 0, 0);
    attackMinion(state, 0, 0);
    const r3 = attackMinion(state, 0, 0);
    expect(r3.success).toBe(false);
    expect(r3.error).toMatch(/already attacked/i);
  });

  it("non-windfury minion can only attack once", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].board = [makeBoardMinion({ currentAttack: 1, currentHealth: 20, windfuryAttacksLeft: 1 })];
    state.players[1].board = [makeBoardMinion({ currentAttack: 1, currentHealth: 20 })];

    const r1 = attackMinion(state, 0, 0);
    expect(r1.success).toBe(true);
    expect(state.players[0].board[0].hasAttacked).toBe(true);

    const r2 = attackMinion(state, 0, 0);
    expect(r2.success).toBe(false);
  });
});

describe("Windfury minion - attackHero", () => {
  it("windfury minion can attack hero twice per turn", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].board = [makeBoardMinion({ currentAttack: 5, currentHealth: 10, windfury: true, windfuryAttacksLeft: 2 })];

    const r1 = attackHero(state, 0);
    expect(r1.success).toBe(true);
    expect(state.players[1].hero.health).toBe(25);
    expect(state.players[0].board[0].hasAttacked).toBe(false);

    const r2 = attackHero(state, 0);
    expect(r2.success).toBe(true);
    expect(state.players[1].hero.health).toBe(20);
    expect(state.players[0].board[0].hasAttacked).toBe(true);
  });

  it("windfury minion blocked after two hero attacks", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].board = [makeBoardMinion({ currentAttack: 3, currentHealth: 10, windfury: true, windfuryAttacksLeft: 2 })];

    attackHero(state, 0);
    attackHero(state, 0);
    const r3 = attackHero(state, 0);
    expect(r3.success).toBe(false);
  });
});

describe("Windfury - startTurn reset", () => {
  it("resets windfuryAttacksLeft to 2 for windfury minions", () => {
    const state = makeState();
    state.activePlayer = 0;
    const minion = makeBoardMinion({ windfury: true, windfuryAttacksLeft: 0, hasAttacked: true });
    state.players[0].board = [minion];

    startTurn(state);
    expect(minion.windfuryAttacksLeft).toBe(2);
    expect(minion.hasAttacked).toBe(false);
  });

  it("resets windfuryAttacksLeft to 1 for non-windfury minions", () => {
    const state = makeState();
    state.activePlayer = 0;
    const minion = makeBoardMinion({ windfuryAttacksLeft: 0, hasAttacked: true });
    state.players[0].board = [minion];

    startTurn(state);
    expect(minion.windfuryAttacksLeft).toBe(1);
    expect(minion.hasAttacked).toBe(false);
  });
});

describe("Windfury - playCard initialization", () => {
  it("windfury minion starts with windfuryAttacksLeft=2", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].hand = [makeCard({ cost: 0, windfury: true })];
    state.players[0].hero.mana = 10;

    playCard(state, 0);
    expect(state.players[0].board[state.players[0].board.length - 1].windfuryAttacksLeft).toBe(2);
  });

  it("non-windfury minion starts with windfuryAttacksLeft=1", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].hand = [makeCard({ cost: 0 })];
    state.players[0].hero.mana = 10;

    playCard(state, 0);
    expect(state.players[0].board[state.players[0].board.length - 1].windfuryAttacksLeft).toBe(1);
  });
});

describe("Windfury weapon - heroAttack", () => {
  it("windfury weapon allows hero to attack twice per turn", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].weapon = { name: "Windfury Weapon", attack: 3, durability: 3, windfury: true };
    state.players[0].heroWindfuryAttacksLeft = 2;
    state.players[0].heroHasAttacked = false;

    const r1 = heroAttack(state, 1);
    expect(r1.success).toBe(true);
    expect(state.players[1].hero.health).toBe(27);
    expect(state.players[0].heroHasAttacked).toBe(false);
    expect(state.players[0].heroWindfuryAttacksLeft).toBe(1);

    const r2 = heroAttack(state, 1);
    expect(r2.success).toBe(true);
    expect(state.players[1].hero.health).toBe(24);
    expect(state.players[0].heroHasAttacked).toBe(true);
    expect(state.players[0].heroWindfuryAttacksLeft).toBe(0);
  });

  it("windfury weapon hero cannot attack a third time", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].weapon = { name: "Windfury Weapon", attack: 2, durability: 5, windfury: true };
    state.players[0].heroWindfuryAttacksLeft = 2;
    state.players[0].heroHasAttacked = false;

    heroAttack(state, 1);
    heroAttack(state, 1);
    const r3 = heroAttack(state, 1);
    expect(r3.success).toBe(false);
    expect(r3.error).toMatch(/already attacked/i);
  });

  it("non-windfury weapon hero can only attack once", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].weapon = { name: "Normal Weapon", attack: 3, durability: 3 };
    state.players[0].heroWindfuryAttacksLeft = 1;
    state.players[0].heroHasAttacked = false;

    const r1 = heroAttack(state, 1);
    expect(r1.success).toBe(true);
    expect(state.players[0].heroHasAttacked).toBe(true);

    const r2 = heroAttack(state, 1);
    expect(r2.success).toBe(false);
  });

  it("startTurn resets heroWindfuryAttacksLeft for windfury weapon", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].weapon = { name: "Windfury Weapon", attack: 2, durability: 3, windfury: true };
    state.players[0].heroWindfuryAttacksLeft = 0;
    state.players[0].heroHasAttacked = true;

    startTurn(state);
    expect(state.players[0].heroWindfuryAttacksLeft).toBe(2);
    expect(state.players[0].heroHasAttacked).toBe(false);
  });

  it("startTurn resets heroWindfuryAttacksLeft to 1 for non-windfury weapon", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].weapon = { name: "Normal Weapon", attack: 2, durability: 3 };
    state.players[0].heroWindfuryAttacksLeft = 0;
    state.players[0].heroHasAttacked = true;

    startTurn(state);
    expect(state.players[0].heroWindfuryAttacksLeft).toBe(1);
    expect(state.players[0].heroHasAttacked).toBe(false);
  });

  it("startTurn sets heroWindfuryAttacksLeft to 0 when no weapon", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].weapon = null;

    startTurn(state);
    expect(state.players[0].heroWindfuryAttacksLeft).toBe(0);
  });

  it("windfury weapon loses durability on each attack", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].weapon = { name: "Windfury Weapon", attack: 2, durability: 2, windfury: true };
    state.players[0].heroWindfuryAttacksLeft = 2;

    heroAttack(state, 1);
    expect(state.players[0].weapon!.durability).toBe(1);

    heroAttack(state, 1);
    expect(state.players[0].weapon).toBeNull();
  });
});

describe("heroAttack emits source field", () => {
  it("heroAttack vs hero emits source with hero kind", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].weapon = { name: "Test Weapon", attack: 3, durability: 3 };
    state.players[0].heroWindfuryAttacksLeft = 1;
    state.players[0].heroHasAttacked = false;

    const events: { type: string; source?: unknown }[] = [];
    gameEventBus.on("attack", (e) => events.push(e));

    heroAttack(state, 1);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].source).toBeDefined();
    expect(events[0].source).toEqual({ kind: "hero", player: 0 });
  });

  it("heroAttack vs minion emits source with hero kind", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].weapon = { name: "Test Weapon", attack: 3, durability: 3 };
    state.players[0].heroWindfuryAttacksLeft = 1;
    state.players[0].heroHasAttacked = false;
    state.players[1].board = [makeBoardMinion({ currentAttack: 1, currentHealth: 10 })];

    const events: { type: string; source?: unknown }[] = [];
    gameEventBus.on("attack", (e) => events.push(e));

    heroAttack(state, 1, 0);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].source).toBeDefined();
    expect(events[0].source).toEqual({ kind: "hero", player: 0 });
  });
});

describe("Windfury minion - mixed attacks", () => {
  it("windfury minion can attack minion then hero", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].board = [makeBoardMinion({ currentAttack: 2, currentHealth: 10, windfury: true, windfuryAttacksLeft: 2 })];
    state.players[1].board = [makeBoardMinion({ currentAttack: 1, currentHealth: 20 })];

    const r1 = attackMinion(state, 0, 0);
    expect(r1.success).toBe(true);
    expect(state.players[0].board[0].hasAttacked).toBe(false);

    const r2 = attackHero(state, 0);
    expect(r2.success).toBe(true);
    expect(state.players[0].board[0].hasAttacked).toBe(true);
    expect(state.players[1].hero.health).toBe(28);
  });
});
