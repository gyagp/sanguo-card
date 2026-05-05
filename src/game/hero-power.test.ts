import { describe, it, expect } from "vitest";
import {
  Card,
  Deck,
  createDeck,
  initializeGame,
  startTurn,
  useHeroPower,
  FACTION_HERO_POWERS,
  STARTING_HP,
  MAX_BOARD_SIZE,
  GameState,
  getDeckFaction,
  getDeckFactionCount,
  removeDeadMinions,
  UPGRADED_FACTION_HERO_POWERS,
  DECK_FACTION_THRESHOLD,
} from "./types";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    name: "Test Card",
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

function makeFactionDeck(faction: "wei" | "shu" | "wu" | "qun"): Deck {
  const cards: Card[] = [];
  for (let i = 0; i < 30; i++) {
    cards.push(makeCard({ name: `${faction}-${i}`, faction }));
  }
  return createDeck(cards);
}

function makeNeutralDeck(): Deck {
  const cards: Card[] = [];
  for (let i = 0; i < 30; i++) {
    cards.push(makeCard({ name: `neutral-${i}`, faction: "neutral" }));
  }
  return createDeck(cards);
}

function setupGame(faction1: "wei" | "shu" | "wu" | "qun" | "neutral", mana: number = 5): GameState {
  const deck1 = faction1 === "neutral" ? makeNeutralDeck() : makeBaseFactionDeck(faction1 as "wei" | "shu" | "wu" | "qun");
  const deck2 = makeNeutralDeck();
  const state = initializeGame(deck1, deck2);
  state.players[0].hero.mana = mana;
  return state;
}

function makeBaseFactionDeck(faction: "wei" | "shu" | "wu" | "qun"): Deck {
  const cards: Card[] = [];
  for (let i = 0; i < 15; i++) cards.push(makeCard({ name: `${faction}-base-${i}`, faction }));
  for (let i = 0; i < 15; i++) cards.push(makeCard({ name: `neutral-base-${i}`, faction: "neutral" }));
  return createDeck(cards);
}

describe("FACTION_HERO_POWERS definitions", () => {
  it("defines hero powers for all five factions", () => {
    for (const faction of ["shu", "wei", "wu", "qun", "neutral"] as const) {
      const power = FACTION_HERO_POWERS[faction];
      expect(power).toBeDefined();
      expect(power.name).toBeTruthy();
      expect(power.cost).toBe(2);
      expect(typeof power.effect).toBe("function");
    }
  });
});

describe("Hero power effects", () => {
  describe("Shu (仁德) — heal hero 2 HP", () => {
    it("heals the hero for 2", () => {
      const state = setupGame("shu");
      state.players[0].hero.health = 20;
      useHeroPower(state);
      expect(state.players[0].hero.health).toBe(22);
    });

    it("does not heal above STARTING_HP", () => {
      const state = setupGame("shu");
      state.players[0].hero.health = STARTING_HP - 1;
      useHeroPower(state);
      expect(state.players[0].hero.health).toBe(STARTING_HP);
    });

    it("does not heal above STARTING_HP when at full", () => {
      const state = setupGame("shu");
      state.players[0].hero.health = STARTING_HP;
      useHeroPower(state);
      expect(state.players[0].hero.health).toBe(STARTING_HP);
    });
  });

  describe("Wei (霸略) — deal 1 damage to enemy hero", () => {
    it("deals 1 damage to enemy hero", () => {
      const state = setupGame("wei");
      const before = state.players[1].hero.health;
      useHeroPower(state);
      expect(state.players[1].hero.health).toBe(before - 1);
    });
  });

  describe("Wu (制衡) — summon 1/1 soldier", () => {
    it("summons a 1/1 token", () => {
      const state = setupGame("wu");
      const boardBefore = state.players[0].board.length;
      useHeroPower(state);
      expect(state.players[0].board.length).toBe(boardBefore + 1);
      const token = state.players[0].board[state.players[0].board.length - 1];
      expect(token.currentAttack).toBe(1);
      expect(token.currentHealth).toBe(1);
      expect(token.name).toBe("士兵");
    });

    it("does not summon when board is full", () => {
      const state = setupGame("wu");
      for (let i = 0; i < MAX_BOARD_SIZE; i++) {
        state.players[0].board.push({
          ...makeCard(),
          currentAttack: 1, currentHealth: 1,
          summoningSickness: false, hasAttacked: false,
          hasDivineShield: false, isStealth: false, isFrozen: false,
          freezeTurnsLeft: 0,
          isImmune: false, windfuryAttacksLeft: 1,
          enrageActive: false, enrageBonus: 0,
          factionAttackBonus: 0, factionHealthBonus: 0, shuAdjacencyAtkBonus: 0, shuAdjacencyHpBonus: 0, brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0, wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0, qunDebuff: 0,
        });
      }
      const result = useHeroPower(state);
      expect(result.success).toBe(true);
      expect(state.players[0].board.length).toBe(MAX_BOARD_SIZE);
    });
  });

  describe("Qun (乱击) — equip 1/2 weapon", () => {
    it("equips a 1/2 weapon", () => {
      const state = setupGame("qun");
      useHeroPower(state);
      expect(state.players[0].weapon).not.toBeNull();
      expect(state.players[0].weapon!.attack).toBe(1);
      expect(state.players[0].weapon!.durability).toBe(2);
    });
  });

  describe("Neutral (策略) — deal 1 damage to random enemy minion", () => {
    it("deals 1 damage to an enemy minion", () => {
      const state = setupGame("neutral");
      state.players[1].board.push({
        ...makeCard(),
        currentAttack: 2, currentHealth: 3,
        summoningSickness: false, hasAttacked: false,
        hasDivineShield: false, isStealth: false, isFrozen: false,
        freezeTurnsLeft: 0,
        isImmune: false, windfuryAttacksLeft: 1,
        enrageActive: false, enrageBonus: 0,
        factionAttackBonus: 0, factionHealthBonus: 0, shuAdjacencyAtkBonus: 0, shuAdjacencyHpBonus: 0, brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0, wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0, qunDebuff: 0,
      });
      const hpBefore = state.players[1].board[0].currentHealth;
      useHeroPower(state);
      expect(state.players[1].board[0].currentHealth).toBe(hpBefore - 1);
    });

    it("hits enemy hero when no enemy minions exist", () => {
      const state = setupGame("neutral");
      const before = state.players[1].hero.health;
      useHeroPower(state);
      expect(state.players[1].hero.health).toBe(before - 1);
    });
  });
});

describe("Hero power effect survives JSON clone", () => {
  it("effect executes after state is JSON-cloned (critical bug test)", () => {
    const state = setupGame("shu");
    state.players[0].hero.health = 20;

    const cloned: GameState = JSON.parse(JSON.stringify(state));
    cloned.players[0].hero.mana = 5;

    // After JSON clone, heroPower.effect is stripped. useHeroPower must still work.
    const result = useHeroPower(cloned);
    expect(result.success).toBe(true);
    // If the effect didn't execute, health stays at 20
    expect(cloned.players[0].hero.health).toBe(22);
  });

  it("Wei effect executes on cloned state", () => {
    const state = setupGame("wei");
    const cloned: GameState = JSON.parse(JSON.stringify(state));
    cloned.players[0].hero.mana = 5;
    const before = cloned.players[1].hero.health;
    useHeroPower(cloned);
    expect(cloned.players[1].hero.health).toBe(before - 1);
  });

  it("Wu effect executes on cloned state", () => {
    const state = setupGame("wu");
    const cloned: GameState = JSON.parse(JSON.stringify(state));
    cloned.players[0].hero.mana = 5;
    const boardBefore = cloned.players[0].board.length;
    useHeroPower(cloned);
    expect(cloned.players[0].board.length).toBe(boardBefore + 1);
  });
});

describe("getDeckFaction and getDeckFactionCount", () => {
  it("returns the dominant faction for a mono-faction deck", () => {
    const deck = makeFactionDeck("wei");
    expect(getDeckFaction(deck)).toBe("wei");
    expect(getDeckFactionCount(deck, "wei")).toBe(30);
  });

  it("returns neutral for an all-neutral deck", () => {
    const deck = makeNeutralDeck();
    expect(getDeckFaction(deck)).toBe("neutral");
  });

  it("returns the faction with the most cards in a mixed deck", () => {
    const cards: Card[] = [];
    for (let i = 0; i < 18; i++) cards.push(makeCard({ name: `shu-${i}`, faction: "shu" }));
    for (let i = 0; i < 12; i++) cards.push(makeCard({ name: `wu-${i}`, faction: "wu" }));
    const deck = createDeck(cards);
    expect(getDeckFaction(deck)).toBe("shu");
    expect(getDeckFactionCount(deck, "shu")).toBe(18);
  });

  it("detects 20+ threshold correctly", () => {
    const cards: Card[] = [];
    for (let i = 0; i < 20; i++) cards.push(makeCard({ name: `wei-${i}`, faction: "wei" }));
    for (let i = 0; i < 10; i++) cards.push(makeCard({ name: `neutral-${i}`, faction: "neutral" }));
    const deck = createDeck(cards);
    expect(getDeckFactionCount(deck, "wei")).toBe(20);
    expect(getDeckFactionCount(deck, "wei") >= DECK_FACTION_THRESHOLD).toBe(true);
  });

  it("19 same-faction cards do not meet threshold", () => {
    const cards: Card[] = [];
    for (let i = 0; i < 19; i++) cards.push(makeCard({ name: `wei-${i}`, faction: "wei" }));
    for (let i = 0; i < 11; i++) cards.push(makeCard({ name: `neutral-${i}`, faction: "neutral" }));
    const deck = createDeck(cards);
    expect(getDeckFactionCount(deck, "wei") >= DECK_FACTION_THRESHOLD).toBe(false);
  });
});

describe("Deck faction bonus and hero power upgrade", () => {
  function makeMixedDeck(faction: "wei" | "shu" | "wu" | "qun", count: number): Deck {
    const cards: Card[] = [];
    for (let i = 0; i < count; i++) cards.push(makeCard({ name: `${faction}-${i}`, faction }));
    for (let i = count; i < 30; i++) cards.push(makeCard({ name: `neutral-${i}`, faction: "neutral" }));
    return createDeck(cards);
  }

  it("full faction deck gets upgraded hero power", () => {
    const deck = makeFactionDeck("wei");
    const state = initializeGame(deck, makeNeutralDeck());
    expect(state.players[0].hasDeckFactionBonus).toBe(true);
    expect(state.players[0].hero.heroPower.name).toBe("霸略·升级");
  });

  it("exactly 20 faction cards gets upgrade", () => {
    const deck = makeMixedDeck("shu", 20);
    const state = initializeGame(deck, makeNeutralDeck());
    expect(state.players[0].hasDeckFactionBonus).toBe(true);
    expect(state.players[0].hero.heroPower.name).toBe("仁德·升级");
  });

  it("19 faction cards does NOT get upgrade", () => {
    const deck = makeMixedDeck("shu", 19);
    const state = initializeGame(deck, makeNeutralDeck());
    expect(state.players[0].hasDeckFactionBonus).toBe(false);
    expect(state.players[0].hero.heroPower.name).toBe("仁德");
  });

  it("neutral deck gets no upgrade", () => {
    const deck = makeNeutralDeck();
    const state = initializeGame(deck, makeNeutralDeck());
    expect(state.players[0].hasDeckFactionBonus).toBe(true); // neutral 30 cards meets count threshold
    expect(state.players[0].hero.heroPower.name).toBe("策略"); // but no upgrade exists for neutral
  });
});

describe("Upgraded hero power effects", () => {
  function setupUpgradedGame(faction: "wei" | "shu" | "wu" | "qun"): GameState {
    const deck = makeFactionDeck(faction);
    const state = initializeGame(deck, makeNeutralDeck());
    state.players[0].hero.mana = 5;
    state.players[0].heroPowerUsed = false;
    return state;
  }

  describe("Wei upgraded (霸略·升级) — deal 2 damage", () => {
    it("deals 2 damage to enemy hero", () => {
      const state = setupUpgradedGame("wei");
      const before = state.players[1].hero.health;
      useHeroPower(state);
      expect(state.players[1].hero.health).toBe(before - 2);
    });
  });

  describe("Shu upgraded (仁德·升级) — heal 3 HP", () => {
    it("heals the hero for 3", () => {
      const state = setupUpgradedGame("shu");
      state.players[0].hero.health = 20;
      useHeroPower(state);
      expect(state.players[0].hero.health).toBe(23);
    });

    it("does not heal above STARTING_HP", () => {
      const state = setupUpgradedGame("shu");
      state.players[0].hero.health = STARTING_HP - 1;
      useHeroPower(state);
      expect(state.players[0].hero.health).toBe(STARTING_HP);
    });
  });

  describe("Wu upgraded (制衡·升级) — summon 2/1 soldier", () => {
    it("summons a 2/1 token", () => {
      const state = setupUpgradedGame("wu");
      const boardBefore = state.players[0].board.length;
      useHeroPower(state);
      expect(state.players[0].board.length).toBe(boardBefore + 1);
      const token = state.players[0].board[state.players[0].board.length - 1];
      expect(token.currentAttack).toBe(2);
      expect(token.currentHealth).toBe(1);
      expect(token.name).toBe("精锐士兵");
    });

    it("does not summon when board is full", () => {
      const state = setupUpgradedGame("wu");
      for (let i = 0; i < MAX_BOARD_SIZE; i++) {
        state.players[0].board.push({
          ...makeCard(),
          currentAttack: 1, currentHealth: 1,
          summoningSickness: false, hasAttacked: false,
          hasDivineShield: false, isStealth: false, isFrozen: false,
          freezeTurnsLeft: 0,
          isImmune: false, windfuryAttacksLeft: 1,
          enrageActive: false, enrageBonus: 0,
          factionAttackBonus: 0, factionHealthBonus: 0, shuAdjacencyAtkBonus: 0, shuAdjacencyHpBonus: 0, brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0, wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0, qunDebuff: 0,
        });
      }
      const result = useHeroPower(state);
      expect(result.success).toBe(true);
      expect(state.players[0].board.length).toBe(MAX_BOARD_SIZE);
    });
  });

  describe("Qun upgraded (乱击·升级) — equip 2/2 weapon", () => {
    it("equips a 2/2 weapon", () => {
      const state = setupUpgradedGame("qun");
      useHeroPower(state);
      expect(state.players[0].weapon).not.toBeNull();
      expect(state.players[0].weapon!.attack).toBe(2);
      expect(state.players[0].weapon!.durability).toBe(2);
    });
  });

  describe("Upgraded effects survive JSON clone", () => {
    it("Wei upgraded effect works after JSON clone", () => {
      const state = setupUpgradedGame("wei");
      const cloned: GameState = JSON.parse(JSON.stringify(state));
      cloned.players[0].hero.mana = 5;
      const before = cloned.players[1].hero.health;
      useHeroPower(cloned);
      expect(cloned.players[1].hero.health).toBe(before - 2);
    });

    it("Shu upgraded effect works after JSON clone", () => {
      const state = setupUpgradedGame("shu");
      state.players[0].hero.health = 20;
      const cloned: GameState = JSON.parse(JSON.stringify(state));
      cloned.players[0].hero.mana = 5;
      useHeroPower(cloned);
      expect(cloned.players[0].hero.health).toBe(23);
    });
  });
});
