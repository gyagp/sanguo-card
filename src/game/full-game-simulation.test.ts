import { describe, it, expect, beforeEach } from 'vitest';
import {
  GameState, Card, Faction, BoardMinion,
  createDeck, initializeGame, startTurn, endTurn,
  playCard, attackMinion, attackHero, useHeroPower, heroAttack,
  checkWinCondition, STARTING_HP, MAX_BOARD_SIZE,
  FACTION_HERO_POWERS, UPGRADED_FACTION_HERO_POWERS,
  gameEventBus, recalculateFactionSynergies,
  getEffectiveCardCost, applyQunTurnStartDebuff,
} from './types';
import { cards } from './cards';

function makeCard(overrides: Partial<Card> & { faction: Faction }): Card {
  return {
    name: 'filler', cost: 1, attack: 1, health: 1, description: '',
    rarity: 'common', type: 'minion',
    ...overrides,
  };
}

function buildFactionDeck(faction: Faction): Card[] {
  const factionCards = cards.filter(c => c.faction === faction);
  const neutralCards = cards.filter(c => c.faction === 'neutral');
  const deck: Card[] = [];
  const counts = new Map<string, number>();

  const addCard = (card: Card): boolean => {
    const max = card.rarity === 'legendary' ? 1 : 2;
    const cur = counts.get(card.name) ?? 0;
    if (cur >= max) return false;
    deck.push({ ...card });
    counts.set(card.name, cur + 1);
    return true;
  };

  for (const card of factionCards) {
    const max = card.rarity === 'legendary' ? 1 : 2;
    for (let i = 0; i < max && deck.length < 30; i++) {
      addCard(card);
    }
  }

  // Fill remaining with faction-flavored fillers to reach threshold
  let fillerIdx = 0;
  while (deck.length < 30) {
    const factionFillersNeeded = 20 - deck.filter(c => c.faction === faction).length;
    if (factionFillersNeeded > 0) {
      deck.push(makeCard({ faction, name: `${faction}_filler_${fillerIdx}`, cost: 1 }));
    } else {
      const card = neutralCards[fillerIdx % neutralCards.length];
      const cur = counts.get(card.name) ?? 0;
      const max = card.rarity === 'legendary' ? 1 : 2;
      if (cur < max) {
        addCard(card);
      } else {
        deck.push(makeCard({ faction: 'neutral', name: `neutral_filler_${fillerIdx}`, cost: 1 }));
      }
    }
    fillerIdx++;
  }

  return deck;
}

function buildNeutralDeck(): Card[] {
  const deck: Card[] = [];
  for (let i = 0; i < 30; i++) {
    deck.push(makeCard({ faction: 'neutral', name: `neutral_opp_${i}`, cost: Math.min(10, 1 + Math.floor(i / 3)) }));
  }
  return deck;
}

function simulateGame(factionDeck: Card[], opponentDeck: Card[], maxTurns = 30): {
  state: GameState;
  winner: 0 | 1 | 'draw' | null;
  turnsPlayed: number;
  factionPassiveTriggered: boolean;
  heroPowerUsedCount: number;
} {
  const deck1 = createDeck(factionDeck);
  const deck2 = createDeck(opponentDeck);
  const state = initializeGame(deck1, deck2);

  let turnsPlayed = 0;
  let factionPassiveTriggered = false;
  let heroPowerUsedCount = 0;

  for (let t = 0; t < maxTurns * 2; t++) {
    if (state.phase === 'ended') break;

    const drawResult = startTurn(state);
    turnsPlayed++;

    const player = state.players[state.activePlayer];

    if (state.activePlayer === 0 && player.hasDeckFactionBonus) {
      factionPassiveTriggered = true;
    }

    let playedThisTurn = 0;
    for (let attempt = 0; attempt < 10; attempt++) {
      if (player.hand.length === 0) break;
      if (player.board.length >= MAX_BOARD_SIZE) break;

      let bestIdx = -1;
      let bestCost = -1;
      for (let i = 0; i < player.hand.length; i++) {
        const card = player.hand[i];
        const cost = getEffectiveCardCost(card, player);
        if (cost <= player.hero.mana && cost > bestCost) {
          if (card.type === 'minion' && player.board.length >= MAX_BOARD_SIZE) continue;
          bestIdx = i;
          bestCost = cost;
        }
      }

      if (bestIdx === -1) break;

      const result = playCard(state, bestIdx);
      if (!result.success) break;
      playedThisTurn++;

      if (state.phase === 'ended') break;
    }

    if (state.phase === 'ended') break;

    if (!player.heroPowerUsed && player.hero.mana >= player.hero.heroPower.cost) {
      const hpResult = useHeroPower(state);
      if (hpResult.success) heroPowerUsedCount++;
      if (state.phase === 'ended') break;
    }

    const opponentIdx = state.activePlayer === 0 ? 1 : 0;

    for (let i = 0; i < player.board.length; i++) {
      if (state.phase === 'ended') break;
      const minion = player.board[i];
      if (!minion || minion.summoningSickness || minion.hasAttacked || minion.isFrozen) continue;
      if (minion.currentAttack <= 0) continue;

      const opponent = state.players[opponentIdx];
      const hasTaunt = opponent.board.some(m => m.taunt);

      if (hasTaunt) {
        const tauntIdx = opponent.board.findIndex(m => m.taunt);
        if (tauntIdx >= 0) {
          attackMinion(state, i, tauntIdx);
        }
      } else if (opponent.board.length > 0 && minion.currentAttack >= opponent.board[0].currentHealth) {
        attackMinion(state, i, 0);
      } else {
        attackHero(state, i);
      }

      if (state.phase === 'ended') break;

      if (minion.windfury && minion.windfuryAttacksLeft > 0 && !minion.hasAttacked) {
        const opAfter = state.players[opponentIdx];
        if (opAfter.board.length > 0) {
          const tauntIdx2 = opAfter.board.findIndex(m => m.taunt);
          if (tauntIdx2 >= 0) {
            attackMinion(state, player.board.indexOf(minion), tauntIdx2);
          } else {
            attackHero(state, player.board.indexOf(minion));
          }
        } else {
          attackHero(state, player.board.indexOf(minion));
        }
      }
    }

    if (state.phase === 'ended') break;

    if (player.weapon && !player.heroHasAttacked) {
      const opponent = state.players[opponentIdx];
      if (opponent.board.length > 0) {
        const tauntIdx = opponent.board.findIndex(m => m.taunt);
        if (tauntIdx >= 0) {
          heroAttack(state, opponentIdx as 0 | 1, tauntIdx);
        } else {
          heroAttack(state, opponentIdx as 0 | 1);
        }
      } else {
        heroAttack(state, opponentIdx as 0 | 1);
      }
    }

    if (state.phase === 'ended') break;

    endTurn(state);
  }

  const winner = checkWinCondition(state);

  return { state, winner, turnsPlayed, factionPassiveTriggered, heroPowerUsedCount };
}

describe('Full game simulation — faction integration', () => {
  beforeEach(() => {
    gameEventBus.clear();
  });

  describe('Wei deck', () => {
    it('completes a full game without errors', () => {
      const weiDeck = buildFactionDeck('wei');
      const neutralDeck = buildNeutralDeck();
      const result = simulateGame(weiDeck, neutralDeck);

      expect(result.turnsPlayed).toBeGreaterThan(0);
      expect(result.state.phase).toBe('ended');
      expect(result.winner).not.toBeNull();
    });

    it('has deck faction bonus and upgraded hero power', () => {
      const weiDeck = buildFactionDeck('wei');
      const deck = createDeck(weiDeck);
      const state = initializeGame(deck, createDeck(buildNeutralDeck()));

      expect(state.players[0].deckFaction).toBe('wei');
      expect(state.players[0].hasDeckFactionBonus).toBe(true);
      expect(state.players[0].hero.heroPower.name).toBe('霸略·升级');
    });

    it('faction passive triggers — spell cost reduction', () => {
      const weiDeck = buildFactionDeck('wei');
      const neutralDeck = buildNeutralDeck();
      const result = simulateGame(weiDeck, neutralDeck);

      expect(result.factionPassiveTriggered).toBe(true);
    });

    it('hero power is used during gameplay', () => {
      const weiDeck = buildFactionDeck('wei');
      const neutralDeck = buildNeutralDeck();
      const result = simulateGame(weiDeck, neutralDeck);

      expect(result.heroPowerUsedCount).toBeGreaterThan(0);
    });

    it('upgraded hero power deals 2 damage', () => {
      const weiDeck = buildFactionDeck('wei');
      const deck1 = createDeck(weiDeck);
      const deck2 = createDeck(buildNeutralDeck());
      const state = initializeGame(deck1, deck2);

      state.players[0].hero.mana = 2;
      state.activePlayer = 0;
      state.turnPhase = 'play';

      const hpBefore = state.players[1].hero.health;
      useHeroPower(state);
      expect(state.players[1].hero.health).toBe(hpBefore - 2);
    });
  });

  describe('Shu deck', () => {
    it('completes a full game without errors', () => {
      const shuDeck = buildFactionDeck('shu');
      const neutralDeck = buildNeutralDeck();
      const result = simulateGame(shuDeck, neutralDeck);

      expect(result.turnsPlayed).toBeGreaterThan(0);
      expect(result.state.phase).toBe('ended');
      expect(result.winner).not.toBeNull();
    });

    it('has deck faction bonus and upgraded hero power', () => {
      const shuDeck = buildFactionDeck('shu');
      const deck = createDeck(shuDeck);
      const state = initializeGame(deck, createDeck(buildNeutralDeck()));

      expect(state.players[0].deckFaction).toBe('shu');
      expect(state.players[0].hasDeckFactionBonus).toBe(true);
      expect(state.players[0].hero.heroPower.name).toBe('仁德·升级');
    });

    it('upgraded hero power heals 3', () => {
      const shuDeck = buildFactionDeck('shu');
      const deck1 = createDeck(shuDeck);
      const deck2 = createDeck(buildNeutralDeck());
      const state = initializeGame(deck1, deck2);

      state.players[0].hero.health = 20;
      state.players[0].hero.mana = 2;
      state.activePlayer = 0;
      state.turnPhase = 'play';

      useHeroPower(state);
      expect(state.players[0].hero.health).toBe(23);
    });

    it('faction synergy applies adjacency bonus to shu minions', () => {
      const shuDeck = buildFactionDeck('shu');
      const deck = createDeck(shuDeck);
      const state = initializeGame(deck, createDeck(buildNeutralDeck()));

      const shuMinion1: BoardMinion = {
        name: '赵云', cost: 4, attack: 4, health: 4, description: '',
        rarity: 'rare', type: 'minion', faction: 'shu',
        currentAttack: 4, currentHealth: 4,
        summoningSickness: false, hasAttacked: false,
        hasDivineShield: false, isStealth: false, isFrozen: false,
        freezeTurnsLeft: 0, isImmune: false, windfuryAttacksLeft: 1,
        enrageActive: false, enrageBonus: 0,
        factionAttackBonus: 0, factionHealthBonus: 0,
        formationAtkBonus: 0, formationHpBonus: 0,
        brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0,
        wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0, qunDebuff: 0,
      };
      const shuMinion2 = { ...shuMinion1, name: '张飞' };

      state.players[0].board = [shuMinion1, shuMinion2];
      recalculateFactionSynergies(state.players[0]);

      expect(shuMinion1.factionAttackBonus).toBe(1);
      expect(shuMinion1.formationAtkBonus).toBe(1);
    });
  });

  describe('Wu deck', () => {
    it('completes a full game without errors', () => {
      const wuDeck = buildFactionDeck('wu');
      const neutralDeck = buildNeutralDeck();
      const result = simulateGame(wuDeck, neutralDeck);

      expect(result.turnsPlayed).toBeGreaterThan(0);
      expect(result.state.phase).toBe('ended');
      expect(result.winner).not.toBeNull();
    });

    it('has deck faction bonus and upgraded hero power', () => {
      const wuDeck = buildFactionDeck('wu');
      const deck = createDeck(wuDeck);
      const state = initializeGame(deck, createDeck(buildNeutralDeck()));

      expect(state.players[0].deckFaction).toBe('wu');
      expect(state.players[0].hasDeckFactionBonus).toBe(true);
      expect(state.players[0].hero.heroPower.name).toBe('制衡·升级');
    });

    it('upgraded hero power summons 2/1 token', () => {
      const wuDeck = buildFactionDeck('wu');
      const deck1 = createDeck(wuDeck);
      const deck2 = createDeck(buildNeutralDeck());
      const state = initializeGame(deck1, deck2);

      state.players[0].hero.mana = 2;
      state.activePlayer = 0;
      state.turnPhase = 'play';

      useHeroPower(state);
      expect(state.players[0].board.length).toBe(1);
      expect(state.players[0].board[0].currentAttack).toBe(2);
      expect(state.players[0].board[0].currentHealth).toBe(1);
    });

    it('faction passive triggers during game', () => {
      const wuDeck = buildFactionDeck('wu');
      const neutralDeck = buildNeutralDeck();
      const result = simulateGame(wuDeck, neutralDeck);

      expect(result.factionPassiveTriggered).toBe(true);
    });
  });

  describe('Qun deck', () => {
    it('completes a full game without errors', () => {
      const qunDeck = buildFactionDeck('qun');
      const neutralDeck = buildNeutralDeck();
      const result = simulateGame(qunDeck, neutralDeck);

      expect(result.turnsPlayed).toBeGreaterThan(0);
      expect(result.state.phase).toBe('ended');
      expect(result.winner).not.toBeNull();
    });

    it('has deck faction bonus and upgraded hero power', () => {
      const qunDeck = buildFactionDeck('qun');
      const deck = createDeck(qunDeck);
      const state = initializeGame(deck, createDeck(buildNeutralDeck()));

      expect(state.players[0].deckFaction).toBe('qun');
      expect(state.players[0].hasDeckFactionBonus).toBe(true);
      expect(state.players[0].hero.heroPower.name).toBe('乱击·升级');
    });

    it('upgraded hero power equips 2/2 weapon', () => {
      const qunDeck = buildFactionDeck('qun');
      const deck1 = createDeck(qunDeck);
      const deck2 = createDeck(buildNeutralDeck());
      const state = initializeGame(deck1, deck2);

      state.players[0].hero.mana = 2;
      state.activePlayer = 0;
      state.turnPhase = 'play';

      useHeroPower(state);
      expect(state.players[0].weapon).not.toBeNull();
      expect(state.players[0].weapon!.attack).toBe(2);
      expect(state.players[0].weapon!.durability).toBe(2);
    });

    it('qun turn-start debuff triggers with 3+ qun minions', () => {
      const qunDeck = buildFactionDeck('qun');
      const deck1 = createDeck(qunDeck);
      const deck2 = createDeck(buildNeutralDeck());
      const state = initializeGame(deck1, deck2);

      const makeQunMinion = (name: string): BoardMinion => ({
        name, cost: 1, attack: 3, health: 3, description: '',
        rarity: 'common', type: 'minion', faction: 'qun',
        currentAttack: 3, currentHealth: 3,
        summoningSickness: false, hasAttacked: false,
        hasDivineShield: false, isStealth: false, isFrozen: false,
        freezeTurnsLeft: 0, isImmune: false, windfuryAttacksLeft: 1,
        enrageActive: false, enrageBonus: 0,
        factionAttackBonus: 0, factionHealthBonus: 0,
        formationAtkBonus: 0, formationHpBonus: 0,
        brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0,
        wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0, qunDebuff: 0,
      });

      state.players[0].board = [makeQunMinion('a'), makeQunMinion('b'), makeQunMinion('c')];
      state.board[0] = state.players[0].board;

      const enemyMinion: BoardMinion = {
        ...makeQunMinion('enemy'), faction: 'neutral', currentAttack: 5,
      };
      state.players[1].board = [enemyMinion];
      state.board[1] = state.players[1].board;

      state.activePlayer = 0;
      applyQunTurnStartDebuff(state, 0, () => 0.1);

      expect(enemyMinion.currentAttack).toBe(4);
      expect(enemyMinion.qunDebuff).toBe(1);
    });
  });

  describe('Cross-faction interactions', () => {
    it('wei vs shu game completes', () => {
      const weiDeck = buildFactionDeck('wei');
      const shuDeck = buildFactionDeck('shu');
      const result = simulateGame(weiDeck, shuDeck);

      expect(result.turnsPlayed).toBeGreaterThan(0);
      expect(result.state.phase).toBe('ended');
    });

    it('wu vs qun game completes', () => {
      const wuDeck = buildFactionDeck('wu');
      const qunDeck = buildFactionDeck('qun');
      const result = simulateGame(wuDeck, qunDeck);

      expect(result.turnsPlayed).toBeGreaterThan(0);
      expect(result.state.phase).toBe('ended');
    });

    it('draw condition handled explicitly', () => {
      const weiDeck = buildFactionDeck('wei');
      const deck1 = createDeck(weiDeck);
      const deck2 = createDeck(buildFactionDeck('shu'));
      const state = initializeGame(deck1, deck2);

      state.players[0].hero.health = 0;
      state.players[1].hero.health = 0;

      const result = checkWinCondition(state);
      expect(result).toBe('draw');
    });
  });
});
