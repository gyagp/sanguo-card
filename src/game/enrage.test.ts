import { describe, it, expect, beforeEach } from "vitest";
import {
  Card,
  Deck,
  GameState,
  BoardMinion,
  createDeck,
  initializeGame,
  attackMinion,
  checkEnrage,
  playCard,
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
    enrageBonus: 0, factionAttackBonus: 0, factionHealthBonus: 0, shuAdjacencyAtkBonus: 0, shuAdjacencyHpBonus: 0, brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0, wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0, qunDebuff: 0,
    ...overrides,
  };
}

function makeState(): GameState {
  return initializeGame(makeDeck(), makeDeck());
}

const xuchu = cards.find(c => c.name === "许褚")!;

describe("Enrage: 许褚 gains +3 attack when damaged", () => {
  beforeEach(() => {
    gameEventBus.clear();
  });

  it("activates enrage when minion takes damage via attackMinion", () => {
    const state = makeState();
    state.players[0].board = [makeBoardMinion({
      ...xuchu,
      currentAttack: xuchu.attack,
      currentHealth: xuchu.health,
      enrage: xuchu.enrage,
    })];
    state.players[1].board = [makeBoardMinion({
      name: "Pinger",
      currentAttack: 1,
      currentHealth: 10,
      attack: 1,
      health: 10,
    })];
    attackMinion(state, 0, 0);
    const m = state.players[0].board[0];
    expect(m.enrageActive).toBe(true);
    expect(m.currentAttack).toBe(xuchu.attack + 3);
    expect(m.enrageBonus).toBe(3);
  });

  it("does not activate enrage when minion is at full health", () => {
    const state = makeState();
    const minion = makeBoardMinion({
      ...xuchu,
      currentAttack: xuchu.attack,
      currentHealth: xuchu.health,
      enrage: xuchu.enrage,
    });
    state.players[0].board = [minion];
    checkEnrage(state);
    expect(minion.enrageActive).toBe(false);
    expect(minion.currentAttack).toBe(xuchu.attack);
  });

  it("deactivates enrage when healed to full health", () => {
    const state = makeState();
    const minion = makeBoardMinion({
      ...xuchu,
      currentAttack: xuchu.attack,
      currentHealth: xuchu.health - 1,
      enrage: xuchu.enrage,
    });
    state.players[0].board = [minion];
    checkEnrage(state);
    expect(minion.enrageActive).toBe(true);
    expect(minion.currentAttack).toBe(xuchu.attack + 3);

    minion.currentHealth = xuchu.health;
    checkEnrage(state);
    expect(minion.enrageActive).toBe(false);
    expect(minion.currentAttack).toBe(xuchu.attack);
  });

  it("preserves other buffs when enrage deactivates", () => {
    const state = makeState();
    const minion = makeBoardMinion({
      ...xuchu,
      currentAttack: xuchu.attack + 2,
      currentHealth: xuchu.health - 1,
      enrage: xuchu.enrage,
    });
    state.players[0].board = [minion];
    checkEnrage(state);
    expect(minion.currentAttack).toBe(xuchu.attack + 2 + 3);

    minion.currentHealth = xuchu.health;
    checkEnrage(state);
    expect(minion.enrageActive).toBe(false);
    expect(minion.currentAttack).toBe(xuchu.attack + 2);
  });

  it("does not double-activate enrage if already active", () => {
    const state = makeState();
    const minion = makeBoardMinion({
      ...xuchu,
      currentAttack: xuchu.attack,
      currentHealth: xuchu.health - 1,
      enrage: xuchu.enrage,
    });
    state.players[0].board = [minion];
    checkEnrage(state);
    checkEnrage(state);
    expect(minion.currentAttack).toBe(xuchu.attack + 3);
  });

  it("works correctly with two 许褚 on the board (uses context.sourceCard)", () => {
    const state = makeState();
    const m1 = makeBoardMinion({
      ...xuchu,
      currentAttack: xuchu.attack,
      currentHealth: xuchu.health - 1,
      enrage: xuchu.enrage,
    });
    const m2 = makeBoardMinion({
      ...xuchu,
      currentAttack: xuchu.attack,
      currentHealth: xuchu.health,
      enrage: xuchu.enrage,
    });
    state.players[0].board = [m1, m2];
    checkEnrage(state);
    expect(m1.enrageActive).toBe(true);
    expect(m1.currentAttack).toBe(xuchu.attack + 3);
    expect(m2.enrageActive).toBe(false);
    expect(m2.currentAttack).toBe(xuchu.attack);
  });

  it("triggers via battlecry damage (弓弩手 hitting 许褚)", () => {
    const state = makeState();
    state.activePlayer = 1;
    const xuchuMinion = makeBoardMinion({
      ...xuchu,
      currentAttack: xuchu.attack,
      currentHealth: xuchu.health,
      enrage: xuchu.enrage,
    });
    state.players[0].board = [xuchuMinion];

    const archer = cards.find(c => c.name === "弓弩手")!;
    state.players[1].hero.mana = 10;
    state.players[1].hand = [{ ...archer }];
    playCard(state, 0);

    expect(xuchuMinion.currentHealth).toBeLessThan(xuchu.health);
    expect(xuchuMinion.enrageActive).toBe(true);
    expect(xuchuMinion.currentAttack).toBe(xuchu.attack + 3);
  });
});
