import { describe, it, expect } from 'vitest';
import {
  getAIAttackDecisions,
  evaluateCardForFaction,
  determinePlayStyle,
  getOnCurvePlayDecisions,
  getOptimalPlayDecisions,
} from './ai';
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
    deckFaction: 'neutral' as Faction,
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

describe('AI trap card play decisions', () => {
  it('evaluates on_attack trap higher when opponent has many minions', () => {
    const trap = makeCard({ type: 'trap', trapTrigger: 'on_attack', cost: 2 });
    const fewMinions = makeGameState({}, { board: [makeMinion()] });
    const manyMinions = makeGameState({}, {
      board: [makeMinion(), makeMinion(), makeMinion(), makeMinion()],
    });

    const scoreFew = evaluateCardForFaction(trap, makePlayer(), fewMinions);
    const scoreMany = evaluateCardForFaction(trap, makePlayer(), manyMinions);
    expect(scoreMany).toBeGreaterThan(scoreFew);
  });

  it('evaluates on_spell trap higher against Wei faction', () => {
    const trap = makeCard({ type: 'trap', trapTrigger: 'on_spell', cost: 2 });
    const vsNeutral = makeGameState({}, { deckFaction: 'neutral' });
    const vsWei = makeGameState({}, { deckFaction: 'wei' });

    const scoreNeutral = evaluateCardForFaction(trap, makePlayer(), vsNeutral);
    const scoreWei = evaluateCardForFaction(trap, makePlayer(), vsWei);
    expect(scoreWei).toBeGreaterThan(scoreNeutral);
  });

  it('evaluates on_spell trap higher when opponent holds spells', () => {
    const trap = makeCard({ type: 'trap', trapTrigger: 'on_spell', cost: 2 });
    const noSpells = makeGameState({}, { hand: [makeCard({ type: 'minion' })] });
    const withSpells = makeGameState({}, { hand: [makeCard({ type: 'spell' })] });

    const scoreNo = evaluateCardForFaction(trap, makePlayer(), noSpells);
    const scoreWith = evaluateCardForFaction(trap, makePlayer(), withSpells);
    expect(scoreWith).toBeGreaterThan(scoreNo);
  });

  it('evaluates on_play trap higher when opponent has large hand', () => {
    const trap = makeCard({ type: 'trap', trapTrigger: 'on_play', cost: 2 });
    const smallHand = makeGameState({}, { hand: [makeCard()] });
    const largeHand = makeGameState({}, {
      hand: [makeCard(), makeCard(), makeCard(), makeCard(), makeCard()],
    });

    const scoreSmall = evaluateCardForFaction(trap, makePlayer(), smallHand);
    const scoreLarge = evaluateCardForFaction(trap, makePlayer(), largeHand);
    expect(scoreLarge).toBeGreaterThan(scoreSmall);
  });

  it('plays traps before minions in optimal play order', () => {
    const hand = [
      makeCard({ type: 'minion', cost: 1, name: 'Soldier' }),
      makeCard({ type: 'trap', cost: 1, name: 'Ambush', trapTrigger: 'on_attack' }),
    ];
    const state = makeGameState(
      { hand, hero: { health: 30, mana: 2, heroPower: { name: '', cost: 2, description: '' } }, maxMana: 2 },
      { board: [makeMinion()] },
    );

    const decisions = getOptimalPlayDecisions(state);
    if (decisions.length >= 2) {
      expect(hand[decisions[0].cardIndex].type).toBe('trap');
    }
  });

  it('plays traps before minions in on-curve play order', () => {
    const hand = [
      makeCard({ type: 'minion', cost: 1, name: 'Soldier' }),
      makeCard({ type: 'trap', cost: 1, name: 'Ambush', trapTrigger: 'on_attack' }),
    ];
    const state = makeGameState(
      { hand, hero: { health: 30, mana: 2, heroPower: { name: '', cost: 2, description: '' } }, maxMana: 2 },
      { board: [makeMinion()] },
    );

    const decisions = getOnCurvePlayDecisions(state);
    if (decisions.length >= 2) {
      expect(hand[decisions[0].cardIndex].type).toBe('trap');
    }
  });

  it('switches to control play style when holding a trap card', () => {
    const state = makeGameState(
      {
        hand: [makeCard({ type: 'trap', trapTrigger: 'on_attack', cost: 2 })],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
        board: [makeMinion()],
      },
      { board: [makeMinion()] },
    );

    const style = determinePlayStyle(state, 0);
    expect(style).toBe('control');
  });
});

describe('AI avoiding enemy traps', () => {
  it('skips low-health minions from attacking hero when enemy has on_attack traps', () => {
    const aiBoard = [
      makeMinion({ currentAttack: 2, currentHealth: 2, name: 'Fragile' }),
    ];
    const state = makeGameState(
      { board: aiBoard, hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } } },
      {
        board: [],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
        activeTraps: [{ name: '反击', trigger: 'on_attack', trapEffect: () => {} }],
      },
    );

    const decisions = getAIAttackDecisions(state);
    expect(decisions.filter(d => d.targetIndex === 'hero')).toHaveLength(0);
  });

  it('allows high-health minions to attack hero even with enemy traps', () => {
    const aiBoard = [
      makeMinion({ currentAttack: 4, currentHealth: 5, name: 'Beefy' }),
    ];
    const state = makeGameState(
      { board: aiBoard, hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } } },
      {
        board: [],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
        activeTraps: [{ name: '反击', trigger: 'on_attack', trapEffect: () => {} }],
      },
    );

    const decisions = getAIAttackDecisions(state);
    expect(decisions.some(d => d.targetIndex === 'hero')).toBe(true);
  });

  it('allows divine shield minions to attack hero despite enemy traps', () => {
    const aiBoard = [
      makeMinion({ currentAttack: 2, currentHealth: 1, hasDivineShield: true, name: 'Shielded' }),
    ];
    const state = makeGameState(
      { board: aiBoard, hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } } },
      {
        board: [],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
        activeTraps: [{ name: '反击', trigger: 'on_attack', trapEffect: () => {} }],
      },
    );

    const decisions = getAIAttackDecisions(state);
    expect(decisions.some(d => d.targetIndex === 'hero')).toBe(true);
  });

  it('raises trade threshold when enemy has on_attack traps', () => {
    const aiBoard = [makeMinion({ currentAttack: 2, currentHealth: 3 })];
    const oppBoard = [makeMinion({ currentAttack: 2, currentHealth: 2 })];

    const noTrapState = makeGameState(
      { board: aiBoard, hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } } },
      { board: oppBoard, hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } }, activeTraps: [] },
    );

    const withTrapState = makeGameState(
      { board: [...aiBoard], hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } } },
      {
        board: [...oppBoard],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
        activeTraps: [{ name: '反击', trigger: 'on_attack', trapEffect: () => {} }],
      },
    );

    const decisionsNoTrap = getAIAttackDecisions(noTrapState);
    const decisionsWithTrap = getAIAttackDecisions(withTrapState);
    expect(decisionsNoTrap.length).toBeGreaterThanOrEqual(decisionsWithTrap.length);
  });

  it('still attacks for lethal even when enemy has traps', () => {
    const aiBoard = [makeMinion({ currentAttack: 10, currentHealth: 1 })];
    const state = makeGameState(
      { board: aiBoard, hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } } },
      {
        board: [],
        hero: { health: 5, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
        activeTraps: [{ name: '反击', trigger: 'on_attack', trapEffect: () => {} }],
      },
    );

    const decisions = getAIAttackDecisions(state);
    expect(decisions.some(d => d.targetIndex === 'hero')).toBe(true);
  });

  it('multiple traps increase conservatism further', () => {
    const aiBoard = [makeMinion({ currentAttack: 3, currentHealth: 4 })];
    const oppBoard = [makeMinion({ currentAttack: 2, currentHealth: 2 })];

    const oneTrap = makeGameState(
      { board: [...aiBoard], hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } } },
      {
        board: [...oppBoard],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
        activeTraps: [{ name: '反击', trigger: 'on_attack', trapEffect: () => {} }],
      },
    );

    const twoTraps = makeGameState(
      { board: [...aiBoard], hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } } },
      {
        board: [...oppBoard],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
        activeTraps: [
          { name: '反击', trigger: 'on_attack', trapEffect: () => {} },
          { name: '伏兵', trigger: 'on_attack', trapEffect: () => {} },
        ],
      },
    );

    const decisionsOne = getAIAttackDecisions(oneTrap);
    const decisionsTwo = getAIAttackDecisions(twoTraps);
    expect(decisionsOne.length).toBeGreaterThanOrEqual(decisionsTwo.length);
  });

  it('non-attack traps do not affect attack decisions', () => {
    const aiBoard = [makeMinion({ currentAttack: 2, currentHealth: 2 })];
    const state = makeGameState(
      { board: aiBoard, hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } } },
      {
        board: [],
        hero: { health: 30, mana: 5, heroPower: { name: '', cost: 2, description: '' } },
        activeTraps: [{ name: '法术陷阱', trigger: 'on_spell', trapEffect: () => {} }],
      },
    );

    const decisions = getAIAttackDecisions(state);
    expect(decisions.some(d => d.targetIndex === 'hero')).toBe(true);
  });
});
