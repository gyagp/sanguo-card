import { describe, it, expect } from 'vitest';
import { cards } from './cards';
import { GameState, BoardMinion, STARTING_HP } from './types';

function makeMinion(overrides: Partial<BoardMinion> = {}): BoardMinion {
  return {
    name: '测试随从',
    cost: 1,
    attack: 1,
    health: 1,
    currentAttack: 2,
    currentHealth: 3,
    maxHealth: 3,
    hasAttacked: false,
    attacksThisTurn: 0,
    turnsInPlay: 1,
    description: '',
    rarity: 'common' as const,
    type: 'minion' as const,
    faction: 'neutral' as const,
    ...overrides,
  };
}

function makeGameState(): GameState {
  return {
    players: [
      {
        hero: { health: STARTING_HP, maxHealth: STARTING_HP, armor: 0 },
        deck: [],
        hand: [],
        board: [],
        mana: 10,
        maxMana: 10,
        fatigue: 0,
        heroPowerUsed: false,
      },
      {
        hero: { health: STARTING_HP, maxHealth: STARTING_HP, armor: 0 },
        deck: [],
        hand: [],
        board: [],
        mana: 10,
        maxMana: 10,
        fatigue: 0,
        heroPowerUsed: false,
      },
    ],
    currentPlayer: 0,
    turn: 5,
    phase: 'playing' as const,
    winner: null,
    lastAction: null,
  };
}

describe('Wu spells and weapons card data', () => {
  const wuSpells = cards.filter(c => c.faction === 'wu' && c.type === 'spell');
  const wuWeapons = cards.filter(c => c.faction === 'wu' && c.type === 'weapon');

  it('has at least 5 Wu spells', () => {
    expect(wuSpells.length).toBeGreaterThanOrEqual(5);
  });

  it('has at least 2 Wu weapons', () => {
    expect(wuWeapons.length).toBeGreaterThanOrEqual(2);
  });

  it('all Wu spells have required fields', () => {
    for (const s of wuSpells) {
      expect(s.name).toBeTruthy();
      expect(s.cost).toBeGreaterThanOrEqual(0);
      expect(s.description).toBeTruthy();
      expect(s.type).toBe('spell');
      expect(s.faction).toBe('wu');
    }
  });

  it('all Wu weapons have attack and health (durability)', () => {
    for (const w of wuWeapons) {
      expect(w.attack).toBeGreaterThan(0);
      expect(w.health).toBeGreaterThan(0);
      expect(w.type).toBe('weapon');
      expect(w.faction).toBe('wu');
    }
  });

  // New Wu spells from current work unit
  const newSpellNames = ['火攻', '水淹七军', '苦肉计', '反间计', '东风破'];
  const newWeaponNames = ['古锭刀', '碧血剑'];

  for (const name of newSpellNames) {
    it(`spell "${name}" exists in cards`, () => {
      const card = cards.find(c => c.name === name && c.faction === 'wu');
      expect(card).toBeDefined();
      expect(card!.type).toBe('spell');
      expect(card!.faction).toBe('wu');
    });
  }

  for (const name of newWeaponNames) {
    it(`weapon "${name}" exists in cards`, () => {
      const card = cards.find(c => c.name === name);
      expect(card).toBeDefined();
      expect(card!.type).toBe('weapon');
      expect(card!.faction).toBe('wu');
    });
  }
});

describe('Wu spell effects', () => {
  it('火攻 deals 3 damage to an enemy minion', () => {
    const card = cards.find(c => c.name === '火攻')!;
    expect(card.targetType).toBe('enemy_minion');
    const state = makeGameState();
    const target = makeMinion({ currentHealth: 5, maxHealth: 5 });
    state.players[1].board.push(target);
    card.effect!(state, { player: 0, sourceCard: card, targetIndex: 0 });
    expect(state.players[1].board[0].currentHealth).toBe(2);
  });

  it('苦肉计 deals 3 damage to own hero and draws 2 cards', () => {
    const card = cards.find(c => c.name === '苦肉计')!;
    const state = makeGameState();
    state.players[0].deck = Array.from({ length: 5 }, () => ({
      name: '牌', cost: 1, attack: 1, health: 1,
      description: '', rarity: 'common' as const, type: 'minion' as const, faction: 'neutral' as const,
    }));
    const startHp = state.players[0].hero.health;
    card.effect!(state, { player: 0, sourceCard: card });
    expect(state.players[0].hero.health).toBe(startHp - 3);
    expect(state.players[0].hand.length).toBe(2);
  });

  it('反间计 deals 2 damage and freezes target, draws 1 card', () => {
    const card = cards.find(c => c.name === '反间计' && c.faction === 'wu')!;
    const state = makeGameState();
    const target = makeMinion({ currentHealth: 5, maxHealth: 5 });
    state.players[1].board.push(target);
    state.players[0].deck = Array.from({ length: 3 }, () => ({
      name: '牌', cost: 1, attack: 1, health: 1,
      description: '', rarity: 'common' as const, type: 'minion' as const, faction: 'neutral' as const,
    }));
    card.effect!(state, { player: 0, sourceCard: card, targetIndex: 0 });
    expect(state.players[1].board[0].currentHealth).toBe(3);
    expect(state.players[1].board[0].isFrozen).toBe(true);
    expect(state.players[0].hand.length).toBe(1);
  });

  it('东风破 deals 3 damage to all enemy minions and buffs all friendly minions +2 attack', () => {
    const card = cards.find(c => c.name === '东风破')!;
    const state = makeGameState();
    state.players[1].board.push(makeMinion({ currentHealth: 5, maxHealth: 5 }));
    state.players[1].board.push(makeMinion({ currentHealth: 4, maxHealth: 4 }));
    state.players[0].board.push(makeMinion({ currentAttack: 2 }));
    card.effect!(state, { player: 0, sourceCard: card });
    expect(state.players[1].board[0].currentHealth).toBe(2);
    expect(state.players[1].board[1].currentHealth).toBe(1);
    expect(state.players[0].board[0].currentAttack).toBe(4);
  });

  it('水淹七军 deals 4 damage to all enemy minions in a lane', () => {
    const card = cards.find(c => c.name === '水淹七军')!;
    expect(card.targetType).toBe('lane_aoe');
    const state = makeGameState();
    const m1 = makeMinion({ currentHealth: 6, maxHealth: 6, lane: 'front' as any });
    const m2 = makeMinion({ currentHealth: 5, maxHealth: 5, lane: 'front' as any });
    state.players[1].board.push(m1, m2);
    card.effect!(state, { player: 0, sourceCard: card, targetLane: 'front' as any });
    expect(state.players[1].board[0].currentHealth).toBe(2);
    expect(state.players[1].board[1].currentHealth).toBe(1);
  });
});

describe('Wu weapon effects', () => {
  it('古锭刀 has 3/2 stats and deals 2 damage on battlecry', () => {
    const card = cards.find(c => c.name === '古锭刀')!;
    expect(card.attack).toBe(3);
    expect(card.health).toBe(2);
    expect(card.targetType).toBe('enemy_minion');
    const state = makeGameState();
    const target = makeMinion({ currentHealth: 5, maxHealth: 5 });
    state.players[1].board.push(target);
    card.battlecry!(state, { player: 0, sourceCard: card, targetIndex: 0 });
    expect(state.players[1].board[0].currentHealth).toBe(3);
  });

  it('碧血剑 has 4/2 stats and draws 2 cards on battlecry', () => {
    const card = cards.find(c => c.name === '碧血剑')!;
    expect(card.attack).toBe(4);
    expect(card.health).toBe(2);
    const state = makeGameState();
    state.players[0].deck = Array.from({ length: 5 }, () => ({
      name: '牌', cost: 1, attack: 1, health: 1,
      description: '', rarity: 'common' as const, type: 'minion' as const, faction: 'neutral' as const,
    }));
    card.battlecry!(state, { player: 0, sourceCard: card });
    expect(state.players[0].hand.length).toBe(2);
  });
});
