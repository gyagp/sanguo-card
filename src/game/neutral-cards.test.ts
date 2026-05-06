import { describe, it, expect, beforeEach } from 'vitest';
import {
  GameState, PlayerState, BoardMinion, Card, Faction, Lane,
  createDeck, createPlayerState, playCard, STARTING_HP,
  gameEventBus, removeDeadMinions,
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

function makePlayer(): PlayerState {
  const deck = createDeck(Array.from({ length: 30 }, (_, i) =>
    makeCard({ faction: 'neutral', name: `n${i}`, cost: 1 })
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

describe('Neutral card counts', () => {
  it('has exactly 5 NEW neutral spells', () => {
    const existingSpells = ['烽火', '征兵令', '草药', '伏兵'];
    const newNeutralSpells = cards.filter(
      c => c.type === 'spell' && c.faction === 'neutral' && !existingSpells.includes(c.name)
    );
    expect(newNeutralSpells).toHaveLength(5);
  });

  it('has exactly 2 neutral traps', () => {
    const neutralTraps = cards.filter(c => c.type === 'trap' && c.faction === 'neutral');
    expect(neutralTraps).toHaveLength(2);
  });

  it('total card count is 136', () => {
    expect(cards).toHaveLength(136);
  });

  it('no duplicate card names', () => {
    const names = cards.map(c => c.name);
    expect(names.length).toBe(new Set(names).size);
  });
});

describe('急救术 spell', () => {
  it('heals hero by 4 and draws a card', () => {
    const card = findCard('急救术');
    const player = makePlayer();
    const opponent = makePlayer();
    player.hero.health = 20;
    const handSizeBefore = player.hand.length;
    const state = makeState(player, opponent);

    player.hand.push(card);
    playCard(state, 0, player.hand.length - 1, Lane.Center, 0);

    expect(state.players[0].hero.health).toBe(24);
    expect(state.players[0].hand.length).toBe(handSizeBefore + 1);
  });

  it('caps healing at STARTING_HP', () => {
    const card = findCard('急救术');
    const player = makePlayer();
    const opponent = makePlayer();
    player.hero.health = STARTING_HP - 1;
    const state = makeState(player, opponent);

    player.hand.push(card);
    playCard(state, 0, player.hand.length - 1, Lane.Center, 0);

    expect(state.players[0].hero.health).toBe(STARTING_HP);
  });
});

describe('搜罗贤才 spell', () => {
  it('draws 2 cards', () => {
    const card = findCard('搜罗贤才');
    const player = makePlayer();
    const opponent = makePlayer();
    const handSizeBefore = player.hand.length;
    const state = makeState(player, opponent);

    player.hand.push(card);
    playCard(state, 0, player.hand.length - 1, Lane.Center, 0);

    expect(state.players[0].hand.length).toBe(handSizeBefore + 2);
  });
});

describe('天降流火 spell', () => {
  it('deals 2 damage to all enemy minions and removes dead ones', () => {
    const card = findCard('天降流火');
    const player = makePlayer();
    const opponent = makePlayer();
    const state = makeState(player, opponent);

    opponent.board.push(makeMinion({ faction: 'neutral', name: 'a', attack: 2, health: 5 }));
    opponent.board.push(makeMinion({ faction: 'neutral', name: 'b', attack: 1, health: 1 }));

    player.hand.push(card);
    playCard(state, 0, player.hand.length - 1, Lane.Center, 0);

    const surviving = state.players[1].board.filter(m => m.name === 'a');
    expect(surviving).toHaveLength(1);
    expect(surviving[0].currentHealth).toBe(3);
    expect(state.players[1].board.filter(m => m.name === 'b')).toHaveLength(0);
  });

  it('does not damage friendly minions', () => {
    const card = findCard('天降流火');
    const player = makePlayer();
    const opponent = makePlayer();
    const state = makeState(player, opponent);

    player.board.push(makeMinion({ faction: 'neutral', name: 'friendly', attack: 2, health: 3 }));
    opponent.board.push(makeMinion({ faction: 'neutral', name: 'enemy', attack: 2, health: 5 }));

    player.hand.push(card);
    playCard(state, 0, player.hand.length - 1, Lane.Center, 0);

    expect(state.players[0].board.find(m => m.name === 'friendly')!.currentHealth).toBe(3);
  });
});

describe('战鼓号令 spell', () => {
  it('gives all friendly minions +1/+1', () => {
    const card = findCard('战鼓号令');
    const player = makePlayer();
    const opponent = makePlayer();
    const state = makeState(player, opponent);

    player.board.push(makeMinion({ faction: 'neutral', name: 'a', attack: 2, health: 3 }));
    player.board.push(makeMinion({ faction: 'neutral', name: 'b', attack: 1, health: 1 }));

    player.hand.push(card);
    playCard(state, 0, player.hand.length - 1, Lane.Center, 0);

    const a = state.players[0].board.find(m => m.name === 'a')!;
    const b = state.players[0].board.find(m => m.name === 'b')!;
    expect(a.currentAttack).toBe(3);
    expect(a.currentHealth).toBe(4);
    expect(b.currentAttack).toBe(2);
    expect(b.currentHealth).toBe(2);
  });

  it('does not buff enemy minions', () => {
    const card = findCard('战鼓号令');
    const player = makePlayer();
    const opponent = makePlayer();
    const state = makeState(player, opponent);

    opponent.board.push(makeMinion({ faction: 'neutral', name: 'enemy', attack: 2, health: 3 }));

    player.hand.push(card);
    playCard(state, 0, player.hand.length - 1, Lane.Center, 0);

    expect(state.players[1].board[0].currentAttack).toBe(2);
    expect(state.players[1].board[0].currentHealth).toBe(3);
  });
});

describe('天命裁决 spell', () => {
  it('destroys a target enemy minion', () => {
    const card = findCard('天命裁决');
    const player = makePlayer();
    const opponent = makePlayer();
    const state = makeState(player, opponent);

    opponent.board.push(makeMinion({ faction: 'neutral', name: 'target', attack: 5, health: 10 }));

    player.hand.push(card);
    playCard(state, 0, player.hand.length - 1, Lane.Center, 0);

    expect(state.players[1].board.filter(m => m.name === 'target')).toHaveLength(0);
  });
});

describe('绊马索 trap', () => {
  it('exists as a neutral trap with on_attack trigger', () => {
    const card = findCard('绊马索');
    expect(card.type).toBe('trap');
    expect(card.faction).toBe('neutral');
    expect(card.trapTrigger).toBe('on_attack');
    expect(card.trapEffect).toBeDefined();
  });
});

describe('落石阵 trap', () => {
  it('exists as a neutral trap with on_play trigger', () => {
    const card = findCard('落石阵');
    expect(card.type).toBe('trap');
    expect(card.faction).toBe('neutral');
    expect(card.trapTrigger).toBe('on_play');
    expect(card.trapEffect).toBeDefined();
  });

  it('deals 3 damage to the triggering minion', () => {
    const card = findCard('落石阵');
    const minion = makeMinion({ faction: 'neutral', name: 'victim', attack: 2, health: 5 });
    const player = makePlayer();
    const opponent = makePlayer();
    const state = makeState(player, opponent);

    card.trapEffect!(state, { player: 0, triggeringMinion: minion });
    expect(minion.currentHealth).toBe(2);
  });
});
