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
const TRADE_KILL_BONUS = 5;
const TRADE_SURVIVE_BONUS = 3;

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

export interface TradeScore {
  attackerIndex: number;
  defenderIndex: number;
  score: number;
}

export function evaluateTrade(
  attacker: BoardMinion,
  defender: BoardMinion,
): number {
  const attackerDies = defender.currentAttack >= attacker.currentHealth;
  const defenderDies = attacker.currentAttack >= defender.currentHealth;

  const attackerValue = attacker.currentAttack + attacker.currentHealth;
  const defenderValue = defender.currentAttack + defender.currentHealth;

  let score = 0;

  if (defenderDies) {
    score += defenderValue + TRADE_KILL_BONUS;
  } else {
    score += attacker.currentAttack;
  }

  if (attackerDies) {
    score -= attackerValue;
  } else {
    score += TRADE_SURVIVE_BONUS;
    score -= defender.currentAttack;
  }

  return score;
}

export function findLethal(
  attackers: BoardMinion[],
  opponentHeroHealth: number,
): boolean {
  let totalDamage = 0;
  for (const minion of attackers) {
    if (!minion.summoningSickness && !minion.hasAttacked) {
      totalDamage += minion.currentAttack;
    }
  }
  return totalDamage >= opponentHeroHealth;
}

export function getAIAttackDecisions(state: GameState): AttackDecision[] {
  const aiIndex = state.activePlayer;
  const opponentIndex = aiIndex === 0 ? 1 : 0;
  const aiBoard = state.players[aiIndex].board;
  const opponentBoard = state.players[opponentIndex].board;
  const opponentHealth = state.players[opponentIndex].hero.health;

  const available = aiBoard.filter(
    (m) => !m.summoningSickness && !m.hasAttacked,
  );

  if (findLethal(available, opponentHealth)) {
    return available.map((_, i) => {
      const boardIndex = aiBoard.indexOf(available[i]);
      return { type: 'attack' as const, attackerIndex: boardIndex, targetIndex: 'hero' as const };
    });
  }

  const decisions: AttackDecision[] = [];
  const usedAttackers = new Set<number>();
  const usedDefenders = new Set<number>();

  if (opponentBoard.length > 0) {
    const trades: TradeScore[] = [];
    for (let a = 0; a < aiBoard.length; a++) {
      const attacker = aiBoard[a];
      if (attacker.summoningSickness || attacker.hasAttacked) continue;
      for (let d = 0; d < opponentBoard.length; d++) {
        trades.push({
          attackerIndex: a,
          defenderIndex: d,
          score: evaluateTrade(attacker, opponentBoard[d]),
        });
      }
    }

    trades.sort((a, b) => b.score - a.score);

    for (const trade of trades) {
      if (usedAttackers.has(trade.attackerIndex) || usedDefenders.has(trade.defenderIndex)) continue;
      if (trade.score > 0) {
        decisions.push({
          type: 'attack',
          attackerIndex: trade.attackerIndex,
          targetIndex: trade.defenderIndex,
        });
        usedAttackers.add(trade.attackerIndex);
        usedDefenders.add(trade.defenderIndex);
      }
    }
  }

  for (let a = 0; a < aiBoard.length; a++) {
    const minion = aiBoard[a];
    if (minion.summoningSickness || minion.hasAttacked || usedAttackers.has(a)) continue;
    decisions.push({
      type: 'attack',
      attackerIndex: a,
      targetIndex: 'hero',
    });
  }

  return decisions;
}
