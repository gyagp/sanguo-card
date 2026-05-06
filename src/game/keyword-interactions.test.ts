import { describe, it, expect, beforeEach } from "vitest";
import {
  Card,
  Deck,
  GameState,
  BoardMinion,
  Lane,
  createDeck,
  initializeGame,
  startTurn,
  attackMinion,
  attackHero,
  playCard,
  checkEnrage,
  gameEventBus,
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
    enrageBonus: 0,
    factionAttackBonus: 0,
    factionHealthBonus: 0,
    lane: Lane.Center, slotIndex: 0,
    ...overrides,
  };
}

function makeState(): GameState {
  return initializeGame(makeDeck(), makeDeck());
}

beforeEach(() => {
  gameEventBus.clear();
});

// ========== TAUNT + OTHER KEYWORDS ==========
describe("Taunt + Stealth interaction", () => {
  it("stealthed taunt minion still enforces taunt — cannot bypass to non-taunt", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].board = [makeBoardMinion({ currentAttack: 3, currentHealth: 5 })];
    state.players[1].board = [
      makeBoardMinion({ currentAttack: 1, currentHealth: 5, taunt: true, isStealth: true, name: "StealthTaunt" }),
      makeBoardMinion({ currentAttack: 2, currentHealth: 3, name: "Other" }),
    ];

    const result = attackMinion(state, 0, 1);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/taunt/i);
  });

  it("stealthed taunt minion cannot be directly targeted either", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].board = [makeBoardMinion({ currentAttack: 3, currentHealth: 5 })];
    state.players[1].board = [
      makeBoardMinion({ currentAttack: 1, currentHealth: 5, taunt: true, isStealth: true }),
      makeBoardMinion({ currentAttack: 2, currentHealth: 3 }),
    ];

    const result = attackMinion(state, 0, 0);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/stealth/i);
  });
});

describe("Taunt + Divine Shield interaction", () => {
  it("taunt minion with divine shield absorbs first hit then takes damage", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].board = [
      makeBoardMinion({ currentAttack: 5, currentHealth: 10, name: "Attacker1" }),
      makeBoardMinion({ currentAttack: 3, currentHealth: 10, name: "Attacker2" }),
    ];
    state.players[1].board = [
      makeBoardMinion({ currentAttack: 1, currentHealth: 5, taunt: true, hasDivineShield: true, name: "ShieldTaunt" }),
    ];

    attackMinion(state, 0, 0);
    expect(state.players[1].board[0].hasDivineShield).toBe(false);
    expect(state.players[1].board[0].currentHealth).toBe(5);

    attackMinion(state, 1, 0);
    expect(state.players[1].board[0].currentHealth).toBe(2);
  });
});

describe("Taunt + Freeze interaction", () => {
  it("frozen minion with taunt still blocks attacks on other targets", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].board = [makeBoardMinion({ currentAttack: 3, currentHealth: 5 })];
    state.players[1].board = [
      makeBoardMinion({ currentAttack: 1, currentHealth: 5, taunt: true, isFrozen: true, name: "FrozenTaunt" }),
      makeBoardMinion({ currentAttack: 2, currentHealth: 3, name: "Other" }),
    ];

    const result = attackMinion(state, 0, 1);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/taunt/i);
  });
});

// ========== CHARGE + OTHER KEYWORDS ==========
describe("Charge keyword", () => {
  it("charge minion can attack immediately after being played", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].hand = [makeCard({ cost: 0, charge: true, attack: 3, health: 3 })];
    state.players[0].hero.mana = 10;
    state.players[1].board = [makeBoardMinion({ currentAttack: 1, currentHealth: 10 })];

    playCard(state, 0);
    const played = state.players[0].board[state.players[0].board.length - 1];
    expect(played.summoningSickness).toBe(false);

    const result = attackMinion(state, state.players[0].board.length - 1, 0);
    expect(result.success).toBe(true);
  });

  it("non-charge minion has summoning sickness", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].hand = [makeCard({ cost: 0, attack: 3, health: 3 })];
    state.players[0].hero.mana = 10;
    state.players[1].board = [makeBoardMinion({ currentAttack: 1, currentHealth: 10 })];

    playCard(state, 0);
    const played = state.players[0].board[state.players[0].board.length - 1];
    expect(played.summoningSickness).toBe(true);

    const result = attackMinion(state, state.players[0].board.length - 1, 0);
    expect(result.success).toBe(false);
  });

  it("charge + windfury minion can attack twice on the turn played", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].hand = [makeCard({ cost: 0, charge: true, windfury: true, attack: 2, health: 10 })];
    state.players[0].hero.mana = 10;
    state.players[1].board = [makeBoardMinion({ currentAttack: 1, currentHealth: 20 })];

    playCard(state, 0);
    const idx = state.players[0].board.length - 1;

    const r1 = attackMinion(state, idx, 0);
    expect(r1.success).toBe(true);
    expect(state.players[0].board[idx].hasAttacked).toBe(false);

    const r2 = attackMinion(state, idx, 0);
    expect(r2.success).toBe(true);
    expect(state.players[0].board[idx].hasAttacked).toBe(true);
  });

  it("charge + divine shield minion keeps shield when attacking", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].hand = [makeCard({ cost: 0, charge: true, divineShield: true, attack: 3, health: 2 })];
    state.players[0].hero.mana = 10;
    state.players[1].board = [makeBoardMinion({ currentAttack: 5, currentHealth: 10 })];

    playCard(state, 0);
    const idx = state.players[0].board.length - 1;
    expect(state.players[0].board[idx].hasDivineShield).toBe(true);

    attackMinion(state, idx, 0);
    expect(state.players[0].board[idx].hasDivineShield).toBe(false);
    expect(state.players[0].board[idx].currentHealth).toBe(2);
  });
});

// ========== DIVINE SHIELD + OTHER KEYWORDS ==========
describe("Divine Shield + Windfury interaction", () => {
  it("windfury minion loses shield on first attack, takes damage on second", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].board = [makeBoardMinion({
      currentAttack: 3, currentHealth: 5,
      hasDivineShield: true, windfury: true, windfuryAttacksLeft: 2,
    })];
    state.players[1].board = [makeBoardMinion({ currentAttack: 2, currentHealth: 20 })];

    attackMinion(state, 0, 0);
    expect(state.players[0].board[0].hasDivineShield).toBe(false);
    expect(state.players[0].board[0].currentHealth).toBe(5);

    attackMinion(state, 0, 0);
    expect(state.players[0].board[0].currentHealth).toBe(3);
  });
});

describe("Divine Shield + Enrage interaction", () => {
  it("divine shield prevents damage so enrage does not activate", () => {
    const xuchu = cards.find(c => c.name === "许褚")!;
    const state = makeState();
    state.activePlayer = 1;
    state.players[0].board = [makeBoardMinion({
      ...xuchu,
      currentAttack: xuchu.attack,
      currentHealth: xuchu.health,
      enrage: xuchu.enrage,
      hasDivineShield: true,
    })];
    state.players[1].board = [makeBoardMinion({ currentAttack: 3, currentHealth: 10 })];

    attackMinion(state, 0, 0);
    expect(state.players[0].board[0].hasDivineShield).toBe(false);
    expect(state.players[0].board[0].enrageActive).toBe(false);
    expect(state.players[0].board[0].currentHealth).toBe(xuchu.health);
  });
});

// ========== FREEZE + OTHER KEYWORDS ==========
describe("Freeze + Windfury interaction", () => {
  it("frozen windfury minion cannot attack at all", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].board = [makeBoardMinion({
      currentAttack: 3, currentHealth: 5,
      windfury: true, windfuryAttacksLeft: 2, isFrozen: true,
    })];
    state.players[1].board = [makeBoardMinion({ currentAttack: 1, currentHealth: 10 })];

    const result = attackMinion(state, 0, 0);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/frozen/i);
  });

  it("startTurn unfreezes windfury minion and restores 2 attacks", () => {
    const state = makeState();
    state.activePlayer = 0;
    const minion = makeBoardMinion({
      windfury: true, windfuryAttacksLeft: 0, isFrozen: true, hasAttacked: true,
    });
    state.players[0].board = [minion];

    startTurn(state);
    expect(minion.isFrozen).toBe(false);
    expect(minion.windfuryAttacksLeft).toBe(2);
    expect(minion.hasAttacked).toBe(false);
  });
});

describe("Freeze + Charge interaction", () => {
  it("frozen charge minion still cannot attack", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].board = [makeBoardMinion({
      currentAttack: 3, currentHealth: 5, charge: true,
      summoningSickness: false, isFrozen: true,
    })];
    state.players[1].board = [makeBoardMinion({ currentAttack: 1, currentHealth: 10 })];

    const result = attackMinion(state, 0, 0);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/frozen/i);
  });
});

// ========== STEALTH + OTHER KEYWORDS ==========
describe("Stealth + Windfury interaction", () => {
  it("stealth breaks after first windfury attack, second attack still works", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].board = [makeBoardMinion({
      currentAttack: 2, currentHealth: 10,
      isStealth: true, windfury: true, windfuryAttacksLeft: 2,
    })];
    state.players[1].board = [makeBoardMinion({ currentAttack: 1, currentHealth: 20 })];

    attackMinion(state, 0, 0);
    expect(state.players[0].board[0].isStealth).toBe(false);

    const r2 = attackMinion(state, 0, 0);
    expect(r2.success).toBe(true);
  });
});

describe("Stealth + Taunt (attacker has stealth)", () => {
  it("attacking with stealth minion into taunt target is allowed and breaks stealth", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].board = [makeBoardMinion({
      currentAttack: 3, currentHealth: 10, isStealth: true,
    })];
    state.players[1].board = [makeBoardMinion({
      currentAttack: 1, currentHealth: 5, taunt: true,
    })];

    const result = attackMinion(state, 0, 0);
    expect(result.success).toBe(true);
    expect(state.players[0].board[0].isStealth).toBe(false);
  });
});

// ========== ENRAGE + OTHER KEYWORDS ==========
describe("Enrage + Windfury interaction", () => {
  it("enrage activates after first windfury attack takes retaliation damage", () => {
    const xuchu = cards.find(c => c.name === "许褚")!;
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].board = [makeBoardMinion({
      ...xuchu,
      currentAttack: xuchu.attack,
      currentHealth: xuchu.health,
      enrage: xuchu.enrage,
      windfury: true,
      windfuryAttacksLeft: 2,
    })];
    state.players[1].board = [makeBoardMinion({ currentAttack: 1, currentHealth: 20 })];

    attackMinion(state, 0, 0);
    expect(state.players[0].board[0].enrageActive).toBe(true);
    expect(state.players[0].board[0].currentAttack).toBe(xuchu.attack + 3);

    const r2 = attackMinion(state, 0, 0);
    expect(r2.success).toBe(true);
  });
});

describe("Enrage + Immune interaction", () => {
  it("immune minion takes no damage so enrage does not activate", () => {
    const xuchu = cards.find(c => c.name === "许褚")!;
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].board = [makeBoardMinion({
      ...xuchu,
      currentAttack: xuchu.attack,
      currentHealth: xuchu.health,
      enrage: xuchu.enrage,
      isImmune: true,
    })];
    state.players[1].board = [makeBoardMinion({ currentAttack: 5, currentHealth: 10 })];

    attackMinion(state, 0, 0);
    expect(state.players[0].board[0].enrageActive).toBe(false);
    expect(state.players[0].board[0].currentHealth).toBe(xuchu.health);
  });
});

// ========== MULTI-KEYWORD COMBINATIONS ==========
describe("Charge + Windfury + Stealth", () => {
  it("charge+windfury+stealth: can attack twice on play turn, stealth breaks on first", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].hand = [makeCard({
      cost: 0, charge: true, windfury: true, stealth: true,
      attack: 2, health: 10,
    })];
    state.players[0].hero.mana = 10;
    state.players[1].board = [makeBoardMinion({ currentAttack: 1, currentHealth: 20 })];

    playCard(state, 0);
    const idx = state.players[0].board.length - 1;
    expect(state.players[0].board[idx].isStealth).toBe(true);
    expect(state.players[0].board[idx].summoningSickness).toBe(false);

    attackMinion(state, idx, 0);
    expect(state.players[0].board[idx].isStealth).toBe(false);

    const r2 = attackMinion(state, idx, 0);
    expect(r2.success).toBe(true);
    expect(state.players[0].board[idx].hasAttacked).toBe(true);
  });
});

describe("Taunt + Divine Shield + Enrage", () => {
  it("taunt+divine shield absorbs first hit; second hit activates enrage", () => {
    const xuchu = cards.find(c => c.name === "许褚")!;
    const state = makeState();
    state.activePlayer = 1;
    state.players[0].board = [makeBoardMinion({
      ...xuchu,
      currentAttack: xuchu.attack,
      currentHealth: xuchu.health,
      enrage: xuchu.enrage,
      taunt: true,
      hasDivineShield: true,
    })];
    state.players[1].board = [
      makeBoardMinion({ currentAttack: 3, currentHealth: 10, name: "A1" }),
      makeBoardMinion({ currentAttack: 2, currentHealth: 10, name: "A2" }),
    ];

    attackMinion(state, 0, 0);
    expect(state.players[0].board[0].hasDivineShield).toBe(false);
    expect(state.players[0].board[0].enrageActive).toBe(false);

    attackMinion(state, 1, 0);
    expect(state.players[0].board[0].enrageActive).toBe(true);
    expect(state.players[0].board[0].currentAttack).toBe(xuchu.attack + 3);
  });
});

describe("Immune + Stealth combined", () => {
  it("immune stealthy attacker takes no damage and loses stealth", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].board = [makeBoardMinion({
      currentAttack: 3, currentHealth: 2, isImmune: true, isStealth: true,
    })];
    state.players[1].board = [makeBoardMinion({ currentAttack: 10, currentHealth: 10 })];

    attackMinion(state, 0, 0);
    expect(state.players[0].board[0].isStealth).toBe(false);
    expect(state.players[0].board[0].currentHealth).toBe(2);
  });
});

describe("Stealth + Taunt lockout", () => {
  it("attacker is locked out when only taunt minion is stealthed — cannot attack hero", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].board = [makeBoardMinion({ currentAttack: 5, currentHealth: 5 })];
    state.players[1].board = [makeBoardMinion({
      currentAttack: 1, currentHealth: 5, taunt: true, isStealth: true,
    })];

    const result = attackHero(state, 0);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/taunt/i);
  });
});

// ========== REAL CARD KEYWORD TESTS ==========
describe("赵云 (charge + divine shield)", () => {
  it("赵云 can attack immediately and has divine shield", () => {
    const zhaoYun = cards.find(c => c.name === "赵云")!;
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].hand = [{ ...zhaoYun, cost: 0 }];
    state.players[0].hero.mana = 10;
    state.players[1].board = [makeBoardMinion({ currentAttack: 5, currentHealth: 10 })];

    playCard(state, 0);
    const idx = state.players[0].board.length - 1;
    const zy = state.players[0].board[idx];
    expect(zy.summoningSickness).toBe(false);
    expect(zy.hasDivineShield).toBe(true);

    attackMinion(state, idx, 0);
    expect(zy.hasDivineShield).toBe(false);
    expect(zy.currentHealth).toBe(zhaoYun.health);
  });
});

describe("吕布 (charge + windfury + spellImmune)", () => {
  it("吕布 can attack twice immediately after being played", () => {
    const lvbu = cards.find(c => c.name === "吕布")!;
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].hand = [{ ...lvbu, cost: 0 }];
    state.players[0].hero.mana = 10;
    state.players[1].board = [makeBoardMinion({ currentAttack: 1, currentHealth: 30 })];

    playCard(state, 0);
    const idx = state.players[0].board.length - 1;
    const lb = state.players[0].board[idx];
    expect(lb.summoningSickness).toBe(false);
    expect(lb.windfuryAttacksLeft).toBe(2);

    const r1 = attackMinion(state, idx, 0);
    expect(r1.success).toBe(true);
    expect(lb.hasAttacked).toBe(false);

    const r2 = attackMinion(state, idx, 0);
    expect(r2.success).toBe(true);
    expect(lb.hasAttacked).toBe(true);
  });
});
