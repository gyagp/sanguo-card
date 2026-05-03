import { describe, it, expect } from 'vitest';
import { evaluateBoard, getPlayableCards, getBestManaUsage, AIDecision } from './ai';
import { GameState, PlayerState, Card, BoardMinion, Deck } from './types';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    name: 'Test',
    cost: 1,
    attack: 1,
    health: 1,
    description: '',
    rarity: 'common',
    type: 'minion',
    faction: 'neutral',
    ...overrides,
  };
}

function makeMinion(overrides: Partial<BoardMinion> = {}): BoardMinion {
  return {
    ...makeCard(),
    currentAttack: 1,
    currentHealth: 1,
    summoningSickness: false,
    hasAttacked: false,
    ...overrides,
  };
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
  };
}

describe('AIDecision type', () => {
  it('supports all four decision types', () => {
    const decisions: AIDecision[] = [
      { type: 'playCard', cardIndex: 0 },
      { type: 'attack', attackerIndex: 0, targetIndex: 0 },
      { type: 'attack', attackerIndex: 0, targetIndex: 'hero' },
      { type: 'useHeroPower' },
      { type: 'endTurn' },
    ];
    expect(decisions).toHaveLength(5);
    const types = new Set(decisions.map(d => d.type));
    expect(types).toEqual(new Set(['playCard', 'attack', 'useHeroPower', 'endTurn']));
  });
});

describe('evaluateBoard', () => {
  it('returns 0 for symmetric board', () => {
    const state = makeGameState(
      { board: [makeMinion({ currentAttack: 2, currentHealth: 3 })] },
      { board: [makeMinion({ currentAttack: 2, currentHealth: 3 })] },
    );
    expect(evaluateBoard(state, 0)).toBe(0);
    expect(evaluateBoard(state, 1)).toBe(0);
  });

  it('returns positive when player has board advantage', () => {
    const state = makeGameState(
      { board: [makeMinion({ currentAttack: 5, currentHealth: 5 })] },
      { board: [] },
    );
    expect(evaluateBoard(state, 0)).toBeGreaterThan(0);
  });

  it('returns negative when opponent has board advantage', () => {
    const state = makeGameState(
      { board: [] },
      { board: [makeMinion({ currentAttack: 5, currentHealth: 5 })] },
    );
    expect(evaluateBoard(state, 0)).toBeLessThan(0);
  });

  it('factors in hero health', () => {
    const state = makeGameState(
      { hero: { health: 30, mana: 0, heroPower: { name: '', cost: 2, description: '' } } },
      { hero: { health: 10, mana: 0, heroPower: { name: '', cost: 2, description: '' } } },
    );
    expect(evaluateBoard(state, 0)).toBeGreaterThan(0);
  });

  it('factors in hand size', () => {
    const state = makeGameState(
      { hand: [makeCard(), makeCard(), makeCard()] },
      { hand: [] },
    );
    expect(evaluateBoard(state, 0)).toBeGreaterThan(0);
  });

  it('is antisymmetric between players', () => {
    const state = makeGameState(
      { board: [makeMinion({ currentAttack: 3, currentHealth: 4 })] },
      { board: [makeMinion({ currentAttack: 1, currentHealth: 2 })] },
    );
    const score0 = evaluateBoard(state, 0);
    const score1 = evaluateBoard(state, 1);
    expect(score0).toBe(-score1);
  });
});

describe('getPlayableCards', () => {
  it('returns empty for empty hand', () => {
    expect(getPlayableCards([], 5)).toEqual([]);
  });

  it('returns all indices when all affordable', () => {
    const hand = [makeCard({ cost: 1 }), makeCard({ cost: 2 }), makeCard({ cost: 3 })];
    expect(getPlayableCards(hand, 10)).toEqual([0, 1, 2]);
  });

  it('returns no indices when none affordable', () => {
    const hand = [makeCard({ cost: 5 }), makeCard({ cost: 6 })];
    expect(getPlayableCards(hand, 3)).toEqual([]);
  });

  it('returns only affordable card indices', () => {
    const hand = [makeCard({ cost: 1 }), makeCard({ cost: 5 }), makeCard({ cost: 2 })];
    expect(getPlayableCards(hand, 2)).toEqual([0, 2]);
  });

  it('includes cards that cost exactly current mana', () => {
    const hand = [makeCard({ cost: 3 })];
    expect(getPlayableCards(hand, 3)).toEqual([0]);
  });

  it('handles zero mana', () => {
    const hand = [makeCard({ cost: 0 }), makeCard({ cost: 1 })];
    expect(getPlayableCards(hand, 0)).toEqual([0]);
  });
});

describe('getBestManaUsage', () => {
  it('returns empty for empty hand', () => {
    expect(getBestManaUsage([], 5)).toEqual([]);
  });

  it('returns empty when nothing is affordable', () => {
    const hand = [makeCard({ cost: 6 })];
    expect(getBestManaUsage(hand, 3)).toEqual([]);
  });

  it('picks the single card that uses the most mana', () => {
    const hand = [makeCard({ cost: 1 }), makeCard({ cost: 3 })];
    const result = getBestManaUsage(hand, 3);
    expect(result).toEqual([1]);
  });

  it('picks combination maximizing mana spent', () => {
    const hand = [makeCard({ cost: 2 }), makeCard({ cost: 3 }), makeCard({ cost: 4 })];
    const result = getBestManaUsage(hand, 5);
    const totalCost = result.reduce((sum, i) => sum + hand[i].cost, 0);
    expect(totalCost).toBe(5);
  });

  it('prefers exact mana usage', () => {
    const hand = [makeCard({ cost: 3 }), makeCard({ cost: 3 }), makeCard({ cost: 1 })];
    const result = getBestManaUsage(hand, 4);
    const totalCost = result.reduce((sum, i) => sum + hand[i].cost, 0);
    expect(totalCost).toBe(4);
  });

  it('selects all cards when total equals mana', () => {
    const hand = [makeCard({ cost: 1 }), makeCard({ cost: 2 }), makeCard({ cost: 3 })];
    const result = getBestManaUsage(hand, 6);
    expect(result.sort()).toEqual([0, 1, 2]);
  });

  it('does not exceed available mana', () => {
    const hand = [makeCard({ cost: 3 }), makeCard({ cost: 4 }), makeCard({ cost: 5 })];
    const result = getBestManaUsage(hand, 6);
    const totalCost = result.reduce((sum, i) => sum + hand[i].cost, 0);
    expect(totalCost).toBeLessThanOrEqual(6);
    expect(totalCost).toBeGreaterThan(0);
  });
});
