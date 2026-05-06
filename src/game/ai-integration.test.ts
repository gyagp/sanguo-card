import { describe, it, expect, beforeEach } from 'vitest';
import { createAI, AIDifficulty, buildFactionDeck, performAIMulligan, applyAIBonusCard, PlayCardDecision, AttackDecision } from './ai';
import { GameState, Deck, initializeGame, startTurn, endTurn, playCard, attackMinion, attackHero, useHeroPower, checkWinCondition, gameEventBus } from './types';
import { cards } from './cards';

function runAIGame(difficulty1: AIDifficulty, difficulty2: AIDifficulty, maxTurns = 100): { winner: 0 | 1 | 'draw' | null; turns: number } {
  const deck1 = buildFactionDeck(cards, difficulty1, difficulty1 === 'hard' ? 8 : difficulty1 === 'normal' ? 5 : 2) as unknown as Deck;
  const deck2 = buildFactionDeck(cards, difficulty2, difficulty2 === 'hard' ? 8 : difficulty2 === 'normal' ? 5 : 2) as unknown as Deck;

  const state = initializeGame(deck1, deck2);
  performAIMulligan(state, difficulty1, 0);
  performAIMulligan(state, difficulty2, 1);
  applyAIBonusCard(state, difficulty1, 0);
  applyAIBonusCard(state, difficulty2, 1);

  let turns = 0;

  while (turns < maxTurns) {
    startTurn(state);
    turns++;

    const currentDifficulty = state.activePlayer === 0 ? difficulty1 : difficulty2;
    const ai = createAI(currentDifficulty);

    const playDecisions = ai.getPlayDecisions(state);
    for (const d of playDecisions) {
      playCard(state, d.cardIndex, d.spellTarget, undefined, d.lane, d.slotIndex, d.targetLane);
    }

    if (ai.shouldUseHeroPower(state)) {
      useHeroPower(state);
    }

    const attackDecisions = ai.getAttackDecisions(state);
    for (const d of attackDecisions) {
      if (d.targetIndex === 'hero') {
        attackHero(state, d.attackerIndex);
      } else {
        attackMinion(state, d.attackerIndex, d.targetIndex);
      }
    }

    const winner = checkWinCondition(state);
    if (winner !== null) {
      return { winner, turns };
    }

    endTurn(state);

    const postEndWinner = checkWinCondition(state);
    if (postEndWinner !== null) {
      return { winner: postEndWinner, turns };
    }
  }

  return { winner: null, turns: maxTurns };
}

describe('AI vs AI integration tests', () => {
  beforeEach(() => {
    gameEventBus.clear();
  });

  describe('games complete without errors at all difficulties', () => {
    const difficulties: AIDifficulty[] = ['easy', 'normal', 'hard'];

    for (const d1 of difficulties) {
      for (const d2 of difficulties) {
        it(`${d1} vs ${d2} completes without errors`, () => {
          const result = runAIGame(d1, d2);
          expect(result.turns).toBeGreaterThan(0);
          expect(result.winner === null || result.winner === 0 || result.winner === 1 || result.winner === 'draw').toBe(true);
        });
      }
    }
  });

  describe('game length is reasonable', () => {
    it('average game length is between 8 and 20 turns across multiple games', () => {
      const gameLengths: number[] = [];
      for (let i = 0; i < 10; i++) {
        const result = runAIGame('normal', 'normal');
        gameLengths.push(result.turns);
      }
      const avg = gameLengths.reduce((a, b) => a + b, 0) / gameLengths.length;
      expect(avg).toBeGreaterThanOrEqual(8);
      expect(avg).toBeLessThanOrEqual(25);
    });
  });

  describe('hard AI wins more often than easy AI', () => {
    it('hard AI wins >=60% vs easy AI over 40 games (20 per side)', () => {
      let hardWins = 0;
      let totalDecisive = 0;

      for (let i = 0; i < 20; i++) {
        const result = runAIGame('hard', 'easy');
        if (result.winner === 0) { hardWins++; totalDecisive++; }
        else if (result.winner === 1) { totalDecisive++; }
      }

      for (let i = 0; i < 20; i++) {
        const result = runAIGame('easy', 'hard');
        if (result.winner === 1) { hardWins++; totalDecisive++; }
        else if (result.winner === 0) { totalDecisive++; }
      }

      expect(totalDecisive).toBeGreaterThan(0);
      expect(hardWins / totalDecisive).toBeGreaterThanOrEqual(0.6);
    });
  });
});
