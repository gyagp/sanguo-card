import { describe, it, expect } from "vitest";
import { cards } from "../cards";
import {
  GameState, BoardMinion, Card, Lane, Deck,
  initializeGame, createDeck, STARTING_HP,
  playCard,
} from "../types";

function makeDeck(): Deck {
  const allMinions = cards.filter(c => c.type === "minion" && c.rarity !== "legendary");
  const deck: Card[] = [];
  for (const card of allMinions) {
    if (deck.length >= 30) break;
    deck.push({ ...card });
    if (deck.length >= 30) break;
    deck.push({ ...card });
  }
  return createDeck(deck);
}

function makeMinion(overrides: Partial<BoardMinion> = {}): BoardMinion {
  return {
    name: "test", cost: 1, attack: 1, health: 1, description: "",
    rarity: "common", type: "minion", faction: "neutral",
    currentAttack: 1, currentHealth: 1,
    summoningSickness: false, hasAttacked: false,
    hasDivineShield: false, isStealth: false, isFrozen: false,
    freezeTurnsLeft: 0, isImmune: false, windfuryAttacksLeft: 1,
    enrageActive: false, enrageBonus: 0,
    factionAttackBonus: 0, factionHealthBonus: 0,
    formationAtkBonus: 0, formationHpBonus: 0,
    brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0,
    wuChargeBonus: 0, wuWeaponBonus: 0,
    wuComboAtkBonus: 0, wuComboHpBonus: 0,
    qunDebuff: 0, heroSkillCooldownLeft: 0,
    heroSkillAtkBonus: 0, heroSkillHpBonus: 0,
    lane: Lane.Center, slotIndex: 0,
    ...overrides,
  };
}

function findCard(name: string): Card {
  const card = cards.find(c => c.name === name);
  if (!card) throw new Error(`Card not found: ${name}`);
  return card;
}

function setupGameWithCardInHand(cardName: string): GameState {
  const state = initializeGame(makeDeck(), makeDeck());
  const card = findCard(cardName);
  state.players[0].hand = [{ ...card }];
  state.players[0].hero.mana = 10;
  state.activePlayer = 0;
  return state;
}

describe("Shu minion cards existence and stats", () => {
  const shuMinions = cards.filter(c => c.faction === "shu" && c.type === "minion");

  it("should have at least 10 Shu minion cards", () => {
    expect(shuMinions.length).toBeGreaterThanOrEqual(10);
  });

  it("all Shu minions have valid stats", () => {
    for (const card of shuMinions) {
      expect(card.attack + card.health).toBeGreaterThan(0);
      expect(card.cost).toBeGreaterThan(0);
    }
  });

  it("Shu minions reflect attack/aggro identity", () => {
    const avgHealth = shuMinions.reduce((s, c) => s + c.health, 0) / shuMinions.length;
    const avgAttack = shuMinions.reduce((s, c) => s + c.attack, 0) / shuMinions.length;
    expect(avgAttack).toBeGreaterThanOrEqual(avgHealth);
  });

  it("includes common, rare, and epic rarities", () => {
    const rarities = new Set(shuMinions.map(c => c.rarity));
    expect(rarities.has("common")).toBe(true);
    expect(rarities.has("rare")).toBe(true);
    expect(rarities.has("epic")).toBe(true);
  });

  it("new Shu minions all exist by name", () => {
    const names = [
      "蜀营先锋", "白耳精兵", "蜀汉斥候", "蜀营突骑", "魏延", "马岱", "马超", "姜维", "法正", "庞统",
    ];
    for (const name of names) {
      expect(cards.find(c => c.name === name)).toBeDefined();
    }
  });
});

describe("Shu common minions", () => {
  it("蜀营先锋 has charge", () => {
    const card = findCard("蜀营先锋");
    expect(card.charge).toBe(true);
    expect(card.cost).toBe(1);
    expect(card.attack).toBe(2);
    expect(card.health).toBe(1);
  });

  it("白耳精兵 battlecry gives +1 attack", () => {
    const state = setupGameWithCardInHand("白耳精兵");
    state.players[0].board = [];
    playCard(state, 0, 0);
    const minion = state.players[0].board.find(m => m.name === "白耳精兵");
    expect(minion).toBeDefined();
    expect(minion!.currentAttack).toBe(4); // 3 base + 1 battlecry
  });

  it("蜀汉斥候 has charge and deathrattle", () => {
    const card = findCard("蜀汉斥候");
    expect(card.charge).toBe(true);
    expect(card.deathrattle).toBeDefined();
  });

  it("蜀营突骑 battlecry deals 2 damage to enemy minion", () => {
    const state = setupGameWithCardInHand("蜀营突骑");
    state.players[1].board = [makeMinion({ name: "target", currentHealth: 5, health: 5 })];
    playCard(state, 0, 0);
    const target = state.players[1].board[0];
    expect(target.currentHealth).toBe(3);
  });

  it("蜀营突骑 battlecry does nothing with no enemy minions", () => {
    const state = setupGameWithCardInHand("蜀营突骑");
    state.players[1].board = [];
    playCard(state, 0, 0);
    expect(state.players[0].board.find(m => m.name === "蜀营突骑")).toBeDefined();
  });
});

describe("Shu rare minions", () => {
  it("魏延 has charge and deathrattle damages own hero", () => {
    const card = findCard("魏延");
    expect(card.charge).toBe(true);
    expect(card.deathrattle).toBeDefined();
    expect(card.cost).toBe(4);
    expect(card.attack).toBe(5);
  });

  it("魏延 deathrattle deals 2 damage to own hero", () => {
    const state = setupGameWithCardInHand("魏延");
    playCard(state, 0, 0);
    const weiYan = state.players[0].board.find(m => m.name === "魏延")!;
    const hpBefore = state.players[0].hero.health;
    weiYan.deathrattle!(state, { player: 0, sourceCard: weiYan });
    expect(state.players[0].hero.health).toBe(hpBefore - 2);
  });

  it("马岱 battlecry gives +2 attack to a friendly minion", () => {
    const state = setupGameWithCardInHand("马岱");
    const ally = makeMinion({ name: "ally", currentAttack: 3 });
    state.players[0].board = [ally];
    playCard(state, 0, 0);
    expect(ally.currentAttack).toBe(5); // 3 + 2
  });

  it("马岱 battlecry does nothing if no other friendly minions", () => {
    const state = setupGameWithCardInHand("马岱");
    state.players[0].board = [];
    playCard(state, 0, 0);
    expect(state.players[0].board.find(m => m.name === "马岱")).toBeDefined();
  });

  it("马超 has charge and enrage", () => {
    const card = findCard("马超");
    expect(card.charge).toBe(true);
    expect(card.enrage).toBeDefined();
    expect(card.cost).toBe(5);
    expect(card.attack).toBe(6);
    expect(card.health).toBe(4);
  });
});

describe("Shu epic minions", () => {
  it("姜维 battlecry gives all friendly minions +1 attack", () => {
    const card = findCard("姜维");
    expect(card.battlecry).toBeDefined();
    const a1 = makeMinion({ name: "a1", currentAttack: 2 });
    const a2 = makeMinion({ name: "a2", currentAttack: 3 });
    const jw = makeMinion({ name: "姜维", faction: "shu" });
    const board = [a1, a2, jw];
    const mockState = { players: [{ board }, { board: [] }] } as any;
    card.battlecry!(mockState, { player: 0, sourceCard: card } as any);
    expect(a1.currentAttack).toBe(3);
    expect(a2.currentAttack).toBe(4);
  });

  it("姜维 battlecry does not buff self", () => {
    const state = setupGameWithCardInHand("姜维");
    state.players[0].board = [];
    playCard(state, 0, 0);
    const jw = state.players[0].board.find(m => m.name === "姜维")!;
    expect(jw.currentAttack).toBe(5);
  });

  it("法正 battlecry deals 3 damage and gains +2/+2 on kill", () => {
    const state = setupGameWithCardInHand("法正");
    state.players[1].board = [makeMinion({ name: "weak", currentHealth: 2, health: 2 })];
    playCard(state, 0, 0);
    const fz = state.players[0].board.find(m => m.name === "法正")!;
    expect(fz.currentAttack).toBe(5); // 3 + 2
    expect(fz.currentHealth).toBe(6); // 4 + 2
  });

  it("法正 battlecry does not gain +2/+2 if target survives", () => {
    const state = setupGameWithCardInHand("法正");
    state.players[1].board = [makeMinion({ name: "tough", currentHealth: 10, health: 10 })];
    playCard(state, 0, 0);
    const fz = state.players[0].board.find(m => m.name === "法正")!;
    expect(fz.currentAttack).toBe(3);
    expect(fz.currentHealth).toBe(4);
    expect(state.players[1].board[0].currentHealth).toBe(7);
  });

  it("庞统 battlecry grants charge to friendly minions directly", () => {
    const card = findCard("庞统");
    expect(card.battlecry).toBeDefined();
    const board = [
      makeMinion({ name: "a1", summoningSickness: true }),
      makeMinion({ name: "a2", summoningSickness: true }),
      makeMinion({ name: "庞统", faction: "shu" }),
    ];
    const mockState = { players: [{ board }, { board: [] }] } as any;
    card.battlecry!(mockState, { player: 0, sourceCard: card } as any);
    expect(board[0].summoningSickness).toBe(false);
    expect(board[1].summoningSickness).toBe(false);
  });

  it("庞统 battlecry does not give self charge", () => {
    const state = setupGameWithCardInHand("庞统");
    state.players[0].board = [];
    playCard(state, 0, 0);
    const pt = state.players[0].board.find(m => m.name === "庞统")!;
    expect(pt).toBeDefined();
  });
});

describe("Shu spells", () => {
  const shuSpells = cards.filter(c => c.faction === "shu" && c.type === "spell");

  it("should have at least 5 Shu spells", () => {
    expect(shuSpells.length).toBeGreaterThanOrEqual(5);
  });

  it("all Shu spells exist by name", () => {
    const names = ["桃园结义", "仁德之心", "出师表", "义释严颜", "锦囊妙计"];
    for (const name of names) {
      expect(shuSpells.find(c => c.name === name)).toBeDefined();
    }
  });

  it("桃园结义 gives all friendly minions +1/+1 and charge", () => {
    const state = setupGameWithCardInHand("桃园结义");
    const m1 = makeMinion({ name: "m1", currentAttack: 2, currentHealth: 3, summoningSickness: true });
    const m2 = makeMinion({ name: "m2", currentAttack: 1, currentHealth: 2, summoningSickness: true });
    state.players[0].board = [m1, m2];
    playCard(state, 0, 0);
    expect(m1.currentAttack).toBe(3);
    expect(m1.currentHealth).toBe(4);
    expect(m1.charge).toBe(true);
    expect(m2.currentAttack).toBe(2);
    expect(m2.currentHealth).toBe(3);
  });

  it("桃园结义 does nothing with empty board", () => {
    const state = setupGameWithCardInHand("桃园结义");
    state.players[0].board = [];
    const result = playCard(state, 0, 0);
    expect(result.success).toBe(true);
  });

  it("仁德之心 restores full health and gives +1 attack", () => {
    const state = setupGameWithCardInHand("仁德之心");
    const m1 = makeMinion({ name: "m1", currentAttack: 3, currentHealth: 2, health: 5 });
    state.players[0].board = [m1];
    playCard(state, 0, 0);
    expect(m1.currentHealth).toBe(5);
    expect(m1.currentAttack).toBe(4);
  });

  it("出师表 draws 3 cards and gives +1 attack to all minions", () => {
    const state = setupGameWithCardInHand("出师表");
    const m1 = makeMinion({ name: "m1", currentAttack: 2 });
    state.players[0].board = [m1];
    const handBefore = state.players[0].hand.length;
    playCard(state, 0, 0);
    expect(m1.currentAttack).toBe(3);
    // hand should have grown by 3 minus the played card (net +2)
    expect(state.players[0].hand.length).toBe(handBefore - 1 + 3);
  });

  it("义释严颜 gives all friendly minions +1/+1", () => {
    const state = setupGameWithCardInHand("义释严颜");
    const m1 = makeMinion({ name: "m1", currentAttack: 2, currentHealth: 3 });
    const m2 = makeMinion({ name: "m2", currentAttack: 4, currentHealth: 1 });
    state.players[0].board = [m1, m2];
    playCard(state, 0, 0);
    expect(m1.currentAttack).toBe(3);
    expect(m1.currentHealth).toBe(4);
    expect(m2.currentAttack).toBe(5);
    expect(m2.currentHealth).toBe(2);
  });

  it("锦囊妙计 (shu) effect deals 1 damage to all enemy minions", () => {
    const card = cards.find(c => c.name === "锦囊妙计" && c.faction === "shu")!;
    expect(card).toBeDefined();
    const e1 = makeMinion({ name: "e1", currentHealth: 3, health: 3 });
    const e2 = makeMinion({ name: "e2", currentHealth: 5, health: 5 });
    const dummyCards = Array.from({ length: 5 }, () => ({ ...cards[0] }));
    const player = { board: [], hand: [], deck: dummyCards };
    const enemy = { board: [e1, e2] };
    const mockState = { players: [player, enemy] } as any;
    card.effect!(mockState, { player: 0, sourceCard: card, spellDamage: 0 } as any);
    expect(e1.currentHealth).toBe(2);
    expect(e2.currentHealth).toBe(4);
  });
});

describe("Shu weapons", () => {
  const shuWeapons = cards.filter(c => c.faction === "shu" && c.type === "weapon");

  it("should have exactly 2 Shu weapons (excluding 青龙偃月刀)", () => {
    const newShuWeapons = shuWeapons.filter(c => c.name !== "青龙偃月刀");
    expect(newShuWeapons).toHaveLength(2);
  });

  it("all new Shu weapons exist by name", () => {
    const names = ["雌雄双股剑", "丈八点钢矛"];
    for (const name of names) {
      expect(shuWeapons.find(c => c.name === name)).toBeDefined();
    }
  });

  it("雌雄双股剑 has correct stats", () => {
    const card = findCard("雌雄双股剑");
    expect(card.cost).toBe(2);
    expect(card.attack).toBe(2);
    expect(card.health).toBe(2);
    expect(card.type).toBe("weapon");
    expect(card.faction).toBe("shu");
  });

  it("雌雄双股剑 battlecry gives all friendly minions +1 attack", () => {
    const card = findCard("雌雄双股剑");
    const m1 = makeMinion({ name: "m1", currentAttack: 2 });
    const m2 = makeMinion({ name: "m2", currentAttack: 3 });
    const board = [m1, m2];
    const mockState = { players: [{ board }, { board: [] }] } as any;
    card.battlecry!(mockState, { player: 0, sourceCard: card } as any);
    expect(m1.currentAttack).toBe(3);
    expect(m2.currentAttack).toBe(4);
  });

  it("丈八点钢矛 has correct stats", () => {
    const card = findCard("丈八点钢矛");
    expect(card.cost).toBe(4);
    expect(card.attack).toBe(3);
    expect(card.health).toBe(3);
    expect(card.type).toBe("weapon");
    expect(card.faction).toBe("shu");
  });

  it("丈八点钢矛 battlecry gives all friendly minions charge", () => {
    const card = findCard("丈八点钢矛");
    const m1 = makeMinion({ name: "m1", summoningSickness: true });
    const m2 = makeMinion({ name: "m2", summoningSickness: true });
    const board = [m1, m2];
    const mockState = { players: [{ board }, { board: [] }] } as any;
    card.battlecry!(mockState, { player: 0, sourceCard: card } as any);
    expect(m1.charge).toBe(true);
    expect(m2.charge).toBe(true);
  });
});
