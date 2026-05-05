import { describe, it, expect } from 'vitest';
import {
  GameState, PlayerState, BoardMinion, Card, Faction,
  playCard, createDeck, createPlayerState, heroAttack,
  applyWuWeaponBuff, startTurn,
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
    factionAttackBonus: 0, factionHealthBonus: 0, shuAdjacencyAtkBonus: 0, shuAdjacencyHpBonus: 0,
    brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0, wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0,
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

function makeWuDeck(): Card[] {
  const cards: Card[] = [];
  for (let i = 0; i < 30; i++) {
    cards.push(makeCard({ faction: 'wu', name: `wu${i}` }));
  }
  return cards;
}

function makeGameState(opts?: { wuDeckP0?: boolean }): GameState {
  const deck1 = createDeck(opts?.wuDeckP0 ? makeWuDeck() : makeDummyDeck());
  const deck2 = createDeck(makeDummyDeck());
  const p0 = createPlayerState(deck1);
  const p1 = createPlayerState(deck2);
  if (opts?.wuDeckP0) {
    p0.deckFaction = 'wu';
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
  };
}

describe('Wu charge bonus', () => {
  it('gives +1 attack to Wu charge minion on play when Wu deck faction', () => {
    const state = makeGameState({ wuDeckP0: true });
    const chargeCard = makeCard({ faction: 'wu', name: '骑兵', cost: 2, attack: 3, health: 2, charge: true });
    state.players[0].hand.push(chargeCard);
    playCard(state, 0);
    const minion = state.players[0].board[0];
    expect(minion.currentAttack).toBe(4);
    expect(minion.wuChargeBonus).toBe(1);
  });

  it('does NOT give charge bonus to non-Wu charge minions', () => {
    const state = makeGameState({ wuDeckP0: true });
    const chargeCard = makeCard({ faction: 'neutral', name: '骑兵', cost: 2, attack: 3, health: 2, charge: true });
    state.players[0].hand.push(chargeCard);
    playCard(state, 0);
    const minion = state.players[0].board[0];
    expect(minion.currentAttack).toBe(3);
    expect(minion.wuChargeBonus).toBe(0);
  });

  it('does NOT give charge bonus without Wu deck faction bonus', () => {
    const state = makeGameState(); // neutral deck
    const chargeCard = makeCard({ faction: 'wu', name: '骑兵', cost: 2, attack: 3, health: 2, charge: true });
    state.players[0].hand.push(chargeCard);
    playCard(state, 0);
    const minion = state.players[0].board[0];
    expect(minion.currentAttack).toBe(3);
    expect(minion.wuChargeBonus).toBe(0);
  });

  it('does NOT give charge bonus to Wu minions without charge', () => {
    const state = makeGameState({ wuDeckP0: true });
    const card = makeCard({ faction: 'wu', name: '步兵', cost: 1, attack: 2, health: 3 });
    state.players[0].hand.push(card);
    playCard(state, 0);
    const minion = state.players[0].board[0];
    expect(minion.currentAttack).toBe(2);
    expect(minion.wuChargeBonus).toBe(0);
  });
});

describe('Wu weapon buff', () => {
  it('buffs a random Wu minion after weapon attack on minion', () => {
    const state = makeGameState({ wuDeckP0: true });
    state.players[0].weapon = { name: '短刀', attack: 2, durability: 2 };
    state.players[0].heroWindfuryAttacksLeft = 1;
    const wuMinion = makeMinion({ faction: 'wu', name: '吴兵', attack: 2, health: 3 });
    state.players[0].board.push(wuMinion);
    state.board[0] = state.players[0].board;
    const target = makeMinion({ faction: 'neutral', name: '敌兵', attack: 1, health: 5 });
    state.players[1].board.push(target);
    state.board[1] = state.players[1].board;

    heroAttack(state, 1, 0);
    expect(wuMinion.currentAttack).toBe(3);
    expect(wuMinion.wuWeaponBonus).toBe(1);
  });

  it('does NOT buff on face (hero) attacks', () => {
    const state = makeGameState({ wuDeckP0: true });
    state.players[0].weapon = { name: '短刀', attack: 2, durability: 2 };
    state.players[0].heroWindfuryAttacksLeft = 1;
    const wuMinion = makeMinion({ faction: 'wu', name: '吴兵', attack: 2, health: 3 });
    state.players[0].board.push(wuMinion);
    state.board[0] = state.players[0].board;

    heroAttack(state, 1);
    expect(wuMinion.currentAttack).toBe(2);
    expect(wuMinion.wuWeaponBonus).toBe(0);
  });

  it('does nothing without Wu deck faction bonus', () => {
    const state = makeGameState(); // neutral deck
    state.players[0].weapon = { name: '短刀', attack: 2, durability: 2 };
    state.players[0].heroWindfuryAttacksLeft = 1;
    const wuMinion = makeMinion({ faction: 'wu', name: '吴兵', attack: 2, health: 3 });
    state.players[0].board.push(wuMinion);
    state.board[0] = state.players[0].board;
    const target = makeMinion({ faction: 'neutral', name: '敌兵', attack: 1, health: 5 });
    state.players[1].board.push(target);
    state.board[1] = state.players[1].board;

    heroAttack(state, 1, 0);
    expect(wuMinion.currentAttack).toBe(2);
    expect(wuMinion.wuWeaponBonus).toBe(0);
  });

  it('tracks wuWeaponBonus cumulatively', () => {
    const player: PlayerState = createPlayerState(createDeck(makeWuDeck()));
    player.deckFaction = 'wu';
    player.hasDeckFactionBonus = true;
    const m = makeMinion({ faction: 'wu', name: '吴兵', attack: 2, health: 3 });
    player.board.push(m);

    const alwaysZero = () => 0;
    applyWuWeaponBuff(player, alwaysZero);
    expect(m.currentAttack).toBe(3);
    expect(m.wuWeaponBonus).toBe(1);
    applyWuWeaponBuff(player, alwaysZero);
    expect(m.currentAttack).toBe(4);
    expect(m.wuWeaponBonus).toBe(2);
  });

  it('uses RNG parameter to select target', () => {
    const player: PlayerState = createPlayerState(createDeck(makeWuDeck()));
    player.deckFaction = 'wu';
    player.hasDeckFactionBonus = true;
    const m0 = makeMinion({ faction: 'wu', name: '吴兵A', attack: 1, health: 3 });
    const m1 = makeMinion({ faction: 'wu', name: '吴兵B', attack: 1, health: 3 });
    player.board.push(m0, m1);

    applyWuWeaponBuff(player, () => 0.99);
    expect(m0.wuWeaponBonus).toBe(0);
    expect(m1.wuWeaponBonus).toBe(1);
  });

  it('skips non-Wu minions when selecting target', () => {
    const player: PlayerState = createPlayerState(createDeck(makeWuDeck()));
    player.deckFaction = 'wu';
    player.hasDeckFactionBonus = true;
    const neutral = makeMinion({ faction: 'neutral', name: '中立', attack: 1, health: 3 });
    const wu = makeMinion({ faction: 'wu', name: '吴兵', attack: 1, health: 3 });
    player.board.push(neutral, wu);

    applyWuWeaponBuff(player, () => 0);
    expect(neutral.wuWeaponBonus).toBe(0);
    expect(wu.wuWeaponBonus).toBe(1);
  });
});

describe('Wu combo counter', () => {
  it('increments combo count for each Wu card played', () => {
    const state = makeGameState({ wuDeckP0: true });
    state.players[0].hand.push(
      makeCard({ faction: 'wu', name: '吴1', cost: 1, attack: 1, health: 1 }),
      makeCard({ faction: 'wu', name: '吴2', cost: 1, attack: 1, health: 1 }),
    );
    playCard(state, 0);
    expect(state.wuComboCount[0]).toBe(1);
    playCard(state, 0);
    expect(state.wuComboCount[0]).toBe(2);
  });

  it('does NOT increment for non-Wu cards', () => {
    const state = makeGameState({ wuDeckP0: true });
    state.players[0].hand.push(
      makeCard({ faction: 'neutral', name: '中立', cost: 1, attack: 1, health: 1 }),
    );
    playCard(state, 0);
    expect(state.wuComboCount[0]).toBe(0);
  });

  it('gives combo bonus (+1/+1) to 3rd Wu card played', () => {
    const state = makeGameState({ wuDeckP0: true });
    for (let i = 0; i < 3; i++) {
      state.players[0].hand.push(
        makeCard({ faction: 'wu', name: `吴${i}`, cost: 1, attack: 2, health: 2 }),
      );
    }
    playCard(state, 0); // 1st
    playCard(state, 0); // 2nd
    playCard(state, 0); // 3rd => combo bonus = 1
    const third = state.players[0].board[2];
    // 2 base + 1 faction synergy (2+ wu) + 1 combo = 4
    expect(third.currentAttack).toBe(4);
    expect(third.currentHealth).toBe(4);
    expect(third.wuComboAtkBonus).toBe(1);
    expect(third.wuComboHpBonus).toBe(1);
  });

  it('gives escalating bonus (+2/+2) to 4th Wu card', () => {
    const state = makeGameState({ wuDeckP0: true });
    for (let i = 0; i < 4; i++) {
      state.players[0].hand.push(
        makeCard({ faction: 'wu', name: `吴${i}`, cost: 1, attack: 1, health: 1 }),
      );
    }
    playCard(state, 0);
    playCard(state, 0);
    playCard(state, 0);
    playCard(state, 0); // 4th => combo bonus = 2
    const fourth = state.players[0].board[3];
    // 1 base + 1 faction atk (4+ wu tier) + 2 combo = 4 atk
    // 1 base + 2 faction hp (4+ wu tier) + 2 combo = 5 hp
    expect(fourth.currentAttack).toBe(4);
    expect(fourth.currentHealth).toBe(5);
    expect(fourth.wuComboAtkBonus).toBe(2);
    expect(fourth.wuComboHpBonus).toBe(2);
  });

  it('first two Wu cards get no combo bonus', () => {
    const state = makeGameState({ wuDeckP0: true });
    for (let i = 0; i < 2; i++) {
      state.players[0].hand.push(
        makeCard({ faction: 'wu', name: `吴${i}`, cost: 1, attack: 2, health: 2 }),
      );
    }
    playCard(state, 0);
    playCard(state, 0);
    // 2 base + 1 faction synergy (2+ wu minions on board) = 3
    expect(state.players[0].board[0].currentAttack).toBe(3);
    expect(state.players[0].board[0].wuComboAtkBonus).toBe(0);
    expect(state.players[0].board[1].currentAttack).toBe(3);
    expect(state.players[0].board[1].wuComboAtkBonus).toBe(0);
  });

  it('resets combo count at start of turn', () => {
    const state = makeGameState({ wuDeckP0: true });
    state.wuComboCount[0] = 5;
    startTurn(state);
    expect(state.wuComboCount[0]).toBe(0);
  });

  it('tracks combo for spells too', () => {
    const state = makeGameState({ wuDeckP0: true });
    state.players[0].hand.push(
      makeCard({ faction: 'wu', name: '吴法1', cost: 1, type: 'spell', attack: 0, health: 0 }),
      makeCard({ faction: 'wu', name: '吴法2', cost: 1, type: 'spell', attack: 0, health: 0 }),
      makeCard({ faction: 'wu', name: '吴兵3', cost: 1, attack: 2, health: 2 }),
    );
    playCard(state, 0); // spell 1
    playCard(state, 0); // spell 2
    expect(state.wuComboCount[0]).toBe(2);
    playCard(state, 0); // minion 3 => combo bonus = 1
    const minion = state.players[0].board[0];
    expect(minion.currentAttack).toBe(3);
    expect(minion.wuComboAtkBonus).toBe(1);
  });

  it('tracks combo for weapons too', () => {
    const state = makeGameState({ wuDeckP0: true });
    state.players[0].hand.push(
      makeCard({ faction: 'wu', name: '吴武器', cost: 1, type: 'weapon', attack: 2, health: 2 }),
    );
    playCard(state, 0);
    expect(state.wuComboCount[0]).toBe(1);
  });
});
