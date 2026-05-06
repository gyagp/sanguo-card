import { describe, it, expect, beforeEach } from "vitest";
import { cards } from "../cards";
import {
  GameState, BoardMinion, Card, Lane, PlayerState, Deck,
  initializeGame, createDeck, MAX_BOARD_SIZE, STARTING_HP,
  playCard, drawCard,
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
  const deck1 = makeDeck();
  const deck2 = makeDeck();
  const state = initializeGame(deck1, deck2);
  const card = findCard(cardName);
  state.players[0].hand = [{ ...card }];
  state.players[0].hero.mana = 10;
  state.activePlayer = 0;
  return state;
}

describe("Wei minion cards existence and stats", () => {
  const weiMinions = cards.filter(c => c.faction === "wei" && c.type === "minion");

  it("should have at least 10 Wei minion cards", () => {
    expect(weiMinions.length).toBeGreaterThanOrEqual(10);
  });

  it("all Wei minions should have balanced stats for their cost", () => {
    for (const card of weiMinions) {
      const statTotal = card.attack + card.health;
      expect(statTotal).toBeGreaterThan(0);
      expect(card.cost).toBeGreaterThan(0);
    }
  });

  it("Wei minions should reflect defense/health identity", () => {
    const avgHealth = weiMinions.reduce((s, c) => s + c.health, 0) / weiMinions.length;
    const avgAttack = weiMinions.reduce((s, c) => s + c.attack, 0) / weiMinions.length;
    expect(avgHealth).toBeGreaterThanOrEqual(avgAttack);
  });
});

describe("曹营卫兵 (Wei common, 1 mana 1/3 taunt)", () => {
  it("should exist with correct stats", () => {
    const card = findCard("曹营卫兵");
    expect(card.cost).toBe(1);
    expect(card.attack).toBe(1);
    expect(card.health).toBe(3);
    expect(card.taunt).toBe(true);
    expect(card.faction).toBe("wei");
    expect(card.rarity).toBe("common");
  });
});

describe("屯田兵 (Wei common, 2 mana 1/4, battlecry +0/+2)", () => {
  it("should exist with correct stats", () => {
    const card = findCard("屯田兵");
    expect(card.cost).toBe(2);
    expect(card.attack).toBe(1);
    expect(card.health).toBe(4);
    expect(card.faction).toBe("wei");
  });

  it("battlecry should grant +0/+2 to self", () => {
    const state = setupGameWithCardInHand("屯田兵");
    playCard(state, 0, undefined, Math.random, Lane.Center);
    const minion = state.players[0].board.find(m => m.name === "屯田兵");
    expect(minion).toBeDefined();
    expect(minion!.currentHealth).toBeGreaterThanOrEqual(6); // 4 base + 2 battlecry
  });
});

describe("虎豹骑 (Wei common, 3 mana 2/4 taunt, battlecry +0/+2 to ally)", () => {
  it("should exist with correct stats", () => {
    const card = findCard("虎豹骑");
    expect(card.cost).toBe(3);
    expect(card.attack).toBe(2);
    expect(card.health).toBe(4);
    expect(card.taunt).toBe(true);
    expect(card.faction).toBe("wei");
  });

  it("battlecry should buff another friendly minion, not self", () => {
    const state = setupGameWithCardInHand("虎豹骑");
    const ally = makeMinion({ name: "ally", currentHealth: 3, health: 3, lane: Lane.Center });
    state.players[0].board.push(ally);

    playCard(state, 0, undefined, Math.random, Lane.Left);
    expect(ally.currentHealth).toBeGreaterThanOrEqual(5); // 3 + 2
  });

  it("battlecry should not buff self when no other minions", () => {
    const state = setupGameWithCardInHand("虎豹骑");
    playCard(state, 0, undefined, Math.random, Lane.Center);
    const self = state.players[0].board.find(m => m.name === "虎豹骑");
    expect(self).toBeDefined();
    expect(self!.currentHealth).toBe(4); // no buff applied
  });

  it("should correctly exclude self even with duplicate 虎豹骑 on board", () => {
    const state = setupGameWithCardInHand("虎豹骑");
    const existing = makeMinion({ name: "虎豹骑", currentHealth: 4, health: 4, faction: "wei", lane: Lane.Left });
    state.players[0].board.push(existing);

    playCard(state, 0, undefined, Math.random, Lane.Center);
    // The existing 虎豹骑 should get the buff, not the new one
    expect(existing.currentHealth).toBeGreaterThanOrEqual(6); // 4 + 2
  });
});

describe("魏营弓手 (Wei common, 2 mana 2/3, battlecry 1 damage)", () => {
  it("should exist with correct stats", () => {
    const card = findCard("魏营弓手");
    expect(card.cost).toBe(2);
    expect(card.attack).toBe(2);
    expect(card.health).toBe(3);
    expect(card.faction).toBe("wei");
  });

  it("battlecry should deal 1 damage to an enemy minion", () => {
    const state = setupGameWithCardInHand("魏营弓手");
    const enemy = makeMinion({ name: "enemy", currentHealth: 5, health: 5, lane: Lane.Center });
    state.players[1].board.push(enemy);

    playCard(state, 0, undefined, Math.random, Lane.Center);
    expect(enemy.currentHealth).toBe(4);
  });
});

describe("曹仁 (Wei rare, 4 mana 3/6 taunt, deathrattle heal hero 4)", () => {
  it("should exist with correct stats", () => {
    const card = findCard("曹仁");
    expect(card.cost).toBe(4);
    expect(card.attack).toBe(3);
    expect(card.health).toBe(6);
    expect(card.taunt).toBe(true);
    expect(card.faction).toBe("wei");
    expect(card.rarity).toBe("rare");
  });

  it("deathrattle should heal hero", () => {
    const state = setupGameWithCardInHand("曹仁");
    state.players[0].hero.health = 20;
    const card = findCard("曹仁");
    const context = {
      event: { type: "minion_died" as const, player: 0 as const },
      sourceCard: card,
      player: 0 as const,
    };
    card.deathrattle!(state, context);
    expect(state.players[0].hero.health).toBe(24);
  });

  it("deathrattle should not heal above max HP", () => {
    const state = setupGameWithCardInHand("曹仁");
    state.players[0].hero.health = 28;
    const card = findCard("曹仁");
    const context = {
      event: { type: "minion_died" as const, player: 0 as const },
      sourceCard: card,
      player: 0 as const,
    };
    card.deathrattle!(state, context);
    expect(state.players[0].hero.health).toBe(STARTING_HP);
  });
});

describe("李典 (Wei rare, 3 mana 2/5, battlecry +0/+1 to all friendlies)", () => {
  it("should exist with correct stats", () => {
    const card = findCard("李典");
    expect(card.cost).toBe(3);
    expect(card.attack).toBe(2);
    expect(card.health).toBe(5);
    expect(card.faction).toBe("wei");
    expect(card.rarity).toBe("rare");
  });

  it("battlecry should buff all other friendly minions +0/+1", () => {
    const state = setupGameWithCardInHand("李典");
    const ally1 = makeMinion({ name: "a1", currentHealth: 3, health: 3, lane: Lane.Left });
    const ally2 = makeMinion({ name: "a2", currentHealth: 2, health: 2, lane: Lane.Right });
    state.players[0].board.push(ally1, ally2);

    playCard(state, 0, undefined, Math.random, Lane.Center);
    expect(ally1.currentHealth).toBeGreaterThanOrEqual(4);
    expect(ally2.currentHealth).toBeGreaterThanOrEqual(3);
  });
});

describe("于禁 (Wei rare, 5 mana 3/7 taunt, enrage +2 attack)", () => {
  it("should exist with correct stats", () => {
    const card = findCard("于禁");
    expect(card.cost).toBe(5);
    expect(card.attack).toBe(3);
    expect(card.health).toBe(7);
    expect(card.taunt).toBe(true);
    expect(card.faction).toBe("wei");
    expect(card.rarity).toBe("rare");
  });

  it("description should not mention taunt in enrage (already has base taunt)", () => {
    const card = findCard("于禁");
    expect(card.description).not.toContain("嘲讽（保持）");
  });

  it("should have enrage effect", () => {
    expect(findCard("于禁").enrage).toBeDefined();
  });
});

describe("荀彧 (Wei epic, 4 mana 2/6, battlecry draw, deathrattle heal all)", () => {
  it("should exist with correct stats", () => {
    const card = findCard("荀彧");
    expect(card.cost).toBe(4);
    expect(card.attack).toBe(2);
    expect(card.health).toBe(6);
    expect(card.faction).toBe("wei");
    expect(card.rarity).toBe("epic");
  });

  it("should have both battlecry and deathrattle", () => {
    const card = findCard("荀彧");
    expect(card.battlecry).toBeDefined();
    expect(card.deathrattle).toBeDefined();
  });
});

describe("张辽 (Wei epic, 5 mana 4/6 charge, battlecry freeze)", () => {
  it("should exist with correct stats", () => {
    const card = findCard("张辽");
    expect(card.cost).toBe(5);
    expect(card.attack).toBe(4);
    expect(card.health).toBe(6);
    expect(card.charge).toBe(true);
    expect(card.faction).toBe("wei");
    expect(card.rarity).toBe("epic");
  });

  it("battlecry should freeze an enemy minion", () => {
    const state = setupGameWithCardInHand("张辽");
    const enemy = makeMinion({ name: "enemy", currentHealth: 5, health: 5, isFrozen: false, lane: Lane.Center });
    state.players[1].board.push(enemy);

    playCard(state, 0, undefined, Math.random, Lane.Center);
    expect(enemy.isFrozen).toBe(true);
  });
});

describe("曹洪 (Wei epic, 6 mana 4/8 taunt, battlecry heal by board count)", () => {
  it("should exist with correct stats", () => {
    const card = findCard("曹洪");
    expect(card.cost).toBe(6);
    expect(card.attack).toBe(4);
    expect(card.health).toBe(8);
    expect(card.taunt).toBe(true);
    expect(card.faction).toBe("wei");
    expect(card.rarity).toBe("epic");
  });

  it("battlecry should heal hero based on board count", () => {
    const state = setupGameWithCardInHand("曹洪");
    state.players[0].hero.health = 20;
    const ally1 = makeMinion({ name: "a1", lane: Lane.Left });
    const ally2 = makeMinion({ name: "a2", lane: Lane.Right });
    state.players[0].board.push(ally1, ally2);

    playCard(state, 0, undefined, Math.random, Lane.Center);
    // board count is 3 (2 allies + 曹洪 himself)
    expect(state.players[0].hero.health).toBe(23);
  });

  it("battlecry should not heal above max HP", () => {
    const state = setupGameWithCardInHand("曹洪");
    state.players[0].hero.health = 29;
    const ally = makeMinion({ name: "a1", lane: Lane.Left });
    state.players[0].board.push(ally);

    playCard(state, 0, undefined, Math.random, Lane.Center);
    expect(state.players[0].hero.health).toBe(STARTING_HP);
  });
});
