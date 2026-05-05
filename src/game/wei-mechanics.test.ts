import { describe, it, expect, beforeEach } from 'vitest';
import {
  GameState, PlayerState, BoardMinion, Card, Faction,
  createDeck, createPlayerState, playCard,
  getEffectiveCardCost, applyFreeze,
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
    factionAttackBonus: 0, factionHealthBonus: 0, shuAdjacencyAtkBonus: 0, shuAdjacencyHpBonus: 0,
    brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0, wuChargeBonus: 0, wuWeaponBonus: 0,
    wuComboAtkBonus: 0, wuComboHpBonus: 0, qunDebuff: 0,
    ...overrides,
  };
}

function makeWeiPlayer(): PlayerState {
  const deck = createDeck(Array.from({ length: 30 }, (_, i) =>
    makeCard({ faction: 'wei', name: `wei${i}`, cost: 1 })
  ));
  const player = createPlayerState(deck);
  player.deckFaction = 'wei';
  player.hasDeckFactionBonus = true;
  player.hero.mana = 10;
  player.maxMana = 10;
  return player;
}

function makeNonWeiPlayer(): PlayerState {
  const deck = createDeck(Array.from({ length: 30 }, (_, i) =>
    makeCard({ faction: 'neutral', name: `neutral${i}`, cost: 1 })
  ));
  const player = createPlayerState(deck);
  player.deckFaction = 'neutral';
  player.hasDeckFactionBonus = false;
  player.hero.mana = 10;
  player.maxMana = 10;
  return player;
}

function makeState(player: PlayerState, opponent: PlayerState): GameState {
  return {
    players: [player, opponent],
    board: [player.board, opponent.board],
    turn: 1, phase: 'playing', turnPhase: 'play', activePlayer: 0,
    spellsPlayed: [[], []], wuComboCount: [0, 0],
  };
}

beforeEach(() => {
  gameEventBus.clear();
});

describe('Wei spell cost reduction', () => {
  it('reduces spell cost by 1 for Wei deck bonus player', () => {
    const player = makeWeiPlayer();
    const spell = makeCard({ faction: 'neutral', cost: 5, type: 'spell' });
    expect(getEffectiveCardCost(spell, player)).toBe(4);
  });

  it('reduces cost of any faction spell, not just Wei spells', () => {
    const player = makeWeiPlayer();
    const shuSpell = makeCard({ faction: 'shu', cost: 3, type: 'spell' });
    expect(getEffectiveCardCost(shuSpell, player)).toBe(2);
  });

  it('reduces 1-cost spell to 0', () => {
    const player = makeWeiPlayer();
    const spell = makeCard({ faction: 'wei', cost: 1, type: 'spell' });
    expect(getEffectiveCardCost(spell, player)).toBe(0);
  });

  it('does not reduce 0-cost spell below 0', () => {
    const player = makeWeiPlayer();
    const spell = makeCard({ faction: 'wei', cost: 0, type: 'spell' });
    expect(getEffectiveCardCost(spell, player)).toBe(0);
  });

  it('does not reduce weapon cost', () => {
    const player = makeWeiPlayer();
    const weapon = makeCard({ faction: 'wei', cost: 3, type: 'weapon' });
    expect(getEffectiveCardCost(weapon, player)).toBe(3);
  });

  it('does not reduce minion cost', () => {
    const player = makeWeiPlayer();
    const minion = makeCard({ faction: 'wei', cost: 4, type: 'minion' });
    expect(getEffectiveCardCost(minion, player)).toBe(4);
  });

  it('does not reduce cost without deck bonus', () => {
    const player = makeWeiPlayer();
    player.hasDeckFactionBonus = false;
    const spell = makeCard({ faction: 'wei', cost: 3, type: 'spell' });
    expect(getEffectiveCardCost(spell, player)).toBe(3);
  });

  it('does not reduce cost for non-Wei deck faction', () => {
    const player = makeNonWeiPlayer();
    const spell = makeCard({ faction: 'wei', cost: 3, type: 'spell' });
    expect(getEffectiveCardCost(spell, player)).toBe(3);
  });

  it('allows playing a spell with exactly reduced cost mana', () => {
    const player = makeWeiPlayer();
    player.hero.mana = 2;
    const spell = makeCard({ faction: 'wei', name: 'testspell', cost: 3, type: 'spell' });
    player.hand = [spell];
    const opponent = makeNonWeiPlayer();
    const state = makeState(player, opponent);

    playCard(state, 0);

    expect(player.hand.find(c => c.name === 'testspell')).toBeUndefined();
    expect(player.hero.mana).toBe(0);
  });
});

describe('Wei spell extra card draw', () => {
  it('draws an extra card after playing a spell', () => {
    const player = makeWeiPlayer();
    const spell = makeCard({ faction: 'wei', name: 'spell1', cost: 1, type: 'spell' });
    player.hand = [spell];
    const opponent = makeNonWeiPlayer();
    const state = makeState(player, opponent);

    const deckBefore = player.deck.length;
    playCard(state, 0);

    expect(player.deck.length).toBe(deckBefore - 1);
  });

  it('does not draw extra card for non-Wei player', () => {
    const player = makeNonWeiPlayer();
    const spell = makeCard({ faction: 'neutral', name: 'spell1', cost: 1, type: 'spell' });
    player.hand = [spell];
    const opponent = makeNonWeiPlayer();
    const state = makeState(player, opponent);

    const deckBefore = player.deck.length;
    playCard(state, 0);

    expect(player.deck.length).toBe(deckBefore);
  });

  it('does not draw extra card when playing a minion', () => {
    const player = makeWeiPlayer();
    const minion = makeCard({ faction: 'wei', name: 'minion1', cost: 1, type: 'minion' });
    player.hand = [minion];
    const opponent = makeNonWeiPlayer();
    const state = makeState(player, opponent);

    const deckBefore = player.deck.length;
    playCard(state, 0);

    expect(player.deck.length).toBe(deckBefore);
  });

  it('does not draw when deck is empty', () => {
    const player = makeWeiPlayer();
    player.deck.length = 0;
    const spell = makeCard({ faction: 'wei', name: 'spell1', cost: 1, type: 'spell' });
    player.hand = [spell];
    const opponent = makeNonWeiPlayer();
    const state = makeState(player, opponent);

    const handBefore = player.hand.length;
    playCard(state, 0);

    // Spell removed, no draw possible
    expect(player.hand.length).toBe(handBefore - 1);
  });

  it('does not draw extra card without deck bonus', () => {
    const player = makeWeiPlayer();
    player.hasDeckFactionBonus = false;
    const spell = makeCard({ faction: 'wei', name: 'spell1', cost: 1, type: 'spell' });
    player.hand = [spell];
    const opponent = makeNonWeiPlayer();
    const state = makeState(player, opponent);

    const deckBefore = player.deck.length;
    playCard(state, 0);

    expect(player.deck.length).toBe(deckBefore);
  });

  it('draws for consecutive spell plays', () => {
    const player = makeWeiPlayer();
    const spell1 = makeCard({ faction: 'wei', name: 'spell1', cost: 1, type: 'spell' });
    const spell2 = makeCard({ faction: 'wei', name: 'spell2', cost: 1, type: 'spell' });
    player.hand = [spell1, spell2];
    const opponent = makeNonWeiPlayer();
    const state = makeState(player, opponent);

    const deckBefore = player.deck.length;
    playCard(state, 0);
    playCard(state, 0);

    // Two spells played, two extra draws
    expect(player.deck.length).toBe(deckBefore - 2);
  });
});

describe('Wei enhanced freeze', () => {
  it('freezes for 2 turns with Wei deck bonus', () => {
    const player = makeWeiPlayer();
    const target = makeMinion({ faction: 'neutral' });

    applyFreeze(target, player);

    expect(target.isFrozen).toBe(true);
    expect(target.freezeTurnsLeft).toBe(2);
  });

  it('freezes for 1 turn without Wei bonus', () => {
    const player = makeNonWeiPlayer();
    const target = makeMinion({ faction: 'neutral' });

    applyFreeze(target, player);

    expect(target.isFrozen).toBe(true);
    expect(target.freezeTurnsLeft).toBe(1);
  });

  it('Wei-frozen minion stays frozen after first turn thaw', () => {
    const player = makeWeiPlayer();
    const target = makeMinion({ faction: 'neutral' });
    applyFreeze(target, player);

    // Simulate one turn of thaw
    target.freezeTurnsLeft--;
    if (target.freezeTurnsLeft <= 0) {
      target.isFrozen = false;
      target.freezeTurnsLeft = 0;
    }

    expect(target.isFrozen).toBe(true);
    expect(target.freezeTurnsLeft).toBe(1);
  });

  it('Wei-frozen minion thaws after second turn', () => {
    const player = makeWeiPlayer();
    const target = makeMinion({ faction: 'neutral' });
    applyFreeze(target, player);

    // Two turns of thaw
    for (let i = 0; i < 2; i++) {
      target.freezeTurnsLeft--;
      if (target.freezeTurnsLeft <= 0) {
        target.isFrozen = false;
        target.freezeTurnsLeft = 0;
      }
    }

    expect(target.isFrozen).toBe(false);
    expect(target.freezeTurnsLeft).toBe(0);
  });

  it('non-Wei freeze thaws after one turn', () => {
    const player = makeNonWeiPlayer();
    const target = makeMinion({ faction: 'neutral' });
    applyFreeze(target, player);

    target.freezeTurnsLeft--;
    if (target.freezeTurnsLeft <= 0) {
      target.isFrozen = false;
      target.freezeTurnsLeft = 0;
    }

    expect(target.isFrozen).toBe(false);
    expect(target.freezeTurnsLeft).toBe(0);
  });

  it('reapplying freeze resets duration', () => {
    const player = makeWeiPlayer();
    const target = makeMinion({ faction: 'neutral' });

    applyFreeze(target, player);
    expect(target.freezeTurnsLeft).toBe(2);

    // One turn passes
    target.freezeTurnsLeft--;

    // Reapply freeze
    applyFreeze(target, player);
    expect(target.freezeTurnsLeft).toBe(2);
  });

  it('freezes own minion with Wei enhancement', () => {
    const player = makeWeiPlayer();
    const ownMinion = makeMinion({ faction: 'wei' });

    applyFreeze(ownMinion, player);

    expect(ownMinion.isFrozen).toBe(true);
    expect(ownMinion.freezeTurnsLeft).toBe(2);
  });
});
