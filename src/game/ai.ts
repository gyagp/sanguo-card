import { GameState, PlayerState, Card, BoardMinion } from './types';

export type AIDecisionType = 'playCard' | 'attack' | 'useHeroPower' | 'endTurn';

export interface PlayCardDecision {
  type: 'playCard';
  cardIndex: number;
}

export interface AttackDecision {
  type: 'attack';
  attackerIndex: number;
  targetIndex: number | 'hero';
}

export interface UseHeroPowerDecision {
  type: 'useHeroPower';
}

export interface EndTurnDecision {
  type: 'endTurn';
}

export type AIDecision =
  | PlayCardDecision
  | AttackDecision
  | UseHeroPowerDecision
  | EndTurnDecision;

const MINION_VALUE_PER_STAT = 1;
const HERO_HEALTH_WEIGHT = 0.5;
const MANA_ADVANTAGE_WEIGHT = 0.3;

export function evaluateBoard(state: GameState, playerIndex: 0 | 1): number {
  const player = state.players[playerIndex];
  const opponent = state.players[playerIndex === 0 ? 1 : 0];

  let score = 0;

  for (const minion of player.board) {
    score += (minion.currentAttack + minion.currentHealth) * MINION_VALUE_PER_STAT;
  }
  for (const minion of opponent.board) {
    score -= (minion.currentAttack + minion.currentHealth) * MINION_VALUE_PER_STAT;
  }

  score += player.hero.health * HERO_HEALTH_WEIGHT;
  score -= opponent.hero.health * HERO_HEALTH_WEIGHT;

  score += player.hand.length * MANA_ADVANTAGE_WEIGHT;
  score -= opponent.hand.length * MANA_ADVANTAGE_WEIGHT;

  return score;
}

export function getPlayableCards(hand: Card[], currentMana: number): number[] {
  const indices: number[] = [];
  for (let i = 0; i < hand.length; i++) {
    if (hand[i].cost <= currentMana) {
      indices.push(i);
    }
  }
  return indices;
}

export function getBestManaUsage(hand: Card[], currentMana: number): number[] {
  const playable = getPlayableCards(hand, currentMana);
  if (playable.length === 0) return [];

  let bestCombo: number[] = [];
  let bestManaSpent = 0;

  const subsetCount = 1 << playable.length;
  for (let mask = 1; mask < subsetCount; mask++) {
    let totalCost = 0;
    const combo: number[] = [];

    for (let bit = 0; bit < playable.length; bit++) {
      if (mask & (1 << bit)) {
        totalCost += hand[playable[bit]].cost;
        combo.push(playable[bit]);
      }
    }

    if (totalCost <= currentMana && totalCost > bestManaSpent) {
      bestManaSpent = totalCost;
      bestCombo = combo;
    }
  }

  return bestCombo;
}
