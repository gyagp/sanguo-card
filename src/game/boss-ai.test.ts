import { describe, it, expect } from 'vitest';
import {
  getCurrentPhase,
  BossAI,
  BOSS_DONGZHUO,
  BOSS_ZHANGJIAO,
  BOSS_LVBU,
  BOSS_YUANSHAO,
  BOSS_CAOCAO,
  BOSS_SIMAYI,
  BOSSES,
  createBossAIFromRule,
} from './boss-ai';
import { GameState, initializeGame, createDeck, Card, startTurn } from './types';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    name: '测试兵',
    cost: 1,
    attack: 1,
    health: 1,
    description: '',
    type: 'minion',
    rarity: 'common',
    faction: 'neutral',
    ...overrides,
  };
}

function makeDeck(count = 30): Card[] {
  return Array.from({ length: count }, (_, i) => makeCard({ name: `测试兵${i}` }));
}

function makeGameState(): GameState {
  const state = initializeGame(createDeck(makeDeck()), createDeck(makeDeck()));
  startTurn(state);
  return state;
}

describe('getCurrentPhase', () => {
  it('returns first phase at full HP', () => {
    const phase = getCurrentPhase(BOSS_DONGZHUO, 30, 30);
    expect(phase.name).toBe('暴政');
  });

  it('returns second phase at half HP', () => {
    const phase = getCurrentPhase(BOSS_DONGZHUO, 15, 30);
    expect(phase.name).toBe('暴怒');
  });

  it('returns last phase at low HP', () => {
    const phase = getCurrentPhase(BOSS_DONGZHUO, 7, 30);
    expect(phase.name).toBe('困兽犹斗');
  });
});

describe('BOSSES registry', () => {
  it('contains all 6 bosses', () => {
    expect(Object.keys(BOSSES)).toHaveLength(6);
    expect(BOSSES['董卓']).toBe(BOSS_DONGZHUO);
    expect(BOSSES['司马懿']).toBe(BOSS_SIMAYI);
  });
});

describe('createBossAIFromRule', () => {
  it('creates BossAI for a known boss', () => {
    const { bossAI, extraMana } = createBossAIFromRule('董卓', 1, 30, 2);
    expect(bossAI).toBeInstanceOf(BossAI);
    expect(extraMana).toBe(2);
  });

  it('creates fallback BossAI for unknown boss', () => {
    const { bossAI, extraMana } = createBossAIFromRule('未知将领');
    expect(bossAI).toBeInstanceOf(BossAI);
    expect(extraMana).toBe(0);
  });
});

describe('DongZhuo turn start effects', () => {
  it('phase 2 spawns a 西凉兵 token', () => {
    const state = makeGameState();
    state.players[1].hero.health = 15;
    state.activePlayer = 1;
    const bossAI = new BossAI(BOSS_DONGZHUO, 1, 30);
    bossAI.applyTurnStartEffect(state);
    const board = state.players[1].board;
    expect(board.length).toBe(1);
    expect(board[0].name).toBe('西凉兵');
    expect(board[0].currentAttack).toBe(2);
    expect(board[0].currentHealth).toBe(1);
  });

  it('phase 3 deals 1 damage to opponent minions and spawns 西凉精锐', () => {
    const state = makeGameState();
    state.players[1].hero.health = 7;
    state.players[0].board.push({
      name: '步兵', cost: 1, attack: 1, health: 2, description: '', type: 'minion',
      rarity: 'common', faction: 'neutral',
      currentAttack: 1, currentHealth: 2,
      summoningSickness: false, hasAttacked: false, hasDivineShield: false,
      isStealth: false, isFrozen: false, freezeTurnsLeft: 0, isImmune: false,
      windfuryAttacksLeft: 1, enrageActive: false, enrageBonus: 0,
      factionAttackBonus: 0, factionHealthBonus: 0,
      shuAdjacencyAtkBonus: 0, shuAdjacencyHpBonus: 0,
      brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0,
      wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0,
      qunDebuff: 0,
    });
    const bossAI = new BossAI(BOSS_DONGZHUO, 1, 30);
    bossAI.applyTurnStartEffect(state);
    expect(state.players[0].board[0].currentHealth).toBe(1);
    expect(state.players[1].board.some(m => m.name === '西凉精锐')).toBe(true);
  });
});

describe('SimaYi herb card fix', () => {
  it('replaced spell has attack and health fields (no unsafe cast)', () => {
    const state = makeGameState();
    state.players[1].hero.health = 15;
    const spellCard: Card = makeCard({ name: '火攻', type: 'spell', cost: 2 });
    state.players[0].hand = [spellCard];
    const bossAI = new BossAI(BOSS_SIMAYI, 1, 30);
    bossAI.applyTurnStartEffect(state);
    const replaced = state.players[0].hand[0];
    expect(replaced.name).toBe('草药');
    expect(replaced.attack).toBe(0);
    expect(replaced.health).toBe(0);
    expect(replaced.type).toBe('spell');
  });

  it('does not replace non-spell cards', () => {
    const state = makeGameState();
    state.players[1].hero.health = 15;
    state.players[0].hand = [makeCard({ name: '士兵', type: 'minion' })];
    const bossAI = new BossAI(BOSS_SIMAYI, 1, 30);
    bossAI.applyTurnStartEffect(state);
    expect(state.players[0].hand[0].name).toBe('士兵');
  });

  it('does not replace cards already named 草药', () => {
    const state = makeGameState();
    state.players[1].hero.health = 15;
    state.players[0].hand = [makeCard({ name: '草药', type: 'spell' })];
    const bossAI = new BossAI(BOSS_SIMAYI, 1, 30);
    bossAI.applyTurnStartEffect(state);
    expect(state.players[0].hand[0].name).toBe('草药');
  });

  it('phase 3 also buffs boss minion attack', () => {
    const state = makeGameState();
    state.players[1].hero.health = 5;
    state.players[0].hand = [];
    state.players[1].board.push({
      name: '卫兵', cost: 1, attack: 2, health: 3, description: '', type: 'minion',
      rarity: 'common', faction: 'neutral',
      currentAttack: 2, currentHealth: 3,
      summoningSickness: false, hasAttacked: false, hasDivineShield: false,
      isStealth: false, isFrozen: false, freezeTurnsLeft: 0, isImmune: false,
      windfuryAttacksLeft: 1, enrageActive: false, enrageBonus: 0,
      factionAttackBonus: 0, factionHealthBonus: 0,
      shuAdjacencyAtkBonus: 0, shuAdjacencyHpBonus: 0,
      brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0,
      wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0,
      qunDebuff: 0,
    });
    const bossAI = new BossAI(BOSS_SIMAYI, 1, 30);
    bossAI.applyTurnStartEffect(state);
    expect(state.players[1].board[0].currentAttack).toBe(3);
  });
});

describe('BossAI decision methods', () => {
  it('getPlayDecisions returns decisions without error', () => {
    const state = makeGameState();
    state.activePlayer = 1;
    const bossAI = new BossAI(BOSS_DONGZHUO, 1, 30);
    const decisions = bossAI.getPlayDecisions(state);
    expect(Array.isArray(decisions)).toBe(true);
  });

  it('getAttackDecisions returns decisions without error', () => {
    const state = makeGameState();
    state.activePlayer = 1;
    const bossAI = new BossAI(BOSS_DONGZHUO, 1, 30);
    const decisions = bossAI.getAttackDecisions(state);
    expect(Array.isArray(decisions)).toBe(true);
  });

  it('shouldUseHeroPower returns true when mana available and not used', () => {
    const state = makeGameState();
    state.activePlayer = 1;
    state.players[1].hero.mana = 5;
    state.players[1].heroPowerUsed = false;
    const bossAI = new BossAI(BOSS_DONGZHUO, 1, 30);
    expect(bossAI.shouldUseHeroPower(state)).toBe(true);
  });

  it('shouldUseHeroPower returns false when already used', () => {
    const state = makeGameState();
    state.activePlayer = 1;
    state.players[1].heroPowerUsed = true;
    const bossAI = new BossAI(BOSS_DONGZHUO, 1, 30);
    expect(bossAI.shouldUseHeroPower(state)).toBe(false);
  });
});

describe('ZhangJiao turn start effects', () => {
  it('phase 1 spawns 乡勇', () => {
    const state = makeGameState();
    state.players[1].hero.health = 30;
    const bossAI = new BossAI(BOSS_ZHANGJIAO, 1, 30);
    bossAI.applyTurnStartEffect(state);
    expect(state.players[1].board.length).toBe(1);
    expect(state.players[1].board[0].name).toBe('乡勇');
  });

  it('phase 2 heals boss and draws a card', () => {
    const state = makeGameState();
    state.players[1].hero.health = 10;
    const deckBefore = state.players[1].deck.length;
    const handBefore = state.players[1].hand.length;
    const bossAI = new BossAI(BOSS_ZHANGJIAO, 1, 30);
    bossAI.applyTurnStartEffect(state);
    expect(state.players[1].hero.health).toBe(13);
    expect(state.players[1].hand.length).toBe(handBefore + 1);
  });
});

describe('LvBu turn start effects', () => {
  it('phase 1 buffs 吕布 minion attack by 1', () => {
    const state = makeGameState();
    state.players[1].hero.health = 30;
    state.players[1].board.push({
      name: '吕布', cost: 8, attack: 8, health: 8, description: '', type: 'minion',
      rarity: 'legendary', faction: 'qun',
      currentAttack: 8, currentHealth: 8,
      summoningSickness: false, hasAttacked: false, hasDivineShield: false,
      isStealth: false, isFrozen: false, freezeTurnsLeft: 0, isImmune: false,
      windfuryAttacksLeft: 1, enrageActive: false, enrageBonus: 0,
      factionAttackBonus: 0, factionHealthBonus: 0,
      shuAdjacencyAtkBonus: 0, shuAdjacencyHpBonus: 0,
      brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0,
      wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0,
      qunDebuff: 0,
    });
    const bossAI = new BossAI(BOSS_LVBU, 1, 30);
    bossAI.applyTurnStartEffect(state);
    expect(state.players[1].board[0].currentAttack).toBe(9);
  });
});

describe('CaoCao turn start effects', () => {
  it('phase 2 steals lowest-attack opponent minion', () => {
    const state = makeGameState();
    state.players[1].hero.health = 8;
    const minion = {
      name: '弱兵', cost: 1, attack: 1, health: 1, description: '', type: 'minion' as const,
      rarity: 'common' as const, faction: 'neutral' as const,
      currentAttack: 1, currentHealth: 1,
      summoningSickness: false, hasAttacked: false, hasDivineShield: false,
      isStealth: false, isFrozen: false, freezeTurnsLeft: 0, isImmune: false,
      windfuryAttacksLeft: 1, enrageActive: false, enrageBonus: 0,
      factionAttackBonus: 0, factionHealthBonus: 0,
      shuAdjacencyAtkBonus: 0, shuAdjacencyHpBonus: 0,
      brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0,
      wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0,
      qunDebuff: 0,
    };
    state.players[0].board.push(minion);
    const bossAI = new BossAI(BOSS_CAOCAO, 1, 30);
    bossAI.applyTurnStartEffect(state);
    expect(state.players[0].board.length).toBe(0);
    expect(state.players[1].board.some(m => m.name === '弱兵')).toBe(true);
  });
});

describe('difficulty scaling', () => {
  it('face priority bosses generate face attack decisions', () => {
    const state = makeGameState();
    state.activePlayer = 1;
    state.players[1].hero.health = 5;
    state.players[1].board.push({
      name: '兵', cost: 1, attack: 2, health: 1, description: '', type: 'minion',
      rarity: 'common', faction: 'neutral',
      currentAttack: 2, currentHealth: 1,
      summoningSickness: false, hasAttacked: false, hasDivineShield: false,
      isStealth: false, isFrozen: false, freezeTurnsLeft: 0, isImmune: false,
      windfuryAttacksLeft: 1, enrageActive: false, enrageBonus: 0,
      factionAttackBonus: 0, factionHealthBonus: 0,
      shuAdjacencyAtkBonus: 0, shuAdjacencyHpBonus: 0,
      brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0,
      wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0,
      qunDebuff: 0,
    });
    const bossAI = new BossAI(BOSS_DONGZHUO, 1, 30);
    const attacks = bossAI.getAttackDecisions(state);
    expect(attacks.some(a => a.targetIndex === 'hero')).toBe(true);
  });
});
