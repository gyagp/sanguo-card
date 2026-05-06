import { describe, it, expect } from 'vitest';
import { cards } from './cards';
import { GameState, BoardMinion, PlayerState, STARTING_HP, Lane, Deck, EffectContext, createPlayerState, initializeGame, MAX_BOARD_SIZE } from './types';
import { createTokenMinion } from './tokens';

function makeMinion(overrides: Partial<BoardMinion> = {}): BoardMinion {
  return {
    name: '测试随从',
    cost: 1,
    attack: 1,
    health: 3,
    description: '',
    rarity: 'common' as const,
    type: 'minion' as const,
    faction: 'neutral' as const,
    currentAttack: overrides.attack ?? 1,
    currentHealth: overrides.health ?? 3,
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
    formationAtkBonus: 0,
    formationHpBonus: 0,
    brotherhoodAtkBonus: 0,
    brotherhoodHpBonus: 0,
    wuChargeBonus: 0,
    wuWeaponBonus: 0,
    wuComboAtkBonus: 0,
    wuComboHpBonus: 0,
    qunDebuff: 0,
    heroSkillCooldownLeft: 0,
    heroSkillAtkBonus: 0,
    heroSkillHpBonus: 0,
    lane: Lane.Center,
    slotIndex: 0,
    ...overrides,
  };
}

function makePlayerState(): PlayerState {
  return {
    hero: { health: STARTING_HP, mana: 10, heroPower: { name: '', cost: 2, description: '' } },
    deck: [] as unknown as Deck,
    hand: [],
    board: [],
    maxMana: 10,
    weapon: null,
    heroPowerUsed: false,
    heroHasAttacked: false,
    heroWindfuryAttacksLeft: 0,
    deckFaction: 'qun' as const,
    hasDeckFactionBonus: false,
    activeTraps: [],
  };
}

function makeGameState(): GameState {
  return {
    players: [makePlayerState(), makePlayerState()],
    board: [[], []],
    turn: 5,
    phase: 'playing' as const,
    turnPhase: 'play' as const,
    activePlayer: 0,
    spellsPlayed: [[], []],
    wuComboCount: [0, 0],
    terrain: { [Lane.Left]: null, [Lane.Center]: null, [Lane.Right]: null },
  };
}

describe('Qun spells and weapons card data', () => {
  const qunSpells = cards.filter(c => c.faction === 'qun' && c.type === 'spell');
  const qunWeapons = cards.filter(c => c.faction === 'qun' && c.type === 'weapon');

  it('has exactly 5 Qun spells', () => {
    expect(qunSpells.length).toBe(5);
  });

  it('has at least 4 Qun weapons (2 pre-existing + 2 new)', () => {
    expect(qunWeapons.length).toBeGreaterThanOrEqual(4);
  });

  it('all Qun spells have required fields', () => {
    for (const s of qunSpells) {
      expect(s.name).toBeTruthy();
      expect(s.cost).toBeGreaterThanOrEqual(0);
      expect(s.description).toBeTruthy();
      expect(s.type).toBe('spell');
      expect(s.faction).toBe('qun');
    }
  });

  it('all Qun weapons have attack and durability', () => {
    for (const w of qunWeapons) {
      expect(w.name).toBeTruthy();
      expect(w.attack).toBeGreaterThan(0);
      expect(w.health).toBeGreaterThan(0);
      expect(w.type).toBe('weapon');
      expect(w.faction).toBe('qun');
    }
  });

  it('all Qun spells have unique names', () => {
    const names = qunSpells.map(c => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('all Qun weapons have unique names', () => {
    const names = qunWeapons.map(c => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('Qun spell names do not collide with other cards', () => {
    const otherNames = new Set(cards.filter(c => !(c.faction === 'qun' && c.type === 'spell')).map(c => c.name));
    for (const s of qunSpells) {
      expect(otherNames.has(s.name)).toBe(false);
    }
  });

  it('Qun weapon names do not collide with other cards', () => {
    const otherNames = new Set(cards.filter(c => !(c.faction === 'qun' && c.type === 'weapon')).map(c => c.name));
    for (const w of qunWeapons) {
      expect(otherNames.has(w.name)).toBe(false);
    }
  });
});

describe('Qun spell effects', () => {
  it('挑拨离间 makes enemy minion attack adjacent ally', () => {
    const card = cards.find(c => c.name === '挑拨离间')!;
    expect(card).toBeDefined();
    expect(card.effect).toBeDefined();

    const state = makeGameState();
    const minion1 = makeMinion({ name: 'A', currentAttack: 3, currentHealth: 5 });
    const minion2 = makeMinion({ name: 'B', currentAttack: 2, currentHealth: 4 });
    state.players[1].board = [minion1, minion2];

    const context: EffectContext = {
      event: { type: 'spell_played', player: 0 },
      sourceCard: card,
      player: 0,
      targetIndex: 0,
    };
    card.effect!(state, context);

    expect(minion2.currentHealth).toBe(4 - 3);
    expect(minion1.currentHealth).toBe(5 - 2);
  });

  it('黄巾起义 summons 3 tokens', () => {
    const card = cards.find(c => c.name === '黄巾起义')!;
    expect(card).toBeDefined();

    const state = makeGameState();
    const context: EffectContext = {
      event: { type: 'spell_played', player: 0 },
      sourceCard: card,
      player: 0,
    };
    card.effect!(state, context);
    expect(state.players[0].board.length).toBe(3);
    for (const m of state.players[0].board) {
      expect(m.name).toBe('黄巾小兵');
    }
  });

  it('黄巾起义 respects board size limit', () => {
    const card = cards.find(c => c.name === '黄巾起义')!;
    const state = makeGameState();
    for (let i = 0; i < 5; i++) {
      state.players[0].board.push(makeMinion());
    }
    const context: EffectContext = {
      event: { type: 'spell_played', player: 0 },
      sourceCard: card,
      player: 0,
    };
    card.effect!(state, context);
    expect(state.players[0].board.length).toBe(MAX_BOARD_SIZE);
  });

  it('以命换命 deals 5 damage to both heroes', () => {
    const card = cards.find(c => c.name === '以命换命')!;
    expect(card).toBeDefined();

    const state = makeGameState();
    const context: EffectContext = {
      event: { type: 'spell_played', player: 0 },
      sourceCard: card,
      player: 0,
    };
    card.effect!(state, context);
    expect(state.players[0].hero.health).toBe(STARTING_HP - 5);
    expect(state.players[1].hero.health).toBe(STARTING_HP - 5);
  });

  it('群雄割据 deals 3 damage to all minions on both sides', () => {
    const card = cards.find(c => c.name === '群雄割据')!;
    expect(card).toBeDefined();

    const state = makeGameState();
    state.players[0].board = [makeMinion({ currentHealth: 5 })];
    state.players[1].board = [makeMinion({ currentHealth: 4 })];

    const context: EffectContext = {
      event: { type: 'spell_played', player: 0 },
      sourceCard: card,
      player: 0,
      spellDamage: 0,
    };
    card.effect!(state, context);
    expect(state.players[0].board[0].currentHealth).toBe(5 - 3);
    expect(state.players[1].board[0].currentHealth).toBe(4 - 3);
  });

  it('群雄割据 benefits from spell damage', () => {
    const card = cards.find(c => c.name === '群雄割据')!;
    const state = makeGameState();
    state.players[0].board = [makeMinion({ currentHealth: 10 })];
    state.players[1].board = [makeMinion({ currentHealth: 10 })];

    const context: EffectContext = {
      event: { type: 'spell_played', player: 0 },
      sourceCard: card,
      player: 0,
      spellDamage: 2,
    };
    card.effect!(state, context);
    expect(state.players[0].board[0].currentHealth).toBe(10 - 5);
    expect(state.players[1].board[0].currentHealth).toBe(10 - 5);
  });

  it('焚城之计 kills all minions and deals 3 to both heroes', () => {
    const card = cards.find(c => c.name === '焚城之计')!;
    expect(card).toBeDefined();

    const state = makeGameState();
    state.players[0].board = [makeMinion({ currentHealth: 10 })];
    state.players[1].board = [makeMinion({ currentHealth: 10 })];

    const context: EffectContext = {
      event: { type: 'spell_played', player: 0 },
      sourceCard: card,
      player: 0,
    };
    card.effect!(state, context);
    expect(state.players[0].board[0].currentHealth).toBe(0);
    expect(state.players[1].board[0].currentHealth).toBe(0);
    expect(state.players[0].hero.health).toBe(STARTING_HP - 3);
    expect(state.players[1].hero.health).toBe(STARTING_HP - 3);
  });
});

describe('Qun weapon effects', () => {
  it('混铁蛇矛 deals 2 damage to own hero on battlecry', () => {
    const card = cards.find(c => c.name === '混铁蛇矛')!;
    expect(card).toBeDefined();
    expect(card.battlecry).toBeDefined();

    const state = makeGameState();
    const context: EffectContext = {
      event: { type: 'minion_played', player: 0, source: card as unknown as BoardMinion },
      sourceCard: card,
      player: 0,
    };
    card.battlecry!(state, context);
    expect(state.players[0].hero.health).toBe(STARTING_HP - 2);
  });

  it('七星宝刀 deals 3 damage to target enemy minion', () => {
    const card = cards.find(c => c.name === '七星宝刀')!;
    expect(card).toBeDefined();
    expect(card.battlecry).toBeDefined();

    const state = makeGameState();
    const target = makeMinion({ currentHealth: 5 });
    state.players[1].board = [target];

    const context: EffectContext = {
      event: { type: 'minion_played', player: 0, source: card as unknown as BoardMinion },
      sourceCard: card,
      player: 0,
      targetIndex: 0,
    };
    card.battlecry!(state, context);
    expect(target.currentHealth).toBe(5 - 3);
  });

  it('混铁蛇矛 has correct stats', () => {
    const card = cards.find(c => c.name === '混铁蛇矛')!;
    expect(card.attack).toBe(4);
    expect(card.health).toBe(2);
    expect(card.cost).toBe(3);
  });

  it('七星宝刀 has correct stats', () => {
    const card = cards.find(c => c.name === '七星宝刀')!;
    expect(card.attack).toBe(5);
    expect(card.health).toBe(3);
    expect(card.cost).toBe(5);
  });
});
