import { describe, it, expect, beforeEach } from "vitest";
import {
  GameState,
  BoardMinion,
  Lane,
  Card,
  Deck,
  createDeck,
  initializeGame,
  removeDeadMinions,
  gameEventBus,
  getReachableLanes,
} from "./types";
import { cards } from "./cards";

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
    enrageBonus: 0, factionAttackBonus: 0, factionHealthBonus: 0, formationAtkBonus: 0, formationHpBonus: 0, brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0, wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0, qunDebuff: 0,
    lane: Lane.Center, slotIndex: 0,
    ...overrides,
  };
}

const dianweiCard = cards.find(c => c.name === "典韦")!;

function makeDianwei(lane: Lane): BoardMinion {
  return makeBoardMinion({
    name: "典韦",
    currentAttack: 7,
    currentHealth: 0,
    lane,
    slotIndex: 0,
    deathrattle: dianweiCard.deathrattle,
  });
}

describe("典韦 deathrattle lane-aware targeting", () => {
  beforeEach(() => {
    gameEventBus.clear();
  });

  it("targets same-lane enemy when available", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].board = [makeDianwei(Lane.Left)];
    state.players[1].board = [
      makeBoardMinion({ name: "SameLane", currentHealth: 20, lane: Lane.Left, slotIndex: 0 }),
      makeBoardMinion({ name: "FarLane", currentHealth: 20, lane: Lane.Right, slotIndex: 0 }),
    ];
    removeDeadMinions(state);
    const sameLane = state.players[1].board.find(m => m.name === "SameLane")!;
    const farLane = state.players[1].board.find(m => m.name === "FarLane")!;
    expect(sameLane.currentHealth).toBe(13); // 20 - 7
    expect(farLane.currentHealth).toBe(20);
  });

  it("targets adjacent-lane enemy when same lane is empty", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].board = [makeDianwei(Lane.Left)];
    state.players[1].board = [
      makeBoardMinion({ name: "Adjacent", currentHealth: 20, lane: Lane.Center, slotIndex: 0 }),
      makeBoardMinion({ name: "Far", currentHealth: 20, lane: Lane.Right, slotIndex: 0 }),
    ];
    removeDeadMinions(state);
    const adjacent = state.players[1].board.find(m => m.name === "Adjacent")!;
    const far = state.players[1].board.find(m => m.name === "Far")!;
    expect(adjacent.currentHealth).toBe(13); // 20 - 7
    expect(far.currentHealth).toBe(20);
  });

  it("center lane can reach left, center, and right", () => {
    const reachable = getReachableLanes(Lane.Center);
    expect(reachable).toContain(Lane.Left);
    expect(reachable).toContain(Lane.Center);
    expect(reachable).toContain(Lane.Right);
  });

  it("典韦 in center targets any lane enemy", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].board = [makeDianwei(Lane.Center)];
    state.players[1].board = [
      makeBoardMinion({ name: "LeftEnemy", currentHealth: 20, lane: Lane.Left, slotIndex: 0 }),
    ];
    removeDeadMinions(state);
    expect(state.players[1].board[0].currentHealth).toBe(13);
  });

  it("left lane 典韦 cannot reach right lane", () => {
    const reachable = getReachableLanes(Lane.Left);
    expect(reachable).not.toContain(Lane.Right);
  });

  it("falls back to any enemy if no reachable-lane enemy exists", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].board = [makeDianwei(Lane.Left)];
    // Only enemy is in right lane (unreachable from left)
    state.players[1].board = [
      makeBoardMinion({ name: "FarEnemy", currentHealth: 20, lane: Lane.Right, slotIndex: 0 }),
    ];
    removeDeadMinions(state);
    expect(state.players[1].board[0].currentHealth).toBe(13);
  });

  it("hits hero when board is completely empty", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].board = [makeDianwei(Lane.Center)];
    state.players[1].board = [];
    removeDeadMinions(state);
    expect(state.players[1].hero.health).toBe(23); // 30 - 7
  });
});

describe("Non-positional deathrattles still work", () => {
  beforeEach(() => {
    gameEventBus.clear();
  });

  const zizhongcheCard = cards.find(c => c.name === "辎重车")!;
  const ganningCard = cards.find(c => c.name === "甘宁")!;
  const guanyuCard = cards.find(c => c.name === "关羽")!;

  it("辎重车 deathrattle draws a card", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    const initialHand = state.players[0].hand.length;
    state.players[0].board = [
      makeBoardMinion({
        name: "辎重车",
        currentHealth: 0,
        deathrattle: zizhongcheCard.deathrattle,
      }),
    ];
    removeDeadMinions(state);
    expect(state.players[0].hand.length).toBe(initialHand + 1);
  });

  it("甘宁 deathrattle equips weapon", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].weapon = null;
    state.players[0].board = [
      makeBoardMinion({
        name: "甘宁",
        currentHealth: 0,
        deathrattle: ganningCard.deathrattle,
      }),
    ];
    removeDeadMinions(state);
    expect(state.players[0].weapon).toEqual({ name: "甘宁之刃", attack: 2, durability: 2 });
  });

  it("关羽 deathrattle equips weapon", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].weapon = null;
    state.players[0].board = [
      makeBoardMinion({
        name: "关羽",
        currentHealth: 0,
        deathrattle: guanyuCard.deathrattle,
      }),
    ];
    removeDeadMinions(state);
    expect(state.players[0].weapon).toEqual({ name: "青龙偃月刀", attack: 5, durability: 3 });
  });
});
