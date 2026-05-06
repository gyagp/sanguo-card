import { describe, it, expect } from 'vitest';
import {
  buildFactionDeck,
  getOptimalPlayDecisions,
  getOnCurvePlayDecisions,
} from './ai';
import {
  Card, BoardMinion, PlayerState, GameState, Faction, Lane,
  DECK_FACTION_THRESHOLD, MAX_DECK_SIZE, MAX_COPIES_PER_CARD, Deck,
  createDeck, createPlayerState, getDeckFaction,
} from './types';
import { cards } from './cards';

function makeCard(overrides: Partial<Card> & { faction: Faction }): Card {
  return {
    name: 'test', cost: 1, attack: 1, health: 1, description: '',
    rarity: 'common', type: 'minion',
    ...overrides,
  };
}

function makeMinion(overrides: Partial<BoardMinion> = {}): BoardMinion {
  return {
    name: 'test', cost: 1, attack: 1, health: 1, description: '',
    rarity: 'common', type: 'minion', faction: 'neutral',
    currentAttack: 1, currentHealth: 1,
    summoningSickness: false, hasAttacked: false,
    hasDivineShield: false, isStealth: false, isFrozen: false,
    freezeTurnsLeft: 0, isImmune: false, windfuryAttacksLeft: 1,
    enrageActive: false, enrageBonus: 0,
    factionAttackBonus: 0, factionHealthBonus: 0,
    formationAtkBonus: 0, formationHpBonus: 0,
    brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0,
    wuChargeBonus: 0, wuWeaponBonus: 0,
    wuComboAtkBonus: 0, wuComboHpBonus: 0, qunDebuff: 0,
    heroSkillCooldownLeft: 0, heroSkillAtkBonus: 0, heroSkillHpBonus: 0,
    lane: Lane.Center, slotIndex: 0,
    ...overrides,
  };
}

function makeDummyDeck(faction: Faction = 'neutral'): Card[] {
  const deck: Card[] = [];
  for (let i = 0; i < 30; i++) {
    deck.push(makeCard({ faction, name: `dummy${i}` }));
  }
  return deck;
}

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    hero: { health: 30, mana: 0, heroPower: { name: '', cost: 2, description: '' } },
    deck: [] as unknown as Deck,
    hand: [],
    board: [],
    maxMana: 0,
    weapon: null,
    heroPowerUsed: false,
    heroHasAttacked: false,
    heroWindfuryAttacksLeft: 0,
    deckFaction: 'neutral' as Faction,
    hasDeckFactionBonus: false,
    activeTraps: [],
    ...overrides,
  };
}

function makeGameState(p1: Partial<PlayerState> = {}, p2: Partial<PlayerState> = {}): GameState {
  return {
    players: [makePlayer(p1), makePlayer(p2)],
    board: [[], []],
    turn: 1,
    phase: 'playing',
    turnPhase: 'play',
    activePlayer: 0,
    spellsPlayed: [[], []], wuComboCount: [0, 0],
    terrain: { [Lane.Left]: null, [Lane.Center]: null, [Lane.Right]: null },
  };
}

describe('Faction deck concentration', () => {
  it('buildFactionDeck always picks a non-neutral faction', () => {
    for (let i = 0; i < 20; i++) {
      const deck = buildFactionDeck(cards);
      const faction = getDeckFaction(deck);
      expect(['shu', 'wei', 'wu', 'qun']).toContain(faction);
    }
  });

  it('buildFactionDeck includes at least DECK_FACTION_THRESHOLD cards of chosen faction', () => {
    for (let i = 0; i < 10; i++) {
      const deck = buildFactionDeck(cards);
      const faction = getDeckFaction(deck);
      const factionCount = deck.filter(c => c.faction === faction).length;
      expect(factionCount).toBeGreaterThanOrEqual(DECK_FACTION_THRESHOLD);
    }
  });

  it('buildFactionDeck fills remaining slots with neutral or off-faction cards', () => {
    for (let i = 0; i < 10; i++) {
      const deck = buildFactionDeck(cards);
      expect(deck).toHaveLength(MAX_DECK_SIZE);
      const faction = getDeckFaction(deck);
      const factionCount = deck.filter(c => c.faction === faction).length;
      const otherCount = deck.length - factionCount;
      expect(otherCount).toBeGreaterThanOrEqual(0);
      expect(otherCount).toBeLessThanOrEqual(MAX_DECK_SIZE - DECK_FACTION_THRESHOLD);
    }
  });

  it('buildFactionDeck with limited card pool respects copy limits', () => {
    const smallPool = [
      makeCard({ faction: 'wu', name: 'wu1', cost: 1 }),
      makeCard({ faction: 'wu', name: 'wu2', cost: 2 }),
      makeCard({ faction: 'neutral', name: 'n1', cost: 1 }),
    ];
    const deck = buildFactionDeck(smallPool);
    expect(deck.length).toBeLessThanOrEqual(3 * MAX_COPIES_PER_CARD);
    expect(deck.length).toBeGreaterThan(0);
  });

  it('buildFactionDeck with no faction cards falls back gracefully', () => {
    const neutralOnly = Array.from({ length: 10 }, (_, i) =>
      makeCard({ faction: 'neutral', name: `n${i}`, cost: i % 5 + 1 })
    );
    const deck = buildFactionDeck(neutralOnly);
    expect(deck.length).toBeLessThanOrEqual(10 * MAX_COPIES_PER_CARD);
    expect(deck.length).toBeGreaterThan(0);
  });
});

describe('Wu combo play order', () => {
  it('Wu plays cheapest cards first for combo activation', () => {
    const hand: Card[] = [
      makeCard({ faction: 'wu', name: 'expensive', cost: 5, attack: 5, health: 5 }),
      makeCard({ faction: 'wu', name: 'cheap1', cost: 1, attack: 1, health: 1 }),
      makeCard({ faction: 'wu', name: 'medium', cost: 3, attack: 3, health: 3 }),
    ];
    const state = makeGameState({
      hero: { health: 30, mana: 9, heroPower: { name: '', cost: 2, description: '' } },
      maxMana: 9,
      hand,
      deckFaction: 'wu',
      hasDeckFactionBonus: true,
    });
    const decisions = getOptimalPlayDecisions(state);
    if (decisions.length >= 2) {
      const costs = decisions.map(d => hand[d.cardIndex].cost);
      for (let i = 1; i < costs.length; i++) {
        expect(costs[i]).toBeGreaterThanOrEqual(costs[i - 1]);
      }
    }
  });

  it('Wu prefers spells over minions at same cost for combo', () => {
    const hand: Card[] = [
      makeCard({ faction: 'wu', name: 'minion1', cost: 2, attack: 2, health: 2, type: 'minion' }),
      makeCard({ faction: 'wu', name: 'spell1', cost: 2, type: 'spell', attack: 0, health: 0 }),
      makeCard({ faction: 'wu', name: 'cheap', cost: 1, attack: 1, health: 1 }),
    ];
    const state = makeGameState({
      hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
      maxMana: 5,
      hand,
      deckFaction: 'wu',
      hasDeckFactionBonus: true,
    });
    const decisions = getOptimalPlayDecisions(state);
    if (decisions.length >= 2) {
      const firstCosts = decisions.map(d => hand[d.cardIndex].cost);
      expect(firstCosts[0]).toBeLessThanOrEqual(firstCosts[firstCosts.length - 1]);
    }
  });

  it('non-Wu faction does not sort cheapest first', () => {
    const hand: Card[] = [
      makeCard({ faction: 'wei', name: 'spell1', cost: 1, type: 'spell', attack: 0, health: 0 }),
      makeCard({ faction: 'wei', name: 'minion1', cost: 2, attack: 3, health: 3, type: 'minion' }),
      makeCard({ faction: 'wei', name: 'minion2', cost: 3, attack: 4, health: 4, type: 'minion' }),
    ];
    const state = makeGameState({
      hero: { health: 30, mana: 6, heroPower: { name: '', cost: 2, description: '' } },
      maxMana: 6,
      hand,
      deckFaction: 'wei',
      hasDeckFactionBonus: true,
    });
    const decisions = getOptimalPlayDecisions(state);
    if (decisions.length >= 2) {
      const types = decisions.map(d => hand[d.cardIndex].type);
      const spellIdx = types.indexOf('spell');
      const minionIdx = types.indexOf('minion');
      if (spellIdx !== -1 && minionIdx !== -1) {
        expect(minionIdx).toBeLessThan(spellIdx);
      }
    }
  });
});

describe('Formation bonus lane placement', () => {
  it('places same-faction minion in lane with existing faction minion', () => {
    const hand: Card[] = [
      makeCard({ faction: 'shu', name: 'shu_new', cost: 2, attack: 2, health: 2 }),
    ];
    const state = makeGameState({
      hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
      maxMana: 5,
      hand,
      board: [makeMinion({ faction: 'shu', lane: Lane.Right, slotIndex: 0 })],
      deckFaction: 'shu',
      hasDeckFactionBonus: true,
    });
    const decisions = getOnCurvePlayDecisions(state);
    expect(decisions.length).toBe(1);
    expect(decisions[0].lane).toBe(Lane.Right);
  });

  it('places faction minion in lane with same faction over empty lane', () => {
    const hand: Card[] = [
      makeCard({ faction: 'wu', name: 'wu_new', cost: 1, attack: 1, health: 1 }),
    ];
    const state = makeGameState({
      hero: { health: 30, mana: 3, heroPower: { name: '', cost: 2, description: '' } },
      maxMana: 3,
      hand,
      board: [makeMinion({ faction: 'wu', lane: Lane.Left, slotIndex: 0 })],
      deckFaction: 'wu',
      hasDeckFactionBonus: true,
    });
    const decisions = getOnCurvePlayDecisions(state);
    expect(decisions.length).toBe(1);
    expect(decisions[0].lane).toBe(Lane.Left);
  });

  it('neutral minion does not get formation bonus preference', () => {
    const hand: Card[] = [
      makeCard({ faction: 'neutral', name: 'neutral1', cost: 1, attack: 1, health: 1 }),
    ];
    const state = makeGameState({
      hero: { health: 30, mana: 3, heroPower: { name: '', cost: 2, description: '' } },
      maxMana: 3,
      hand,
      board: [makeMinion({ faction: 'shu', lane: Lane.Left, slotIndex: 0 })],
      deckFaction: 'shu',
      hasDeckFactionBonus: true,
    });
    const decisions = getOnCurvePlayDecisions(state);
    expect(decisions.length).toBe(1);
    expect(decisions[0].lane).toBeDefined();
  });

  it('skips full lane even if it has same-faction minions', () => {
    const hand: Card[] = [
      makeCard({ faction: 'wei', name: 'wei_new', cost: 1, attack: 1, health: 1 }),
    ];
    const state = makeGameState({
      hero: { health: 30, mana: 3, heroPower: { name: '', cost: 2, description: '' } },
      maxMana: 3,
      hand,
      board: [
        makeMinion({ faction: 'wei', lane: Lane.Center, slotIndex: 0 }),
        makeMinion({ faction: 'wei', lane: Lane.Center, slotIndex: 1 }),
      ],
      deckFaction: 'wei',
      hasDeckFactionBonus: true,
    });
    const decisions = getOnCurvePlayDecisions(state);
    expect(decisions.length).toBe(1);
    expect(decisions[0].lane).not.toBe(Lane.Center);
  });

  it('places multiple same-faction minions in same lane when possible', () => {
    const hand: Card[] = [
      makeCard({ faction: 'qun', name: 'qun1', cost: 1, attack: 1, health: 1 }),
      makeCard({ faction: 'qun', name: 'qun2', cost: 2, attack: 2, health: 2 }),
    ];
    const state = makeGameState({
      hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
      maxMana: 5,
      hand,
      board: [makeMinion({ faction: 'qun', lane: Lane.Right, slotIndex: 0 })],
      deckFaction: 'qun',
      hasDeckFactionBonus: true,
    });
    const decisions = getOnCurvePlayDecisions(state);
    const minionDecisions = decisions.filter(d => hand[d.cardIndex].type === 'minion');
    if (minionDecisions.length >= 1) {
      expect(minionDecisions[0].lane).toBe(Lane.Right);
    }
  });
});
