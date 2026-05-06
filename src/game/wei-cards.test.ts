import { describe, it, expect, beforeEach } from 'vitest';
import {
  GameState, PlayerState, BoardMinion, Card, Faction, Lane,
  createDeck, createPlayerState, playCard, STARTING_HP,
  gameEventBus,
} from './types';
import { cards } from './cards';

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
    factionAttackBonus: 0, factionHealthBonus: 0, formationAtkBonus: 0, formationHpBonus: 0,
    brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0, wuChargeBonus: 0, wuWeaponBonus: 0,
    wuComboAtkBonus: 0, wuComboHpBonus: 0, qunDebuff: 0,
    lane: Lane.Center, slotIndex: 0,
    heroSkillAtkBonus: 0, heroSkillHpBonus: 0, heroSkillCooldownLeft: 0,
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
    terrain: { [Lane.Left]: null, [Lane.Center]: null, [Lane.Right]: null },
  };
}

function findCard(name: string): Card {
  const card = cards.find(c => c.name === name);
  if (!card) throw new Error(`Card "${name}" not found`);
  return card;
}

beforeEach(() => {
  gameEventBus.clear();
});

describe('Wei cards exist in card pool', () => {
  it('has 5 Wei spells', () => {
    const weiSpells = cards.filter(c => c.type === 'spell' && c.faction === 'wei');
    expect(weiSpells.length).toBeGreaterThanOrEqual(5);
  });

  it('has 2 Wei weapons', () => {
    const weiWeapons = cards.filter(c => c.type === 'weapon' && c.faction === 'wei');
    expect(weiWeapons.length).toBeGreaterThanOrEqual(2);
  });

  const expectedSpells = ['令行禁止', '屯田令', '挟天子以令诸侯', '离间计', '九品中正'];
  const expectedWeapons = ['倚天剑', '青釭剑'];

  for (const name of [...expectedSpells, ...expectedWeapons]) {
    it(`card "${name}" exists`, () => {
      expect(cards.find(c => c.name === name)).toBeDefined();
    });
  }
});

describe('令行禁止 (freeze + heal)', () => {
  it('freezes enemy minion and heals hero by 3', () => {
    const player = makeWeiPlayer();
    const opponent = makeNonWeiPlayer();
    const card = { ...findCard('令行禁止') };
    player.hand = [card];
    opponent.board.push(makeMinion({ faction: 'neutral', name: 'target', attack: 3, health: 5 }));
    player.hero.health = 20;
    const state = makeState(player, opponent);

    playCard(state, 0, 0);

    expect(opponent.board[0].isFrozen).toBe(true);
    expect(player.hero.health).toBe(23);
  });

  it('does not heal above STARTING_HP', () => {
    const player = makeWeiPlayer();
    const opponent = makeNonWeiPlayer();
    const card = { ...findCard('令行禁止') };
    player.hand = [card];
    opponent.board.push(makeMinion({ faction: 'neutral', name: 'target', attack: 1, health: 1 }));
    player.hero.health = STARTING_HP;
    const state = makeState(player, opponent);

    playCard(state, 0, 0);

    expect(player.hero.health).toBe(STARTING_HP);
  });
});

describe('屯田令 (+0/+2 to all friendly)', () => {
  it('gives +0/+2 to all friendly minions', () => {
    const player = makeWeiPlayer();
    const opponent = makeNonWeiPlayer();
    const card = { ...findCard('屯田令') };
    player.hand = [card];
    player.board.push(makeMinion({ faction: 'wei', name: 'm1', attack: 2, health: 3 }));
    player.board.push(makeMinion({ faction: 'wei', name: 'm2', attack: 1, health: 1 }));
    const state = makeState(player, opponent);

    playCard(state, 0);

    expect(player.board[0].currentHealth).toBe(5);
    expect(player.board[0].currentAttack).toBe(2);
    expect(player.board[1].currentHealth).toBe(3);
  });

  it('does nothing with empty board', () => {
    const player = makeWeiPlayer();
    const opponent = makeNonWeiPlayer();
    const card = { ...findCard('屯田令') };
    player.hand = [card];
    const state = makeState(player, opponent);

    playCard(state, 0);
    // no error
  });
});

describe('挟天子以令诸侯 (draw 2 + heal 5)', () => {
  it('draws 2 cards and heals 5', () => {
    const player = makeWeiPlayer();
    const opponent = makeNonWeiPlayer();
    const card = { ...findCard('挟天子以令诸侯') };
    player.hand = [card];
    player.hero.health = 20;
    const state = makeState(player, opponent);

    const deckBefore = player.deck.length;
    const handBefore = player.hand.length;
    playCard(state, 0);

    // 2 draws from spell + 1 extra draw from Wei bonus = 3 total draws
    expect(player.deck.length).toBe(deckBefore - 3);
    expect(player.hero.health).toBe(25);
  });
});

describe('离间计 (3 damage + conditional freeze)', () => {
  it('deals 3 damage and freezes if target survives', () => {
    const player = makeWeiPlayer();
    const opponent = makeNonWeiPlayer();
    const card = { ...findCard('离间计') };
    player.hand = [card];
    opponent.board.push(makeMinion({ faction: 'neutral', name: 'target', attack: 2, health: 6 }));
    const state = makeState(player, opponent);

    playCard(state, 0, 0);

    expect(opponent.board[0].currentHealth).toBe(3);
    expect(opponent.board[0].isFrozen).toBe(true);
  });

  it('does not freeze if target dies', () => {
    const player = makeWeiPlayer();
    const opponent = makeNonWeiPlayer();
    const card = { ...findCard('离间计') };
    player.hand = [card];
    opponent.board.push(makeMinion({ faction: 'neutral', name: 'target', attack: 2, health: 3 }));
    const state = makeState(player, opponent);

    playCard(state, 0, 0);

    // Target should be dead (health <= 0), removed by removeDeadMinions or still at 0
    const target = opponent.board.find(m => m.name === 'target');
    if (target) {
      expect(target.currentHealth).toBeLessThanOrEqual(0);
      expect(target.isFrozen).toBe(false);
    }
  });
});

describe('九品中正 (+2/+3 to all friendly + heal 5)', () => {
  it('buffs all friendly minions and heals hero', () => {
    const player = makeWeiPlayer();
    const opponent = makeNonWeiPlayer();
    const card = { ...findCard('九品中正') };
    player.hand = [card];
    player.board.push(makeMinion({ faction: 'wei', name: 'm1', attack: 3, health: 4 }));
    player.board.push(makeMinion({ faction: 'wei', name: 'm2', attack: 1, health: 2 }));
    player.hero.health = 20;
    const state = makeState(player, opponent);

    playCard(state, 0);

    expect(player.board[0].currentAttack).toBe(5);
    expect(player.board[0].currentHealth).toBe(7);
    expect(player.board[1].currentAttack).toBe(3);
    expect(player.board[1].currentHealth).toBe(5);
    expect(player.hero.health).toBe(25);
  });
});

describe('倚天剑 (weapon + battlecry heal 4)', () => {
  it('equips weapon and heals hero by 4', () => {
    const player = makeWeiPlayer();
    const opponent = makeNonWeiPlayer();
    const card = { ...findCard('倚天剑') };
    player.hand = [card];
    player.hero.health = 20;
    const state = makeState(player, opponent);

    playCard(state, 0);

    expect(player.weapon).toBeDefined();
    expect(player.weapon!.attack).toBe(4);
    expect(player.weapon!.durability).toBe(2);
    expect(player.hero.health).toBe(24);
  });

  it('does not heal above STARTING_HP', () => {
    const player = makeWeiPlayer();
    const opponent = makeNonWeiPlayer();
    const card = { ...findCard('倚天剑') };
    player.hand = [card];
    player.hero.health = STARTING_HP;
    const state = makeState(player, opponent);

    playCard(state, 0);

    expect(player.hero.health).toBe(STARTING_HP);
  });
});

describe('青釭剑 (weapon + battlecry draw 1)', () => {
  it('equips weapon and draws a card', () => {
    const player = makeWeiPlayer();
    const opponent = makeNonWeiPlayer();
    const card = { ...findCard('青釭剑') };
    player.hand = [card];
    const state = makeState(player, opponent);

    const deckBefore = player.deck.length;
    playCard(state, 0);

    expect(player.weapon).toBeDefined();
    expect(player.weapon!.attack).toBe(2);
    expect(player.weapon!.durability).toBe(3);
    expect(player.deck.length).toBe(deckBefore - 1);
  });
});

describe('Wei identity fit', () => {
  it('all Wei spells have control/armor/draw effects', () => {
    const weiSpells = cards.filter(c => c.type === 'spell' && c.faction === 'wei');
    for (const spell of weiSpells) {
      const desc = spell.description;
      const hasControl = /冻结|伤害/.test(desc);
      const hasDefense = /生命值|护甲|\+0\/\+\d/.test(desc);
      const hasDraw = /抽/.test(desc);
      expect(hasControl || hasDefense || hasDraw).toBe(true);
    }
  });

  it('Wei weapons have reasonable stats', () => {
    const weiWeapons = cards.filter(c => c.type === 'weapon' && c.faction === 'wei');
    for (const weapon of weiWeapons) {
      expect(weapon.attack).toBeGreaterThan(0);
      expect(weapon.health).toBeGreaterThan(0);
      expect(weapon.cost).toBeGreaterThan(0);
    }
  });
});
