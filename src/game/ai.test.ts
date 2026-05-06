import { describe, it, expect } from 'vitest';
import { evaluateBoard, getPlayableCards, getBestManaUsage, AIDecision, findLethal, evaluateTrade, getAIAttackDecisions, createAI, AIDifficulty, AIStrategy, evaluateCardForFaction, getOnCurvePlayDecisions, getOptimalPlayDecisions } from './ai';
import { GameState, PlayerState, Card, BoardMinion, Deck, Faction, Lane } from './types';

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
    hasDivineShield: false,
    isStealth: false,
    isFrozen: false,
    freezeTurnsLeft: 0,
    isImmune: false,
    windfuryAttacksLeft: 1,
    enrageActive: false,
    enrageBonus: 0, factionAttackBonus: 0, factionHealthBonus: 0, shuAdjacencyAtkBonus: 0, shuAdjacencyHpBonus: 0, brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0, wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0, qunDebuff: 0, lane: Lane.Center, slotIndex: 0,
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
    heroHasAttacked: false,
    heroWindfuryAttacksLeft: 0,
    deckFaction: "neutral" as Faction,
    hasDeckFactionBonus: false,
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

describe('findLethal', () => {
  it('returns true when total attack >= opponent health', () => {
    const attackers = [
      makeMinion({ currentAttack: 5 }),
      makeMinion({ currentAttack: 4 }),
    ];
    expect(findLethal(attackers, 9)).toBe(true);
  });

  it('returns true when total attack exceeds opponent health', () => {
    const attackers = [makeMinion({ currentAttack: 10 })];
    expect(findLethal(attackers, 5)).toBe(true);
  });

  it('returns false when total attack < opponent health', () => {
    const attackers = [
      makeMinion({ currentAttack: 3 }),
      makeMinion({ currentAttack: 2 }),
    ];
    expect(findLethal(attackers, 10)).toBe(false);
  });

  it('ignores minions with summoning sickness', () => {
    const attackers = [
      makeMinion({ currentAttack: 10, summoningSickness: true }),
      makeMinion({ currentAttack: 2 }),
    ];
    expect(findLethal(attackers, 5)).toBe(false);
  });

  it('ignores minions that already attacked', () => {
    const attackers = [
      makeMinion({ currentAttack: 10, hasAttacked: true, windfuryAttacksLeft: 0 }),
      makeMinion({ currentAttack: 2 }),
    ];
    expect(findLethal(attackers, 5)).toBe(false);
  });

  it('returns true with empty board and zero health', () => {
    expect(findLethal([], 0)).toBe(true);
  });
});

describe('evaluateTrade', () => {
  it('scores favorably when attacker kills defender and survives', () => {
    const attacker = makeMinion({ currentAttack: 5, currentHealth: 4 });
    const defender = makeMinion({ currentAttack: 2, currentHealth: 3 });
    const score = evaluateTrade(attacker, defender);
    expect(score).toBeGreaterThan(0);
  });

  it('scores negatively when attacker dies and defender survives', () => {
    const attacker = makeMinion({ currentAttack: 1, currentHealth: 1 });
    const defender = makeMinion({ currentAttack: 5, currentHealth: 10 });
    const score = evaluateTrade(attacker, defender);
    expect(score).toBeLessThan(0);
  });

  it('scores positively for even trade when defender has higher value', () => {
    const attacker = makeMinion({ currentAttack: 3, currentHealth: 2 });
    const defender = makeMinion({ currentAttack: 2, currentHealth: 3 });
    expect(evaluateTrade(attacker, defender)).toBeGreaterThan(0);
  });

  it('scores mutual kills based on value exchange', () => {
    const attacker = makeMinion({ currentAttack: 3, currentHealth: 3 });
    const defender = makeMinion({ currentAttack: 3, currentHealth: 3 });
    const score = evaluateTrade(attacker, defender);
    // Both die: gain defenderValue+bonus, lose attackerValue => net = bonus
    expect(score).toBeGreaterThan(0);
  });
});

describe('getAIAttackDecisions', () => {
  it('goes face when lethal is available', () => {
    const state = makeGameState(
      { board: [makeMinion({ currentAttack: 10, currentHealth: 5 })] },
      { hero: { health: 5, mana: 0, heroPower: { name: '', cost: 2, description: '' } }, board: [makeMinion({ currentAttack: 2, currentHealth: 2 })] },
    );
    state.activePlayer = 0;
    const decisions = getAIAttackDecisions(state);
    expect(decisions.every(d => d.targetIndex === 'hero')).toBe(true);
  });

  it('trades efficiently when no lethal', () => {
    const state = makeGameState(
      { board: [makeMinion({ currentAttack: 5, currentHealth: 4 })] },
      { hero: { health: 30, mana: 0, heroPower: { name: '', cost: 2, description: '' } }, board: [makeMinion({ currentAttack: 2, currentHealth: 3 })] },
    );
    state.activePlayer = 0;
    const decisions = getAIAttackDecisions(state);
    const tradeDecision = decisions.find(d => d.targetIndex !== 'hero');
    expect(tradeDecision).toBeDefined();
    expect(tradeDecision!.targetIndex).toBe(0);
  });

  it('sends remaining minions face after trading', () => {
    const state = makeGameState(
      { board: [
        makeMinion({ currentAttack: 5, currentHealth: 4, name: 'Trader' }),
        makeMinion({ currentAttack: 3, currentHealth: 3, name: 'Attacker' }),
      ]},
      { hero: { health: 30, mana: 0, heroPower: { name: '', cost: 2, description: '' } }, board: [makeMinion({ currentAttack: 2, currentHealth: 3 })] },
    );
    state.activePlayer = 0;
    const decisions = getAIAttackDecisions(state);
    expect(decisions.length).toBe(2);
    const faceAttacks = decisions.filter(d => d.targetIndex === 'hero');
    expect(faceAttacks.length).toBeGreaterThanOrEqual(1);
  });

  it('skips minions with summoning sickness', () => {
    const state = makeGameState(
      { board: [makeMinion({ currentAttack: 5, summoningSickness: true })] },
      { hero: { health: 30, mana: 0, heroPower: { name: '', cost: 2, description: '' } } },
    );
    state.activePlayer = 0;
    const decisions = getAIAttackDecisions(state);
    expect(decisions).toEqual([]);
  });

  it('returns empty when no minions on board', () => {
    const state = makeGameState({}, {});
    state.activePlayer = 0;
    expect(getAIAttackDecisions(state)).toEqual([]);
  });
});

describe('createAI', () => {
  it('creates an AI for each difficulty level', () => {
    const difficulties: AIDifficulty[] = ['easy', 'normal', 'hard'];
    for (const d of difficulties) {
      const ai = createAI(d);
      expect(ai.difficulty).toBe(d);
      expect(ai.getPlayDecisions).toBeDefined();
      expect(ai.getAttackDecisions).toBeDefined();
      expect(ai.shouldUseHeroPower).toBeDefined();
    }
  });

  it('easy AI returns valid play decisions', () => {
    const ai = createAI('easy');
    const state = makeGameState(
      { hand: [makeCard({ cost: 1 }), makeCard({ cost: 2 })], hero: { health: 30, mana: 3, heroPower: { name: '', cost: 2, description: '' } } },
      {},
    );
    const decisions = ai.getPlayDecisions(state);
    expect(decisions.every(d => d.type === 'playCard')).toBe(true);
    const totalCost = decisions.reduce((s, d) => s + state.players[0].hand[d.cardIndex].cost, 0);
    expect(totalCost).toBeLessThanOrEqual(3);
  });

  it('easy AI returns valid attack decisions', () => {
    const ai = createAI('easy');
    const state = makeGameState(
      { board: [makeMinion({ currentAttack: 3, currentHealth: 2 })] },
      { board: [makeMinion({ currentAttack: 2, currentHealth: 2 })] },
    );
    const decisions = ai.getAttackDecisions(state);
    expect(decisions.every(d => d.type === 'attack')).toBe(true);
  });

  it('normal AI plays on-curve (highest cost first)', () => {
    const ai = createAI('normal');
    const state = makeGameState(
      { hand: [makeCard({ cost: 1 }), makeCard({ cost: 3 }), makeCard({ cost: 2 })], hero: { health: 30, mana: 3, heroPower: { name: '', cost: 2, description: '' } } },
      {},
    );
    const decisions = ai.getPlayDecisions(state);
    expect(decisions.length).toBeGreaterThan(0);
    expect(decisions[0].cardIndex).toBe(1);
  });

  it('hard AI uses optimal mana', () => {
    const ai = createAI('hard');
    const state = makeGameState(
      { hand: [makeCard({ cost: 2 }), makeCard({ cost: 3 }), makeCard({ cost: 4 })], hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } } },
      {},
    );
    const decisions = ai.getPlayDecisions(state);
    const totalCost = decisions.reduce((s, d) => s + state.players[0].hand[d.cardIndex].cost, 0);
    expect(totalCost).toBe(5);
  });

  it('hard AI uses hero power when it fits mana curve', () => {
    const ai = createAI('hard');
    const state = makeGameState(
      { hand: [makeCard({ cost: 1 })], hero: { health: 30, mana: 3, heroPower: { name: 'Ping', cost: 2, description: '' } }, heroPowerUsed: false },
      {},
    );
    expect(ai.shouldUseHeroPower(state)).toBe(true);
  });

  it('hard AI skips hero power when already used', () => {
    const ai = createAI('hard');
    const state = makeGameState(
      { hand: [], hero: { health: 30, mana: 5, heroPower: { name: 'Ping', cost: 2, description: '' } }, heroPowerUsed: true },
      {},
    );
    expect(ai.shouldUseHeroPower(state)).toBe(false);
  });

  it('normal/hard AI uses smart attack decisions (lethal detection)', () => {
    for (const d of ['normal', 'hard'] as AIDifficulty[]) {
      const ai = createAI(d);
      const state = makeGameState(
        { board: [makeMinion({ currentAttack: 10, currentHealth: 5 })] },
        { hero: { health: 5, mana: 0, heroPower: { name: '', cost: 2, description: '' } }, board: [makeMinion({ currentAttack: 2, currentHealth: 2 })] },
      );
      const decisions = ai.getAttackDecisions(state);
      expect(decisions.every(d => d.targetIndex === 'hero')).toBe(true);
    }
  });
});

describe('Easy AI — valid but suboptimal plays', () => {
  it('plays valid cards that stay within mana budget', () => {
    const ai = createAI('easy');
    const hand = [makeCard({ cost: 1 }), makeCard({ cost: 2 }), makeCard({ cost: 3 })];
    const state = makeGameState(
      { hand, hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } } },
      {},
    );
    const decisions = ai.getPlayDecisions(state);
    const totalCost = decisions.reduce((s, d) => s + hand[d.cardIndex].cost, 0);
    expect(totalCost).toBeLessThanOrEqual(5);
    for (const d of decisions) {
      expect(d.cardIndex).toBeGreaterThanOrEqual(0);
      expect(d.cardIndex).toBeLessThan(hand.length);
    }
  });

  it('does not always pick the optimal mana combo (randomness)', () => {
    const ai = createAI('easy');
    const hand = [makeCard({ cost: 2 }), makeCard({ cost: 3 }), makeCard({ cost: 4 })];
    const state = makeGameState(
      { hand, hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } } },
      {},
    );
    const combos = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const decisions = ai.getPlayDecisions(state);
      const key = decisions.map(d => d.cardIndex).sort().join(',');
      combos.add(key);
    }
    expect(combos.size).toBeGreaterThan(1);
  });

  it('attacks randomly — does not always pick optimal trades', () => {
    const ai = createAI('easy');
    const state = makeGameState(
      { board: [makeMinion({ currentAttack: 3, currentHealth: 5 }), makeMinion({ currentAttack: 2, currentHealth: 3 })] },
      { hero: { health: 30, mana: 0, heroPower: { name: '', cost: 2, description: '' } }, board: [makeMinion({ currentAttack: 1, currentHealth: 1 })] },
    );
    const targets = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const decisions = ai.getAttackDecisions(state);
      const key = decisions.map(d => `${d.attackerIndex}->${d.targetIndex}`).join(';');
      targets.add(key);
    }
    expect(targets.size).toBeGreaterThan(1);
  });

  it('hero power usage is probabilistic (not always on)', () => {
    const ai = createAI('easy');
    const state = makeGameState(
      { hero: { health: 30, mana: 5, heroPower: { name: 'Ping', cost: 2, description: '' } }, heroPowerUsed: false },
      {},
    );
    let trueCount = 0;
    for (let i = 0; i < 100; i++) {
      if (ai.shouldUseHeroPower(state)) trueCount++;
    }
    expect(trueCount).toBeGreaterThan(5);
    expect(trueCount).toBeLessThan(95);
  });
});

describe('Normal AI — on-curve play (uses most mana greedily)', () => {
  it('plays highest cost card first', () => {
    const ai = createAI('normal');
    const hand = [makeCard({ cost: 1 }), makeCard({ cost: 4 }), makeCard({ cost: 2 })];
    const state = makeGameState(
      { hand, hero: { health: 30, mana: 4, heroPower: { name: '', cost: 2, description: '' } } },
      {},
    );
    const decisions = ai.getPlayDecisions(state);
    expect(decisions[0].cardIndex).toBe(1);
  });

  it('fills remaining mana after big card', () => {
    const ai = createAI('normal');
    const hand = [makeCard({ cost: 1 }), makeCard({ cost: 3 }), makeCard({ cost: 2 })];
    const state = makeGameState(
      { hand, hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } } },
      {},
    );
    const decisions = ai.getPlayDecisions(state);
    const totalCost = decisions.reduce((s, d) => s + hand[d.cardIndex].cost, 0);
    expect(totalCost).toBe(5);
  });

  it('uses hero power when mana is available and not yet used', () => {
    const ai = createAI('normal');
    const state = makeGameState(
      { hand: [], hero: { health: 30, mana: 3, heroPower: { name: 'Ping', cost: 2, description: '' } }, heroPowerUsed: false },
      {},
    );
    expect(ai.shouldUseHeroPower(state)).toBe(true);
  });

  it('skips hero power when already used', () => {
    const ai = createAI('normal');
    const state = makeGameState(
      { hand: [], hero: { health: 30, mana: 3, heroPower: { name: 'Ping', cost: 2, description: '' } }, heroPowerUsed: true },
      {},
    );
    expect(ai.shouldUseHeroPower(state)).toBe(false);
  });
});

describe('Hard AI — optimal play and lethal detection', () => {
  it('finds exact mana combo over greedy approach', () => {
    const ai = createAI('hard');
    const hand = [makeCard({ cost: 3 }), makeCard({ cost: 3 }), makeCard({ cost: 1 })];
    const state = makeGameState(
      { hand, hero: { health: 30, mana: 4, heroPower: { name: '', cost: 2, description: '' } } },
      {},
    );
    const decisions = ai.getPlayDecisions(state);
    const totalCost = decisions.reduce((s, d) => s + hand[d.cardIndex].cost, 0);
    expect(totalCost).toBe(4);
    const indices = decisions.map(d => d.cardIndex).sort();
    expect(indices).toEqual([0, 2]);
  });

  it('detects lethal and sends all minions face', () => {
    const ai = createAI('hard');
    const state = makeGameState(
      { board: [makeMinion({ currentAttack: 4 }), makeMinion({ currentAttack: 3 })] },
      { hero: { health: 7, mana: 0, heroPower: { name: '', cost: 2, description: '' } }, board: [makeMinion({ currentAttack: 5, currentHealth: 5 })] },
    );
    const decisions = ai.getAttackDecisions(state);
    expect(decisions.every(d => d.targetIndex === 'hero')).toBe(true);
    expect(decisions.length).toBe(2);
  });

  it('uses hero power when it fits mana curve without reducing card plays', () => {
    const ai = createAI('hard');
    const state = makeGameState(
      { hand: [makeCard({ cost: 3 })], hero: { health: 30, mana: 5, heroPower: { name: 'Ping', cost: 2, description: '' } }, heroPowerUsed: false },
      {},
    );
    expect(ai.shouldUseHeroPower(state)).toBe(true);
  });

  it('skips hero power when it would reduce mana efficiency', () => {
    const ai = createAI('hard');
    const state = makeGameState(
      { hand: [makeCard({ cost: 5 })], hero: { health: 30, mana: 5, heroPower: { name: 'Ping', cost: 2, description: '' } }, heroPowerUsed: false },
      {},
    );
    expect(ai.shouldUseHeroPower(state)).toBe(false);
  });
});

describe('evaluateCardForFaction — Wei AI prioritizes spells', () => {
  it('gives bonus score to spell cards for Wei faction', () => {
    const spell = makeCard({ type: 'spell', attack: 0, health: 0, cost: 3 });
    const minion = makeCard({ type: 'minion', attack: 2, health: 2, cost: 3 });
    const weiPlayer = makePlayer({ deckFaction: 'wei', hasDeckFactionBonus: true });
    const neutralPlayer = makePlayer({ deckFaction: 'neutral' });

    const spellScoreWei = evaluateCardForFaction(spell, weiPlayer);
    const spellScoreNeutral = evaluateCardForFaction(spell, neutralPlayer);
    expect(spellScoreWei).toBeGreaterThan(spellScoreNeutral);
  });

  it('gives bonus for spellDamage cards for Wei faction', () => {
    const card = makeCard({ type: 'minion', attack: 1, health: 1, spellDamage: 2 });
    const weiPlayer = makePlayer({ deckFaction: 'wei' });
    const neutralPlayer = makePlayer({ deckFaction: 'neutral' });
    expect(evaluateCardForFaction(card, weiPlayer)).toBeGreaterThan(evaluateCardForFaction(card, neutralPlayer));
  });
});

describe('evaluateCardForFaction — Shu AI values Shu minions', () => {
  it('gives bonus to Shu faction minions for Shu player', () => {
    const shuMinion = makeCard({ type: 'minion', faction: 'shu', attack: 2, health: 2 });
    const neutralMinion = makeCard({ type: 'minion', faction: 'neutral', attack: 2, health: 2 });
    const shuPlayer = makePlayer({ deckFaction: 'shu' });
    expect(evaluateCardForFaction(shuMinion, shuPlayer)).toBeGreaterThan(evaluateCardForFaction(neutralMinion, shuPlayer));
  });

  it('does not give Shu bonus to spells even with Shu faction', () => {
    const shuSpell = makeCard({ type: 'spell', faction: 'shu', attack: 0, health: 0 });
    const shuPlayer = makePlayer({ deckFaction: 'shu' });
    const neutralPlayer = makePlayer({ deckFaction: 'neutral' });
    expect(evaluateCardForFaction(shuSpell, shuPlayer)).toBe(evaluateCardForFaction(shuSpell, neutralPlayer));
  });
});

describe('evaluateCardForFaction — Wu AI values cheap cards', () => {
  it('gives bonus to low-cost cards (cost <= 3) for Wu player', () => {
    const cheapCard = makeCard({ cost: 2, attack: 1, health: 1 });
    const expensiveCard = makeCard({ cost: 5, attack: 3, health: 3 });
    const wuPlayer = makePlayer({ deckFaction: 'wu' });
    const neutralPlayer = makePlayer({ deckFaction: 'neutral' });

    const cheapWuScore = evaluateCardForFaction(cheapCard, wuPlayer);
    const cheapNeutralScore = evaluateCardForFaction(cheapCard, neutralPlayer);
    expect(cheapWuScore).toBeGreaterThan(cheapNeutralScore);

    const expWuScore = evaluateCardForFaction(expensiveCard, wuPlayer);
    const expNeutralScore = evaluateCardForFaction(expensiveCard, neutralPlayer);
    expect(expWuScore).toBe(expNeutralScore);
  });
});

describe('evaluateCardForFaction — Qun AI values battlecry', () => {
  it('gives bonus to cards with battlecry for Qun player', () => {
    const bcCard = makeCard({ attack: 2, health: 2, battlecry: (s) => s });
    const noBcCard = makeCard({ attack: 2, health: 2 });
    const qunPlayer = makePlayer({ deckFaction: 'qun' });
    expect(evaluateCardForFaction(bcCard, qunPlayer)).toBeGreaterThan(evaluateCardForFaction(noBcCard, qunPlayer));
  });
});

describe('Shu AI placement — adjacency for Shu minions', () => {
  it('places Shu minion adjacent to existing Shu minion on board', () => {
    const shuMinion = makeCard({ type: 'minion', faction: 'shu', cost: 2, attack: 2, health: 2 });
    const state = makeGameState(
      {
        hand: [shuMinion],
        board: [
          makeMinion({ faction: 'neutral' }),
          makeMinion({ faction: 'shu' }),
          makeMinion({ faction: 'neutral' }),
        ],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
        deckFaction: 'shu',
        hasDeckFactionBonus: true,
      },
      {},
    );
    const decisions = getOnCurvePlayDecisions(state);
    expect(decisions.length).toBe(1);
    expect(decisions[0].boardPosition).toBeDefined();
    // Should be placed at position 1 or 2 (adjacent to the Shu minion at index 1)
    expect([1, 2]).toContain(decisions[0].boardPosition);
  });

  it('does not set boardPosition for non-Shu minion even with Shu deck', () => {
    const neutralMinion = makeCard({ type: 'minion', faction: 'neutral', cost: 2, attack: 2, health: 2 });
    const state = makeGameState(
      {
        hand: [neutralMinion],
        board: [makeMinion({ faction: 'shu' })],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
        deckFaction: 'shu',
        hasDeckFactionBonus: true,
      },
      {},
    );
    const decisions = getOnCurvePlayDecisions(state);
    expect(decisions.length).toBe(1);
    expect(decisions[0].boardPosition).toBeUndefined();
  });

  it('does not set boardPosition when board has no Shu minions', () => {
    const shuMinion = makeCard({ type: 'minion', faction: 'shu', cost: 2, attack: 2, health: 2 });
    const state = makeGameState(
      {
        hand: [shuMinion],
        board: [makeMinion({ faction: 'neutral' }), makeMinion({ faction: 'wei' })],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
        deckFaction: 'shu',
        hasDeckFactionBonus: true,
      },
      {},
    );
    const decisions = getOnCurvePlayDecisions(state);
    expect(decisions.length).toBe(1);
    expect(decisions[0].boardPosition).toBeUndefined();
  });
});

describe('Wu AI play ordering — chains plays by cost', () => {
  it('orders plays from cheapest to most expensive for Wu deck', () => {
    const state = makeGameState(
      {
        hand: [
          makeCard({ cost: 3, attack: 3, health: 3, faction: 'wu' }),
          makeCard({ cost: 1, attack: 1, health: 1, faction: 'wu' }),
          makeCard({ cost: 2, attack: 2, health: 2, faction: 'wu' }),
        ],
        hero: { health: 30, mana: 6, heroPower: { name: '', cost: 2, description: '' } },
        deckFaction: 'wu',
        hasDeckFactionBonus: true,
      },
      {},
    );
    const decisions = getOnCurvePlayDecisions(state);
    expect(decisions.length).toBe(3);
    const costs = decisions.map(d => state.players[0].hand[d.cardIndex].cost);
    for (let i = 1; i < costs.length; i++) {
      expect(costs[i]).toBeGreaterThanOrEqual(costs[i - 1]);
    }
  });

  it('non-Wu deck does not sort by ascending cost', () => {
    const state = makeGameState(
      {
        hand: [
          makeCard({ cost: 1, attack: 1, health: 1 }),
          makeCard({ cost: 3, attack: 3, health: 3 }),
        ],
        hero: { health: 30, mana: 4, heroPower: { name: '', cost: 2, description: '' } },
        deckFaction: 'neutral',
      },
      {},
    );
    const decisions = getOnCurvePlayDecisions(state);
    // Normal on-curve sorts descending (highest cost first)
    expect(decisions[0].cardIndex).toBe(1);
  });
});

describe('Wei AI play ordering — spells played last', () => {
  it('plays minions before spells for Wei deck', () => {
    const state = makeGameState(
      {
        hand: [
          makeCard({ cost: 2, type: 'spell', attack: 0, health: 0, faction: 'wei' }),
          makeCard({ cost: 2, type: 'minion', attack: 2, health: 2, faction: 'wei' }),
        ],
        hero: { health: 30, mana: 4, heroPower: { name: '', cost: 2, description: '' } },
        deckFaction: 'wei',
        hasDeckFactionBonus: true,
      },
      {},
    );
    const decisions = getOnCurvePlayDecisions(state);
    expect(decisions.length).toBe(2);
    expect(state.players[0].hand[decisions[0].cardIndex].type).toBe('minion');
    expect(state.players[0].hand[decisions[1].cardIndex].type).toBe('spell');
  });
});

describe('Faction-aware getBestManaUsage — synergy scoring', () => {
  it('prefers faction-synergistic cards when total mana is equal', () => {
    const shuMinion = makeCard({ cost: 2, attack: 2, health: 2, faction: 'shu' });
    const neutralMinion = makeCard({ cost: 2, attack: 2, health: 2, faction: 'neutral' });
    const hand = [shuMinion, neutralMinion];
    const board = [makeMinion({ faction: 'shu' })];
    const shuPlayer = makePlayer({ deckFaction: 'shu', hasDeckFactionBonus: true });
    const result = getBestManaUsage(hand, 2, board, shuPlayer);
    // Should pick the shu minion (index 0) for synergy
    expect(result).toEqual([0]);
  });
});

describe('Optimal play decisions with faction mechanics', () => {
  it('hard AI applies Shu board positions', () => {
    const state = makeGameState(
      {
        hand: [makeCard({ cost: 2, attack: 2, health: 2, faction: 'shu', type: 'minion' })],
        board: [makeMinion({ faction: 'shu' })],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
        deckFaction: 'shu',
        hasDeckFactionBonus: true,
      },
      {},
    );
    const decisions = getOptimalPlayDecisions(state);
    expect(decisions.length).toBe(1);
    expect(decisions[0].boardPosition).toBeDefined();
  });

  it('hard AI applies Wu play ordering', () => {
    const state = makeGameState(
      {
        hand: [
          makeCard({ cost: 3, attack: 3, health: 3, faction: 'wu' }),
          makeCard({ cost: 1, attack: 1, health: 1, faction: 'wu' }),
        ],
        hero: { health: 30, mana: 4, heroPower: { name: '', cost: 2, description: '' } },
        deckFaction: 'wu',
        hasDeckFactionBonus: true,
      },
      {},
    );
    const decisions = getOptimalPlayDecisions(state);
    expect(decisions.length).toBe(2);
    const costs = decisions.map(d => state.players[0].hand[d.cardIndex].cost);
    expect(costs[0]).toBeLessThanOrEqual(costs[1]);
  });
});

describe('AI responds within 2-second budget', () => {
  const difficulties: AIDifficulty[] = ['easy', 'normal', 'hard'];

  for (const d of difficulties) {
    it(`${d} AI completes all decisions within 2 seconds`, () => {
      const ai = createAI(d);
      const hand = Array.from({ length: 10 }, (_, i) => makeCard({ cost: (i % 5) + 1 }));
      const board = Array.from({ length: 7 }, () => makeMinion({ currentAttack: 3, currentHealth: 3 }));
      const oppBoard = Array.from({ length: 7 }, () => makeMinion({ currentAttack: 2, currentHealth: 4 }));
      const state = makeGameState(
        { hand, board, hero: { health: 30, mana: 10, heroPower: { name: 'Ping', cost: 2, description: '' } }, heroPowerUsed: false },
        { board: oppBoard, hero: { health: 30, mana: 0, heroPower: { name: '', cost: 2, description: '' } } },
      );

      const start = performance.now();
      ai.getPlayDecisions(state);
      ai.getAttackDecisions(state);
      ai.shouldUseHeroPower(state);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(2000);
    });
  }
});
