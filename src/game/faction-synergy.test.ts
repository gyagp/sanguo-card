import { describe, it, expect, beforeEach } from 'vitest';
import {
  GameState, PlayerState, BoardMinion, Card, Faction,
  FACTION_SYNERGIES, recalculateFactionSynergies, playCard,
  createDeck, createPlayerState, MAX_BOARD_SIZE, MAX_HAND_SIZE,
  DECK_FACTION_THRESHOLD, FactionPassive, FactionSynergyBonus, EffectContext,
  getEffectiveCardCost, applyFreeze, drawCard, Lane,
} from './types';
import {
  countFactionMinions, evaluateFactionSynergy, evaluateBoard,
  getBestManaUsage, createAI, getPlayableCards,
} from './ai';

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
    factionAttackBonus: 0, factionHealthBonus: 0, formationAtkBonus: 0, formationHpBonus: 0, brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0, wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0, qunDebuff: 0,
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
    spellsPlayed: [[], []], wuComboCount: [0, 0],
    terrain: { [Lane.Left]: null, [Lane.Center]: null, [Lane.Right]: null },
  };
}

describe('FACTION_SYNERGIES definition', () => {
  it('defines tiered synergy for all non-neutral factions', () => {
    for (const faction of ['shu', 'wei', 'wu', 'qun'] as const) {
      const synergy = FACTION_SYNERGIES[faction];
      expect(synergy.tiers).toBeDefined();
      expect(synergy.tiers.length).toBe(3);
      expect(synergy.tiers[0].requiredCount).toBe(2);
      expect(synergy.tiers[1].requiredCount).toBe(4);
      expect(synergy.tiers[2].requiredCount).toBe(6);
    }
    // Verify tier 1 bonuses match original values
    expect(FACTION_SYNERGIES.shu.tiers[0]).toEqual({ requiredCount: 2, attackBonus: 1, healthBonus: 0 });
    expect(FACTION_SYNERGIES.wei.tiers[0]).toEqual({ requiredCount: 2, attackBonus: 0, healthBonus: 1 });
    expect(FACTION_SYNERGIES.wu.tiers[0]).toEqual({ requiredCount: 2, attackBonus: 1, healthBonus: 1 });
    expect(FACTION_SYNERGIES.qun.tiers[0]).toEqual({ requiredCount: 2, attackBonus: 2, healthBonus: 0 });
  });
});

describe('recalculateFactionSynergies', () => {
  it('applies attack bonus when 2+ shu minions on board', () => {
    const m1 = makeMinion({ faction: 'shu', name: 'a', attack: 3, health: 3 });
    const m2 = makeMinion({ faction: 'shu', name: 'b', attack: 2, health: 2 });
    const player: PlayerState = createPlayerState(createDeck(makeDummyDeck()));
    player.board = [m1, m2];

    recalculateFactionSynergies(player);

    expect(m1.currentAttack).toBe(5); // 3 + 1 (faction) + 1 (shu adjacency)
    expect(m1.factionAttackBonus).toBe(1);
    expect(m2.currentAttack).toBe(4); // 2 + 1 (faction) + 1 (shu adjacency)
    expect(m2.factionAttackBonus).toBe(1);
  });

  it('applies health bonus for wei minions', () => {
    const m1 = makeMinion({ faction: 'wei', attack: 2, health: 3, lane: Lane.Left });
    const m2 = makeMinion({ faction: 'wei', attack: 1, health: 2, lane: Lane.Right });
    const player = createPlayerState(createDeck(makeDummyDeck()));
    player.board = [m1, m2];

    recalculateFactionSynergies(player);

    expect(m1.currentHealth).toBe(4); // 3 + 1
    expect(m1.factionHealthBonus).toBe(1);
    expect(m2.currentHealth).toBe(3); // 2 + 1
  });

  it('applies both attack and health bonus for wu', () => {
    const m1 = makeMinion({ faction: 'wu', attack: 3, health: 3, lane: Lane.Left });
    const m2 = makeMinion({ faction: 'wu', attack: 2, health: 2, lane: Lane.Right });
    const player = createPlayerState(createDeck(makeDummyDeck()));
    player.board = [m1, m2];

    recalculateFactionSynergies(player);

    expect(m1.currentAttack).toBe(4);
    expect(m1.currentHealth).toBe(4);
    expect(m2.currentAttack).toBe(3);
    expect(m2.currentHealth).toBe(3);
  });

  it('applies +2 atk for qun', () => {
    const m1 = makeMinion({ faction: 'qun', attack: 5, health: 5, lane: Lane.Left });
    const m2 = makeMinion({ faction: 'qun', attack: 4, health: 2, lane: Lane.Right });
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
    expect(m1.currentAttack).toBe(5); // 3 + 1 (faction) + 1 (adjacency)

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

    // Shu gets +1 atk (faction) + 1 atk (adjacency)
    expect(shu1.currentAttack).toBe(4);
    expect(shu2.currentAttack).toBe(5);
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

describe('DECK_FACTION_THRESHOLD', () => {
  it('is defined as 20', () => {
    expect(DECK_FACTION_THRESHOLD).toBe(20);
  });
});

describe('FactionPassive type', () => {
  it('can be constructed with required fields', () => {
    const passive: FactionPassive = {
      faction: 'shu',
      trigger: 'turn_start',
      description: 'Draw a card',
      effect: (ctx: EffectContext) => {},
    };
    expect(passive.faction).toBe('shu');
    expect(passive.trigger).toBe('turn_start');
    expect(typeof passive.effect).toBe('function');
  });
});

describe('FactionSynergyBonus tiered structure', () => {
  it('each faction has 3 tiers at 2/4/6 thresholds', () => {
    for (const faction of ['shu', 'wei', 'wu', 'qun'] as const) {
      const synergy = FACTION_SYNERGIES[faction];
      expect(synergy.tiers.map(t => t.requiredCount)).toEqual([2, 4, 6]);
    }
  });

  it('higher tiers have equal or better bonuses', () => {
    for (const faction of ['shu', 'wei', 'wu', 'qun'] as const) {
      const tiers = FACTION_SYNERGIES[faction].tiers;
      for (let i = 1; i < tiers.length; i++) {
        expect(tiers[i].attackBonus + tiers[i].healthBonus).toBeGreaterThanOrEqual(
          tiers[i - 1].attackBonus + tiers[i - 1].healthBonus
        );
      }
    }
  });
});

describe('AI evaluateFactionSynergy uses highest tier only (not accumulated)', () => {
  it('with 4 shu minions, uses tier 2 bonus only, not tier1+tier2', () => {
    const board = [
      makeMinion({ faction: 'shu' }),
      makeMinion({ faction: 'shu' }),
      makeMinion({ faction: 'shu' }),
      makeMinion({ faction: 'shu' }),
    ];
    // Tier 2 for shu: attackBonus=2, healthBonus=0 → 4 * 2 = 8
    // If accumulated (bug): tier1(1)+tier2(2) = 3 → 4*3=12
    expect(evaluateFactionSynergy(board)).toBe(8);
  });

  it('with 6 shu minions, uses tier 3 bonus only', () => {
    const board = Array.from({ length: 6 }, () => makeMinion({ faction: 'shu' }));
    // Tier 3 for shu: attackBonus=3, healthBonus=1 → 6 * 4 = 24
    // If accumulated (bug): (1+2+4) = 7 → 6*7=42
    expect(evaluateFactionSynergy(board)).toBe(24);
  });
});

describe('Wei control mechanics', () => {
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

  describe('getEffectiveCardCost', () => {
    it('reduces spell cost by 1 for Wei deck bonus player', () => {
      const player = makeWeiPlayer();
      const spell = makeCard({ faction: 'wei', cost: 3, type: 'spell' });
      expect(getEffectiveCardCost(spell, player)).toBe(2);
    });

    it('does not reduce cost below 0', () => {
      const player = makeWeiPlayer();
      const spell = makeCard({ faction: 'wei', cost: 0, type: 'spell' });
      expect(getEffectiveCardCost(spell, player)).toBe(0);
    });

    it('does not reduce minion cost for Wei player', () => {
      const player = makeWeiPlayer();
      const minion = makeCard({ faction: 'wei', cost: 3, type: 'minion' });
      expect(getEffectiveCardCost(minion, player)).toBe(3);
    });

    it('does not reduce spell cost for non-Wei player', () => {
      const player = makeNonWeiPlayer();
      const spell = makeCard({ faction: 'neutral', cost: 3, type: 'spell' });
      expect(getEffectiveCardCost(spell, player)).toBe(3);
    });

    it('does not reduce spell cost for Wei player without deck bonus', () => {
      const player = makeWeiPlayer();
      player.hasDeckFactionBonus = false;
      const spell = makeCard({ faction: 'wei', cost: 3, type: 'spell' });
      expect(getEffectiveCardCost(spell, player)).toBe(3);
    });
  });

  describe('applyFreeze', () => {
    it('sets freeze to 2 turns with Wei deck bonus', () => {
      const player = makeWeiPlayer();
      const minion = makeMinion({ faction: 'neutral' });
      applyFreeze(minion, player);
      expect(minion.isFrozen).toBe(true);
      expect(minion.freezeTurnsLeft).toBe(2);
    });

    it('sets freeze to 1 turn without Wei bonus', () => {
      const player = makeNonWeiPlayer();
      const minion = makeMinion({ faction: 'neutral' });
      applyFreeze(minion, player);
      expect(minion.isFrozen).toBe(true);
      expect(minion.freezeTurnsLeft).toBe(1);
    });
  });

  describe('Wei spell extra card draw', () => {
    it('draws extra card when Wei player plays a spell', () => {
      const player = makeWeiPlayer();
      for (let i = 0; i < 5; i++) {
        player.hand.push(makeCard({ faction: 'wei', name: `h${i}`, cost: 1, type: 'minion' }));
      }
      const spell = makeCard({ faction: 'wei', name: 'testspell', cost: 1, type: 'spell' });
      player.hand.push(spell);

      const opponent = makeNonWeiPlayer();
      for (let i = 0; i < 5; i++) {
        opponent.deck.push(makeCard({ faction: 'neutral', name: `od${i}`, cost: 1 }) as never);
      }

      const state: GameState = {
        players: [player, opponent],
        board: [player.board, opponent.board],
        turn: 1, phase: 'playing', turnPhase: 'play', activePlayer: 0,
        spellsPlayed: [[], []], wuComboCount: [0, 0],
      };

      const handSizeBefore = player.hand.length;
      const deckSizeBefore = player.deck.length;
      const spellIndex = player.hand.indexOf(spell);
      playCard(state, spellIndex);
      // Spell removed (-1), extra card drawn (+1) => net 0 change
      expect(player.hand.length).toBe(handSizeBefore - 1 + 1);
      expect(player.deck.length).toBe(deckSizeBefore - 1);
    });

    it('does not draw extra card for non-Wei player playing a spell', () => {
      const player = makeNonWeiPlayer();
      const spell = makeCard({ faction: 'neutral', name: 'testspell', cost: 1, type: 'spell' });
      player.hand.push(spell);

      const opponent = makeNonWeiPlayer();

      const state: GameState = {
        players: [player, opponent],
        board: [player.board, opponent.board],
        turn: 1, phase: 'playing', turnPhase: 'play', activePlayer: 0,
        spellsPlayed: [[], []], wuComboCount: [0, 0],
      };

      const deckSizeBefore = player.deck.length;
      playCard(state, 0);
      expect(player.deck.length).toBe(deckSizeBefore);
    });
  });

  describe('AI getPlayableCards with Wei cost reduction', () => {
    it('considers reduced spell cost for Wei player', () => {
      const player = makeWeiPlayer();
      player.hero.mana = 2;
      const hand: Card[] = [
        makeCard({ faction: 'wei', cost: 3, type: 'spell', name: 'expensiveSpell' }),
        makeCard({ faction: 'wei', cost: 1, type: 'minion', name: 'cheapMinion' }),
      ];
      player.hand = hand;
      // Spell cost 3 -> 2 with Wei bonus, so playable with 2 mana
      const playable = getPlayableCards(hand, 2, player);
      expect(playable).toContain(0);
      expect(playable).toContain(1);
    });

    it('does not reduce spell cost without player context', () => {
      const hand: Card[] = [
        makeCard({ faction: 'wei', cost: 3, type: 'spell', name: 'expensiveSpell' }),
      ];
      const playable = getPlayableCards(hand, 2);
      expect(playable).toEqual([]);
    });
  });
});
