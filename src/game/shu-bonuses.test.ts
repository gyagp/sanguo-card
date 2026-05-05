import { describe, it, expect, beforeEach } from 'vitest';
import {
  GameState, PlayerState, BoardMinion, Card, Faction,
  recalculateShuBonuses, recalculateFactionSynergies, playCard,
  removeDeadMinions, createDeck, createPlayerState,
  gameEventBus,
} from './types';

function makeCard(overrides: Partial<Card> & { faction: Faction }): Card {
  return {
    name: 'test', cost: 1, attack: 1, health: 1, description: '',
    rarity: 'common', type: 'minion',
    ...overrides,
  };
}

function makeMinion(overrides: Partial<BoardMinion> & { faction: Faction }): BoardMinion {
  return {
    name: 'test', cost: 1, attack: 1, health: 1, description: '',
    rarity: 'common', type: 'minion',
    currentAttack: overrides.attack ?? 1,
    currentHealth: overrides.health ?? 1,
    summoningSickness: false, hasAttacked: false,
    hasDivineShield: false, isStealth: false, isFrozen: false,
    freezeTurnsLeft: 0,
    isImmune: false, windfuryAttacksLeft: 1, enrageActive: false, enrageBonus: 0,
    factionAttackBonus: 0, factionHealthBonus: 0,
    shuAdjacencyAtkBonus: 0, shuAdjacencyHpBonus: 0,
    brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0,
    ...overrides,
  };
}

function makeDummyDeck(): Card[] {
  return Array.from({ length: 30 }, (_, i) =>
    makeCard({ faction: 'neutral', name: `dummy${i}` })
  );
}

function makeGameState(p0Board: BoardMinion[], p1Board: BoardMinion[]): GameState {
  const deck1 = createDeck(makeDummyDeck());
  const deck2 = createDeck(makeDummyDeck());
  const p0 = createPlayerState(deck1);
  const p1 = createPlayerState(deck2);
  p0.board = p0Board;
  p1.board = p1Board;
  return {
    players: [p0, p1],
    board: [p0Board, p1Board],
    turn: 1, phase: 'playing', turnPhase: 'play', activePlayer: 0,
    spellsPlayed: [[], []],
  };
}

beforeEach(() => {
  gameEventBus.clear();
});

describe('recalculateShuBonuses — adjacency', () => {
  it('grants +1/+1 to two adjacent Shu minions', () => {
    const m1 = makeMinion({ faction: 'shu', attack: 2, health: 3 });
    const m2 = makeMinion({ faction: 'shu', attack: 3, health: 4 });
    const player = createPlayerState(createDeck(makeDummyDeck()));
    player.board = [m1, m2];

    recalculateShuBonuses(player);

    expect(m1.shuAdjacencyAtkBonus).toBe(1);
    expect(m1.shuAdjacencyHpBonus).toBe(1);
    expect(m1.currentAttack).toBe(3); // 2+1
    expect(m1.currentHealth).toBe(4); // 3+1

    expect(m2.shuAdjacencyAtkBonus).toBe(1);
    expect(m2.shuAdjacencyHpBonus).toBe(1);
    expect(m2.currentAttack).toBe(4); // 3+1
    expect(m2.currentHealth).toBe(5); // 4+1
  });

  it('middle Shu minion between two Shu gets +2/+2 (stacks per neighbor)', () => {
    const m1 = makeMinion({ faction: 'shu', attack: 1, health: 1 });
    const m2 = makeMinion({ faction: 'shu', attack: 1, health: 1 });
    const m3 = makeMinion({ faction: 'shu', attack: 1, health: 1 });
    const player = createPlayerState(createDeck(makeDummyDeck()));
    player.board = [m1, m2, m3];

    recalculateShuBonuses(player);

    expect(m1.shuAdjacencyAtkBonus).toBe(1);
    expect(m2.shuAdjacencyAtkBonus).toBe(2);
    expect(m2.shuAdjacencyHpBonus).toBe(2);
    expect(m2.currentAttack).toBe(3); // 1+2
    expect(m2.currentHealth).toBe(3); // 1+2
    expect(m3.shuAdjacencyAtkBonus).toBe(1);
  });

  it('non-adjacent Shu minions separated by non-Shu get no adjacency bonus', () => {
    const s1 = makeMinion({ faction: 'shu', name: 's1', attack: 2, health: 2 });
    const n = makeMinion({ faction: 'wei', name: 'w1', attack: 1, health: 1 });
    const s2 = makeMinion({ faction: 'shu', name: 's2', attack: 2, health: 2 });
    const player = createPlayerState(createDeck(makeDummyDeck()));
    player.board = [s1, n, s2];

    recalculateShuBonuses(player);

    expect(s1.shuAdjacencyAtkBonus).toBe(0);
    expect(s2.shuAdjacencyAtkBonus).toBe(0);
  });

  it('single Shu minion gets no adjacency bonus', () => {
    const m = makeMinion({ faction: 'shu', attack: 3, health: 3 });
    const player = createPlayerState(createDeck(makeDummyDeck()));
    player.board = [m];

    recalculateShuBonuses(player);

    expect(m.shuAdjacencyAtkBonus).toBe(0);
    expect(m.shuAdjacencyHpBonus).toBe(0);
    expect(m.currentAttack).toBe(3);
    expect(m.currentHealth).toBe(3);
  });

  it('non-Shu minions never get adjacency bonus', () => {
    const w1 = makeMinion({ faction: 'wei', attack: 2, health: 2 });
    const w2 = makeMinion({ faction: 'wei', attack: 2, health: 2 });
    const player = createPlayerState(createDeck(makeDummyDeck()));
    player.board = [w1, w2];

    recalculateShuBonuses(player);

    expect(w1.shuAdjacencyAtkBonus).toBe(0);
    expect(w2.shuAdjacencyAtkBonus).toBe(0);
  });
});

describe('recalculateShuBonuses — brotherhood trio', () => {
  it('grants +2/+2 to 刘备, 关羽, 张飞 when all three on board', () => {
    const liu = makeMinion({ faction: 'shu', name: '刘备', attack: 2, health: 3 });
    const guan = makeMinion({ faction: 'shu', name: '关羽', attack: 4, health: 5 });
    const zhang = makeMinion({ faction: 'shu', name: '张飞', attack: 3, health: 4 });
    const player = createPlayerState(createDeck(makeDummyDeck()));
    player.board = [liu, guan, zhang];

    recalculateShuBonuses(player);

    expect(liu.brotherhoodAtkBonus).toBe(2);
    expect(liu.brotherhoodHpBonus).toBe(2);
    expect(guan.brotherhoodAtkBonus).toBe(2);
    expect(guan.brotherhoodHpBonus).toBe(2);
    expect(zhang.brotherhoodAtkBonus).toBe(2);
    expect(zhang.brotherhoodHpBonus).toBe(2);

    // verify stats include both adjacency + brotherhood
    // liu(idx 0) adj to guan(idx 1): +1/+1 adj, +2/+2 bro = +3/+3
    expect(liu.currentAttack).toBe(2 + 1 + 2); // 5
    expect(liu.currentHealth).toBe(3 + 1 + 2); // 6
  });

  it('no brotherhood bonus with only two of three heroes', () => {
    const liu = makeMinion({ faction: 'shu', name: '刘备', attack: 2, health: 3 });
    const guan = makeMinion({ faction: 'shu', name: '关羽', attack: 4, health: 5 });
    const player = createPlayerState(createDeck(makeDummyDeck()));
    player.board = [liu, guan];

    recalculateShuBonuses(player);

    expect(liu.brotherhoodAtkBonus).toBe(0);
    expect(liu.brotherhoodHpBonus).toBe(0);
    expect(guan.brotherhoodAtkBonus).toBe(0);
  });

  it('non-brotherhood Shu minions do not get brotherhood bonus even when trio present', () => {
    const liu = makeMinion({ faction: 'shu', name: '刘备', attack: 2, health: 2 });
    const guan = makeMinion({ faction: 'shu', name: '关羽', attack: 2, health: 2 });
    const zhang = makeMinion({ faction: 'shu', name: '张飞', attack: 2, health: 2 });
    const other = makeMinion({ faction: 'shu', name: '赵云', attack: 3, health: 3 });
    const player = createPlayerState(createDeck(makeDummyDeck()));
    player.board = [liu, guan, zhang, other];

    recalculateShuBonuses(player);

    expect(other.brotherhoodAtkBonus).toBe(0);
    expect(other.brotherhoodHpBonus).toBe(0);
    // But other still gets adjacency from adjacent 张飞
    expect(other.shuAdjacencyAtkBonus).toBe(1);
  });
});

describe('bonuses recalculated on minion play', () => {
  it('playing a Shu minion adjacent to another grants both adjacency bonus', () => {
    const existing = makeMinion({ faction: 'shu', name: '赵云', attack: 3, health: 3 });
    const state = makeGameState([existing], []);
    const card = makeCard({ faction: 'shu', name: '马超', cost: 1, attack: 2, health: 2 });
    state.players[0].hand = [card];
    state.players[0].hero.mana = 10;

    playCard(state, 0);

    expect(state.players[0].board.length).toBe(2);
    const m1 = state.players[0].board[0];
    const m2 = state.players[0].board[1];
    expect(m1.shuAdjacencyAtkBonus).toBe(1);
    expect(m1.shuAdjacencyHpBonus).toBe(1);
    expect(m2.shuAdjacencyAtkBonus).toBe(1);
    expect(m2.shuAdjacencyHpBonus).toBe(1);
  });

  it('playing third brotherhood member triggers brotherhood bonus for all three', () => {
    const liu = makeMinion({ faction: 'shu', name: '刘备', attack: 2, health: 3 });
    const guan = makeMinion({ faction: 'shu', name: '关羽', attack: 4, health: 5 });
    const state = makeGameState([liu, guan], []);
    const zhangCard = makeCard({ faction: 'shu', name: '张飞', cost: 1, attack: 3, health: 4 });
    state.players[0].hand = [zhangCard];
    state.players[0].hero.mana = 10;

    playCard(state, 0);

    expect(state.players[0].board.length).toBe(3);
    for (const m of state.players[0].board) {
      expect(m.brotherhoodAtkBonus).toBe(2);
      expect(m.brotherhoodHpBonus).toBe(2);
    }
  });
});

describe('bonuses recalculated on minion death', () => {
  it('adjacency bonus removed when neighbor dies', () => {
    const s1 = makeMinion({ faction: 'shu', name: 's1', attack: 2, health: 5 });
    const s2 = makeMinion({ faction: 'shu', name: 's2', attack: 2, health: 5 });
    const state = makeGameState([s1, s2], []);
    const player = state.players[0];
    recalculateShuBonuses(player);

    expect(s1.shuAdjacencyAtkBonus).toBe(1);

    // Kill s2
    s2.currentHealth = 0;
    removeDeadMinions(state);

    expect(player.board.length).toBe(1);
    expect(player.board[0].name).toBe('s1');
    expect(player.board[0].shuAdjacencyAtkBonus).toBe(0);
    expect(player.board[0].shuAdjacencyHpBonus).toBe(0);
  });

  it('brotherhood bonus removed when one of three dies', () => {
    const liu = makeMinion({ faction: 'shu', name: '刘备', attack: 2, health: 5 });
    const guan = makeMinion({ faction: 'shu', name: '关羽', attack: 4, health: 5 });
    const zhang = makeMinion({ faction: 'shu', name: '张飞', attack: 3, health: 5 });
    const state = makeGameState([liu, guan, zhang], []);
    recalculateShuBonuses(state.players[0]);

    expect(liu.brotherhoodAtkBonus).toBe(2);

    // Kill 张飞
    zhang.currentHealth = 0;
    removeDeadMinions(state);

    expect(state.players[0].board.length).toBe(2);
    expect(liu.brotherhoodAtkBonus).toBe(0);
    expect(liu.brotherhoodHpBonus).toBe(0);
    expect(guan.brotherhoodAtkBonus).toBe(0);
  });

  it('minion at 1 HP with adjacency bonus that loses neighbor is removed (0 HP after bonus loss)', () => {
    const s1 = makeMinion({ faction: 'shu', name: 's1', attack: 2, health: 5 });
    const s2 = makeMinion({ faction: 'shu', name: 's2', attack: 1, health: 1 });
    const player = createPlayerState(createDeck(makeDummyDeck()));
    player.board = [s1, s2];
    const state = makeGameState([], []);
    state.players[0] = player;

    // Apply adjacency: s2 gets +1/+1 -> currentHealth = 2
    recalculateShuBonuses(player);
    expect(s2.currentHealth).toBe(2);
    expect(s2.shuAdjacencyHpBonus).toBe(1);

    // Damage s2 to 1 HP (it's alive because of the +1 adjacency HP)
    s2.currentHealth = 1;

    // Kill s1 -> s2 loses adjacency bonus -> health drops by 1 -> 0 HP
    s1.currentHealth = 0;
    removeDeadMinions(state);

    // Both should be removed: s1 died directly, s2 died from lost bonus
    expect(player.board.length).toBe(0);
  });
});

describe('recalculateShuBonuses is idempotent', () => {
  it('calling twice does not double the bonus', () => {
    const m1 = makeMinion({ faction: 'shu', attack: 2, health: 3 });
    const m2 = makeMinion({ faction: 'shu', attack: 3, health: 4 });
    const player = createPlayerState(createDeck(makeDummyDeck()));
    player.board = [m1, m2];

    recalculateShuBonuses(player);
    recalculateShuBonuses(player);

    expect(m1.currentAttack).toBe(3); // 2+1, not 2+1+1
    expect(m1.currentHealth).toBe(4); // 3+1
    expect(m1.shuAdjacencyAtkBonus).toBe(1);
  });
});
