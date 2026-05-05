import { describe, it, expect, beforeEach } from 'vitest';
import {
  GameState, PlayerState, BoardMinion, Card, Faction,
  FACTION_SYNERGIES, recalculateFactionSynergies, playCard,
  createDeck, createPlayerState, MAX_BOARD_SIZE,
} from './types';
import {
  countFactionMinions, evaluateFactionSynergy, evaluateBoard,
  getBestManaUsage, createAI,
} from './ai';

function makeMinion(overrides: Partial<BoardMinion> & { faction: Faction }): BoardMinion {
  return {
    name: 'test', cost: 1, attack: 1, health: 1, description: '',
    rarity: 'common', type: 'minion',
    currentAttack: overrides.attack ?? 1,
    currentHealth: overrides.health ?? 1,
    summoningSickness: false, hasAttacked: false,
    hasDivineShield: false, isStealth: false, isFrozen: false,
    isImmune: false, windfuryAttacksLeft: 1, enrageActive: false, enrageBonus: 0,
    factionAttackBonus: 0, factionHealthBonus: 0,
    ...overrides,
  };
}

function makeCard(overrides: Partial<Card> & { faction: Faction }): Card {
  return {
    name: 'test', cost: 1, attack: 1, health: 1, description: '',
    rarity: 'common', type: 'minion',
    ...overrides,
  };
}

function makeDummyDeck(): Card[] {
  const cards: Card[] = [];
  for (let i = 0; i < 30; i++) {
    cards.push(makeCard({ faction: 'neutral', name: `dummy${i}` }));
  }
  return cards;
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
    turn: 1,
    phase: 'playing',
    turnPhase: 'play',
    activePlayer: 0,
  };
}

describe('FACTION_SYNERGIES definition', () => {
  it('defines synergy for all non-neutral factions', () => {
    expect(FACTION_SYNERGIES.shu).toEqual({ requiredCount: 2, attackBonus: 1, healthBonus: 0 });
    expect(FACTION_SYNERGIES.wei).toEqual({ requiredCount: 2, attackBonus: 0, healthBonus: 1 });
    expect(FACTION_SYNERGIES.wu).toEqual({ requiredCount: 2, attackBonus: 1, healthBonus: 1 });
    expect(FACTION_SYNERGIES.qun).toEqual({ requiredCount: 2, attackBonus: 2, healthBonus: 0 });
  });
});

describe('recalculateFactionSynergies', () => {
  it('applies attack bonus when 2+ shu minions on board', () => {
    const m1 = makeMinion({ faction: 'shu', name: 'a', attack: 3, health: 3 });
    const m2 = makeMinion({ faction: 'shu', name: 'b', attack: 2, health: 2 });
    const player: PlayerState = createPlayerState(createDeck(makeDummyDeck()));
    player.board = [m1, m2];

    recalculateFactionSynergies(player);

    expect(m1.currentAttack).toBe(4); // 3 + 1
    expect(m1.factionAttackBonus).toBe(1);
    expect(m2.currentAttack).toBe(3); // 2 + 1
    expect(m2.factionAttackBonus).toBe(1);
  });

  it('applies health bonus for wei minions', () => {
    const m1 = makeMinion({ faction: 'wei', attack: 2, health: 3 });
    const m2 = makeMinion({ faction: 'wei', attack: 1, health: 2 });
    const player = createPlayerState(createDeck(makeDummyDeck()));
    player.board = [m1, m2];

    recalculateFactionSynergies(player);

    expect(m1.currentHealth).toBe(4); // 3 + 1
    expect(m1.factionHealthBonus).toBe(1);
    expect(m2.currentHealth).toBe(3); // 2 + 1
  });

  it('applies both attack and health bonus for wu', () => {
    const m1 = makeMinion({ faction: 'wu', attack: 3, health: 3 });
    const m2 = makeMinion({ faction: 'wu', attack: 2, health: 2 });
    const player = createPlayerState(createDeck(makeDummyDeck()));
    player.board = [m1, m2];

    recalculateFactionSynergies(player);

    expect(m1.currentAttack).toBe(4);
    expect(m1.currentHealth).toBe(4);
    expect(m2.currentAttack).toBe(3);
    expect(m2.currentHealth).toBe(3);
  });

  it('applies +2 atk for qun', () => {
    const m1 = makeMinion({ faction: 'qun', attack: 5, health: 5 });
    const m2 = makeMinion({ faction: 'qun', attack: 4, health: 2 });
    const player = createPlayerState(createDeck(makeDummyDeck()));
    player.board = [m1, m2];

    recalculateFactionSynergies(player);

    expect(m1.currentAttack).toBe(7); // 5 + 2
    expect(m2.currentAttack).toBe(6); // 4 + 2
  });

  it('does not apply bonus for neutral minions', () => {
    const m1 = makeMinion({ faction: 'neutral', attack: 2, health: 2 });
    const m2 = makeMinion({ faction: 'neutral', attack: 3, health: 3 });
    const player = createPlayerState(createDeck(makeDummyDeck()));
    player.board = [m1, m2];

    recalculateFactionSynergies(player);

    expect(m1.currentAttack).toBe(2);
    expect(m1.factionAttackBonus).toBe(0);
  });

  it('does not apply bonus when only 1 minion of a faction', () => {
    const m1 = makeMinion({ faction: 'shu', attack: 3, health: 3 });
    const m2 = makeMinion({ faction: 'neutral', attack: 2, health: 2 });
    const player = createPlayerState(createDeck(makeDummyDeck()));
    player.board = [m1, m2];

    recalculateFactionSynergies(player);

    expect(m1.currentAttack).toBe(3);
    expect(m1.factionAttackBonus).toBe(0);
  });

  it('removes bonus when faction count drops below required', () => {
    const m1 = makeMinion({ faction: 'shu', attack: 3, health: 3 });
    const m2 = makeMinion({ faction: 'shu', attack: 2, health: 2 });
    const player = createPlayerState(createDeck(makeDummyDeck()));
    player.board = [m1, m2];

    recalculateFactionSynergies(player);
    expect(m1.currentAttack).toBe(4);

    // Remove one shu minion
    player.board = [m1];
    recalculateFactionSynergies(player);

    expect(m1.currentAttack).toBe(3);
    expect(m1.factionAttackBonus).toBe(0);
  });

  it('handles mixed factions independently', () => {
    const shu1 = makeMinion({ faction: 'shu', name: 's1', attack: 2, health: 2 });
    const shu2 = makeMinion({ faction: 'shu', name: 's2', attack: 3, health: 3 });
    const wei1 = makeMinion({ faction: 'wei', name: 'w1', attack: 1, health: 4 });
    const player = createPlayerState(createDeck(makeDummyDeck()));
    player.board = [shu1, shu2, wei1];

    recalculateFactionSynergies(player);

    // Shu gets +1 atk
    expect(shu1.currentAttack).toBe(3);
    expect(shu2.currentAttack).toBe(4);
    // Wei alone, no bonus
    expect(wei1.currentAttack).toBe(1);
    expect(wei1.currentHealth).toBe(4);
  });
});

describe('playCard triggers synergy recalculation', () => {
  it('applies synergy when second faction minion is played', () => {
    const shu1 = makeMinion({ faction: 'shu', name: 'existing', attack: 3, health: 3 });
    const state = makeGameState([shu1], []);
    const shuCard = makeCard({ faction: 'shu', name: 'newShu', cost: 1, attack: 2, health: 2 });
    state.players[0].hand = [shuCard];
    state.players[0].hero.mana = 10;

    playCard(state, 0);

    expect(state.players[0].board.length).toBe(2);
    // Both should have +1 atk from shu synergy
    expect(state.players[0].board[0].factionAttackBonus).toBe(1);
    expect(state.players[0].board[1].factionAttackBonus).toBe(1);
  });
});

describe('AI faction synergy functions', () => {
  it('countFactionMinions counts correctly', () => {
    const board = [
      makeMinion({ faction: 'shu' }),
      makeMinion({ faction: 'shu' }),
      makeMinion({ faction: 'wei' }),
    ];
    expect(countFactionMinions(board, 'shu')).toBe(2);
    expect(countFactionMinions(board, 'wei')).toBe(1);
    expect(countFactionMinions(board, 'wu')).toBe(0);
  });

  it('evaluateFactionSynergy scores active synergies', () => {
    const board = [
      makeMinion({ faction: 'shu' }),
      makeMinion({ faction: 'shu' }),
    ];
    // shu: 2 minions * (1 atk + 0 hp) = 2
    expect(evaluateFactionSynergy(board)).toBe(2);
  });

  it('evaluateFactionSynergy returns 0 when no synergy active', () => {
    const board = [
      makeMinion({ faction: 'shu' }),
      makeMinion({ faction: 'wei' }),
    ];
    expect(evaluateFactionSynergy(board)).toBe(0);
  });

  it('evaluateBoard includes faction synergy in scoring', () => {
    const state = makeGameState(
      [makeMinion({ faction: 'shu', attack: 2, health: 2 }), makeMinion({ faction: 'shu', attack: 2, health: 2 })],
      [],
    );
    const scoreWithSynergy = evaluateBoard(state, 0);

    const state2 = makeGameState(
      [makeMinion({ faction: 'shu', attack: 2, health: 2 }), makeMinion({ faction: 'wei', attack: 2, health: 2 })],
      [],
    );
    const scoreWithoutSynergy = evaluateBoard(state2, 0);

    expect(scoreWithSynergy).toBeGreaterThan(scoreWithoutSynergy);
  });
});

describe('AI getBestManaUsage prefers faction synergy', () => {
  it('prefers cards that trigger synergy over same-cost alternatives', () => {
    const board = [makeMinion({ faction: 'shu' })];
    const hand: Card[] = [
      makeCard({ faction: 'shu', name: 'shuCard', cost: 2 }),
      makeCard({ faction: 'neutral', name: 'neutralCard', cost: 2 }),
    ];

    const result = getBestManaUsage(hand, 2, board);

    // Should pick shu card (index 0) for synergy
    expect(result).toEqual([0]);
  });

  it('without board context, picks by mana only', () => {
    const hand: Card[] = [
      makeCard({ faction: 'shu', name: 'shuCard', cost: 2 }),
      makeCard({ faction: 'neutral', name: 'neutralCard', cost: 3 }),
    ];

    const result = getBestManaUsage(hand, 3);
    // Without board, should pick highest mana cost
    expect(result).toEqual([1]);
  });
});

describe('HardAI uses faction synergy', () => {
  it('hard AI calls getOptimalPlayDecisions which uses board for synergy', () => {
    const ai = createAI('hard');
    const shu1 = makeMinion({ faction: 'shu', name: 'existing' });
    const state = makeGameState([shu1], []);
    const shuCard = makeCard({ faction: 'shu', name: 'shuPlay', cost: 1 });
    const neutralCard = makeCard({ faction: 'neutral', name: 'neutralPlay', cost: 1 });
    state.players[0].hand = [shuCard, neutralCard];
    state.players[0].hero.mana = 1;

    const decisions = ai.getPlayDecisions(state);

    // Should prefer the shu card (index 0) for synergy
    expect(decisions.length).toBe(1);
    expect(decisions[0].cardIndex).toBe(0);
  });
});
