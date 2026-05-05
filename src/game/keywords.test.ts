import { describe, it, expect, beforeEach } from "vitest";
import {
  GameState,
  BoardMinion,
  Card,
  Deck,
  createDeck,
  initializeGame,
  attackMinion,
  attackHero,
  startTurn,
  endTurn,
  playCard,
  gameEventBus,
  EventBus,
  GameEvent,
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
  const cards: Card[] = [];
  for (let i = 0; i < 30; i++) {
    cards.push(makeCard({ name: `Card ${i}` }));
  }
  return createDeck(cards);
}

function placeMinion(
  state: GameState,
  playerIdx: 0 | 1,
  overrides: Partial<BoardMinion> = {}
): BoardMinion {
  const minion: BoardMinion = {
    name: "Placed",
    cost: 1,
    attack: 2,
    health: 3,
    description: "",
    rarity: "common",
    type: "minion",
    faction: "neutral",
    currentAttack: 2,
    currentHealth: 3,
    summoningSickness: false,
    hasAttacked: false,
    hasDivineShield: false,
    isStealth: false,
    isFrozen: false,
    isImmune: false,
    windfuryAttacksLeft: 1,
    enrageActive: false,
    enrageBonus: 0, factionAttackBonus: 0, factionHealthBonus: 0,
    ...overrides,
  };
  state.players[playerIdx].board.push(minion);
  return minion;
}

function makeState(): GameState {
  return initializeGame(makeDeck(), makeDeck());
}

beforeEach(() => {
  gameEventBus.clear();
});

// ========== TAUNT ==========
describe("Taunt keyword", () => {
  it("blocks attackMinion when opponent has taunt and target is not taunter", () => {
    const state = makeState();
    state.activePlayer = 0;
    placeMinion(state, 0, { currentAttack: 3, currentHealth: 3 });
    placeMinion(state, 1, { currentAttack: 1, currentHealth: 1, taunt: true, name: "Taunter" });
    placeMinion(state, 1, { currentAttack: 2, currentHealth: 2, name: "NonTaunt" });

    const result = attackMinion(state, 0, 1);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/taunt/i);
  });

  it("allows attacking the taunter directly", () => {
    const state = makeState();
    state.activePlayer = 0;
    placeMinion(state, 0, { currentAttack: 3, currentHealth: 3 });
    placeMinion(state, 1, { currentAttack: 1, currentHealth: 5, taunt: true });
    placeMinion(state, 1, { currentAttack: 2, currentHealth: 2 });

    const result = attackMinion(state, 0, 0);
    expect(result.success).toBe(true);
  });

  it("blocks attackHero when opponent has taunt minion", () => {
    const state = makeState();
    state.activePlayer = 0;
    placeMinion(state, 0, { currentAttack: 5, currentHealth: 5 });
    placeMinion(state, 1, { currentAttack: 1, currentHealth: 1, taunt: true });

    const result = attackHero(state, 0);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/taunt/i);
  });

  it("allows attackHero when no taunt minions exist", () => {
    const state = makeState();
    state.activePlayer = 0;
    placeMinion(state, 0, { currentAttack: 5, currentHealth: 5 });
    placeMinion(state, 1, { currentAttack: 1, currentHealth: 1 });

    const result = attackHero(state, 0);
    expect(result.success).toBe(true);
  });
});

// ========== DIVINE SHIELD ==========
describe("Divine Shield keyword", () => {
  it("absorbs first hit without taking damage", () => {
    const state = makeState();
    state.activePlayer = 0;
    placeMinion(state, 0, { currentAttack: 5, currentHealth: 3 });
    placeMinion(state, 1, { currentAttack: 2, currentHealth: 3, hasDivineShield: true });

    attackMinion(state, 0, 0);
    // Defender had divine shield: no damage, shield removed
    expect(state.players[1].board[0].currentHealth).toBe(3);
    expect(state.players[1].board[0].hasDivineShield).toBe(false);
    // Attacker takes damage normally
    expect(state.players[0].board[0].currentHealth).toBe(1); // 3 - 2
  });

  it("takes damage on second hit after shield is broken", () => {
    const state = makeState();
    state.activePlayer = 0;
    placeMinion(state, 0, { currentAttack: 2, currentHealth: 10 });
    const shielded = placeMinion(state, 1, { currentAttack: 1, currentHealth: 3, hasDivineShield: true });

    attackMinion(state, 0, 0);
    expect(shielded.hasDivineShield).toBe(false);
    expect(shielded.currentHealth).toBe(3);

    // Reset attacker for second hit
    state.players[0].board[0].hasAttacked = false;
    state.players[0].board[0].windfuryAttacksLeft = 1;
    attackMinion(state, 0, 0);
    expect(shielded.currentHealth).toBe(1); // 3 - 2
  });

  it("attacker divine shield absorbs retaliation damage", () => {
    const state = makeState();
    state.activePlayer = 0;
    placeMinion(state, 0, { currentAttack: 3, currentHealth: 2, hasDivineShield: true });
    placeMinion(state, 1, { currentAttack: 5, currentHealth: 10 });

    attackMinion(state, 0, 0);
    expect(state.players[0].board[0].currentHealth).toBe(2); // shield absorbed
    expect(state.players[0].board[0].hasDivineShield).toBe(false);
  });
});

// ========== FREEZE ==========
describe("Freeze keyword", () => {
  it("frozen minion cannot attack minion", () => {
    const state = makeState();
    state.activePlayer = 0;
    placeMinion(state, 0, { currentAttack: 3, currentHealth: 3, isFrozen: true });
    placeMinion(state, 1, { currentAttack: 1, currentHealth: 1 });

    const result = attackMinion(state, 0, 0);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/frozen/i);
  });

  it("frozen minion cannot attack hero", () => {
    const state = makeState();
    state.activePlayer = 0;
    placeMinion(state, 0, { currentAttack: 3, currentHealth: 3, isFrozen: true });

    const result = attackHero(state, 0);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/frozen/i);
  });

  it("startTurn clears frozen status", () => {
    const state = makeState();
    state.activePlayer = 0;
    const minion = placeMinion(state, 0, { isFrozen: true });

    startTurn(state);
    expect(minion.isFrozen).toBe(false);
  });
});

// ========== STEALTH ==========
describe("Stealth keyword", () => {
  it("stealthed minion cannot be targeted by attack", () => {
    const state = makeState();
    state.activePlayer = 0;
    placeMinion(state, 0, { currentAttack: 3, currentHealth: 3 });
    placeMinion(state, 1, { currentAttack: 1, currentHealth: 1, isStealth: true });

    const result = attackMinion(state, 0, 0);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/stealth/i);
  });

  it("attacking breaks stealth on the attacker", () => {
    const state = makeState();
    state.activePlayer = 0;
    const stealthy = placeMinion(state, 0, { currentAttack: 3, currentHealth: 5, isStealth: true });
    placeMinion(state, 1, { currentAttack: 1, currentHealth: 1 });

    attackMinion(state, 0, 0);
    expect(stealthy.isStealth).toBe(false);
  });

  it("attacking hero breaks stealth", () => {
    const state = makeState();
    state.activePlayer = 0;
    const stealthy = placeMinion(state, 0, { currentAttack: 3, currentHealth: 5, isStealth: true });

    attackHero(state, 0);
    expect(stealthy.isStealth).toBe(false);
  });
});

// ========== IMMUNE ==========
describe("Immune keyword", () => {
  it("immune minion takes no damage from attack", () => {
    const state = makeState();
    state.activePlayer = 0;
    placeMinion(state, 0, { currentAttack: 3, currentHealth: 3 });
    placeMinion(state, 1, { currentAttack: 5, currentHealth: 3, isImmune: true });

    attackMinion(state, 0, 0);
    // Defender is immune: no damage taken
    expect(state.players[1].board[0].currentHealth).toBe(3);
    // Attacker takes full damage from defender
    expect(state.players[0].board.length).toBe(0); // 3 - 5 = dead
  });

  it("immune attacker takes no retaliation damage", () => {
    const state = makeState();
    state.activePlayer = 0;
    placeMinion(state, 0, { currentAttack: 3, currentHealth: 2, isImmune: true });
    placeMinion(state, 1, { currentAttack: 10, currentHealth: 10 });

    attackMinion(state, 0, 0);
    expect(state.players[0].board[0].currentHealth).toBe(2); // no damage
    expect(state.players[1].board[0].currentHealth).toBe(7); // 10 - 3
  });

  it("immune hero takes no damage from attackHero", () => {
    const state = makeState();
    state.activePlayer = 0;
    placeMinion(state, 0, { currentAttack: 10, currentHealth: 5 });
    state.players[1].hero.isImmune = true;

    const result = attackHero(state, 0);
    expect(result.success).toBe(true);
    expect(state.players[1].hero.health).toBe(30); // no damage
  });
});

// ========== EVENT BUS ==========
describe("EventBus", () => {
  it("emits and receives events", () => {
    const bus = new EventBus();
    const events: GameEvent[] = [];
    bus.on("turn_start", (e) => events.push(e));
    bus.emit({ type: "turn_start", player: 0 });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("turn_start");
  });

  it("off removes listener", () => {
    const bus = new EventBus();
    const events: GameEvent[] = [];
    const listener = (e: GameEvent) => events.push(e);
    bus.on("turn_start", listener);
    bus.off("turn_start", listener);
    bus.emit({ type: "turn_start", player: 0 });
    expect(events).toHaveLength(0);
  });

  it("clear removes all listeners", () => {
    const bus = new EventBus();
    const events: GameEvent[] = [];
    bus.on("turn_start", (e) => events.push(e));
    bus.on("attack", (e) => events.push(e));
    bus.clear();
    bus.emit({ type: "turn_start", player: 0 });
    bus.emit({ type: "attack", player: 0 });
    expect(events).toHaveLength(0);
  });
});

describe("Game event emissions", () => {
  it("startTurn emits turn_start event", () => {
    const state = makeState();
    state.activePlayer = 0;
    const events: GameEvent[] = [];
    gameEventBus.on("turn_start", (e) => events.push(e));
    startTurn(state);
    expect(events).toHaveLength(1);
    expect(events[0].player).toBe(0);
  });

  it("endTurn emits turn_end event", () => {
    const state = makeState();
    state.activePlayer = 0;
    const events: GameEvent[] = [];
    gameEventBus.on("turn_end", (e) => events.push(e));
    endTurn(state);
    expect(events).toHaveLength(1);
    expect(events[0].player).toBe(0);
  });

  it("playCard emits minion_played for minion cards", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].hand = [makeCard({ cost: 0 })];
    state.players[0].hero.mana = 10;
    const events: GameEvent[] = [];
    gameEventBus.on("minion_played", (e) => events.push(e));
    playCard(state, 0);
    expect(events).toHaveLength(1);
  });

  it("playCard emits spell_played for spell cards", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].hand = [makeCard({ cost: 0, type: "spell" })];
    state.players[0].hero.mana = 10;
    const events: GameEvent[] = [];
    gameEventBus.on("spell_played", (e) => events.push(e));
    playCard(state, 0);
    expect(events).toHaveLength(1);
  });

  it("attackMinion emits attack event", () => {
    const state = makeState();
    state.activePlayer = 0;
    placeMinion(state, 0, { currentAttack: 1, currentHealth: 10 });
    placeMinion(state, 1, { currentAttack: 1, currentHealth: 10 });
    const events: GameEvent[] = [];
    gameEventBus.on("attack", (e) => events.push(e));
    attackMinion(state, 0, 0);
    expect(events).toHaveLength(1);
  });

  it("attackMinion emits minion_died with correct owner", () => {
    const state = makeState();
    state.activePlayer = 0;
    placeMinion(state, 0, { currentAttack: 5, currentHealth: 10, name: "Attacker" });
    placeMinion(state, 1, { currentAttack: 1, currentHealth: 1, name: "Defender" });
    const events: GameEvent[] = [];
    gameEventBus.on("minion_died", (e) => events.push(e));
    attackMinion(state, 0, 0);
    expect(events).toHaveLength(1);
    expect(events[0].player).toBe(1); // defender's minion died, owner is player 1
  });

  it("attackMinion emits minion_died for attacker's minion with correct owner", () => {
    const state = makeState();
    state.activePlayer = 0;
    placeMinion(state, 0, { currentAttack: 5, currentHealth: 1, name: "Attacker" });
    placeMinion(state, 1, { currentAttack: 5, currentHealth: 1, name: "Defender" });
    const events: GameEvent[] = [];
    gameEventBus.on("minion_died", (e) => events.push(e));
    attackMinion(state, 0, 0);
    expect(events).toHaveLength(2);
    const attackerDeath = events.find((e) => (e.source as BoardMinion).name === "Attacker");
    const defenderDeath = events.find((e) => (e.source as BoardMinion).name === "Defender");
    expect(attackerDeath!.player).toBe(0);
    expect(defenderDeath!.player).toBe(1);
  });

  it("attackHero emits attack and hero_damaged events", () => {
    const state = makeState();
    state.activePlayer = 0;
    placeMinion(state, 0, { currentAttack: 5, currentHealth: 5 });
    const attackEvents: GameEvent[] = [];
    const heroEvents: GameEvent[] = [];
    gameEventBus.on("attack", (e) => attackEvents.push(e));
    gameEventBus.on("hero_damaged", (e) => heroEvents.push(e));
    attackHero(state, 0);
    expect(attackEvents).toHaveLength(1);
    expect(heroEvents).toHaveLength(1);
    expect(heroEvents[0].value).toBe(5);
  });
});
