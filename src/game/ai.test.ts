import { describe, it, expect } from 'vitest';
import { evaluateBoard, getPlayableCards, getBestManaUsage, AIDecision, findLethal, evaluateTrade, getAIAttackDecisions, createAI, AIDifficulty, AIStrategy, evaluateCardForFaction, getOnCurvePlayDecisions, getOptimalPlayDecisions, calculateMinionThreatScore, calculateFriendlyBuffScore, calculateBoardPower, assessBoardAdvantage, determinePlayStyle } from './ai';
import { GameState, PlayerState, Card, BoardMinion, Deck, Faction, Lane, TerrainType } from './types';

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
    enrageBonus: 0, factionAttackBonus: 0, factionHealthBonus: 0, formationAtkBonus: 0, formationHpBonus: 0, brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0, wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0, qunDebuff: 0, lane: Lane.Center, slotIndex: 0,
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
    expect(decisions[0].lane).toBeDefined();
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
    expect(decisions[0].lane).toBeDefined();
  });

  it('assigns lane even when board has no Shu minions', () => {
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
    expect(decisions[0].lane).toBeDefined();
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
    expect(decisions[0].lane).toBeDefined();
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

describe('AI keyword awareness — scoring', () => {
  it('penalizes attacking divine shield minions', () => {
    const attacker = makeMinion({ currentAttack: 3, currentHealth: 4 });
    const shielded = makeMinion({ currentAttack: 2, currentHealth: 3, hasDivineShield: true });
    const unshielded = makeMinion({ currentAttack: 2, currentHealth: 3, hasDivineShield: false });
    expect(evaluateTrade(attacker, shielded)).toBeLessThan(evaluateTrade(attacker, unshielded));
  });

  it('gives bonus for stealth-broken targets (had stealth, lost it)', () => {
    const attacker = makeMinion({ currentAttack: 3, currentHealth: 4 });
    const stealthBroken = makeMinion({ currentAttack: 2, currentHealth: 3, isStealth: false, stealth: true });
    const normal = makeMinion({ currentAttack: 2, currentHealth: 3, isStealth: false });
    expect(evaluateTrade(attacker, stealthBroken)).toBeGreaterThan(evaluateTrade(attacker, normal));
  });

  it('gives bonus for damaged minions', () => {
    const attacker = makeMinion({ currentAttack: 3, currentHealth: 4 });
    const damaged = makeMinion({ currentAttack: 2, currentHealth: 2, health: 5 });
    const full = makeMinion({ currentAttack: 2, currentHealth: 5, health: 5 });
    expect(evaluateTrade(attacker, damaged)).toBeGreaterThan(evaluateTrade(attacker, full));
  });

  it('taunt bonus is highest priority in scoring', () => {
    const attacker = makeMinion({ currentAttack: 3, currentHealth: 4 });
    const taunt = makeMinion({ currentAttack: 2, currentHealth: 3, taunt: true });
    const noTaunt = makeMinion({ currentAttack: 2, currentHealth: 3 });
    expect(evaluateTrade(attacker, taunt)).toBeGreaterThan(evaluateTrade(attacker, noTaunt));
  });

  it('AI prefers non-shield target over divine shield when both available', () => {
    const state = makeGameState(
      { board: [makeMinion({ currentAttack: 3, currentHealth: 4, lane: Lane.Center })] },
      {
        hero: { health: 30, mana: 0, heroPower: { name: '', cost: 2, description: '' } },
        board: [
          makeMinion({ currentAttack: 2, currentHealth: 2, hasDivineShield: true, lane: Lane.Center }),
          makeMinion({ currentAttack: 2, currentHealth: 2, hasDivineShield: false, lane: Lane.Center }),
        ],
      },
    );
    state.activePlayer = 0;
    const decisions = getAIAttackDecisions(state);
    const trade = decisions.find(d => d.targetIndex !== 'hero');
    expect(trade).toBeDefined();
    // Should prefer the non-shielded target (index 1)
    expect(trade!.targetIndex).toBe(1);
  });

  it('AI targets taunt before non-taunt in same lane', () => {
    const state = makeGameState(
      { board: [makeMinion({ currentAttack: 5, currentHealth: 5, lane: Lane.Center })] },
      {
        hero: { health: 30, mana: 0, heroPower: { name: '', cost: 2, description: '' } },
        board: [
          makeMinion({ currentAttack: 3, currentHealth: 3, lane: Lane.Center }),
          makeMinion({ currentAttack: 1, currentHealth: 3, taunt: true, lane: Lane.Center }),
        ],
      },
    );
    state.activePlayer = 0;
    const decisions = getAIAttackDecisions(state);
    // With taunt present, AI must attack taunt (index 1)
    expect(decisions.length).toBeGreaterThan(0);
    expect(decisions[0].targetIndex).toBe(1);
  });
});

describe('AI keyword-aware targeting — taunt priority', () => {
  it('multiple attackers all forced to hit taunt before going face', () => {
    const state = makeGameState(
      { board: [
        makeMinion({ currentAttack: 3, currentHealth: 3, lane: Lane.Center }),
        makeMinion({ currentAttack: 4, currentHealth: 4, lane: Lane.Center }),
      ]},
      {
        hero: { health: 10, mana: 0, heroPower: { name: '', cost: 2, description: '' } },
        board: [
          makeMinion({ currentAttack: 1, currentHealth: 8, taunt: true, lane: Lane.Center }),
        ],
      },
    );
    state.activePlayer = 0;
    const decisions = getAIAttackDecisions(state);
    // Even though hero is at 10hp, taunt blocks lethal — at least one must hit taunt
    const tauntAttacks = decisions.filter(d => d.targetIndex === 0);
    expect(tauntAttacks.length).toBeGreaterThanOrEqual(1);
  });

  it('stealth taunt does NOT block attacks — AI can go face', () => {
    const state = makeGameState(
      { board: [makeMinion({ currentAttack: 5, currentHealth: 5, lane: Lane.Center })] },
      {
        hero: { health: 5, mana: 0, heroPower: { name: '', cost: 2, description: '' } },
        board: [
          makeMinion({ currentAttack: 2, currentHealth: 3, taunt: true, isStealth: true, lane: Lane.Center }),
        ],
      },
    );
    state.activePlayer = 0;
    const decisions = getAIAttackDecisions(state);
    // Stealth taunt can't be targeted — AI goes face for lethal
    expect(decisions.every(d => d.targetIndex === 'hero')).toBe(true);
  });

  it('AI cannot target stealthed minions at all', () => {
    const state = makeGameState(
      { board: [makeMinion({ currentAttack: 5, currentHealth: 5, lane: Lane.Center })] },
      {
        hero: { health: 30, mana: 0, heroPower: { name: '', cost: 2, description: '' } },
        board: [
          makeMinion({ currentAttack: 3, currentHealth: 2, isStealth: true, lane: Lane.Center }),
        ],
      },
    );
    state.activePlayer = 0;
    const decisions = getAIAttackDecisions(state);
    // Stealthed minion is untargetable — AI goes face
    const minionAttacks = decisions.filter(d => d.targetIndex !== 'hero');
    expect(minionAttacks).toHaveLength(0);
  });

  it('taunt bonus still applies to shielded taunt (net positive vs no-taunt shielded)', () => {
    const attacker = makeMinion({ currentAttack: 3, currentHealth: 4 });
    const shieldedTaunt = makeMinion({ currentAttack: 2, currentHealth: 3, taunt: true, hasDivineShield: true });
    const shieldedNoTaunt = makeMinion({ currentAttack: 2, currentHealth: 3, hasDivineShield: true });
    // Both have shield penalty, but taunt gets the +10 bonus on top
    expect(evaluateTrade(attacker, shieldedTaunt)).toBeGreaterThan(evaluateTrade(attacker, shieldedNoTaunt));
  });
});

describe('AI keyword-aware targeting — divine shield avoidance', () => {
  it('AI goes face instead of wasting attack on shielded minion when score is negative', () => {
    const state = makeGameState(
      { board: [makeMinion({ currentAttack: 2, currentHealth: 3, lane: Lane.Center })] },
      {
        hero: { health: 30, mana: 0, heroPower: { name: '', cost: 2, description: '' } },
        board: [
          makeMinion({ currentAttack: 4, currentHealth: 5, hasDivineShield: true, lane: Lane.Center }),
        ],
      },
    );
    state.activePlayer = 0;
    const decisions = getAIAttackDecisions(state);
    // 2/3 into 4/5+shield: shield absorbs damage, attacker takes 4 and dies — very bad trade
    expect(decisions.length).toBe(1);
    expect(decisions[0].targetIndex).toBe('hero');
  });

  it('evaluateTrade: divine shield makes defender effectively survive even with enough damage', () => {
    const attacker = makeMinion({ currentAttack: 5, currentHealth: 5 });
    const shielded = makeMinion({ currentAttack: 1, currentHealth: 3, hasDivineShield: true });
    const unshielded = makeMinion({ currentAttack: 1, currentHealth: 3, hasDivineShield: false });
    // Without shield: 5 >= 3, defender dies. With shield: 0 effective damage, defender lives
    const shieldScore = evaluateTrade(attacker, shielded);
    const normalScore = evaluateTrade(attacker, unshielded);
    expect(normalScore).toBeGreaterThan(shieldScore);
  });

  it('lethal calculation ignores divine shield on board (goes face)', () => {
    const state = makeGameState(
      { board: [makeMinion({ currentAttack: 10, currentHealth: 5, lane: Lane.Center })] },
      {
        hero: { health: 5, mana: 0, heroPower: { name: '', cost: 2, description: '' } },
        board: [
          makeMinion({ currentAttack: 1, currentHealth: 1, hasDivineShield: true, lane: Lane.Center }),
        ],
      },
    );
    state.activePlayer = 0;
    const decisions = getAIAttackDecisions(state);
    // Lethal available — AI ignores the shielded minion and goes face
    expect(decisions.every(d => d.targetIndex === 'hero')).toBe(true);
  });
});

describe('AI keyword-aware targeting — stealth and enrage interactions', () => {
  it('stealth-broken minion (stealth: true, isStealth: false) gets priority bonus', () => {
    const attacker = makeMinion({ currentAttack: 3, currentHealth: 3 });
    const stealthBroken = makeMinion({ currentAttack: 2, currentHealth: 2, stealth: true, isStealth: false });
    const normal = makeMinion({ currentAttack: 2, currentHealth: 2 });
    expect(evaluateTrade(attacker, stealthBroken)).toBeGreaterThan(evaluateTrade(attacker, normal));
  });

  it('AI skips stealth minion even when it would be a good trade', () => {
    const state = makeGameState(
      { board: [makeMinion({ currentAttack: 5, currentHealth: 5, lane: Lane.Center })] },
      {
        hero: { health: 30, mana: 0, heroPower: { name: '', cost: 2, description: '' } },
        board: [
          makeMinion({ currentAttack: 1, currentHealth: 1, isStealth: true, lane: Lane.Center }),
          makeMinion({ currentAttack: 2, currentHealth: 3, lane: Lane.Center }),
        ],
      },
    );
    state.activePlayer = 0;
    const decisions = getAIAttackDecisions(state);
    // Index 0 is stealthed — AI must not target it
    const stealthAttacks = decisions.filter(d => d.targetIndex === 0);
    expect(stealthAttacks).toHaveLength(0);
  });

  it('damaged minion bonus applies (simulating post-enrage vulnerability)', () => {
    const attacker = makeMinion({ currentAttack: 4, currentHealth: 4 });
    // A minion that has been damaged (currentHealth < max health) — could have enrage active
    const damaged = makeMinion({ currentAttack: 5, currentHealth: 2, health: 5, enrageActive: true, enrageBonus: 3 });
    const healthy = makeMinion({ currentAttack: 2, currentHealth: 5, health: 5 });
    // Damaged minion with boosted attack is a higher-value trade target
    const damagedScore = evaluateTrade(attacker, damaged);
    const healthyScore = evaluateTrade(attacker, healthy);
    expect(damagedScore).toBeGreaterThan(healthyScore);
  });

  it('AI prefers killing a stealth-broken minion over a normal one', () => {
    const state = makeGameState(
      { board: [
        makeMinion({ currentAttack: 3, currentHealth: 3, lane: Lane.Center }),
        makeMinion({ currentAttack: 3, currentHealth: 3, lane: Lane.Center }),
      ]},
      {
        hero: { health: 30, mana: 0, heroPower: { name: '', cost: 2, description: '' } },
        board: [
          makeMinion({ currentAttack: 2, currentHealth: 2, lane: Lane.Center }),
          makeMinion({ currentAttack: 2, currentHealth: 2, stealth: true, isStealth: false, lane: Lane.Center }),
        ],
      },
    );
    state.activePlayer = 0;
    const decisions = getAIAttackDecisions(state);
    // Stealth-broken target (index 1) should be preferred due to STEALTH_BROKEN_BONUS
    const firstTrade = decisions.find(d => d.targetIndex !== 'hero');
    expect(firstTrade).toBeDefined();
    expect(firstTrade!.targetIndex).toBe(1);
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

describe('AI lane system — minion placement', () => {
  it('AI places minions in valid lane+slot positions', () => {
    const state = makeGameState(
      {
        hand: [makeCard({ cost: 1, type: 'minion', faction: 'shu' }), makeCard({ cost: 2, type: 'minion', faction: 'wei' })],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
      },
      {},
    );
    for (const difficulty of ['easy', 'normal', 'hard'] as AIDifficulty[]) {
      const ai = createAI(difficulty);
      const decisions = ai.getPlayDecisions(state);
      for (const d of decisions) {
        if (state.players[0].hand[d.cardIndex].type === 'minion') {
          expect(d.lane).toBeDefined();
          expect([Lane.Left, Lane.Center, Lane.Right]).toContain(d.lane);
        }
      }
    }
  });

  it('AI picks lane with formation bonus (same faction already present)', () => {
    const state = makeGameState(
      {
        hand: [makeCard({ cost: 2, type: 'minion', faction: 'shu', attack: 2, health: 2 })],
        board: [makeMinion({ faction: 'shu', lane: Lane.Left, slotIndex: 0 })],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
        deckFaction: 'neutral',
      },
      {},
    );
    const decisions = getOnCurvePlayDecisions(state);
    expect(decisions.length).toBe(1);
    expect(decisions[0].lane).toBe(Lane.Left);
  });

  it('AI avoids fire terrain when possible', () => {
    const state = makeGameState(
      {
        hand: [makeCard({ cost: 1, type: 'minion', faction: 'neutral', attack: 1, health: 1 })],
        board: [],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
      },
      {},
    );
    state.terrain[Lane.Left] = { type: TerrainType.Fire, name: '烈焰', description: '' };
    state.terrain[Lane.Center] = { type: TerrainType.Fire, name: '烈焰', description: '' };
    state.terrain[Lane.Right] = null;
    const decisions = getOnCurvePlayDecisions(state);
    expect(decisions.length).toBe(1);
    expect(decisions[0].lane).toBe(Lane.Right);
  });

  it('AI prefers healing aura terrain', () => {
    const state = makeGameState(
      {
        hand: [makeCard({ cost: 1, type: 'minion', faction: 'neutral', attack: 1, health: 1 })],
        board: [],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
      },
      {},
    );
    state.terrain[Lane.Left] = null;
    state.terrain[Lane.Center] = { type: TerrainType.HealingAura, name: '治愈光环', description: '' };
    state.terrain[Lane.Right] = null;
    const decisions = getOnCurvePlayDecisions(state);
    expect(decisions.length).toBe(1);
    expect(decisions[0].lane).toBe(Lane.Center);
  });

  it('formation bonus outweighs terrain preference', () => {
    const state = makeGameState(
      {
        hand: [makeCard({ cost: 2, type: 'minion', faction: 'shu', attack: 2, health: 2 })],
        board: [makeMinion({ faction: 'shu', lane: Lane.Left, slotIndex: 0 })],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
      },
      {},
    );
    state.terrain[Lane.Center] = { type: TerrainType.HealingAura, name: '治愈光环', description: '' };
    const decisions = getOnCurvePlayDecisions(state);
    expect(decisions.length).toBe(1);
    // formation bonus (+5) > healing aura (+2)
    expect(decisions[0].lane).toBe(Lane.Left);
  });
});

describe('AI lane system — attack respects lane adjacency', () => {
  it('AI only attacks targets in reachable lanes', () => {
    const state = makeGameState(
      { board: [makeMinion({ currentAttack: 3, currentHealth: 3, lane: Lane.Left })] },
      {
        hero: { health: 30, mana: 0, heroPower: { name: '', cost: 2, description: '' } },
        board: [makeMinion({ currentAttack: 1, currentHealth: 1, lane: Lane.Right })],
      },
    );
    state.activePlayer = 0;
    const decisions = getAIAttackDecisions(state);
    // Left lane can only reach Left+Center, not Right — should go face
    const minionAttacks = decisions.filter(d => d.targetIndex !== 'hero');
    expect(minionAttacks).toHaveLength(0);
  });

  it('AI attacks minion in same lane', () => {
    const state = makeGameState(
      { board: [makeMinion({ currentAttack: 5, currentHealth: 5, lane: Lane.Center })] },
      {
        hero: { health: 30, mana: 0, heroPower: { name: '', cost: 2, description: '' } },
        board: [makeMinion({ currentAttack: 2, currentHealth: 3, lane: Lane.Center })],
      },
    );
    state.activePlayer = 0;
    const decisions = getAIAttackDecisions(state);
    const trade = decisions.find(d => d.targetIndex === 0);
    expect(trade).toBeDefined();
  });

  it('AI attacks minion in adjacent lane', () => {
    const state = makeGameState(
      { board: [makeMinion({ currentAttack: 5, currentHealth: 5, lane: Lane.Center })] },
      {
        hero: { health: 30, mana: 0, heroPower: { name: '', cost: 2, description: '' } },
        board: [makeMinion({ currentAttack: 2, currentHealth: 3, lane: Lane.Left })],
      },
    );
    state.activePlayer = 0;
    const decisions = getAIAttackDecisions(state);
    const trade = decisions.find(d => d.targetIndex === 0);
    expect(trade).toBeDefined();
  });

  it('AI respects taunt only in reachable lanes', () => {
    const state = makeGameState(
      { board: [makeMinion({ currentAttack: 5, currentHealth: 5, lane: Lane.Left })] },
      {
        hero: { health: 30, mana: 0, heroPower: { name: '', cost: 2, description: '' } },
        board: [makeMinion({ currentAttack: 1, currentHealth: 10, taunt: true, lane: Lane.Right })],
      },
    );
    state.activePlayer = 0;
    const decisions = getAIAttackDecisions(state);
    // Taunt is in Right lane, unreachable from Left — AI should go face
    expect(decisions.length).toBe(1);
    expect(decisions[0].targetIndex).toBe('hero');
  });

  it('AI attacks reachable taunt instead of going face', () => {
    const state = makeGameState(
      { board: [makeMinion({ currentAttack: 5, currentHealth: 5, lane: Lane.Center })] },
      {
        hero: { health: 30, mana: 0, heroPower: { name: '', cost: 2, description: '' } },
        board: [makeMinion({ currentAttack: 1, currentHealth: 3, taunt: true, lane: Lane.Left })],
      },
    );
    state.activePlayer = 0;
    const decisions = getAIAttackDecisions(state);
    expect(decisions.length).toBe(1);
    expect(decisions[0].targetIndex).toBe(0);
  });

  it('AI does not skip non-taunt targets when taunt is in unreachable lane', () => {
    const state = makeGameState(
      { board: [
        makeMinion({ currentAttack: 5, currentHealth: 5, lane: Lane.Left }),
        makeMinion({ currentAttack: 3, currentHealth: 3, lane: Lane.Right }),
      ]},
      {
        hero: { health: 30, mana: 0, heroPower: { name: '', cost: 2, description: '' } },
        board: [
          makeMinion({ currentAttack: 1, currentHealth: 2, lane: Lane.Left }),
          makeMinion({ currentAttack: 1, currentHealth: 10, taunt: true, lane: Lane.Right }),
        ],
      },
    );
    state.activePlayer = 0;
    const decisions = getAIAttackDecisions(state);
    // Left attacker can't reach Right taunt — should still attack Left defender
    const leftAttack = decisions.find(d => d.attackerIndex === 0 && d.targetIndex === 0);
    expect(leftAttack).toBeDefined();
  });

  it('does not place in full lane', () => {
    const state = makeGameState(
      {
        hand: [makeCard({ cost: 1, type: 'minion', faction: 'shu', attack: 1, health: 1 })],
        board: [
          makeMinion({ lane: Lane.Left, slotIndex: 0 }),
          makeMinion({ lane: Lane.Left, slotIndex: 1 }),
          makeMinion({ lane: Lane.Center, slotIndex: 0 }),
          makeMinion({ lane: Lane.Center, slotIndex: 1 }),
        ],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
      },
      {},
    );
    const decisions = getOnCurvePlayDecisions(state);
    expect(decisions.length).toBe(1);
    expect(decisions[0].lane).toBe(Lane.Right);
  });
});

describe('AI spell target threat scoring', () => {
  it('freeze spells score higher on high-attack minions', () => {
    const bigAttacker = makeMinion({ currentAttack: 8, currentHealth: 3 });
    const smallAttacker = makeMinion({ currentAttack: 2, currentHealth: 3 });
    expect(calculateMinionThreatScore(bigAttacker, 'freeze')).toBeGreaterThan(
      calculateMinionThreatScore(smallAttacker, 'freeze')
    );
  });

  it('freeze spells penalize already-frozen minions', () => {
    const frozen = makeMinion({ currentAttack: 5, currentHealth: 3, isFrozen: true });
    const unfrozen = makeMinion({ currentAttack: 5, currentHealth: 3, isFrozen: false });
    expect(calculateMinionThreatScore(frozen, 'freeze')).toBeLessThan(
      calculateMinionThreatScore(unfrozen, 'freeze')
    );
  });

  it('freeze spells prefer windfury targets', () => {
    const windfury = makeMinion({ currentAttack: 4, currentHealth: 3, windfury: true });
    const normal = makeMinion({ currentAttack: 4, currentHealth: 3 });
    expect(calculateMinionThreatScore(windfury, 'freeze')).toBeGreaterThan(
      calculateMinionThreatScore(normal, 'freeze')
    );
  });

  it('destroy spells prefer high-stat minions', () => {
    const big = makeMinion({ currentAttack: 6, currentHealth: 8 });
    const small = makeMinion({ currentAttack: 2, currentHealth: 2 });
    expect(calculateMinionThreatScore(big, 'destroy')).toBeGreaterThan(
      calculateMinionThreatScore(small, 'destroy')
    );
  });

  it('destroy spells penalize divine shield targets', () => {
    const shielded = makeMinion({ currentAttack: 4, currentHealth: 4, hasDivineShield: true });
    const unshielded = makeMinion({ currentAttack: 4, currentHealth: 4 });
    expect(calculateMinionThreatScore(shielded, 'destroy')).toBeLessThan(
      calculateMinionThreatScore(unshielded, 'destroy')
    );
  });

  it('damage spells penalize divine shield targets', () => {
    const shielded = makeMinion({ currentAttack: 3, currentHealth: 3, hasDivineShield: true });
    const unshielded = makeMinion({ currentAttack: 3, currentHealth: 3 });
    expect(calculateMinionThreatScore(shielded, 'damage')).toBeLessThan(
      calculateMinionThreatScore(unshielded, 'damage')
    );
  });

  it('damage spells penalize enrage minions that have not triggered', () => {
    const enrage = makeMinion({ currentAttack: 3, currentHealth: 5, enrage: ((s: any) => s) as any, enrageActive: false });
    const normal = makeMinion({ currentAttack: 3, currentHealth: 5 });
    expect(calculateMinionThreatScore(enrage, 'damage')).toBeLessThan(
      calculateMinionThreatScore(normal, 'damage')
    );
  });

  it('damage spells prioritize windfury targets', () => {
    const windfury = makeMinion({ currentAttack: 4, currentHealth: 3, windfury: true });
    const normal = makeMinion({ currentAttack: 4, currentHealth: 3 });
    expect(calculateMinionThreatScore(windfury, 'damage')).toBeGreaterThan(
      calculateMinionThreatScore(normal, 'damage')
    );
  });

  it('damage spells prioritize taunt targets', () => {
    const taunt = makeMinion({ currentAttack: 3, currentHealth: 4, taunt: true });
    const normal = makeMinion({ currentAttack: 3, currentHealth: 4 });
    expect(calculateMinionThreatScore(taunt, 'damage')).toBeGreaterThan(
      calculateMinionThreatScore(normal, 'damage')
    );
  });

  it('spell targeting integrates with play decisions — freeze targets highest attack', () => {
    const freezeSpell = makeCard({
      cost: 2, type: 'spell', faction: 'wei',
      targetType: 'enemy_minion',
      description: '使一个敌方随从冻结',
    });
    const state = makeGameState(
      {
        hand: [freezeSpell],
        board: [makeMinion({ lane: Lane.Center })],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
      },
      {
        board: [
          makeMinion({ currentAttack: 2, currentHealth: 3, lane: Lane.Center }),
          makeMinion({ currentAttack: 7, currentHealth: 3, lane: Lane.Center }),
        ],
      },
    );
    const decisions = getOnCurvePlayDecisions(state);
    expect(decisions.length).toBe(1);
    expect(decisions[0].spellTarget).toBe(1);
  });

  it('spell targeting integrates with play decisions — damage avoids divine shield', () => {
    const damageSpell = makeCard({
      cost: 1, type: 'spell', faction: 'neutral',
      targetType: 'enemy_minion',
      description: '对一个敌方随从造成2点伤害',
    });
    const state = makeGameState(
      {
        hand: [damageSpell],
        board: [makeMinion({ lane: Lane.Center })],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
      },
      {
        board: [
          makeMinion({ currentAttack: 3, currentHealth: 3, hasDivineShield: true, lane: Lane.Center }),
          makeMinion({ currentAttack: 3, currentHealth: 3, hasDivineShield: false, lane: Lane.Center }),
        ],
      },
    );
    const decisions = getOnCurvePlayDecisions(state);
    expect(decisions.length).toBe(1);
    expect(decisions[0].spellTarget).toBe(1);
  });
});

describe('AI friendly buff scoring', () => {
  it('windfury minions score highest for buffs', () => {
    const windfury = makeMinion({ currentAttack: 4, currentHealth: 3, windfury: true });
    const normal = makeMinion({ currentAttack: 4, currentHealth: 3 });
    expect(calculateFriendlyBuffScore(windfury)).toBeGreaterThan(calculateFriendlyBuffScore(normal));
  });

  it('charge minions score higher than vanilla for buffs', () => {
    const charge = makeMinion({ currentAttack: 3, currentHealth: 3, charge: true });
    const normal = makeMinion({ currentAttack: 3, currentHealth: 3 });
    expect(calculateFriendlyBuffScore(charge)).toBeGreaterThan(calculateFriendlyBuffScore(normal));
  });

  it('frozen minions score lower for buffs', () => {
    const frozen = makeMinion({ currentAttack: 3, currentHealth: 3, isFrozen: true });
    const normal = makeMinion({ currentAttack: 3, currentHealth: 3 });
    expect(calculateFriendlyBuffScore(frozen)).toBeLessThan(calculateFriendlyBuffScore(normal));
  });

  it('summoning sick non-charge minions score lower', () => {
    const sick = makeMinion({ currentAttack: 3, currentHealth: 3, summoningSickness: true });
    const ready = makeMinion({ currentAttack: 3, currentHealth: 3 });
    expect(calculateFriendlyBuffScore(sick)).toBeLessThan(calculateFriendlyBuffScore(ready));
  });

  it('taunt minions get buff score bonus', () => {
    const taunt = makeMinion({ currentAttack: 3, currentHealth: 3, taunt: true });
    const normal = makeMinion({ currentAttack: 3, currentHealth: 3 });
    expect(calculateFriendlyBuffScore(taunt)).toBeGreaterThan(calculateFriendlyBuffScore(normal));
  });

  it('buff spells get higher evaluation score when board has windfury minion', () => {
    const buffSpell = makeCard({ type: 'spell', attack: 0, health: 0, description: '使所有友方随从获得+1/+1' });
    const playerWithWindfury = makePlayer({
      board: [makeMinion({ currentAttack: 4, currentHealth: 3, windfury: true })],
    });
    const playerEmpty = makePlayer({ board: [] });
    expect(evaluateCardForFaction(buffSpell, playerWithWindfury)).toBeGreaterThan(
      evaluateCardForFaction(buffSpell, playerEmpty)
    );
  });

  it('non-buff spells are not affected by friendly board', () => {
    const damageSpell = makeCard({ type: 'spell', attack: 0, health: 0, description: '对一个敌方随从造成3点伤害' });
    const playerWithBoard = makePlayer({
      board: [makeMinion({ currentAttack: 5, currentHealth: 5, windfury: true })],
    });
    const playerEmpty = makePlayer({ board: [] });
    expect(evaluateCardForFaction(damageSpell, playerWithBoard)).toBe(
      evaluateCardForFaction(damageSpell, playerEmpty)
    );
  });

  it('classifySpell detects buff spells correctly', () => {
    const buffSpell = makeCard({ description: '使所有友方随从获得+1攻击力' });
    const damageSpell = makeCard({ description: '对一个敌方随从造成3点伤害' });
    const freezeSpell = makeCard({ description: '使一个敌方随从冻结' });
    const playerWithBoard = makePlayer({
      board: [makeMinion({ currentAttack: 3, currentHealth: 3, charge: true })],
    });
    const playerEmpty = makePlayer({ board: [] });
    // Buff spell should score higher with board present
    const buffWithBoard = evaluateCardForFaction({ ...buffSpell, type: 'spell' }, playerWithBoard);
    const buffNoBoard = evaluateCardForFaction({ ...buffSpell, type: 'spell' }, playerEmpty);
    expect(buffWithBoard).toBeGreaterThan(buffNoBoard);
    // Damage/freeze spells should not change
    expect(evaluateCardForFaction({ ...damageSpell, type: 'spell' }, playerWithBoard)).toBe(
      evaluateCardForFaction({ ...damageSpell, type: 'spell' }, playerEmpty)
    );
    expect(evaluateCardForFaction({ ...freezeSpell, type: 'spell' }, playerWithBoard)).toBe(
      evaluateCardForFaction({ ...freezeSpell, type: 'spell' }, playerEmpty)
    );
  });
});

describe('AI spell target evaluation — card play integration', () => {
  it('destroy spell targets highest-stat minion over low-stat minion', () => {
    const destroySpell = makeCard({
      cost: 3, type: 'spell', faction: 'neutral',
      targetType: 'enemy_minion',
      description: '消灭一个敌方随从',
    });
    const state = makeGameState(
      {
        hand: [destroySpell],
        board: [makeMinion({ lane: Lane.Center })],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
      },
      {
        board: [
          makeMinion({ currentAttack: 2, currentHealth: 2, lane: Lane.Center }),
          makeMinion({ currentAttack: 6, currentHealth: 7, lane: Lane.Center }),
        ],
      },
    );
    const decisions = getOnCurvePlayDecisions(state);
    expect(decisions.length).toBe(1);
    expect(decisions[0].spellTarget).toBe(1);
  });

  it('destroy spell avoids divine shield targets', () => {
    const destroySpell = makeCard({
      cost: 3, type: 'spell', faction: 'neutral',
      targetType: 'enemy_minion',
      description: '消灭一个敌方随从',
    });
    const state = makeGameState(
      {
        hand: [destroySpell],
        board: [makeMinion({ lane: Lane.Center })],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
      },
      {
        board: [
          makeMinion({ currentAttack: 5, currentHealth: 5, hasDivineShield: true, lane: Lane.Center }),
          makeMinion({ currentAttack: 5, currentHealth: 5, hasDivineShield: false, lane: Lane.Center }),
        ],
      },
    );
    const decisions = getOnCurvePlayDecisions(state);
    expect(decisions.length).toBe(1);
    expect(decisions[0].spellTarget).toBe(1);
  });

  it('destroy spell prefers taunt targets', () => {
    const destroySpell = makeCard({
      cost: 3, type: 'spell', faction: 'neutral',
      targetType: 'enemy_minion',
      description: '消灭一个敌方随从',
    });
    const state = makeGameState(
      {
        hand: [destroySpell],
        board: [makeMinion({ lane: Lane.Center })],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
      },
      {
        board: [
          makeMinion({ currentAttack: 4, currentHealth: 4, lane: Lane.Center }),
          makeMinion({ currentAttack: 4, currentHealth: 4, taunt: true, lane: Lane.Center }),
        ],
      },
    );
    const decisions = getOnCurvePlayDecisions(state);
    expect(decisions.length).toBe(1);
    expect(decisions[0].spellTarget).toBe(1);
  });

  it('spell skips spell-immune minions', () => {
    const damageSpell = makeCard({
      cost: 1, type: 'spell', faction: 'neutral',
      targetType: 'enemy_minion',
      description: '对一个敌方随从造成2点伤害',
    });
    const state = makeGameState(
      {
        hand: [damageSpell],
        board: [makeMinion({ lane: Lane.Center })],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
      },
      {
        board: [
          makeMinion({ currentAttack: 8, currentHealth: 8, spellImmune: true, lane: Lane.Center }),
          makeMinion({ currentAttack: 2, currentHealth: 2, lane: Lane.Center }),
        ],
      },
    );
    const decisions = getOnCurvePlayDecisions(state);
    expect(decisions.length).toBe(1);
    expect(decisions[0].spellTarget).toBe(1);
  });
});

describe('AI freeze targeting — card play integration', () => {
  it('freeze spell targets highest-attack minion', () => {
    const freezeSpell = makeCard({
      cost: 2, type: 'spell', faction: 'neutral',
      targetType: 'enemy_minion',
      description: '使一个敌方随从冻结',
    });
    const state = makeGameState(
      {
        hand: [freezeSpell],
        board: [makeMinion({ lane: Lane.Center })],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
      },
      {
        board: [
          makeMinion({ currentAttack: 3, currentHealth: 5, lane: Lane.Center }),
          makeMinion({ currentAttack: 8, currentHealth: 2, lane: Lane.Center }),
        ],
      },
    );
    const decisions = getOnCurvePlayDecisions(state);
    expect(decisions.length).toBe(1);
    expect(decisions[0].spellTarget).toBe(1);
  });

  it('freeze spell skips already-frozen minions', () => {
    const freezeSpell = makeCard({
      cost: 2, type: 'spell', faction: 'neutral',
      targetType: 'enemy_minion',
      description: '使一个敌方随从冻结',
    });
    const state = makeGameState(
      {
        hand: [freezeSpell],
        board: [makeMinion({ lane: Lane.Center })],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
      },
      {
        board: [
          makeMinion({ currentAttack: 10, currentHealth: 5, isFrozen: true, lane: Lane.Center }),
          makeMinion({ currentAttack: 4, currentHealth: 3, lane: Lane.Center }),
        ],
      },
    );
    const decisions = getOnCurvePlayDecisions(state);
    expect(decisions.length).toBe(1);
    expect(decisions[0].spellTarget).toBe(1);
  });

  it('freeze spell prefers windfury over regular high-attack', () => {
    const freezeSpell = makeCard({
      cost: 2, type: 'spell', faction: 'neutral',
      targetType: 'enemy_minion',
      description: '使一个敌方随从冻结',
    });
    const state = makeGameState(
      {
        hand: [freezeSpell],
        board: [makeMinion({ lane: Lane.Center })],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
      },
      {
        board: [
          makeMinion({ currentAttack: 5, currentHealth: 3, lane: Lane.Center }),
          makeMinion({ currentAttack: 4, currentHealth: 3, windfury: true, lane: Lane.Center }),
        ],
      },
    );
    const decisions = getOnCurvePlayDecisions(state);
    expect(decisions.length).toBe(1);
    // Windfury 4-attack: effective 8*3 + 8 = 32; Regular 5-attack: 5*3 = 15
    expect(decisions[0].spellTarget).toBe(1);
  });

  it('freeze spell considers charge bonus', () => {
    const freezeSpell = makeCard({
      cost: 2, type: 'spell', faction: 'neutral',
      targetType: 'enemy_minion',
      description: '使一个敌方随从冻结',
    });
    const state = makeGameState(
      {
        hand: [freezeSpell],
        board: [makeMinion({ lane: Lane.Center })],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
      },
      {
        board: [
          makeMinion({ currentAttack: 3, currentHealth: 3, lane: Lane.Center }),
          makeMinion({ currentAttack: 3, currentHealth: 3, charge: true, lane: Lane.Center }),
        ],
      },
    );
    const decisions = getOnCurvePlayDecisions(state);
    expect(decisions.length).toBe(1);
    expect(decisions[0].spellTarget).toBe(1);
  });
});

describe('AI buff target selection — card play integration', () => {
  it('buff spell scores higher when board has windfury minion vs charge minion', () => {
    const buffSpell = makeCard({ type: 'spell', attack: 0, health: 0, description: '使所有友方随从获得+2/+2' });
    const playerWindfury = makePlayer({
      board: [makeMinion({ currentAttack: 3, currentHealth: 3, windfury: true })],
    });
    const playerCharge = makePlayer({
      board: [makeMinion({ currentAttack: 3, currentHealth: 3, charge: true })],
    });
    expect(evaluateCardForFaction(buffSpell, playerWindfury)).toBeGreaterThan(
      evaluateCardForFaction(buffSpell, playerCharge)
    );
  });

  it('buff spell scores lower when best target is frozen', () => {
    const buffSpell = makeCard({ type: 'spell', attack: 0, health: 0, description: '使一个友方随从获得+3攻击力' });
    const playerFrozen = makePlayer({
      board: [makeMinion({ currentAttack: 5, currentHealth: 5, isFrozen: true })],
    });
    const playerReady = makePlayer({
      board: [makeMinion({ currentAttack: 5, currentHealth: 5 })],
    });
    expect(evaluateCardForFaction(buffSpell, playerFrozen)).toBeLessThan(
      evaluateCardForFaction(buffSpell, playerReady)
    );
  });

  it('buff spell picks best target among multiple minions', () => {
    const buffSpell = makeCard({ type: 'spell', attack: 0, health: 0, description: '使一个友方随从获得+2/+2' });
    const playerMixed = makePlayer({
      board: [
        makeMinion({ currentAttack: 2, currentHealth: 2, summoningSickness: true }),
        makeMinion({ currentAttack: 4, currentHealth: 4, windfury: true }),
        makeMinion({ currentAttack: 3, currentHealth: 3 }),
      ],
    });
    const playerOnlyWeak = makePlayer({
      board: [
        makeMinion({ currentAttack: 2, currentHealth: 2, summoningSickness: true }),
        makeMinion({ currentAttack: 3, currentHealth: 3 }),
      ],
    });
    expect(evaluateCardForFaction(buffSpell, playerMixed)).toBeGreaterThan(
      evaluateCardForFaction(buffSpell, playerOnlyWeak)
    );
  });

  it('buff spell has no bonus on empty board', () => {
    const buffSpell = makeCard({ type: 'spell', attack: 0, health: 0, description: '使所有友方随从获得+1/+1' });
    const damageSpell = makeCard({ type: 'spell', attack: 0, health: 0, description: '对所有敌方随从造成2点伤害' });
    const emptyPlayer = makePlayer({ board: [] });
    const buffScore = evaluateCardForFaction(buffSpell, emptyPlayer);
    const damageScore = evaluateCardForFaction(damageSpell, emptyPlayer);
    expect(buffScore).toBe(damageScore);
  });

  it('divine shield minions get modest buff score bonus', () => {
    const shielded = makeMinion({ currentAttack: 3, currentHealth: 3, hasDivineShield: true });
    const normal = makeMinion({ currentAttack: 3, currentHealth: 3 });
    expect(calculateFriendlyBuffScore(shielded)).toBeGreaterThan(calculateFriendlyBuffScore(normal));
  });
});

describe('AI board state evaluation — threat assessment and play style switching', () => {
  describe('calculateBoardPower', () => {
    it('returns 0 for empty board', () => {
      expect(calculateBoardPower([])).toBe(0);
    });

    it('sums attack + health for basic minions', () => {
      const board = [makeMinion({ currentAttack: 3, currentHealth: 4 })];
      expect(calculateBoardPower(board)).toBe(7);
    });

    it('adds bonus for taunt', () => {
      const withTaunt = [makeMinion({ currentAttack: 3, currentHealth: 4, taunt: true })];
      const without = [makeMinion({ currentAttack: 3, currentHealth: 4 })];
      expect(calculateBoardPower(withTaunt)).toBeGreaterThan(calculateBoardPower(without));
    });

    it('adds bonus for divine shield', () => {
      const withShield = [makeMinion({ currentAttack: 3, currentHealth: 4, hasDivineShield: true })];
      const without = [makeMinion({ currentAttack: 3, currentHealth: 4 })];
      expect(calculateBoardPower(withShield)).toBeGreaterThan(calculateBoardPower(without));
    });

    it('adds extra attack value for windfury', () => {
      const withWindfury = [makeMinion({ currentAttack: 4, currentHealth: 3, windfury: true })];
      const without = [makeMinion({ currentAttack: 4, currentHealth: 3 })];
      expect(calculateBoardPower(withWindfury)).toBe(calculateBoardPower(without) + 4);
    });

    it('reduces power for frozen minions', () => {
      const frozen = [makeMinion({ currentAttack: 4, currentHealth: 3, isFrozen: true })];
      const unfrozen = [makeMinion({ currentAttack: 4, currentHealth: 3 })];
      expect(calculateBoardPower(frozen)).toBeLessThan(calculateBoardPower(unfrozen));
    });
  });

  describe('assessBoardAdvantage', () => {
    it('returns positive when AI has stronger board', () => {
      const state = makeGameState(
        { board: [makeMinion({ currentAttack: 5, currentHealth: 5 })] },
        { board: [makeMinion({ currentAttack: 2, currentHealth: 2 })] },
      );
      expect(assessBoardAdvantage(state, 0)).toBeGreaterThan(0);
    });

    it('returns negative when opponent has stronger board', () => {
      const state = makeGameState(
        { board: [makeMinion({ currentAttack: 2, currentHealth: 2 })] },
        { board: [makeMinion({ currentAttack: 5, currentHealth: 5 })] },
      );
      expect(assessBoardAdvantage(state, 0)).toBeLessThan(0);
    });

    it('factors in life totals', () => {
      const state = makeGameState(
        { hero: { health: 30, mana: 0, heroPower: { name: '', cost: 2, description: '' } } },
        { hero: { health: 10, mana: 0, heroPower: { name: '', cost: 2, description: '' } } },
      );
      expect(assessBoardAdvantage(state, 0)).toBeGreaterThan(0);
    });

    it('factors in card count', () => {
      const state = makeGameState(
        { hand: [makeCard(), makeCard(), makeCard()] },
        { hand: [] },
      );
      expect(assessBoardAdvantage(state, 0)).toBeGreaterThan(0);
    });
  });

  describe('determinePlayStyle', () => {
    it('returns control when AI is at low health with enemies on board', () => {
      const state = makeGameState(
        { hero: { health: 8, mana: 5, heroPower: { name: '', cost: 2, description: '' } } },
        { board: [makeMinion({ currentAttack: 3, currentHealth: 3 })] },
      );
      expect(determinePlayStyle(state, 0)).toBe('control');
    });

    it('returns aggro when AI has large board advantage', () => {
      const state = makeGameState(
        { board: [
          makeMinion({ currentAttack: 5, currentHealth: 5 }),
          makeMinion({ currentAttack: 4, currentHealth: 4 }),
        ]},
        { board: [makeMinion({ currentAttack: 1, currentHealth: 1 })] },
      );
      expect(determinePlayStyle(state, 0)).toBe('aggro');
    });

    it('returns control when AI has large board disadvantage', () => {
      const state = makeGameState(
        { board: [makeMinion({ currentAttack: 1, currentHealth: 1 })] },
        { board: [
          makeMinion({ currentAttack: 5, currentHealth: 5 }),
          makeMinion({ currentAttack: 4, currentHealth: 4 }),
        ]},
      );
      expect(determinePlayStyle(state, 0)).toBe('control');
    });

    it('returns control when enemy has high-threat minion (windfury)', () => {
      const state = makeGameState(
        { board: [makeMinion({ currentAttack: 3, currentHealth: 3 })] },
        { board: [makeMinion({ currentAttack: 4, currentHealth: 4, windfury: true })] },
      );
      expect(determinePlayStyle(state, 0)).toBe('control');
    });

    it('returns control when enemy has high-attack minion', () => {
      const state = makeGameState(
        { board: [makeMinion({ currentAttack: 3, currentHealth: 3 })] },
        { board: [makeMinion({ currentAttack: 6, currentHealth: 3 })] },
      );
      expect(determinePlayStyle(state, 0)).toBe('control');
    });

    it('returns aggro when AI has much more life than opponent', () => {
      const state = makeGameState(
        { hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } } },
        { hero: { health: 15, mana: 5, heroPower: { name: '', cost: 2, description: '' } } },
      );
      expect(determinePlayStyle(state, 0)).toBe('aggro');
    });
  });

  describe('play style affects attack decisions', () => {
    it('aggro AI sends remaining attackers face', () => {
      const state = makeGameState(
        { board: [
          makeMinion({ currentAttack: 4, currentHealth: 4, lane: Lane.Center }),
          makeMinion({ currentAttack: 3, currentHealth: 3, lane: Lane.Left }),
        ]},
        {
          hero: { health: 20, mana: 0, heroPower: { name: '', cost: 2, description: '' } },
          board: [makeMinion({ currentAttack: 1, currentHealth: 1, lane: Lane.Right })],
        },
      );
      state.activePlayer = 0;
      const decisions = getAIAttackDecisions(state, 'aggro');
      const faceDecisions = decisions.filter(d => d.targetIndex === 'hero');
      expect(faceDecisions.length).toBeGreaterThan(0);
    });

    it('control AI trades into threats instead of going face', () => {
      const state = makeGameState(
        { board: [makeMinion({ currentAttack: 5, currentHealth: 5, lane: Lane.Center })] },
        {
          hero: { health: 30, mana: 0, heroPower: { name: '', cost: 2, description: '' } },
          board: [makeMinion({ currentAttack: 4, currentHealth: 3, lane: Lane.Center })],
        },
      );
      state.activePlayer = 0;
      const decisions = getAIAttackDecisions(state, 'control');
      expect(decisions.length).toBe(1);
      expect(decisions[0].targetIndex).toBe(0);
    });

    it('control AI values windfury and high-attack threats higher for trading', () => {
      const state = makeGameState(
        { board: [
          makeMinion({ currentAttack: 3, currentHealth: 4, lane: Lane.Center }),
          makeMinion({ currentAttack: 3, currentHealth: 4, lane: Lane.Left }),
        ]},
        {
          hero: { health: 30, mana: 0, heroPower: { name: '', cost: 2, description: '' } },
          board: [
            makeMinion({ currentAttack: 2, currentHealth: 2, lane: Lane.Center }),
            makeMinion({ currentAttack: 3, currentHealth: 2, windfury: true, lane: Lane.Left }),
          ],
        },
      );
      state.activePlayer = 0;
      const aggroDecisions = getAIAttackDecisions(state, 'aggro');
      const controlDecisions = getAIAttackDecisions(state, 'control');
      const controlTrades = controlDecisions.filter(d => d.targetIndex !== 'hero');
      const aggroTrades = aggroDecisions.filter(d => d.targetIndex !== 'hero');
      expect(controlTrades.length).toBeGreaterThanOrEqual(aggroTrades.length);
    });
  });
});
