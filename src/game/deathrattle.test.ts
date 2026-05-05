import { describe, it, expect, beforeEach } from "vitest";
import {
  GameState,
  BoardMinion,
  Card,
  Deck,
  EffectContext,
  createDeck,
  initializeGame,
  attackMinion,
  removeDeadMinions,
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
    enrageBonus: 0, factionAttackBonus: 0, factionHealthBonus: 0, shuAdjacencyAtkBonus: 0, shuAdjacencyHpBonus: 0, brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0, wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0,
    ...overrides,
  };
}

describe("Deathrattle execution in removeDeadMinions", () => {
  beforeEach(() => {
    gameEventBus.clear();
  });

  it("fires deathrattle when a minion dies", () => {
    let deathrattleFired = false;
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].board = [
      makeBoardMinion({
        name: "DRMinion",
        currentHealth: 0,
        deathrattle: (s, _ctx) => { deathrattleFired = true; return s; },
      }),
    ];
    removeDeadMinions(state);
    expect(deathrattleFired).toBe(true);
    expect(state.players[0].board).toHaveLength(0);
  });

  it("does not fire deathrattle for alive minions", () => {
    let deathrattleFired = false;
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].board = [
      makeBoardMinion({
        currentHealth: 5,
        deathrattle: (s, _ctx) => { deathrattleFired = true; return s; },
      }),
    ];
    removeDeadMinions(state);
    expect(deathrattleFired).toBe(false);
    expect(state.players[0].board).toHaveLength(1);
  });

  it("deathrattle receives correct context with owner info", () => {
    let receivedCtx: EffectContext | null = null;
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[1].board = [
      makeBoardMinion({
        name: "P2Minion",
        currentHealth: 0,
        deathrattle: (s, ctx) => { receivedCtx = ctx; return s; },
      }),
    ];
    removeDeadMinions(state);
    expect(receivedCtx).not.toBeNull();
    expect(receivedCtx!.player).toBe(1);
    expect(receivedCtx!.event.type).toBe("minion_died");
    expect(receivedCtx!.sourceCard.name).toBe("P2Minion");
  });

  it("辎重车 deathrattle draws a card", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    const initialHandSize = state.players[0].hand.length;
    const initialDeckSize = (state.players[0].deck as unknown as Card[]).length;

    state.players[0].board = [
      makeBoardMinion({
        name: "辎重车",
        currentHealth: 0,
        deathrattle: (s, ctx) => {
          const player = s.players[ctx.player];
          if (player.deck.length > 0) {
            const deck = player.deck as unknown as Card[];
            const card = deck.shift()!;
            if (player.hand.length < 10) {
              player.hand.push(card);
            }
          }
          return s;
        },
      }),
    ];
    removeDeadMinions(state);
    expect(state.players[0].hand.length).toBe(initialHandSize + 1);
    expect((state.players[0].deck as unknown as Card[]).length).toBe(initialDeckSize - 1);
  });

  it("甘宁 deathrattle equips a weapon", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].weapon = null;
    state.players[0].board = [
      makeBoardMinion({
        name: "甘宁",
        currentHealth: 0,
        deathrattle: (s, ctx) => {
          s.players[ctx.player].weapon = { name: "甘宁之刃", attack: 2, durability: 2 };
          return s;
        },
      }),
    ];
    removeDeadMinions(state);
    expect(state.players[0].weapon).toEqual({ name: "甘宁之刃", attack: 2, durability: 2 });
  });

  it("典韦 deathrattle deals damage to a random enemy", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].board = [
      makeBoardMinion({
        name: "典韦",
        currentAttack: 7,
        currentHealth: 0,
        deathrattle: (s, ctx) => {
          const enemy = ctx.player === 0 ? 1 : 0;
          const sourceMinion = ctx.sourceCard as BoardMinion;
          const dmg = sourceMinion.currentAttack;
          const enemyBoard = s.players[enemy].board;
          if (enemyBoard.length > 0) {
            enemyBoard[0].currentHealth -= dmg;
          } else {
            s.players[enemy].hero.health -= dmg;
          }
          return s;
        },
      }),
    ];
    state.players[1].board = [
      makeBoardMinion({ name: "Target", currentAttack: 1, currentHealth: 10 }),
    ];
    removeDeadMinions(state);
    expect(state.players[1].board[0].currentHealth).toBe(3); // 10 - 7
  });

  it("典韦 deathrattle hits hero when no enemy minions", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].board = [
      makeBoardMinion({
        name: "典韦",
        currentAttack: 7,
        currentHealth: 0,
        deathrattle: (s, ctx) => {
          const enemy = ctx.player === 0 ? 1 : 0;
          const sourceMinion = ctx.sourceCard as BoardMinion;
          const dmg = sourceMinion.currentAttack;
          const enemyBoard = s.players[enemy].board;
          if (enemyBoard.length > 0) {
            enemyBoard[0].currentHealth -= dmg;
          } else {
            s.players[enemy].hero.health -= dmg;
          }
          return s;
        },
      }),
    ];
    state.players[1].board = [];
    removeDeadMinions(state);
    expect(state.players[1].hero.health).toBe(23); // 30 - 7
  });
});

describe("Deathrattle via attackMinion", () => {
  beforeEach(() => {
    gameEventBus.clear();
  });

  it("deathrattle fires when minion dies in combat", () => {
    let deathrattleFired = false;
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].board = [
      makeBoardMinion({ name: "Attacker", currentAttack: 5, currentHealth: 10 }),
    ];
    state.players[1].board = [
      makeBoardMinion({
        name: "Defender",
        currentAttack: 1,
        currentHealth: 3,
        deathrattle: (s, _ctx) => { deathrattleFired = true; return s; },
      }),
    ];
    attackMinion(state, 0, 0);
    expect(deathrattleFired).toBe(true);
    expect(state.players[1].board).toHaveLength(0);
  });

  it("both attacker and defender deathrattles fire when both die", () => {
    let attackerDR = false;
    let defenderDR = false;
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].board = [
      makeBoardMinion({
        name: "Attacker",
        currentAttack: 5,
        currentHealth: 3,
        deathrattle: (s, _ctx) => { attackerDR = true; return s; },
      }),
    ];
    state.players[1].board = [
      makeBoardMinion({
        name: "Defender",
        currentAttack: 5,
        currentHealth: 3,
        deathrattle: (s, _ctx) => { defenderDR = true; return s; },
      }),
    ];
    attackMinion(state, 0, 0);
    expect(attackerDR).toBe(true);
    expect(defenderDR).toBe(true);
    expect(state.players[0].board).toHaveLength(0);
    expect(state.players[1].board).toHaveLength(0);
  });

  it("emits minion_died events for dead minions", () => {
    const diedEvents: string[] = [];
    gameEventBus.on("minion_died", (e) => {
      if (e.source && "name" in e.source) diedEvents.push(e.source.name);
    });
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].board = [
      makeBoardMinion({ name: "Attacker", currentAttack: 5, currentHealth: 1 }),
    ];
    state.players[1].board = [
      makeBoardMinion({ name: "Defender", currentAttack: 5, currentHealth: 1 }),
    ];
    attackMinion(state, 0, 0);
    expect(diedEvents).toContain("Attacker");
    expect(diedEvents).toContain("Defender");
  });
});

describe("Snapshot before removal", () => {
  beforeEach(() => {
    gameEventBus.clear();
  });

  it("deathrattle can read the dying minion's stats before removal", () => {
    let capturedAttack = 0;
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].board = [
      makeBoardMinion({
        name: "Dying",
        currentAttack: 7,
        currentHealth: 0,
        deathrattle: (s, ctx) => {
          capturedAttack = (ctx.sourceCard as BoardMinion).currentAttack;
          return s;
        },
      }),
    ];
    removeDeadMinions(state);
    expect(capturedAttack).toBe(7);
  });

  it("deathrattle can see other minions still on board before they are removed", () => {
    let boardSizeAtDeathrattle = 0;
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].board = [
      makeBoardMinion({
        name: "First",
        currentHealth: 0,
        deathrattle: (s, ctx) => {
          boardSizeAtDeathrattle = s.players[ctx.player].board.length;
          return s;
        },
      }),
      makeBoardMinion({ name: "Alive", currentHealth: 5 }),
    ];
    removeDeadMinions(state);
    // The dying minion and the alive one are both still on board when deathrattle fires
    expect(boardSizeAtDeathrattle).toBe(2);
    // After removal, only the alive one remains
    expect(state.players[0].board).toHaveLength(1);
    expect(state.players[0].board[0].name).toBe("Alive");
  });
});

describe("Chained deathrattles", () => {
  beforeEach(() => {
    gameEventBus.clear();
  });

  it("deathrattle that kills another deathrattle minion triggers the second deathrattle", () => {
    let secondDRFired = false;
    const state = initializeGame(makeDeck(), makeDeck());

    state.players[1].board = [
      makeBoardMinion({
        name: "SecondVictim",
        currentAttack: 1,
        currentHealth: 3,
        deathrattle: (s, _ctx) => { secondDRFired = true; return s; },
      }),
    ];

    state.players[0].board = [
      makeBoardMinion({
        name: "FirstDying",
        currentAttack: 5,
        currentHealth: 0,
        deathrattle: (s, ctx) => {
          const enemy = ctx.player === 0 ? 1 : 0;
          if (s.players[enemy].board.length > 0) {
            s.players[enemy].board[0].currentHealth -= 10;
          }
          return s;
        },
      }),
    ];

    removeDeadMinions(state);
    expect(secondDRFired).toBe(true);
    expect(state.players[1].board).toHaveLength(0);
  });
});
