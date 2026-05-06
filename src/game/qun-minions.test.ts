import { describe, it, expect } from 'vitest';
import { cards } from './cards';
import { GameState, BoardMinion, Card, STARTING_HP, Lane } from './types';

function createMinion(card: Card, overrides?: Partial<BoardMinion>): BoardMinion {
  return {
    ...card,
    currentAttack: card.attack,
    currentHealth: card.health,
    summoningSickness: !card.charge,
    hasAttacked: false,
    hasDivineShield: card.divineShield ?? false,
    isStealth: card.stealth ?? false,
    isFrozen: false,
    freezeTurnsLeft: 0,
    isImmune: card.immune ?? false,
    windfuryAttacksLeft: card.windfury ? 2 : 1,
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
    lane: Lane.Front,
    slotIndex: 0,
    ...overrides,
  };
}

function createGameState(): GameState {
  return {
    players: [
      {
        hero: { health: STARTING_HP, mana: 10, heroPower: { name: '', cost: 2, description: '' }, isImmune: false },
        hand: [],
        board: [],
        deck: [] as unknown as import('./types').Deck,
        fatigueDamage: 1,
        traps: [],
        heroPowerUsedThisGame: false,
        heroSkillUsedThisTurn: false,
      },
      {
        hero: { health: STARTING_HP, mana: 10, heroPower: { name: '', cost: 2, description: '' }, isImmune: false },
        hand: [],
        board: [],
        deck: [] as unknown as import('./types').Deck,
        fatigueDamage: 1,
        traps: [],
        heroPowerUsedThisGame: false,
        heroSkillUsedThisTurn: false,
      },
    ],
    activePlayer: 0 as 0 | 1,
    turn: 1,
    phase: 'playing' as const,
    turnPhase: 'main' as const,
    mulliganComplete: [true, true],
    terrain: {},
    winner: undefined,
  } as GameState;
}

const newQunMinionNames = ['黄巾贼兵', '马匪斥候', '赏金猎人', '草原骑兵', '黑山贼将', '西凉铁骑', '毒士贾诩', '飞熊军统领', '乱世枭雄', '白波贼帅'];
const newQunMinions = cards.filter(c => newQunMinionNames.includes(c.name));

describe('Qun minion cards - data integrity', () => {
  it('has exactly 10 new Qun minion cards', () => {
    expect(newQunMinions).toHaveLength(10);
    for (const c of newQunMinions) {
      expect(c.faction).toBe('qun');
      expect(c.type).toBe('minion');
    }
  });

  it('has correct rarity distribution (4 common, 3 rare, 3 epic)', () => {
    const common = newQunMinions.filter(c => c.rarity === 'common');
    const rare = newQunMinions.filter(c => c.rarity === 'rare');
    const epic = newQunMinions.filter(c => c.rarity === 'epic');
    expect(common).toHaveLength(4);
    expect(rare).toHaveLength(3);
    expect(epic).toHaveLength(3);
  });

  it('all new Qun minions have unique names', () => {
    expect(new Set(newQunMinionNames).size).toBe(10);
  });

  it('all new Qun minions have valid stats (positive cost, attack, health)', () => {
    for (const c of newQunMinions) {
      expect(c.cost).toBeGreaterThan(0);
      expect(c.attack).toBeGreaterThan(0);
      expect(c.health).toBeGreaterThan(0);
    }
  });
});

describe('Qun minion effects', () => {
  it('黄巾贼兵 deathrattle discards a hand card', () => {
    const card = cards.find(c => c.name === '黄巾贼兵')!;
    const state = createGameState();
    const dummyCard = cards[0];
    state.players[0].hand = [dummyCard, dummyCard];
    const minion = createMinion(card);
    state.players[0].board.push(minion);
    card.deathrattle!(state, { player: 0, sourceCard: minion, event: { type: 'minion_died', player: 0, state } });
    expect(state.players[0].hand.length).toBe(1);
  });

  it('马匪斥候 has charge and deathrattle damages friendly minion', () => {
    const card = cards.find(c => c.name === '马匪斥候')!;
    expect(card.charge).toBe(true);
    const state = createGameState();
    const friendly = createMinion(cards[0], { currentHealth: 5 });
    state.players[0].board.push(friendly);
    const minion = createMinion(card);
    state.players[0].board.push(minion);
    card.deathrattle!(state, { player: 0, sourceCard: minion, event: { type: 'minion_died', player: 0, state } });
    const totalDamage = (5 - friendly.currentHealth) + (card.health - minion.currentHealth);
    expect(totalDamage).toBeGreaterThanOrEqual(1);
  });

  it('赏金猎人 battlecry deals 2 self-damage and draws a card', () => {
    const card = cards.find(c => c.name === '赏金猎人')!;
    const state = createGameState();
    const dummyCard = cards[0];
    state.players[0].deck = [dummyCard, dummyCard] as unknown as import('./types').Deck;
    const minion = createMinion(card);
    state.players[0].board.push(minion);
    card.battlecry!(state, { player: 0, sourceCard: minion, event: { type: 'minion_played', player: 0, state } });
    expect(state.players[0].hero.health).toBe(STARTING_HP - 2);
    expect(state.players[0].hand.length).toBe(1);
  });

  it('草原骑兵 has charge and deathrattle damages both heroes', () => {
    const card = cards.find(c => c.name === '草原骑兵')!;
    expect(card.charge).toBe(true);
    const state = createGameState();
    const minion = createMinion(card);
    state.players[0].board.push(minion);
    card.deathrattle!(state, { player: 0, sourceCard: minion, event: { type: 'minion_died', player: 0, state } });
    expect(state.players[0].hero.health).toBe(STARTING_HP - 2);
    expect(state.players[1].hero.health).toBe(STARTING_HP - 2);
  });

  it('黑山贼将 battlecry deals 3 self-damage (overstatted)', () => {
    const card = cards.find(c => c.name === '黑山贼将')!;
    const state = createGameState();
    const minion = createMinion(card);
    state.players[0].board.push(minion);
    card.battlecry!(state, { player: 0, sourceCard: minion, event: { type: 'minion_played', player: 0, state } });
    expect(state.players[0].hero.health).toBe(STARTING_HP - 3);
  });

  it('西凉铁骑 has charge and endOfTurn discards a card', () => {
    const card = cards.find(c => c.name === '西凉铁骑')!;
    expect(card.charge).toBe(true);
    const state = createGameState();
    const dummyCard = cards[0];
    state.players[0].hand = [dummyCard, dummyCard, dummyCard];
    const minion = createMinion(card);
    state.players[0].board.push(minion);
    card.endOfTurn!(state, { player: 0, sourceCard: minion, event: { type: 'turn_end', player: 0, state } });
    expect(state.players[0].hand.length).toBe(2);
  });

  it('毒士贾诩 battlecry deals 1 to all other minions and 2 self-hero-damage', () => {
    const card = cards.find(c => c.name === '毒士贾诩')!;
    const state = createGameState();
    const friendly = createMinion(cards[0], { currentHealth: 5 });
    const enemy = createMinion(cards[0], { currentHealth: 5 });
    state.players[0].board.push(friendly);
    state.players[1].board.push(enemy);
    const minion = createMinion(card);
    state.players[0].board.push(minion);
    card.battlecry!(state, { player: 0, sourceCard: minion, event: { type: 'minion_played', player: 0, state } });
    expect(friendly.currentHealth).toBe(4);
    expect(enemy.currentHealth).toBe(4);
    expect(minion.currentHealth).toBe(card.health); // self is excluded
    expect(state.players[0].hero.health).toBe(STARTING_HP - 2);
  });

  it('飞熊军统领 has charge, windfury, and endOfTurn self-damage', () => {
    const card = cards.find(c => c.name === '飞熊军统领')!;
    expect(card.charge).toBe(true);
    expect(card.windfury).toBe(true);
    const state = createGameState();
    const minion = createMinion(card);
    state.players[0].board.push(minion);
    card.endOfTurn!(state, { player: 0, sourceCard: minion, event: { type: 'turn_end', player: 0, state } });
    expect(state.players[0].hero.health).toBe(STARTING_HP - 3);
  });

  it('乱世枭雄 battlecry destroys all other minions', () => {
    const card = cards.find(c => c.name === '乱世枭雄')!;
    const state = createGameState();
    const friendly = createMinion(cards[0], { currentHealth: 5 });
    state.players[0].board.push(friendly);
    const e1 = createMinion(cards[0], { currentHealth: 5 });
    const e2 = createMinion(cards[0], { currentHealth: 3 });
    state.players[1].board.push(e1, e2);
    const minion = createMinion(card);
    state.players[0].board.push(minion);
    card.battlecry!(state, { player: 0, sourceCard: minion, event: { type: 'minion_played', player: 0, state } });
    expect(state.players[0].board.length).toBe(1);
    expect(state.players[0].board[0]).toBe(minion);
    expect(state.players[1].board.length).toBe(0);
    expect(state.players[0].hero.health).toBe(STARTING_HP - 4); // 2 enemy minions * 2
  });

  it('白波贼帅 battlecry summons two 2/1 tokens, deathrattle self-damages', () => {
    const card = cards.find(c => c.name === '白波贼帅')!;
    const state = createGameState();
    const minion = createMinion(card);
    state.players[0].board.push(minion);
    card.battlecry!(state, { player: 0, sourceCard: minion, event: { type: 'minion_played', player: 0, state } });
    expect(state.players[0].board.length).toBe(3);
    expect(state.players[0].board[1].name).toBe('黄巾小兵');
    expect(state.players[0].board[1].currentAttack).toBe(2);
    expect(state.players[0].board[1].currentHealth).toBe(1);
    card.deathrattle!(state, { player: 0, sourceCard: minion, event: { type: 'minion_died', player: 0, state } });
    expect(state.players[0].hero.health).toBe(STARTING_HP - 2);
  });
});
