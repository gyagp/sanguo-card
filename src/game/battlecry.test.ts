import { describe, it, expect, beforeEach } from "vitest";
import {
  GameState,
  BoardMinion,
  Card,
  Deck,
  EffectContext,
  createDeck,
  initializeGame,
  playCard,
  gameEventBus,
  MAX_BOARD_SIZE,
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
  const deckCards: Card[] = [];
  for (let i = 0; i < 30; i++) {
    deckCards.push(makeCard({ name: `Card ${i}` }));
  }
  return createDeck(deckCards);
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
    freezeTurnsLeft: 0,
    isImmune: false,
    windfuryAttacksLeft: 1,
    enrageActive: false,
    enrageBonus: 0, factionAttackBonus: 0, factionHealthBonus: 0, shuAdjacencyAtkBonus: 0, shuAdjacencyHpBonus: 0, brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0, wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0, qunDebuff: 0,
    ...overrides,
  };
  state.players[playerIdx].board.push(minion);
  return minion;
}

function makeState(): GameState {
  return initializeGame(makeDeck(), makeDeck());
}

function findCard(name: string): Card {
  const card = cards.find((c) => c.name === name);
  if (!card) throw new Error(`Card not found: ${name}`);
  return { ...card };
}

beforeEach(() => {
  gameEventBus.clear();
});

describe("Battlecry execution in playCard", () => {
  it("calls battlecry when a minion with battlecry is played", () => {
    const state = makeState();
    state.activePlayer = 0;
    let called = false;
    const card = makeCard({
      cost: 0,
      battlecry: (s: GameState, ctx: EffectContext) => {
        called = true;
        return s;
      },
    });
    state.players[0].hand = [card];
    state.players[0].hero.mana = 10;

    playCard(state, 0);
    expect(called).toBe(true);
  });

  it("does not call battlecry for cards without one", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].hand = [makeCard({ cost: 0 })];
    state.players[0].hero.mana = 10;

    const result = playCard(state, 0);
    expect(result.success).toBe(true);
    expect(state.players[0].board).toHaveLength(1);
  });

  it("battlecry receives correct EffectContext", () => {
    const state = makeState();
    state.activePlayer = 1;
    let receivedCtx: EffectContext | null = null;
    const card = makeCard({
      cost: 0,
      name: "CtxTest",
      battlecry: (s: GameState, ctx: EffectContext) => {
        receivedCtx = ctx;
        return s;
      },
    });
    state.players[1].hand = [card];
    state.players[1].hero.mana = 10;

    playCard(state, 0);
    expect(receivedCtx).not.toBeNull();
    expect(receivedCtx!.player).toBe(1);
    expect(receivedCtx!.event.type).toBe("minion_played");
    expect(receivedCtx!.sourceCard.name).toBe("CtxTest");
  });
});

describe("张飞 battlecry — gains taunt", () => {
  it("gives the played minion taunt", () => {
    const state = makeState();
    state.activePlayer = 0;
    const zhangfei = findCard("张飞");
    zhangfei.cost = 0;
    state.players[0].hand = [zhangfei];
    state.players[0].hero.mana = 10;

    playCard(state, 0);
    const board = state.players[0].board;
    const placed = board[board.length - 1];
    expect(placed.name).toBe("张飞");
    expect(placed.taunt).toBe(true);
  });
});

describe("孙权 battlecry — grants +2/+2 and divine shield to allies", () => {
  it("buffs existing friendly minions", () => {
    const state = makeState();
    state.activePlayer = 0;
    const ally = placeMinion(state, 0, { name: "Ally", currentAttack: 3, currentHealth: 4 });

    const sunquan = findCard("孙权");
    sunquan.cost = 0;
    state.players[0].hand = [sunquan];
    state.players[0].hero.mana = 10;

    playCard(state, 0);
    expect(ally.currentAttack).toBe(5); // 3 + 2
    expect(ally.currentHealth).toBe(6); // 4 + 2
    expect(ally.hasDivineShield).toBe(true);
  });

  it("does not buff 孙权 itself", () => {
    const state = makeState();
    state.activePlayer = 0;
    const sunquan = findCard("孙权");
    sunquan.cost = 0;
    state.players[0].hand = [sunquan];
    state.players[0].hero.mana = 10;

    playCard(state, 0);
    const board = state.players[0].board;
    const sq = board.find((m) => m.name === "孙权")!;
    expect(sq.currentAttack).toBe(5); // base, not buffed
    expect(sq.hasDivineShield).toBe(false);
  });
});

describe("运粮车 battlecry — heals hero for 2", () => {
  it("restores 2 health to the hero", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].hero.health = 25;
    const card = findCard("运粮车");
    card.cost = 0;
    state.players[0].hand = [card];
    state.players[0].hero.mana = 10;

    playCard(state, 0);
    expect(state.players[0].hero.health).toBe(27);
  });
});

describe("弓弩手 battlecry — deals 1 damage to random enemy minion", () => {
  it("damages an enemy minion", () => {
    const state = makeState();
    state.activePlayer = 0;
    const enemy = placeMinion(state, 1, { currentHealth: 5, name: "Target" });
    const card = findCard("弓弩手");
    card.cost = 0;
    state.players[0].hand = [card];
    state.players[0].hero.mana = 10;

    playCard(state, 0);
    expect(enemy.currentHealth).toBe(4);
  });

  it("does nothing when enemy board is empty", () => {
    const state = makeState();
    state.activePlayer = 0;
    const card = findCard("弓弩手");
    card.cost = 0;
    state.players[0].hand = [card];
    state.players[0].hero.mana = 10;

    const result = playCard(state, 0);
    expect(result.success).toBe(true);
  });
});

describe("刘备 battlecry — summons 张飞 and 关羽", () => {
  it("summons two minions", () => {
    const state = makeState();
    state.activePlayer = 0;
    const liubei = findCard("刘备");
    liubei.cost = 0;
    state.players[0].hand = [liubei];
    state.players[0].hero.mana = 10;

    playCard(state, 0);
    const board = state.players[0].board;
    expect(board.length).toBe(3); // 刘备 + 张飞 + 关羽
    expect(board.some((m) => m.name === "张飞")).toBe(true);
    expect(board.some((m) => m.name === "关羽")).toBe(true);
  });

  it("respects max board size", () => {
    const state = makeState();
    state.activePlayer = 0;
    // Fill board to 6 slots
    for (let i = 0; i < 6; i++) {
      placeMinion(state, 0, { name: `Filler${i}` });
    }
    const liubei = findCard("刘备");
    liubei.cost = 0;
    state.players[0].hand = [liubei];
    state.players[0].hero.mana = 10;

    // Board is full (7) after 刘备 is placed, no room for summons
    playCard(state, 0);
    expect(state.players[0].board.length).toBe(MAX_BOARD_SIZE);
  });
});

describe("曹操 battlecry — steals enemy minion with <=3 attack", () => {
  it("steals an enemy minion with low attack", () => {
    const state = makeState();
    state.activePlayer = 0;
    placeMinion(state, 1, { name: "Weak", currentAttack: 2, currentHealth: 3 });
    const caocao = findCard("曹操");
    caocao.cost = 0;
    state.players[0].hand = [caocao];
    state.players[0].hero.mana = 10;

    playCard(state, 0);
    expect(state.players[1].board.length).toBe(0);
    expect(state.players[0].board.some((m) => m.name === "Weak")).toBe(true);
  });

  it("does not steal minions with >3 attack", () => {
    const state = makeState();
    state.activePlayer = 0;
    placeMinion(state, 1, { name: "Strong", currentAttack: 5, currentHealth: 3 });
    const caocao = findCard("曹操");
    caocao.cost = 0;
    state.players[0].hand = [caocao];
    state.players[0].hero.mana = 10;

    playCard(state, 0);
    expect(state.players[1].board.length).toBe(1);
    expect(state.players[0].board.some((m) => m.name === "Strong")).toBe(false);
  });
});

describe("司马懿 battlecry — copies opponent's last-turn spells to hand", () => {
  it("copies all of opponent's spells to hand", () => {
    const state = makeState();
    state.activePlayer = 0;
    const spellCard = makeCard({ name: "TestSpell", type: "spell", cost: 1 });
    state.spellsPlayed[1].push({ ...spellCard });

    const simayi = findCard("司马懿");
    simayi.cost = 0;
    state.players[0].hand = [simayi];
    state.players[0].hero.mana = 10;

    playCard(state, 0);
    const hand = state.players[0].hand;
    expect(hand.some((c) => c.name === "TestSpell")).toBe(true);
  });

  it("does nothing when opponent has no spells played", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.spellsPlayed[1] = [];
    state.spellsPlayed[0].push(makeCard({ name: "OwnSpell", type: "spell" }));

    const simayi = findCard("司马懿");
    simayi.cost = 0;
    state.players[0].hand = [simayi];
    state.players[0].hero.mana = 10;

    playCard(state, 0);
    // Should not have added own spell
    expect(state.players[0].hand.some((c) => c.name === "OwnSpell")).toBe(false);
  });

  it("copies ALL opponent spells, not just the last", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.spellsPlayed[1].push(makeCard({ name: "FirstSpell", type: "spell" }));
    state.spellsPlayed[1].push(makeCard({ name: "SecondSpell", type: "spell" }));

    const simayi = findCard("司马懿");
    simayi.cost = 0;
    state.players[0].hand = [simayi];
    state.players[0].hero.mana = 10;

    playCard(state, 0);
    const hand = state.players[0].hand;
    expect(hand.some((c) => c.name === "FirstSpell")).toBe(true);
    expect(hand.some((c) => c.name === "SecondSpell")).toBe(true);
  });

  it("does not add spells when hand is full (MAX_HAND_SIZE)", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.spellsPlayed[1].push(makeCard({ name: "TestSpell", type: "spell" }));

    const simayi = findCard("司马懿");
    // Fill hand to MAX_HAND_SIZE
    state.players[0].hand = [];
    for (let i = 0; i < 10; i++) {
      state.players[0].hand.push(makeCard({ name: `Filler${i}` }));
    }

    // Call battlecry directly
    const context: EffectContext = {
      event: { type: "minion_played", player: 0 },
      sourceCard: simayi,
      player: 0,
    };
    simayi.battlecry!(state, context);
    expect(state.players[0].hand).toHaveLength(10);
    expect(state.players[0].hand.some((c) => c.name === "TestSpell")).toBe(false);
  });
});

describe("Spell history tracking", () => {
  it("playCard tracks spells in spellsPlayed", () => {
    const state = makeState();
    state.activePlayer = 0;
    const spell = findCard("草药");
    spell.cost = 0;
    state.players[0].hand = [spell];
    state.players[0].hero.mana = 10;

    playCard(state, 0);
    expect(state.spellsPlayed[0]).toHaveLength(1);
    expect(state.spellsPlayed[0][0].name).toBe("草药");
  });

  it("does not track minion plays in spellsPlayed", () => {
    const state = makeState();
    state.activePlayer = 0;
    state.players[0].hand = [makeCard({ cost: 0 })];
    state.players[0].hero.mana = 10;

    playCard(state, 0);
    expect(state.spellsPlayed[0]).toHaveLength(0);
  });

  it("initializeGame starts with empty spellsPlayed", () => {
    const state = makeState();
    expect(state.spellsPlayed).toEqual([[], []]);
  });
});

describe("Battlecry removes dead minions", () => {
  it("弓弩手 killing a 1-health minion removes it from board", () => {
    const state = makeState();
    state.activePlayer = 0;
    placeMinion(state, 1, { name: "Weak", currentAttack: 1, currentHealth: 1 });
    const card = findCard("弓弩手");
    card.cost = 0;
    state.players[0].hand = [card];
    state.players[0].hero.mana = 10;

    playCard(state, 0);
    expect(state.players[1].board.length).toBe(0);
  });
});
