import { describe, it, expect } from 'vitest';
import { createAI, AIDifficulty, getOptimalPlayDecisions, getOnCurvePlayDecisions, buildFactionDeck, performAIMulligan, applyAIBonusCard } from './ai';
import { GameState, PlayerState, Card, BoardMinion, Deck, Faction, Lane, MAX_DECK_SIZE } from './types';
import { cards } from './cards';

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

describe('AI behavior differences across difficulties', () => {
  describe('createAI returns correct difficulty strategies', () => {
    it('easy AI has difficulty easy', () => {
      expect(createAI('easy').difficulty).toBe('easy');
    });

    it('normal AI has difficulty normal', () => {
      expect(createAI('normal').difficulty).toBe('normal');
    });

    it('hard AI has difficulty hard', () => {
      expect(createAI('hard').difficulty).toBe('hard');
    });
  });

  describe('mulligan behavior scales with difficulty', () => {
    const expensiveHand: Card[] = [
      makeCard({ cost: 5 }),
      makeCard({ cost: 6 }),
      makeCard({ cost: 2 }),
    ];

    it('easy AI never mulligans', () => {
      const ai = createAI('easy');
      expect(ai.mulliganHand(expensiveHand)).toHaveLength(0);
    });

    it('normal AI mulligans cards costing >4', () => {
      const ai = createAI('normal');
      const toReplace = ai.mulliganHand(expensiveHand);
      expect(toReplace).toContain(0);
      expect(toReplace).toContain(1);
      expect(toReplace).not.toContain(2);
    });

    it('hard AI mulligans more aggressively (>3 cost)', () => {
      const hand: Card[] = [
        makeCard({ cost: 4 }),
        makeCard({ cost: 2 }),
        makeCard({ cost: 3 }),
      ];
      const hardAI = createAI('hard');
      const normalAI = createAI('normal');
      const hardReplace = hardAI.mulliganHand(hand);
      const normalReplace = normalAI.mulliganHand(hand);
      expect(hardReplace.length).toBeGreaterThanOrEqual(normalReplace.length);
      expect(hardReplace).toContain(0);
    });

    it('hard AI keeps 2-drops and mulligans 3-drops without a 2-drop', () => {
      const handNo2Drop: Card[] = [
        makeCard({ cost: 3 }),
        makeCard({ cost: 3 }),
        makeCard({ cost: 1 }),
      ];
      const ai = createAI('hard');
      const toReplace = ai.mulliganHand(handNo2Drop);
      expect(toReplace).toContain(0);
      expect(toReplace).toContain(1);
    });

    it('hard AI keeps 3-drop when hand has a 2-drop', () => {
      const handWith2Drop: Card[] = [
        makeCard({ cost: 2 }),
        makeCard({ cost: 3 }),
        makeCard({ cost: 1 }),
      ];
      const ai = createAI('hard');
      const toReplace = ai.mulliganHand(handWith2Drop);
      expect(toReplace).not.toContain(1);
    });
  });

  describe('bonus card scaling', () => {
    it('easy AI does not get bonus card', () => {
      expect(createAI('easy').shouldGetBonusCard()).toBe(false);
    });

    it('normal AI does not get bonus card', () => {
      expect(createAI('normal').shouldGetBonusCard()).toBe(false);
    });

    it('hard AI gets bonus card', () => {
      expect(createAI('hard').shouldGetBonusCard()).toBe(true);
    });

    it('applyAIBonusCard gives hard AI an extra card', () => {
      const state = makeGameState();
      state.players[1] = makePlayer({
        hand: [makeCard()],
        deck: [makeCard({ name: 'Bonus' }), makeCard()] as unknown as Deck,
      });
      applyAIBonusCard(state, 'hard');
      expect(state.players[1].hand).toHaveLength(2);
    });

    it('applyAIBonusCard does not give easy AI an extra card', () => {
      const state = makeGameState();
      state.players[1] = makePlayer({
        hand: [makeCard()],
        deck: [makeCard({ name: 'Bonus' }), makeCard()] as unknown as Deck,
      });
      applyAIBonusCard(state, 'easy');
      expect(state.players[1].hand).toHaveLength(1);
    });
  });

  describe('hero power usage scales with difficulty', () => {
    it('easy AI uses hero power only ~30% of the time', () => {
      const ai = createAI('easy');
      let usedCount = 0;
      const trials = 1000;
      const state = makeGameState({ hero: { health: 30, mana: 5, heroPower: { name: 'HP', cost: 2, description: '' } } });
      for (let i = 0; i < trials; i++) {
        if (ai.shouldUseHeroPower(state)) usedCount++;
      }
      const rate = usedCount / trials;
      expect(rate).toBeGreaterThan(0.05);
      expect(rate).toBeLessThan(0.30);
    });

    it('normal AI always uses hero power when affordable', () => {
      const ai = createAI('normal');
      const state = makeGameState({
        hero: { health: 30, mana: 5, heroPower: { name: 'HP', cost: 2, description: '' } },
        heroPowerUsed: false,
      });
      expect(ai.shouldUseHeroPower(state)).toBe(true);
    });

    it('normal AI does not use hero power when already used', () => {
      const ai = createAI('normal');
      const state = makeGameState({
        hero: { health: 30, mana: 5, heroPower: { name: 'HP', cost: 2, description: '' } },
        heroPowerUsed: true,
      });
      expect(ai.shouldUseHeroPower(state)).toBe(false);
    });
  });

  describe('play decisions scale with difficulty', () => {
    it('hard AI uses optimal mana usage while normal uses on-curve', () => {
      const hand = [
        makeCard({ cost: 3, attack: 3, health: 3 }),
        makeCard({ cost: 2, attack: 2, health: 2 }),
        makeCard({ cost: 2, attack: 2, health: 2 }),
        makeCard({ cost: 1, attack: 1, health: 1 }),
      ];
      const state = makeGameState({
        hero: { health: 30, mana: 4, heroPower: { name: '', cost: 2, description: '' } },
        hand,
        board: [],
      });

      const hardAI = createAI('hard');
      const normalAI = createAI('normal');
      const hardDecisions = hardAI.getPlayDecisions(state);
      const normalDecisions = normalAI.getPlayDecisions(state);

      const hardManaCost = hardDecisions.reduce((s, d) => s + hand[d.cardIndex].cost, 0);
      const normalManaCost = normalDecisions.reduce((s, d) => s + hand[d.cardIndex].cost, 0);
      expect(hardManaCost).toBeGreaterThanOrEqual(normalManaCost);
    });
  });
});

describe('Hard AI makes strictly better decisions than easy AI', () => {
  it('hard AI plays more total mana worth of cards than easy AI on average', () => {
    const hand = [
      makeCard({ cost: 3, attack: 3, health: 3 }),
      makeCard({ cost: 2, attack: 2, health: 2 }),
      makeCard({ cost: 2, attack: 2, health: 2 }),
      makeCard({ cost: 1, attack: 1, health: 1 }),
    ];

    let hardTotal = 0;
    let easyTotal = 0;
    const trials = 50;

    for (let i = 0; i < trials; i++) {
      const state = makeGameState({
        hero: { health: 30, mana: 4, heroPower: { name: '', cost: 2, description: '' } },
        hand: [...hand],
        board: [],
      });

      const hardDecisions = createAI('hard').getPlayDecisions(state);
      const easyDecisions = createAI('easy').getPlayDecisions(state);

      hardTotal += hardDecisions.reduce((s, d) => s + hand[d.cardIndex].cost, 0);
      easyTotal += easyDecisions.reduce((s, d) => s + hand[d.cardIndex].cost, 0);
    }

    expect(hardTotal / trials).toBeGreaterThanOrEqual(easyTotal / trials);
  });

  it('hard AI gets bonus card advantage over easy AI', () => {
    const hardAI = createAI('hard');
    const easyAI = createAI('easy');
    expect(hardAI.shouldGetBonusCard()).toBe(true);
    expect(easyAI.shouldGetBonusCard()).toBe(false);
  });

  it('hard AI mulligans more aggressively for early game', () => {
    const hand: Card[] = [
      makeCard({ cost: 5 }),
      makeCard({ cost: 4 }),
      makeCard({ cost: 3 }),
    ];
    const hardReplace = createAI('hard').mulliganHand(hand);
    const easyReplace = createAI('easy').mulliganHand(hand);
    expect(hardReplace.length).toBeGreaterThan(easyReplace.length);
  });

  it('hard AI builds higher quality decks than easy AI', () => {
    const hardDecks = Array.from({ length: 20 }, () => buildFactionDeck(cards, 'hard'));
    const easyDecks = Array.from({ length: 20 }, () => buildFactionDeck(cards, 'easy'));

    const hardRarities = new Set(hardDecks.flat().map(c => c.rarity));
    const easyRarities = new Set(easyDecks.flat().map(c => c.rarity));

    expect(hardRarities.size).toBeGreaterThan(easyRarities.size);
  });

  it('performAIMulligan modifies hand for hard difficulty', () => {
    const state = makeGameState();
    const expensiveCards = [
      makeCard({ cost: 5 }),
      makeCard({ cost: 6 }),
      makeCard({ cost: 7 }),
    ];
    const deckCards = Array.from({ length: 10 }, () => makeCard({ cost: 1 }));
    state.players[1] = makePlayer({
      hand: [...expensiveCards],
      deck: deckCards as unknown as Deck,
    });

    performAIMulligan(state, 'hard');
    const avgCost = state.players[1].hand.reduce((s, c) => s + c.cost, 0) / state.players[1].hand.length;
    expect(avgCost).toBeLessThan(6);
  });

  it('performAIMulligan does not modify hand for easy difficulty', () => {
    const state = makeGameState();
    const expensiveCards = [
      makeCard({ cost: 5 }),
      makeCard({ cost: 6 }),
      makeCard({ cost: 7 }),
    ];
    state.players[1] = makePlayer({
      hand: [...expensiveCards],
      deck: [makeCard({ cost: 1 })] as unknown as Deck,
    });

    performAIMulligan(state, 'easy');
    const costs = state.players[1].hand.map(c => c.cost);
    expect(costs).toEqual([5, 6, 7]);
  });
});

describe('Deck quality differences across difficulties', () => {
  it('hard decks have strictly more rare+ cards than easy decks', () => {
    const hardDecks = Array.from({ length: 30 }, () => buildFactionDeck(cards, 'hard'));
    const easyDecks = Array.from({ length: 30 }, () => buildFactionDeck(cards, 'easy'));

    const hardNonCommon = hardDecks.flat().filter(c => c.rarity !== 'common').length;
    const easyNonCommon = easyDecks.flat().filter(c => c.rarity !== 'common').length;

    expect(hardNonCommon).toBeGreaterThan(easyNonCommon);
  });

  it('normal decks have intermediate rarity between easy and hard', () => {
    const easyDecks = Array.from({ length: 30 }, () => buildFactionDeck(cards, 'easy'));
    const normalDecks = Array.from({ length: 30 }, () => buildFactionDeck(cards, 'normal'));
    const hardDecks = Array.from({ length: 30 }, () => buildFactionDeck(cards, 'hard'));

    const easyRarityCount = new Set(easyDecks.flat().map(c => c.rarity)).size;
    const normalRarityCount = new Set(normalDecks.flat().map(c => c.rarity)).size;
    const hardRarityCount = new Set(hardDecks.flat().map(c => c.rarity)).size;

    expect(normalRarityCount).toBeGreaterThanOrEqual(easyRarityCount);
    expect(hardRarityCount).toBeGreaterThanOrEqual(normalRarityCount);
  });

  it('all difficulty decks have exactly MAX_DECK_SIZE cards', () => {
    const difficulties: AIDifficulty[] = ['easy', 'normal', 'hard'];
    for (const diff of difficulties) {
      const deck = buildFactionDeck(cards, diff);
      expect(deck).toHaveLength(MAX_DECK_SIZE);
    }
  });

  it('numeric difficulty 10 produces better decks than difficulty 1', () => {
    const d10Decks = Array.from({ length: 30 }, () => buildFactionDeck(cards, undefined, 10));
    const d1Decks = Array.from({ length: 30 }, () => buildFactionDeck(cards, undefined, 1));

    const avgStatD10 = d10Decks.flat().reduce((s, c) => s + c.attack + c.health, 0) / d10Decks.flat().length;
    const avgStatD1 = d1Decks.flat().reduce((s, c) => s + c.attack + c.health, 0) / d1Decks.flat().length;

    expect(avgStatD10).toBeGreaterThanOrEqual(avgStatD1);
  });
});
