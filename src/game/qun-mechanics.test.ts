import { describe, it, expect } from 'vitest';
import {
  GameState, BoardMinion, Card, Faction, Lane,
  playCard, createDeck, createPlayerState,
  applyQunTurnStartDebuff,
} from './types';

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
    factionAttackBonus: 0, factionHealthBonus: 0, formationAtkBonus: 0, formationHpBonus: 0,
    brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0, wuChargeBonus: 0, wuWeaponBonus: 0,
    wuComboAtkBonus: 0, wuComboHpBonus: 0, qunDebuff: 0,
    lane: Lane.Center, slotIndex: 0,
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

function makeQunDeck(): Card[] {
  const cards: Card[] = [];
  for (let i = 0; i < 30; i++) {
    cards.push(makeCard({ faction: 'qun', name: `qun${i}` }));
  }
  return cards;
}

function makeDummyDeck(): Card[] {
  const cards: Card[] = [];
  for (let i = 0; i < 30; i++) {
    cards.push(makeCard({ faction: 'neutral', name: `dummy${i}` }));
  }
  return cards;
}

function makeGameState(opts?: { qunDeckP0?: boolean }): GameState {
  const deck1 = createDeck(opts?.qunDeckP0 ? makeQunDeck() : makeDummyDeck());
  const deck2 = createDeck(makeDummyDeck());
  const p0 = createPlayerState(deck1);
  const p1 = createPlayerState(deck2);
  if (opts?.qunDeckP0) {
    p0.deckFaction = 'qun';
    p0.hasDeckFactionBonus = true;
  }
  p0.hero.mana = 10;
  p0.maxMana = 10;
  return {
    players: [p0, p1],
    board: [p0.board, p1.board],
    turn: 1,
    phase: 'playing',
    turnPhase: 'play',
    activePlayer: 0,
    spellsPlayed: [[], []], wuComboCount: [0, 0],
    terrain: { [Lane.Left]: null, [Lane.Center]: null, [Lane.Right]: null },
  };
}

describe('Qun battlecry double-trigger', () => {
  it('triggers battlecry twice when rng < 0.5', () => {
    const state = makeGameState({ qunDeckP0: true });
    let battlecryCount = 0;
    const card = makeCard({
      faction: 'qun', name: 'qunWarrior', cost: 1, attack: 2, health: 3,
      battlecry: (s) => { battlecryCount++; return s; },
    });
    state.players[0].hand.push(card);
    playCard(state, 0, undefined, () => 0.1);
    expect(battlecryCount).toBe(2);
  });

  it('triggers battlecry only once when rng >= 0.5', () => {
    const state = makeGameState({ qunDeckP0: true });
    let battlecryCount = 0;
    const card = makeCard({
      faction: 'qun', name: 'qunWarrior', cost: 1, attack: 2, health: 3,
      battlecry: (s) => { battlecryCount++; return s; },
    });
    state.players[0].hand.push(card);
    playCard(state, 0, undefined, () => 0.9);
    expect(battlecryCount).toBe(1);
  });

  it('does not double-trigger if minion died during first battlecry', () => {
    const state = makeGameState({ qunDeckP0: true });
    let battlecryCount = 0;
    const card = makeCard({
      faction: 'qun', name: 'qunWarrior', cost: 1, attack: 2, health: 3,
      battlecry: (s, ctx) => {
        battlecryCount++;
        const player = s.players[ctx.player];
        const self = player.board.find(m => m.name === 'qunWarrior');
        if (self) self.currentHealth = 0;
        return s;
      },
    });
    state.players[0].hand.push(card);
    playCard(state, 0, undefined, () => 0.1);
    expect(battlecryCount).toBe(1);
  });

  it('does not double-trigger for non-qun faction deck', () => {
    const state = makeGameState();
    let battlecryCount = 0;
    const card = makeCard({
      faction: 'qun', name: 'qunWarrior', cost: 1, attack: 2, health: 3,
      battlecry: (s) => { battlecryCount++; return s; },
    });
    state.players[0].hand.push(card);
    playCard(state, 0, undefined, () => 0.1);
    expect(battlecryCount).toBe(1);
  });

  it('does not double-trigger onPlay effects', () => {
    const state = makeGameState({ qunDeckP0: true });
    let onPlayCount = 0;
    const card = makeCard({
      faction: 'qun', name: 'qunWarrior', cost: 1, attack: 2, health: 3,
      onPlay: () => { onPlayCount++; },
    });
    state.players[0].hand.push(card);
    playCard(state, 0, undefined, () => 0.1);
    expect(onPlayCount).toBe(1);
  });
});

describe('Qun spell damage variance', () => {
  it('adds +1 damage when rng yields high value', () => {
    const state = makeGameState({ qunDeckP0: true });
    let receivedSpellDamage = 0;
    const spell = makeCard({
      faction: 'qun', name: 'qunSpell', cost: 1, type: 'spell',
      attack: 0, health: 0,
      effect: (s, ctx) => { receivedSpellDamage = ctx.spellDamage ?? 0; return s; },
    });
    state.players[0].hand.push(spell);
    // rng() * 3 = 2.97 => Math.floor = 2, variance = 2 - 1 = +1
    playCard(state, 0, undefined, () => 0.99);
    expect(receivedSpellDamage).toBe(1);
  });

  it('subtracts 1 damage when rng yields 0', () => {
    const state = makeGameState({ qunDeckP0: true });
    let receivedSpellDamage = 0;
    const spell = makeCard({
      faction: 'qun', name: 'qunSpell', cost: 1, type: 'spell',
      attack: 0, health: 0,
      effect: (s, ctx) => { receivedSpellDamage = ctx.spellDamage ?? 0; return s; },
    });
    state.players[0].hand.push(spell);
    // rng() * 3 = 0 => Math.floor = 0, variance = 0 - 1 = -1, clamped to 0
    playCard(state, 0, undefined, () => 0.0);
    expect(receivedSpellDamage).toBe(0);
  });

  it('clamps spell damage to 0 when variance would make it negative', () => {
    const state = makeGameState({ qunDeckP0: true });
    let receivedSpellDamage = -999;
    const spell = makeCard({
      faction: 'qun', name: 'qunSpell', cost: 1, type: 'spell',
      attack: 0, health: 0,
      effect: (s, ctx) => { receivedSpellDamage = ctx.spellDamage ?? 0; return s; },
    });
    state.players[0].hand.push(spell);
    playCard(state, 0, undefined, () => 0.0);
    expect(receivedSpellDamage).toBeGreaterThanOrEqual(0);
  });

  it('does not apply variance for non-qun deck', () => {
    const state = makeGameState();
    let receivedSpellDamage = -999;
    const spell = makeCard({
      faction: 'qun', name: 'qunSpell', cost: 1, type: 'spell',
      attack: 0, health: 0,
      effect: (s, ctx) => { receivedSpellDamage = ctx.spellDamage ?? 0; return s; },
    });
    state.players[0].hand.push(spell);
    playCard(state, 0, undefined, () => 0.99);
    expect(receivedSpellDamage).toBe(0);
  });
});

describe('Qun turn start enemy debuff', () => {
  it('debuffs enemy minions when 3+ Qun minions on board', () => {
    const state = makeGameState({ qunDeckP0: true });
    state.players[0].board.push(
      makeMinion({ faction: 'qun', name: 'q1', attack: 2, health: 2 }),
      makeMinion({ faction: 'qun', name: 'q2', attack: 2, health: 2 }),
      makeMinion({ faction: 'qun', name: 'q3', attack: 2, health: 2 }),
    );
    const enemy = makeMinion({ faction: 'neutral', name: 'e1', attack: 3, health: 3 });
    state.players[1].board.push(enemy);
    applyQunTurnStartDebuff(state, 0, () => 0.1);
    expect(enemy.currentAttack).toBe(2);
    expect(enemy.qunDebuff).toBe(1);
  });

  it('does not debuff when fewer than 3 Qun minions', () => {
    const state = makeGameState({ qunDeckP0: true });
    state.players[0].board.push(
      makeMinion({ faction: 'qun', name: 'q1', attack: 2, health: 2 }),
      makeMinion({ faction: 'qun', name: 'q2', attack: 2, health: 2 }),
    );
    const enemy = makeMinion({ faction: 'neutral', name: 'e1', attack: 3, health: 3 });
    state.players[1].board.push(enemy);
    applyQunTurnStartDebuff(state, 0, () => 0.1);
    expect(enemy.currentAttack).toBe(3);
    expect(enemy.qunDebuff).toBe(0);
  });

  it('does not debuff when rng >= 0.5', () => {
    const state = makeGameState({ qunDeckP0: true });
    state.players[0].board.push(
      makeMinion({ faction: 'qun', name: 'q1', attack: 2, health: 2 }),
      makeMinion({ faction: 'qun', name: 'q2', attack: 2, health: 2 }),
      makeMinion({ faction: 'qun', name: 'q3', attack: 2, health: 2 }),
    );
    const enemy = makeMinion({ faction: 'neutral', name: 'e1', attack: 3, health: 3 });
    state.players[1].board.push(enemy);
    applyQunTurnStartDebuff(state, 0, () => 0.9);
    expect(enemy.currentAttack).toBe(3);
    expect(enemy.qunDebuff).toBe(0);
  });

  it('does not reduce attack below 0', () => {
    const state = makeGameState({ qunDeckP0: true });
    state.players[0].board.push(
      makeMinion({ faction: 'qun', name: 'q1', attack: 2, health: 2 }),
      makeMinion({ faction: 'qun', name: 'q2', attack: 2, health: 2 }),
      makeMinion({ faction: 'qun', name: 'q3', attack: 2, health: 2 }),
    );
    const enemy = makeMinion({ faction: 'neutral', name: 'e1', attack: 0, health: 3 });
    state.players[1].board.push(enemy);
    applyQunTurnStartDebuff(state, 0, () => 0.1);
    expect(enemy.currentAttack).toBe(0);
    expect(enemy.qunDebuff).toBe(0);
  });

  it('tracks cumulative debuff across multiple turns', () => {
    const state = makeGameState({ qunDeckP0: true });
    state.players[0].board.push(
      makeMinion({ faction: 'qun', name: 'q1', attack: 2, health: 2 }),
      makeMinion({ faction: 'qun', name: 'q2', attack: 2, health: 2 }),
      makeMinion({ faction: 'qun', name: 'q3', attack: 2, health: 2 }),
    );
    const enemy = makeMinion({ faction: 'neutral', name: 'e1', attack: 5, health: 5 });
    state.players[1].board.push(enemy);
    applyQunTurnStartDebuff(state, 0, () => 0.1);
    applyQunTurnStartDebuff(state, 0, () => 0.1);
    expect(enemy.currentAttack).toBe(3);
    expect(enemy.qunDebuff).toBe(2);
  });
});
