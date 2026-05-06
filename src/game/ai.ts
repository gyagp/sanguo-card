import { GameState, PlayerState, Card, BoardMinion, Faction, FACTION_SYNERGIES, getEffectiveCardCost, Lane, ALL_LANES, getLaneCount, MAX_LANE_SIZE, getReachableLanes, getSpellReachableLanes, TerrainType } from './types';


type SpellCategory = 'freeze' | 'destroy' | 'damage' | 'buff' | 'generic';

function classifySpell(card: Card): SpellCategory {
  const desc = card.description || '';
  const hasDamage = desc.includes('伤害');
  const hasFreeze = desc.includes('冻结');
  const hasDestroy = desc.includes('消灭');
  const hasBuff = desc.includes('友方') && (desc.includes('获得') || desc.includes('攻击力') || desc.includes('生命'));
  if (hasDestroy && !hasDamage) return 'destroy';
  if (hasFreeze && !hasDamage) return 'freeze';
  if (hasDamage) return 'damage';
  if (hasBuff) return 'buff';
  return 'generic';
}

export function calculateMinionThreatScore(m: BoardMinion, spellCategory: SpellCategory): number {
  let score = 0;
  const effectiveAttack = m.windfury ? m.currentAttack * 2 : m.currentAttack;

  if (spellCategory === 'freeze') {
    score = effectiveAttack * 3;
    if (m.isFrozen) score -= 20;
    if (m.windfury) score += 8;
    if (m.charge) score += 4;
    if (m.taunt) score += 5;
    if (m.hasDivineShield) score += 3;
    if (m.enrage && !m.enrageActive) score += 3;
    return score;
  }

  if (spellCategory === 'destroy') {
    score = m.currentAttack + m.currentHealth;
    if (m.windfury) score += 6;
    if (m.taunt) score += 8;
    if (m.hasDivineShield) score -= 15;
    if (m.enrage && !m.enrageActive) score += 4;
    if (m.isStealth) score -= 2;
    return score;
  }

  score = effectiveAttack * 2;
  if (m.taunt) score += 10;
  if (m.hasDivineShield) score -= 12;
  if (m.windfury) score += 6;
  if (m.enrage && !m.enrageActive) score -= 5;
  if (!m.isStealth && m.stealth) score += 4;
  if (m.isFrozen) score -= 3;
  if (m.charge && m.summoningSickness) score += 3;
  return score;
}

export function calculateFriendlyBuffScore(m: BoardMinion): number {
  let score = 0;
  score = m.currentAttack + m.currentHealth;
  if (m.windfury) score += 10;
  if (m.charge) score += 6;
  if (m.taunt) score += 4;
  if (m.hasDivineShield) score += 3;
  if (m.summoningSickness && !m.charge) score -= 5;
  if (m.isFrozen) score -= 4;
  return score;
}

function pickSpellTarget(card: Card, state: GameState): number | undefined {
  if (card.targetType !== 'enemy_minion') return undefined;
  const player = state.players[state.activePlayer];
  const reachableLanes = getSpellReachableLanes(player);
  const opponentIndex = state.activePlayer === 0 ? 1 : 0;
  const enemyBoard = state.players[opponentIndex].board;
  if (enemyBoard.length === 0) return undefined;
  const spellCategory = classifySpell(card);
  let bestIdx = -1;
  let bestScore = -Infinity;
  for (let i = 0; i < enemyBoard.length; i++) {
    const m = enemyBoard[i];
    if (m.spellImmune) continue;
    if (!reachableLanes.includes(m.lane)) continue;
    const score = calculateMinionThreatScore(m, spellCategory);
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  }
  return bestIdx === -1 ? undefined : bestIdx;
}

function pickSpellTargetLane(card: Card, state: GameState): Lane | undefined {
  if (card.targetType !== 'lane_aoe') return undefined;
  const opponentIndex = state.activePlayer === 0 ? 1 : 0;
  const enemyBoard = state.players[opponentIndex].board;
  const spellCategory = classifySpell(card);
  let bestLane: Lane | undefined;
  let bestScore = -Infinity;
  for (const lane of ALL_LANES) {
    let score = 0;
    for (const m of enemyBoard) {
      if (m.lane === lane) {
        score += calculateMinionThreatScore(m, spellCategory);
      }
    }
    if (score > bestScore) { bestScore = score; bestLane = lane; }
  }
  return bestLane;
}

export type AIDifficulty = 'easy' | 'normal' | 'hard' | 'boss';

export type AIDecisionType = 'playCard' | 'attack' | 'useHeroPower' | 'endTurn';

export interface PlayCardDecision {
  type: 'playCard';
  cardIndex: number;
  spellTarget?: number;
  targetLane?: Lane;
  lane?: Lane;
  slotIndex?: number;
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
const TAUNT_PRIORITY_BONUS = 10;
const DIVINE_SHIELD_PENALTY = -8;
const STEALTH_BROKEN_BONUS = 4;
const DAMAGED_MINION_BONUS = 3;
const FACTION_SYNERGY_WEIGHT = 2;

export function countFactionMinions(board: BoardMinion[], faction: Faction): number {
  return board.filter(m => m.faction === faction).length;
}

export function evaluateFactionSynergy(board: BoardMinion[]): number {
  let score = 0;
  for (const faction of ['shu', 'wei', 'wu', 'qun'] as const) {
    const count = countFactionMinions(board, faction);
    const synergy = FACTION_SYNERGIES[faction];
    let bestBonus = 0;
    for (const tier of synergy.tiers) {
      if (count >= tier.requiredCount) {
        bestBonus = tier.attackBonus + tier.healthBonus;
      }
    }
    score += count * bestBonus;
  }
  return score;
}

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

  score += evaluateFactionSynergy(player.board) * FACTION_SYNERGY_WEIGHT;
  score -= evaluateFactionSynergy(opponent.board) * FACTION_SYNERGY_WEIGHT;

  return score;
}

export function getPlayableCards(hand: Card[], currentMana: number, player?: PlayerState): number[] {
  const indices: number[] = [];
  for (let i = 0; i < hand.length; i++) {
    const cost = player ? getEffectiveCardCost(hand[i], player) : hand[i].cost;
    if (cost <= currentMana) {
      indices.push(i);
    }
  }
  return indices;
}

export function getBestManaUsage(hand: Card[], currentMana: number, board?: BoardMinion[], player?: PlayerState): number[] {
  const playable = getPlayableCards(hand, currentMana, player);
  if (playable.length === 0) return [];

  let bestCombo: number[] = [];
  let bestManaSpent = 0;
  let bestSynergyScore = -1;

  const subsetCount = 1 << playable.length;
  for (let mask = 1; mask < subsetCount; mask++) {
    let totalCost = 0;
    const combo: number[] = [];

    for (let bit = 0; bit < playable.length; bit++) {
      if (mask & (1 << bit)) {
        totalCost += player ? getEffectiveCardCost(hand[playable[bit]], player) : hand[playable[bit]].cost;
        combo.push(playable[bit]);
      }
    }

    if (totalCost <= currentMana && totalCost >= bestManaSpent) {
      let synergyScore = 0;
      if (board) {
        const factionCounts = new Map<Faction, number>();
        for (const m of board) {
          if (m.faction !== "neutral") {
            factionCounts.set(m.faction, (factionCounts.get(m.faction) ?? 0) + 1);
          }
        }
        for (const idx of combo) {
          const f = hand[idx].faction;
          if (f !== "neutral") {
            factionCounts.set(f, (factionCounts.get(f) ?? 0) + 1);
          }
        }
        for (const [faction, count] of factionCounts) {
          if (faction !== "neutral") {
            const synergy = FACTION_SYNERGIES[faction as Exclude<Faction, "neutral">];
            let bestBonus = 0;
            for (const tier of synergy.tiers) {
              if (count >= tier.requiredCount) {
                bestBonus = tier.attackBonus + tier.healthBonus;
              }
            }
            synergyScore += count * bestBonus;
          }
        }
      }

      if (player) {
        for (const idx of combo) {
          synergyScore += evaluateCardForFaction(hand[idx], player);
        }
      }

      if (totalCost > bestManaSpent || synergyScore > bestSynergyScore) {
        bestManaSpent = totalCost;
        bestSynergyScore = synergyScore;
        bestCombo = combo;
      }
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
  const defenderHasShield = defender.hasDivineShield;
  const effectiveAttackerDamage = defenderHasShield ? 0 : attacker.currentAttack;
  const attackerDies = defender.currentAttack >= attacker.currentHealth;
  const defenderDies = effectiveAttackerDamage >= defender.currentHealth;

  const attackerValue = attacker.currentAttack + attacker.currentHealth;
  const defenderValue = defender.currentAttack + defender.currentHealth;

  let score = 0;

  if (defenderDies) {
    score += defenderValue + TRADE_KILL_BONUS;
  } else {
    score += effectiveAttackerDamage;
  }

  if (attackerDies) {
    score -= attackerValue;
  } else {
    score += TRADE_SURVIVE_BONUS;
    score -= defender.currentAttack;
  }

  if (defender.taunt) {
    score += TAUNT_PRIORITY_BONUS;
  }

  if (defenderHasShield && !defenderDies) {
    score += DIVINE_SHIELD_PENALTY;
  }

  if (!defender.isStealth && defender.stealth) {
    score += STEALTH_BROKEN_BONUS;
  }

  // health is the Card's original max HP; currentHealth < health means the minion is damaged
  if (defender.currentHealth < defender.health) {
    score += DAMAGED_MINION_BONUS;
  }

  return score;
}

export function findLethal(
  attackers: BoardMinion[],
  opponentHeroHealth: number,
): boolean {
  let totalDamage = 0;
  for (const minion of attackers) {
    if (!minion.summoningSickness && !(minion.hasAttacked && minion.windfuryAttacksLeft <= 0)) {
      totalDamage += minion.currentAttack * Math.max(minion.windfuryAttacksLeft, 0);
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
    (m) => !m.summoningSickness && !(m.hasAttacked && m.windfuryAttacksLeft <= 0),
  );

  if (findLethal(available, opponentHealth)) {
    const decisions: AttackDecision[] = [];
    for (const minion of available) {
      const boardIndex = aiBoard.indexOf(minion);
      const attacks = Math.max(minion.windfuryAttacksLeft, 0);
      for (let a = 0; a < attacks; a++) {
        decisions.push({ type: 'attack' as const, attackerIndex: boardIndex, targetIndex: 'hero' as const });
      }
    }
    return decisions;
  }

  const decisions: AttackDecision[] = [];
  const usedAttackers = new Set<number>();
  const usedDefenders = new Set<number>();

  if (opponentBoard.length > 0) {
    const trades: TradeScore[] = [];
    for (let a = 0; a < aiBoard.length; a++) {
      const attacker = aiBoard[a];
      if (attacker.summoningSickness || (attacker.hasAttacked && attacker.windfuryAttacksLeft <= 0)) continue;
      const reachable = getReachableLanes(attacker.lane);
      const hasTaunts = opponentBoard.some(m => m.taunt && !m.isStealth && reachable.includes(m.lane));
      for (let d = 0; d < opponentBoard.length; d++) {
        const defender = opponentBoard[d];
        if (!reachable.includes(defender.lane)) continue;
        if (defender.isStealth) continue;
        if (hasTaunts && !defender.taunt) continue;
        trades.push({
          attackerIndex: a,
          defenderIndex: d,
          score: evaluateTrade(attacker, defender),
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
    if (minion.summoningSickness || (minion.hasAttacked && minion.windfuryAttacksLeft <= 0) || usedAttackers.has(a)) continue;
    const reachable = getReachableLanes(minion.lane);
    const reachableTaunts = opponentBoard.filter(m => m.taunt && !m.isStealth && reachable.includes(m.lane));
    if (reachableTaunts.length > 0) {
      const tauntIdx = opponentBoard.indexOf(reachableTaunts[0]);
      if (!usedDefenders.has(tauntIdx)) {
        decisions.push({ type: 'attack', attackerIndex: a, targetIndex: tauntIdx });
        usedDefenders.add(tauntIdx);
      }
      continue;
    }
    const remainingAttacks = Math.max(minion.windfuryAttacksLeft, 0);
    for (let r = 0; r < remainingAttacks; r++) {
      decisions.push({
        type: 'attack',
        attackerIndex: a,
        targetIndex: 'hero',
      });
    }
  }

  return decisions;
}

export interface AIStrategy {
  difficulty: AIDifficulty;
  getPlayDecisions(state: GameState): PlayCardDecision[];
  getAttackDecisions(state: GameState): AttackDecision[];
  shouldUseHeroPower(state: GameState): boolean;
}

function getRandomPlayDecisions(state: GameState): PlayCardDecision[] {
  const player = state.players[state.activePlayer];
  const playable = getPlayableCards(player.hand, player.hero.mana, player);
  if (playable.length === 0) return [];
  const shuffled = [...playable].sort(() => Math.random() - 0.5);
  const decisions: PlayCardDecision[] = [];
  let mana = player.hero.mana;
  for (const idx of shuffled) {
    const cost = getEffectiveCardCost(player.hand[idx], player);
    if (cost <= mana) {
      decisions.push({ type: 'playCard', cardIndex: idx, spellTarget: pickSpellTarget(player.hand[idx], state), targetLane: pickSpellTargetLane(player.hand[idx], state), lane: pickLaneForMinion(player, player.hand[idx], state) });
      mana -= cost;
    }
  }
  return decisions;
}

function getRandomAttackDecisions(state: GameState): AttackDecision[] {
  const aiIndex = state.activePlayer;
  const opponentIndex = aiIndex === 0 ? 1 : 0;
  const aiBoard = state.players[aiIndex].board;
  const opponentBoard = state.players[opponentIndex].board;
  const decisions: AttackDecision[] = [];

  for (let a = 0; a < aiBoard.length; a++) {
    const minion = aiBoard[a];
    if (minion.summoningSickness || (minion.hasAttacked && minion.windfuryAttacksLeft <= 0)) continue;
    const reachable = getReachableLanes(minion.lane);
    const reachableTargets = opponentBoard
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => reachable.includes(m.lane));
    if (reachableTargets.length > 0 && Math.random() < 0.5) {
      const pick = reachableTargets[Math.floor(Math.random() * reachableTargets.length)];
      decisions.push({ type: 'attack', attackerIndex: a, targetIndex: pick.i });
    } else {
      const reachableTaunts = opponentBoard.filter(m => m.taunt && reachable.includes(m.lane));
      if (reachableTaunts.length > 0) {
        const tauntIdx = opponentBoard.indexOf(reachableTaunts[Math.floor(Math.random() * reachableTaunts.length)]);
        decisions.push({ type: 'attack', attackerIndex: a, targetIndex: tauntIdx });
      } else {
        decisions.push({ type: 'attack', attackerIndex: a, targetIndex: 'hero' });
      }
    }
  }
  return decisions;
}

export function getOnCurvePlayDecisions(state: GameState): PlayCardDecision[] {
  const player = state.players[state.activePlayer];
  const playable = getPlayableCards(player.hand, player.hero.mana, player);
  if (playable.length === 0) return [];

  const sorted = [...playable].sort((a, b) => player.hand[b].cost - player.hand[a].cost);
  let decisions: PlayCardDecision[] = [];
  let mana = player.hero.mana;
  for (const idx of sorted) {
    const cost = getEffectiveCardCost(player.hand[idx], player);
    if (cost <= mana) {
      decisions.push({ type: 'playCard', cardIndex: idx, spellTarget: pickSpellTarget(player.hand[idx], state), targetLane: pickSpellTargetLane(player.hand[idx], state), lane: pickLaneForMinion(player, player.hand[idx], state) });
      mana -= cost;
    }
  }
  decisions = applyFactionPlayOrder(decisions, player, state);
  decisions = applyFactionBoardPositions(decisions, player, state);
  return decisions;
}

export function getOptimalPlayDecisions(state: GameState): PlayCardDecision[] {
  const player = state.players[state.activePlayer];
  const bestCombo = getBestManaUsage(player.hand, player.hero.mana, player.board, player);
  let decisions: PlayCardDecision[] = bestCombo.map(idx => ({ type: 'playCard' as const, cardIndex: idx, spellTarget: pickSpellTarget(player.hand[idx], state), targetLane: pickSpellTargetLane(player.hand[idx], state), lane: pickLaneForMinion(player, player.hand[idx], state) }));
  decisions = applyFactionPlayOrder(decisions, player, state);
  decisions = applyFactionBoardPositions(decisions, player, state);
  return decisions;
}

const WEI_SPELL_BONUS = 3;
const QUN_VARIANCE_TOLERANCE = 2;

export function evaluateCardForFaction(card: Card, player: PlayerState): number {
  let score = card.attack + card.health + (card.taunt ? 2 : 0) + (card.charge ? 1 : 0);

  if (player.deckFaction === "wei") {
    if (card.type === "spell") score += WEI_SPELL_BONUS;
    if (card.spellDamage) score += card.spellDamage * 2;
  }

  if (player.deckFaction === "shu") {
    if (card.faction === "shu" && card.type === "minion") score += 2;
  }

  if (player.deckFaction === "wu") {
    if (card.cost <= 3) score += 1;
  }

  if (player.deckFaction === "qun") {
    if (card.battlecry) score += QUN_VARIANCE_TOLERANCE;
  }

  if (card.type === "spell") {
    const category = classifySpell(card);
    if (category === 'buff' && player.board.length > 0) {
      let bestBuffScore = 0;
      for (const m of player.board) {
        const buffScore = calculateFriendlyBuffScore(m);
        if (buffScore > bestBuffScore) bestBuffScore = buffScore;
      }
      score += Math.floor(bestBuffScore / 3);
    }
  }

  return score;
}

function applyFactionPlayOrder(decisions: PlayCardDecision[], player: PlayerState, state: GameState): PlayCardDecision[] {
  if (decisions.length <= 1) return decisions;

  if (player.deckFaction === "wu") {
    const sorted = [...decisions].sort((a, b) => {
      const cardA = player.hand[a.cardIndex];
      const cardB = player.hand[b.cardIndex];
      const costA = getEffectiveCardCost(cardA, player);
      const costB = getEffectiveCardCost(cardB, player);
      if (costA !== costB) return costA - costB;
      if (cardA.type === "spell" && cardB.type !== "spell") return -1;
      if (cardA.type !== "spell" && cardB.type === "spell") return 1;
      return 0;
    });
    return sorted;
  }

  if (player.deckFaction === "wei") {
    const spells = decisions.filter(d => player.hand[d.cardIndex].type === "spell");
    const nonSpells = decisions.filter(d => player.hand[d.cardIndex].type !== "spell");
    return [...nonSpells, ...spells];
  }

  return decisions;
}

function pickLaneForMinion(player: PlayerState, card?: Card, state?: GameState): Lane {
  const available = ALL_LANES.filter(l => getLaneCount(player, l) < MAX_LANE_SIZE);
  if (available.length === 0) return Lane.Center;
  if (available.length === 1) return available[0];

  let bestLane = available[0];
  let bestScore = -Infinity;

  for (const lane of available) {
    let score = 0;

    if (card && card.faction !== "neutral") {
      const sameFactionInLane = player.board.filter(m => m.lane === lane && m.faction === card.faction).length;
      if (sameFactionInLane >= 1) score += 5;
    }

    if (state?.terrain) {
      const terrain = state.terrain[lane];
      if (terrain?.type === TerrainType.Fire) score -= 8;
      if (terrain?.type === TerrainType.HealingAura) score += 2;
      if (terrain?.type === TerrainType.Stealth) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestLane = lane;
    }
  }

  return bestLane;
}

function applyLaneAssignments(decisions: PlayCardDecision[], player: PlayerState, state?: GameState): PlayCardDecision[] {
  const laneCounts = new Map<Lane, number>();
  for (const lane of ALL_LANES) {
    laneCounts.set(lane, getLaneCount(player, lane));
  }
  return decisions.map(d => {
    const card = player.hand[d.cardIndex];
    if (card.type !== "minion") return d;
    const available = ALL_LANES.filter(l => (laneCounts.get(l) ?? 0) < MAX_LANE_SIZE);
    if (available.length === 0) return d;

    let bestLane = available[0];
    let bestScore = -Infinity;
    for (const lane of available) {
      let score = 0;
      if (card.faction !== "neutral") {
        const sameFaction = player.board.filter(m => m.lane === lane && m.faction === card.faction).length;
        if (sameFaction >= 1) score += 5;
      }
      if (state?.terrain) {
        const terrain = state.terrain[lane];
        if (terrain?.type === TerrainType.Fire) score -= 8;
        if (terrain?.type === TerrainType.HealingAura) score += 2;
        if (terrain?.type === TerrainType.Stealth) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        bestLane = lane;
      }
    }

    laneCounts.set(bestLane, (laneCounts.get(bestLane) ?? 0) + 1);
    return { ...d, lane: bestLane };
  });
}

function applyFactionBoardPositions(decisions: PlayCardDecision[], player: PlayerState, state?: GameState): PlayCardDecision[] {
  decisions = applyLaneAssignments(decisions, player, state);

  if (player.deckFaction !== "shu") return decisions;

  return decisions.map(d => {
    const card = player.hand[d.cardIndex];
    if (card.type !== "minion" || card.faction !== "shu") return d;
    const bestLane = pickShuLane(player);
    if (bestLane) return { ...d, lane: bestLane };
    return d;
  });
}

function pickShuLane(player: PlayerState): Lane | undefined {
  let bestLane: Lane | undefined;
  let bestAdjacentShu = 0;
  for (const lane of ALL_LANES) {
    if (getLaneCount(player, lane) >= MAX_LANE_SIZE) continue;
    const shuInLane = player.board.filter(m => m.lane === lane && m.faction === "shu").length;
    if (shuInLane > bestAdjacentShu) {
      bestAdjacentShu = shuInLane;
      bestLane = lane;
    }
  }
  return bestAdjacentShu > 0 ? bestLane : undefined;
}

class EasyAI implements AIStrategy {
  difficulty: AIDifficulty = 'easy';

  getPlayDecisions(state: GameState): PlayCardDecision[] {
    return getRandomPlayDecisions(state);
  }

  getAttackDecisions(state: GameState): AttackDecision[] {
    return getRandomAttackDecisions(state);
  }

  shouldUseHeroPower(): boolean {
    return Math.random() < 0.3;
  }
}

class NormalAI implements AIStrategy {
  difficulty: AIDifficulty = 'normal';

  getPlayDecisions(state: GameState): PlayCardDecision[] {
    return getOnCurvePlayDecisions(state);
  }

  getAttackDecisions(state: GameState): AttackDecision[] {
    return getAIAttackDecisions(state);
  }

  shouldUseHeroPower(state: GameState): boolean {
    const player = state.players[state.activePlayer];
    return !player.heroPowerUsed && player.hero.mana >= player.hero.heroPower.cost;
  }
}

class HardAI implements AIStrategy {
  difficulty: AIDifficulty = 'hard';

  getPlayDecisions(state: GameState): PlayCardDecision[] {
    return getOptimalPlayDecisions(state);
  }

  getAttackDecisions(state: GameState): AttackDecision[] {
    return getAIAttackDecisions(state);
  }

  shouldUseHeroPower(state: GameState): boolean {
    const player = state.players[state.activePlayer];
    if (player.heroPowerUsed || player.hero.mana < player.hero.heroPower.cost) return false;
    const manaAfter = player.hero.mana - player.hero.heroPower.cost;
    const bestWithout = getBestManaUsage(player.hand, player.hero.mana, player.board, player);
    const bestWith = getBestManaUsage(player.hand, manaAfter, player.board, player);
    const manaUsedWithout = bestWithout.reduce((s, i) => s + player.hand[i].cost, 0);
    const manaUsedWith = bestWith.reduce((s, i) => s + player.hand[i].cost, 0) + player.hero.heroPower.cost;
    return manaUsedWith >= manaUsedWithout;
  }
}

export function createAI(difficulty: AIDifficulty): AIStrategy {
  switch (difficulty) {
    case 'easy': return new EasyAI();
    case 'normal': return new NormalAI();
    case 'hard': return new HardAI();
    case 'boss': return new HardAI();
  }
}
