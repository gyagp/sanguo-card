import { describe, it, expect } from "vitest";
import {
  Card,
  GameState,
  PlayerState,
  BoardMinion,
  Deck,
  Faction,
  Lane,
  TerrainType,
  TERRAIN_DEFINITIONS,
  createDeck,
  createPlayerState,
  getReachableLanes,
  getSpellReachableLanes,
  getBoardMinions,
  getMinionsByLane,
  getLaneBoard,
  getLaneCount,
  addMinionToLane,
  attackMinion,
  attackHero,
  recalculateFormationBonuses,
  recalculateFactionSynergies,
  MAX_LANE_SIZE,
  ALL_LANES,
  startTurn,
  playCard,
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

function makeDeck(): Deck {
  return createDeck(Array.from({ length: 30 }, (_, i) => makeCard({ name: `Card ${i}` })));
}

function makeGameState(): GameState {
  return {
    players: [createPlayerState(makeDeck()), createPlayerState(makeDeck())],
    board: [[], []],
    turn: 1,
    phase: "playing",
    turnPhase: "play",
    activePlayer: 0,
    spellsPlayed: [[], []],
    wuComboCount: [0, 0],
    terrain: { [Lane.Left]: null, [Lane.Center]: null, [Lane.Right]: null },
  };
}

function makeBoardMinion(overrides: Partial<BoardMinion> = {}): BoardMinion {
  return {
    name: "Test Minion",
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
    freezeTurnsLeft: 0,
    isImmune: false,
    windfuryAttacksLeft: 1,
    enrageActive: false,
    enrageBonus: 0,
    factionAttackBonus: 0,
    factionHealthBonus: 0,
    formationAtkBonus: 0,
    formationHpBonus: 0,
    brotherhoodAtkBonus: 0,
    brotherhoodHpBonus: 0,
    wuChargeBonus: 0,
    wuWeaponBonus: 0,
    wuComboAtkBonus: 0,
    wuComboHpBonus: 0,
    qunDebuff: 0,
    lane: Lane.Center,
    slotIndex: 0,
    ...overrides,
  };
}

// ─── Attack Lane Validation ─────────────────────────────────────────────────

describe("Attack lane validation", () => {
  it("allows attack within the same lane", () => {
    const state = makeGameState();
    state.players[0].board.push(makeBoardMinion({ lane: Lane.Center }));
    state.players[1].board.push(makeBoardMinion({ lane: Lane.Center }));
    const result = attackMinion(state, 0, 0);
    expect(result.success).toBe(true);
  });

  it("allows attack to adjacent lane (Left → Center)", () => {
    const state = makeGameState();
    state.players[0].board.push(makeBoardMinion({ lane: Lane.Left }));
    state.players[1].board.push(makeBoardMinion({ lane: Lane.Center }));
    const result = attackMinion(state, 0, 0);
    expect(result.success).toBe(true);
  });

  it("allows attack to adjacent lane (Right → Center)", () => {
    const state = makeGameState();
    state.players[0].board.push(makeBoardMinion({ lane: Lane.Right }));
    state.players[1].board.push(makeBoardMinion({ lane: Lane.Center }));
    const result = attackMinion(state, 0, 0);
    expect(result.success).toBe(true);
  });

  it("allows attack to adjacent lane (Center → Left)", () => {
    const state = makeGameState();
    state.players[0].board.push(makeBoardMinion({ lane: Lane.Center }));
    state.players[1].board.push(makeBoardMinion({ lane: Lane.Left }));
    const result = attackMinion(state, 0, 0);
    expect(result.success).toBe(true);
  });

  it("rejects attack from Left to Right (non-adjacent)", () => {
    const state = makeGameState();
    state.players[0].board.push(makeBoardMinion({ lane: Lane.Left }));
    state.players[1].board.push(makeBoardMinion({ lane: Lane.Right }));
    const result = attackMinion(state, 0, 0);
    expect(result.success).toBe(false);
    expect(result.error).toContain("not in an adjacent lane");
  });

  it("rejects attack from Right to Left (non-adjacent)", () => {
    const state = makeGameState();
    state.players[0].board.push(makeBoardMinion({ lane: Lane.Right }));
    state.players[1].board.push(makeBoardMinion({ lane: Lane.Left }));
    const result = attackMinion(state, 0, 0);
    expect(result.success).toBe(false);
    expect(result.error).toContain("not in an adjacent lane");
  });

  it("taunt only blocks within reachable lanes", () => {
    const state = makeGameState();
    state.players[0].board.push(makeBoardMinion({ lane: Lane.Left }));
    // Taunt minion in Right lane (unreachable from Left)
    state.players[1].board.push(makeBoardMinion({ lane: Lane.Right, taunt: true } as any));
    // Non-taunt minion in Center (reachable from Left)
    state.players[1].board.push(makeBoardMinion({ lane: Lane.Center }));
    const result = attackMinion(state, 0, 1);
    expect(result.success).toBe(true);
  });

  it("taunt in reachable lane forces targeting", () => {
    const state = makeGameState();
    state.players[0].board.push(makeBoardMinion({ lane: Lane.Center }));
    state.players[1].board.push(makeBoardMinion({ lane: Lane.Center, taunt: true } as any));
    state.players[1].board.push(makeBoardMinion({ lane: Lane.Center }));
    const result = attackMinion(state, 0, 1);
    expect(result.success).toBe(false);
    expect(result.error).toContain("taunt");
  });
});

// ─── getReachableLanes ──────────────────────────────────────────────────────

describe("getReachableLanes", () => {
  it("Left reaches Left and Center", () => {
    expect(getReachableLanes(Lane.Left)).toEqual([Lane.Left, Lane.Center]);
  });

  it("Center reaches all lanes", () => {
    expect(getReachableLanes(Lane.Center)).toEqual([Lane.Left, Lane.Center, Lane.Right]);
  });

  it("Right reaches Center and Right", () => {
    expect(getReachableLanes(Lane.Right)).toEqual([Lane.Center, Lane.Right]);
  });
});

// ─── Formation Bonus ────────────────────────────────────────────────────────

describe("Formation bonus", () => {
  it("grants +1/+1 when 2 same-faction minions share a lane", () => {
    const player = createPlayerState(makeDeck());
    const m1 = makeBoardMinion({ name: "A", faction: "shu", lane: Lane.Left, currentAttack: 2, currentHealth: 3 });
    const m2 = makeBoardMinion({ name: "B", faction: "shu", lane: Lane.Left, currentAttack: 3, currentHealth: 4 });
    player.board.push(m1, m2);

    recalculateFormationBonuses(player);

    expect(m1.formationAtkBonus).toBe(1);
    expect(m1.formationHpBonus).toBe(1);
    expect(m1.currentAttack).toBe(3);
    expect(m1.currentHealth).toBe(4);
    expect(m2.formationAtkBonus).toBe(1);
    expect(m2.formationHpBonus).toBe(1);
    expect(m2.currentAttack).toBe(4);
    expect(m2.currentHealth).toBe(5);
  });

  it("does not grant bonus for neutral faction", () => {
    const player = createPlayerState(makeDeck());
    const m1 = makeBoardMinion({ faction: "neutral", lane: Lane.Left });
    const m2 = makeBoardMinion({ faction: "neutral", lane: Lane.Left });
    player.board.push(m1, m2);

    recalculateFormationBonuses(player);

    expect(m1.formationAtkBonus).toBe(0);
    expect(m2.formationAtkBonus).toBe(0);
  });

  it("does not grant bonus for same faction in different lanes", () => {
    const player = createPlayerState(makeDeck());
    const m1 = makeBoardMinion({ faction: "shu", lane: Lane.Left, currentAttack: 2, currentHealth: 3 });
    const m2 = makeBoardMinion({ faction: "shu", lane: Lane.Right, currentAttack: 3, currentHealth: 4 });
    player.board.push(m1, m2);

    recalculateFormationBonuses(player);

    expect(m1.formationAtkBonus).toBe(0);
    expect(m2.formationAtkBonus).toBe(0);
  });

  it("does not grant bonus for different factions in same lane", () => {
    const player = createPlayerState(makeDeck());
    const m1 = makeBoardMinion({ faction: "shu", lane: Lane.Center });
    const m2 = makeBoardMinion({ faction: "wei", lane: Lane.Center });
    player.board.push(m1, m2);

    recalculateFormationBonuses(player);

    expect(m1.formationAtkBonus).toBe(0);
    expect(m2.formationAtkBonus).toBe(0);
  });

  it("removes bonus when recalculated after minion leaves lane", () => {
    const player = createPlayerState(makeDeck());
    const m1 = makeBoardMinion({ faction: "shu", lane: Lane.Left, currentAttack: 2, currentHealth: 3 });
    const m2 = makeBoardMinion({ faction: "shu", lane: Lane.Left, currentAttack: 3, currentHealth: 4 });
    player.board.push(m1, m2);

    recalculateFormationBonuses(player);
    expect(m1.formationAtkBonus).toBe(1);

    // Remove m2
    player.board.splice(1, 1);
    recalculateFormationBonuses(player);

    expect(m1.formationAtkBonus).toBe(0);
    expect(m1.currentAttack).toBe(2);
    expect(m1.currentHealth).toBe(3);
  });
});

// ─── Terrain Effects ────────────────────────────────────────────────────────

describe("Terrain effects", () => {
  describe("Fire terrain", () => {
    it("deals 1 damage to active player's minions at turn start", () => {
      const state = makeGameState();
      state.terrain[Lane.Center] = TERRAIN_DEFINITIONS[TerrainType.Fire];
      state.activePlayer = 0;
      state.players[0].maxMana = 0;
      const m = makeBoardMinion({ lane: Lane.Center, currentHealth: 5 });
      state.players[0].board.push(m);

      // startTurn applies terrain to active player
      startTurn(state);

      expect(m.currentHealth).toBe(4);
    });

    it("does not damage minions in other lanes", () => {
      const state = makeGameState();
      state.terrain[Lane.Left] = TERRAIN_DEFINITIONS[TerrainType.Fire];
      state.activePlayer = 0;
      state.players[0].maxMana = 0;
      const m = makeBoardMinion({ lane: Lane.Center, currentHealth: 5 });
      state.players[0].board.push(m);

      startTurn(state);

      expect(m.currentHealth).toBe(5);
    });

    it("does not damage immune minions", () => {
      const state = makeGameState();
      state.terrain[Lane.Center] = TERRAIN_DEFINITIONS[TerrainType.Fire];
      state.activePlayer = 0;
      state.players[0].maxMana = 0;
      const m = makeBoardMinion({ lane: Lane.Center, currentHealth: 3, isImmune: true });
      state.players[0].board.push(m);

      startTurn(state);

      expect(m.currentHealth).toBe(3);
    });
  });

  describe("Healing Aura terrain", () => {
    it("heals 1 HP to minions in that lane at turn start", () => {
      const state = makeGameState();
      state.terrain[Lane.Right] = TERRAIN_DEFINITIONS[TerrainType.HealingAura];
      state.activePlayer = 0;
      state.players[0].maxMana = 0;
      const m = makeBoardMinion({ lane: Lane.Right, currentHealth: 2, health: 5 });
      state.players[0].board.push(m);

      startTurn(state);

      expect(m.currentHealth).toBe(3);
    });

    it("does not heal above max health", () => {
      const state = makeGameState();
      state.terrain[Lane.Center] = TERRAIN_DEFINITIONS[TerrainType.HealingAura];
      state.activePlayer = 0;
      state.players[0].maxMana = 0;
      const m = makeBoardMinion({ lane: Lane.Center, currentHealth: 3, health: 3 });
      state.players[0].board.push(m);

      startTurn(state);

      expect(m.currentHealth).toBe(3);
    });
  });

  describe("Stealth terrain", () => {
    it("grants stealth when minion is placed in stealth terrain lane", () => {
      const state = makeGameState();
      state.terrain[Lane.Left] = TERRAIN_DEFINITIONS[TerrainType.Stealth];
      state.activePlayer = 0;
      state.players[0].hero.mana = 10;
      state.players[0].maxMana = 10;

      const card = makeCard({ name: "Stealth Test", cost: 1, attack: 2, health: 3, faction: "neutral" });
      state.players[0].hand.push(card);

      const result = playCard(state, 0, undefined, Math.random, Lane.Left);
      expect(result.success).toBe(true);

      const placed = state.players[0].board.find(m => m.name === "Stealth Test");
      expect(placed).toBeDefined();
      expect(placed!.isStealth).toBe(true);
    });

    it("does not grant stealth in a lane without stealth terrain", () => {
      const state = makeGameState();
      state.terrain[Lane.Left] = TERRAIN_DEFINITIONS[TerrainType.Stealth];
      state.activePlayer = 0;
      state.players[0].hero.mana = 10;
      state.players[0].maxMana = 10;

      const card = makeCard({ name: "No Stealth", cost: 1, attack: 2, health: 3 });
      state.players[0].hand.push(card);

      const result = playCard(state, 0, undefined, Math.random, Lane.Center);
      expect(result.success).toBe(true);

      const placed = state.players[0].board.find(m => m.name === "No Stealth");
      expect(placed).toBeDefined();
      expect(placed!.isStealth).toBe(false);
    });
  });
});

// ─── Spell Lane Targeting ───────────────────────────────────────────────────

describe("getSpellReachableLanes", () => {
  it("returns all lanes when player has no minions", () => {
    const player = createPlayerState(makeDeck());
    const reachable = getSpellReachableLanes(player);
    expect(reachable.sort()).toEqual([Lane.Left, Lane.Center, Lane.Right].sort());
  });

  it("returns adjacent lanes of owned minions", () => {
    const player = createPlayerState(makeDeck());
    player.board.push(makeBoardMinion({ lane: Lane.Left }));
    const reachable = getSpellReachableLanes(player);
    expect(reachable).toContain(Lane.Left);
    expect(reachable).toContain(Lane.Center);
    expect(reachable).not.toContain(Lane.Right);
  });

  it("unions reachable lanes from multiple minions", () => {
    const player = createPlayerState(makeDeck());
    player.board.push(makeBoardMinion({ lane: Lane.Left }));
    player.board.push(makeBoardMinion({ lane: Lane.Right }));
    const reachable = getSpellReachableLanes(player);
    expect(reachable.sort()).toEqual([Lane.Left, Lane.Center, Lane.Right].sort());
  });

  it("center minion reaches all lanes", () => {
    const player = createPlayerState(makeDeck());
    player.board.push(makeBoardMinion({ lane: Lane.Center }));
    const reachable = getSpellReachableLanes(player);
    expect(reachable.sort()).toEqual([Lane.Left, Lane.Center, Lane.Right].sort());
  });
});

// ─── Board Helpers ──────────────────────────────────────────────────────────

describe("Board lane helpers", () => {
  it("getBoardMinions returns all minions", () => {
    const player = createPlayerState(makeDeck());
    player.board.push(makeBoardMinion({ lane: Lane.Left }));
    player.board.push(makeBoardMinion({ lane: Lane.Right }));
    expect(getBoardMinions(player)).toHaveLength(2);
  });

  it("getMinionsByLane filters by lane", () => {
    const player = createPlayerState(makeDeck());
    player.board.push(makeBoardMinion({ lane: Lane.Left }));
    player.board.push(makeBoardMinion({ lane: Lane.Center }));
    player.board.push(makeBoardMinion({ lane: Lane.Left }));
    expect(getMinionsByLane(player, Lane.Left)).toHaveLength(2);
    expect(getMinionsByLane(player, Lane.Center)).toHaveLength(1);
    expect(getMinionsByLane(player, Lane.Right)).toHaveLength(0);
  });

  it("getLaneBoard groups by lane", () => {
    const player = createPlayerState(makeDeck());
    player.board.push(makeBoardMinion({ lane: Lane.Left }));
    player.board.push(makeBoardMinion({ lane: Lane.Right }));
    const lb = getLaneBoard(player);
    expect(lb[Lane.Left]).toHaveLength(1);
    expect(lb[Lane.Center]).toHaveLength(0);
    expect(lb[Lane.Right]).toHaveLength(1);
  });

  it("getLaneCount returns correct count", () => {
    const player = createPlayerState(makeDeck());
    player.board.push(makeBoardMinion({ lane: Lane.Center }));
    player.board.push(makeBoardMinion({ lane: Lane.Center }));
    expect(getLaneCount(player, Lane.Center)).toBe(2);
    expect(getLaneCount(player, Lane.Left)).toBe(0);
  });

  it("addMinionToLane respects MAX_LANE_SIZE", () => {
    const player = createPlayerState(makeDeck());
    const m1 = makeBoardMinion({ lane: Lane.Left });
    const m2 = makeBoardMinion({ lane: Lane.Left });
    const m3 = makeBoardMinion({ lane: Lane.Left });
    expect(addMinionToLane(player, m1, Lane.Left)).toBe(true);
    expect(addMinionToLane(player, m2, Lane.Left)).toBe(true);
    expect(addMinionToLane(player, m3, Lane.Left)).toBe(false);
    expect(player.board).toHaveLength(2);
  });

  it("addMinionToLane sets lane and slotIndex", () => {
    const player = createPlayerState(makeDeck());
    const m = makeBoardMinion();
    addMinionToLane(player, m, Lane.Right, 0);
    expect(m.lane).toBe(Lane.Right);
    expect(m.slotIndex).toBe(0);
  });
});
