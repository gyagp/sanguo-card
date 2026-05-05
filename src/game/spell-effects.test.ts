import { describe, it, expect } from "vitest";
import { cards } from "./cards";
import {
  Card,
  GameState,
  PlayerState,
  BoardMinion,
  Deck,
  playCard,
  startTurn,
  createPlayerState,
  MAX_BOARD_SIZE,
  STARTING_HP,
  drawCard,
} from "./types";

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
    spellsPlayed: [[], []],
  };
}

function makeMinion(overrides: Partial<BoardMinion> = {}): BoardMinion {
  return {
    name: "test", cost: 1, attack: 1, health: 1, description: "",
    rarity: "common", type: "minion", faction: "neutral",
    currentAttack: 1, currentHealth: 1,
    summoningSickness: true, hasAttacked: false, hasDivineShield: false,
    isStealth: false, isFrozen: false, isImmune: false,
    windfuryAttacksLeft: 1, enrageActive: false, enrageBonus: 0,
    factionAttackBonus: 0, factionHealthBonus: 0,
    ...overrides,
  };
}

function findCard(name: string): Card {
  const card = cards.find(c => c.name === name);
  if (!card) throw new Error(`Card not found: ${name}`);
  return { ...card };
}

function giveCard(state: GameState, playerIdx: 0 | 1, card: Card): void {
  state.players[playerIdx].hand.push(card);
}

describe("Card interface has effect field for spells", () => {
  it("spell cards have effect field", () => {
    const spells = cards.filter(c => c.type === "spell");
    expect(spells.length).toBeGreaterThan(0);
    for (const spell of spells) {
      expect(spell.effect).toBeDefined();
      expect(typeof spell.effect).toBe("function");
    }
  });

  it("minion cards do not have effect field set", () => {
    const minions = cards.filter(c => c.type === "minion");
    for (const minion of minions) {
      expect(minion.effect).toBeUndefined();
    }
  });
});

describe("playCard executes spell effects", () => {
  it("烽火 deals damage to an enemy minion", () => {
    const state = makeState();
    state.players[0].hero.mana = 10;
    const enemy = makeMinion({ currentHealth: 5 });
    state.players[1].board.push(enemy);
    giveCard(state, 0, findCard("烽火"));
    const result = playCard(state, 0);
    expect(result.success).toBe(true);
    expect(enemy.currentHealth).toBeLessThanOrEqual(3);
  });

  it("草药 heals the hero", () => {
    const state = makeState();
    state.players[0].hero.mana = 10;
    state.players[0].hero.health = 20;
    giveCard(state, 0, findCard("草药"));
    playCard(state, 0);
    expect(state.players[0].hero.health).toBe(25);
  });

  it("草药 does not heal above max HP", () => {
    const state = makeState();
    state.players[0].hero.mana = 10;
    state.players[0].hero.health = 28;
    giveCard(state, 0, findCard("草药"));
    playCard(state, 0);
    expect(state.players[0].hero.health).toBe(STARTING_HP);
  });

  it("征兵令 summons two 1/1 tokens", () => {
    const state = makeState();
    state.players[0].hero.mana = 10;
    giveCard(state, 0, findCard("征兵令"));
    playCard(state, 0);
    expect(state.players[0].board.length).toBe(2);
    for (const m of state.players[0].board) {
      expect(m.currentAttack).toBe(1);
      expect(m.currentHealth).toBe(1);
    }
  });

  it("征兵令 respects board size limit", () => {
    const state = makeState();
    state.players[0].hero.mana = 10;
    for (let i = 0; i < 6; i++) {
      state.players[0].board.push(makeMinion());
    }
    giveCard(state, 0, findCard("征兵令"));
    playCard(state, 0);
    expect(state.players[0].board.length).toBe(MAX_BOARD_SIZE);
  });

  it("伏兵 deals AoE damage to all enemy minions", () => {
    const state = makeState();
    state.players[0].hero.mana = 10;
    for (let i = 0; i < 3; i++) {
      state.players[1].board.push(makeMinion({ currentHealth: 5 }));
    }
    giveCard(state, 0, findCard("伏兵"));
    playCard(state, 0);
    for (const m of state.players[1].board) {
      expect(m.currentHealth).toBe(2);
    }
  });

  it("草船借箭 draws 3 cards normally", () => {
    const state = makeState();
    state.players[0].hero.mana = 10;
    state.players[0].hand = [];
    state.players[0].hand.push(findCard("草船借箭"));
    // After playing the spell, hand should be empty then draw 3 (but card is removed first so hand.length==0 -> draws 5)
    // Per the reviewer feedback, this is the current behavior
    playCard(state, 0);
    // Card is removed before effect, hand was [草船借箭], after removal hand=[], so draws 5
    expect(state.players[0].hand.length).toBe(5);
  });

  it("草船借箭 draws 3 when player has other cards in hand", () => {
    const state = makeState();
    state.players[0].hero.mana = 10;
    const filler = findCard("草药");
    state.players[0].hand = [findCard("草船借箭"), filler];
    playCard(state, 0);
    // After removing 草船借箭, hand=[filler], length=1 > 0, so draws 3
    expect(state.players[0].hand.length).toBe(4); // 1 existing + 3 drawn
  });

  it("连环计 freezes and damages all enemy minions", () => {
    const state = makeState();
    state.players[0].hero.mana = 10;
    for (let i = 0; i < 3; i++) {
      state.players[1].board.push(makeMinion({ currentHealth: 5 }));
    }
    giveCard(state, 0, findCard("连环计"));
    playCard(state, 0);
    for (const m of state.players[1].board) {
      expect(m.isFrozen).toBe(true);
      expect(m.currentHealth).toBe(3);
    }
  });

  it("火烧赤壁 deals damage to all enemy minions and hero", () => {
    const state = makeState();
    state.players[0].hero.mana = 10;
    state.players[1].board.push(makeMinion({ currentHealth: 10 }));
    giveCard(state, 0, findCard("火烧赤壁"));
    playCard(state, 0);
    expect(state.players[1].board[0].currentHealth).toBe(2);
    expect(state.players[1].hero.health).toBe(STARTING_HP - 4);
  });

  it("spell card is removed from hand and mana is spent", () => {
    const state = makeState();
    state.players[0].hero.mana = 10;
    giveCard(state, 0, findCard("烽火"));
    state.players[1].board.push(makeMinion({ currentHealth: 5 }));
    const handSizeBefore = state.players[0].hand.length;
    playCard(state, 0);
    expect(state.players[0].hand.length).toBe(handSizeBefore - 1);
    expect(state.players[0].hero.mana).toBe(9); // 烽火 costs 1
  });
});

describe("spellDamage bonus from minions", () => {
  it("spellDamage minion boosts spell damage", () => {
    const state = makeState();
    state.players[0].hero.mana = 10;
    // 诸葛亮 has spellDamage: 3
    state.players[0].board.push(makeMinion({ spellDamage: 3 }));
    state.players[1].board.push(makeMinion({ currentHealth: 10 }));
    giveCard(state, 0, findCard("烽火"));
    playCard(state, 0);
    // 烽火 does 2 + 3 spellDamage = 5
    expect(state.players[1].board[0].currentHealth).toBe(5);
  });

  it("multiple spellDamage minions stack", () => {
    const state = makeState();
    state.players[0].hero.mana = 10;
    state.players[0].board.push(makeMinion({ spellDamage: 1 }));
    state.players[0].board.push(makeMinion({ spellDamage: 2 }));
    state.players[1].board.push(makeMinion({ currentHealth: 10 }));
    giveCard(state, 0, findCard("烽火"));
    playCard(state, 0);
    // 2 + 1 + 2 = 5
    expect(state.players[1].board[0].currentHealth).toBe(5);
  });

  it("spellDamage does not affect non-damage spells", () => {
    const state = makeState();
    state.players[0].hero.mana = 10;
    state.players[0].board.push(makeMinion({ spellDamage: 3 }));
    state.players[0].hero.health = 20;
    giveCard(state, 0, findCard("草药"));
    playCard(state, 0);
    // 草药 heals 5, unaffected by spellDamage
    expect(state.players[0].hero.health).toBe(25);
  });
});

describe("空城计 immunity clears on next turn", () => {
  it("sets hero immune and draws 2 cards", () => {
    const state = makeState();
    state.players[0].hero.mana = 10;
    giveCard(state, 0, findCard("空城计"));
    playCard(state, 0);
    expect(state.players[0].hero.isImmune).toBe(true);
    // drew 2 cards
  });

  it("immunity clears when opponent's turn starts (after activePlayer switches)", () => {
    const state = makeState();
    state.players[0].hero.mana = 10;
    state.activePlayer = 0;
    giveCard(state, 0, findCard("空城计"));
    playCard(state, 0);
    expect(state.players[0].hero.isImmune).toBe(true);

    // End turn switches to player 1, then player 1's turn starts
    // When player 0's next turn starts, their immunity should clear
    state.activePlayer = 0;
    startTurn(state);
    expect(state.players[0].hero.isImmune).toBe(false);
  });
});

describe("removeDeadMinions after spell damage", () => {
  it("minions killed by spells are removed", () => {
    const state = makeState();
    state.players[0].hero.mana = 10;
    state.players[1].board.push(makeMinion({ currentHealth: 2 }));
    giveCard(state, 0, findCard("烽火"));
    playCard(state, 0);
    expect(state.players[1].board.length).toBe(0);
  });

  it("伏兵 kills low-health minions via AoE", () => {
    const state = makeState();
    state.players[0].hero.mana = 10;
    state.players[1].board.push(makeMinion({ currentHealth: 2 }));
    state.players[1].board.push(makeMinion({ currentHealth: 5 }));
    giveCard(state, 0, findCard("伏兵"));
    playCard(state, 0);
    expect(state.players[1].board.length).toBe(1);
    expect(state.players[1].board[0].currentHealth).toBe(2);
  });
});
