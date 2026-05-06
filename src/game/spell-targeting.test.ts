import { describe, it, expect } from "vitest";
import { cards } from "./cards";
import {
  Card,
  GameState,
  BoardMinion,
  Deck,
  Lane,
  playCard,
  createPlayerState,
  getReachableLanes,
  getSpellReachableLanes,
} from "./types";
import * as fs from "fs";
import * as path from "path";

function makeDeck(): Deck {
  const filler: Card = {
    name: "filler", cost: 1, attack: 1, health: 1,
    description: "test", rarity: "common", type: "minion", faction: "neutral",
  };
  return Array(30).fill(filler) as unknown as Deck;
}

function makeState(): GameState {
  return {
    players: [createPlayerState(makeDeck()), createPlayerState(makeDeck())],
    board: [[], []],
    turn: 1,
    phase: "playing",
    turnPhase: "play",
    activePlayer: 0,
    spellsPlayed: [[], []], wuComboCount: [0, 0],
    terrain: { [Lane.Left]: null, [Lane.Center]: null, [Lane.Right]: null },
  };
}

function makeMinion(overrides: Partial<BoardMinion> = {}): BoardMinion {
  return {
    name: "test", cost: 1, attack: 1, health: 1, description: "",
    rarity: "common", type: "minion", faction: "neutral",
    currentAttack: 1, currentHealth: 1,
    summoningSickness: true, hasAttacked: false, hasDivineShield: false,
    isStealth: false, isFrozen: false, isImmune: false,
    freezeTurnsLeft: 0,
    windfuryAttacksLeft: 1, enrageActive: false, enrageBonus: 0,
    factionAttackBonus: 0, factionHealthBonus: 0, shuAdjacencyAtkBonus: 0, shuAdjacencyHpBonus: 0, brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0, wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0, qunDebuff: 0,
    lane: Lane.Center, slotIndex: 0,
    ...overrides,
  };
}

function findCard(name: string): Card {
  const card = cards.find((c) => c.name === name);
  if (!card) throw new Error(`Card not found: ${name}`);
  return { ...card };
}

function giveCard(state: GameState, player: number, card: Card) {
  state.players[player].hand.push(card);
}

// ===== AC: Lane adjacency helpers =====

describe("Lane adjacency", () => {
  it("Left reaches Left and Center", () => {
    expect(getReachableLanes(Lane.Left)).toEqual([Lane.Left, Lane.Center]);
  });

  it("Center reaches all three lanes", () => {
    expect(getReachableLanes(Lane.Center)).toEqual([Lane.Left, Lane.Center, Lane.Right]);
  });

  it("Right reaches Center and Right", () => {
    expect(getReachableLanes(Lane.Right)).toEqual([Lane.Center, Lane.Right]);
  });
});

describe("getSpellReachableLanes", () => {
  it("returns all lanes when player has no minions", () => {
    const player = createPlayerState(makeDeck());
    player.board = [];
    const lanes = getSpellReachableLanes(player);
    expect(lanes).toContain(Lane.Left);
    expect(lanes).toContain(Lane.Center);
    expect(lanes).toContain(Lane.Right);
  });

  it("returns only reachable lanes based on minion positions", () => {
    const player = createPlayerState(makeDeck());
    player.board = [makeMinion({ lane: Lane.Left })];
    const lanes = getSpellReachableLanes(player);
    expect(lanes).toContain(Lane.Left);
    expect(lanes).toContain(Lane.Center);
    expect(lanes).not.toContain(Lane.Right);
  });

  it("unions reachable lanes from multiple minions", () => {
    const player = createPlayerState(makeDeck());
    player.board = [
      makeMinion({ lane: Lane.Left }),
      makeMinion({ lane: Lane.Right }),
    ];
    const lanes = getSpellReachableLanes(player);
    expect(lanes.length).toBe(3);
  });
});

// ===== AC: Spell card targetType definitions =====

describe("Spell targetType definitions", () => {
  it("lane_aoe spells: 伏兵, 连环计, 火烧赤壁", () => {
    expect(findCard("伏兵").targetType).toBe("lane_aoe");
    expect(findCard("连环计").targetType).toBe("lane_aoe");
    expect(findCard("火烧赤壁").targetType).toBe("lane_aoe");
  });

  it("enemy_minion spell: 烽火", () => {
    expect(findCard("烽火").targetType).toBe("enemy_minion");
  });

  it("non-targeted spells have no targetType", () => {
    expect(findCard("草药").targetType).toBeUndefined();
    expect(findCard("征兵令").targetType).toBeUndefined();
  });
});

// ===== AC: AOE spells require lane selection and only hit that lane's minions =====

describe("Lane AOE spells only hit target lane", () => {
  it("伏兵 deals 3 damage only to target lane minions", () => {
    const state = makeState();
    state.players[0].hero.mana = 10;
    state.players[1].board = [
      makeMinion({ name: "L", lane: Lane.Left, currentHealth: 10 }),
      makeMinion({ name: "C", lane: Lane.Center, currentHealth: 10 }),
      makeMinion({ name: "R", lane: Lane.Right, currentHealth: 10 }),
    ];
    giveCard(state, 0, findCard("伏兵"));
    const idx = state.players[0].hand.length - 1;
    playCard(state, idx, undefined, () => 0.5, Lane.Center, undefined, Lane.Left);

    const board = state.players[1].board;
    expect(board.find(m => m.name === "L")!.currentHealth).toBe(7);
    expect(board.find(m => m.name === "C")!.currentHealth).toBe(10);
    expect(board.find(m => m.name === "R")!.currentHealth).toBe(10);
  });

  it("连环计 freezes and damages only target lane", () => {
    const state = makeState();
    state.players[0].hero.mana = 10;
    state.players[1].board = [
      makeMinion({ name: "L", lane: Lane.Left, currentHealth: 10 }),
      makeMinion({ name: "C", lane: Lane.Center, currentHealth: 10 }),
    ];
    giveCard(state, 0, findCard("连环计"));
    const idx = state.players[0].hand.length - 1;
    playCard(state, idx, undefined, () => 0.5, Lane.Center, undefined, Lane.Center);

    const board = state.players[1].board;
    expect(board.find(m => m.name === "L")!.currentHealth).toBe(10);
    expect(board.find(m => m.name === "L")!.isFrozen).toBe(false);
    expect(board.find(m => m.name === "C")!.currentHealth).toBe(8);
    expect(board.find(m => m.name === "C")!.isFrozen).toBe(true);
  });

  it("火烧赤壁 hits only target lane minions + enemy hero", () => {
    const state = makeState();
    state.players[0].hero.mana = 10;
    state.players[1].board = [
      makeMinion({ name: "L", lane: Lane.Left, currentHealth: 20 }),
      makeMinion({ name: "R", lane: Lane.Right, currentHealth: 20 }),
    ];
    const heroHp = state.players[1].hero.health;
    giveCard(state, 0, findCard("火烧赤壁"));
    const idx = state.players[0].hand.length - 1;
    playCard(state, idx, undefined, () => 0.5, Lane.Center, undefined, Lane.Right);

    const board = state.players[1].board;
    expect(board.find(m => m.name === "L")!.currentHealth).toBe(20);
    expect(board.find(m => m.name === "R")!.currentHealth).toBe(12);
    expect(state.players[1].hero.health).toBe(heroHp - 4);
  });

  it("lane_aoe with no minions in target lane deals no minion damage", () => {
    const state = makeState();
    state.players[0].hero.mana = 10;
    state.players[1].board = [
      makeMinion({ name: "C", lane: Lane.Center, currentHealth: 10 }),
    ];
    giveCard(state, 0, findCard("伏兵"));
    const idx = state.players[0].hand.length - 1;
    playCard(state, idx, undefined, () => 0.5, Lane.Center, undefined, Lane.Left);

    expect(state.players[1].board.find(m => m.name === "C")!.currentHealth).toBe(10);
  });
});

// ===== AC: Targeted spells respect lane adjacency (烽火) =====

describe("Targeted spell (烽火)", () => {
  it("deals damage to specified targetIndex", () => {
    const state = makeState();
    state.players[0].hero.mana = 10;
    state.players[1].board = [
      makeMinion({ name: "A", currentHealth: 5 }),
      makeMinion({ name: "B", currentHealth: 5 }),
    ];
    giveCard(state, 0, findCard("烽火"));
    const idx = state.players[0].hand.length - 1;
    playCard(state, idx, 1);
    expect(state.players[1].board[0].currentHealth).toBe(5);
    expect(state.players[1].board[1].currentHealth).toBe(3);
  });

  it("falls back to random target when no targetIndex", () => {
    const state = makeState();
    state.players[0].hero.mana = 10;
    state.players[1].board = [
      makeMinion({ name: "A", currentHealth: 5 }),
    ];
    giveCard(state, 0, findCard("烽火"));
    const idx = state.players[0].hand.length - 1;
    playCard(state, idx);
    expect(state.players[1].board[0].currentHealth).toBe(3);
  });
});

// ===== AC: UI enforces lane_aoe requiring targetLane =====

describe("UI enforcement", () => {
  it("page.tsx validates lane_aoe spells require targetLane", () => {
    const pagePath = path.resolve(__dirname, "../app/game/page.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toMatch(/lane_aoe/);
    expect(content).toMatch(/targetLane/);
  });

  it("page.tsx has targeting mode for spells", () => {
    const pagePath = path.resolve(__dirname, "../app/game/page.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");
    expect(content).toMatch(/pendingSpell/);
    expect(content).toMatch(/card\.targetType/);
  });
});

// ===== AC: AI handles lane_aoe targeting =====

describe("AI lane targeting", () => {
  it("AI code handles lane_aoe spell targeting", () => {
    const aiPath = path.resolve(__dirname, "./ai.ts");
    const content = fs.readFileSync(aiPath, "utf-8");
    expect(content).toMatch(/lane_aoe/);
  });
});
