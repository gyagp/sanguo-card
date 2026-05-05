import {
  GameState,
  BoardMinion,
  Card,
  MAX_BOARD_SIZE,
  removeDeadMinions,
} from './types';
import {
  AIStrategy,
  AIDifficulty,
  PlayCardDecision,
  AttackDecision,
  getAIAttackDecisions,
  getOnCurvePlayDecisions,
  getOptimalPlayDecisions,
} from './ai';

export interface BossPhase {
  name: string;
  hpThreshold: number;
  strategyOverride?: {
    playStyle?: 'curve' | 'optimal' | 'aggressive';
    attackPriority?: 'face' | 'trade' | 'smart';
  };
  turnStartEffect?: (state: GameState, bossPlayer: 0 | 1) => GameState;
}

export interface BossDefinition {
  name: string;
  phases: BossPhase[];
}

export function getCurrentPhase(boss: BossDefinition, currentHp: number, maxHp: number): BossPhase {
  const hpPercent = currentHp / maxHp;
  let activePhase = boss.phases[0];
  for (const phase of boss.phases) {
    if (hpPercent <= phase.hpThreshold) {
      activePhase = phase;
    }
  }
  return activePhase;
}

function createToken(name: string, attack: number, health: number, faction: Card['faction'] = 'neutral'): BoardMinion {
  return {
    name,
    cost: 0,
    attack,
    health,
    description: '',
    type: 'minion',
    rarity: 'common',
    faction,
    currentAttack: attack,
    currentHealth: health,
    summoningSickness: true,
    hasAttacked: false,
    hasDivineShield: false,
    isStealth: false,
    isFrozen: false,
    freezeTurnsLeft: 0,
    isImmune: false,
    windfuryAttacksLeft: 1,
    enrageActive: false,
    enrageBonus: 0,
    factionAttackBonus: 0,
    factionHealthBonus: 0,
    shuAdjacencyAtkBonus: 0,
    shuAdjacencyHpBonus: 0,
    brotherhoodAtkBonus: 0,
    brotherhoodHpBonus: 0, wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0, qunDebuff: 0,
  };
}

export const BOSS_DONGZHUO: BossDefinition = {
  name: '董卓',
  phases: [
    {
      name: '暴政',
      hpThreshold: 1.0,
      strategyOverride: { playStyle: 'curve', attackPriority: 'smart' },
    },
    {
      name: '暴怒',
      hpThreshold: 0.5,
      strategyOverride: { playStyle: 'optimal', attackPriority: 'face' },
      turnStartEffect: (state: GameState, bossPlayer: 0 | 1): GameState => {
        const board = state.players[bossPlayer].board;
        if (board.length < MAX_BOARD_SIZE) {
          board.push(createToken('西凉兵', 2, 1, 'qun'));
        }
        return state;
      },
    },
    {
      name: '困兽犹斗',
      hpThreshold: 0.25,
      strategyOverride: { playStyle: 'optimal', attackPriority: 'face' },
      turnStartEffect: (state: GameState, bossPlayer: 0 | 1): GameState => {
        const opponentIndex = bossPlayer === 0 ? 1 : 0;
        for (const minion of state.players[opponentIndex].board) {
          minion.currentHealth -= 1;
        }
        removeDeadMinions(state);
        const board = state.players[bossPlayer].board;
        if (board.length < MAX_BOARD_SIZE) {
          board.push(createToken('西凉精锐', 3, 2, 'qun'));
        }
        return state;
      },
    },
  ],
};

function getFaceAttackDecisions(state: GameState): AttackDecision[] {
  const aiIndex = state.activePlayer;
  const aiBoard = state.players[aiIndex].board;
  const decisions: AttackDecision[] = [];

  for (let a = 0; a < aiBoard.length; a++) {
    const minion = aiBoard[a];
    if (minion.summoningSickness || (minion.hasAttacked && minion.windfuryAttacksLeft <= 0)) continue;
    const attacks = Math.max(minion.windfuryAttacksLeft, 0);
    for (let r = 0; r < attacks; r++) {
      decisions.push({ type: 'attack', attackerIndex: a, targetIndex: 'hero' });
    }
  }
  return decisions;
}

export class BossAI implements AIStrategy {
  difficulty: AIDifficulty = 'hard';
  private boss: BossDefinition;
  private bossPlayer: 0 | 1;
  private maxHp: number;

  constructor(boss: BossDefinition, bossPlayer: 0 | 1, maxHp: number) {
    this.boss = boss;
    this.bossPlayer = bossPlayer;
    this.maxHp = maxHp;
  }

  private getPhase(state: GameState): BossPhase {
    const currentHp = state.players[this.bossPlayer].hero.health;
    return getCurrentPhase(this.boss, currentHp, this.maxHp);
  }

  getPlayDecisions(state: GameState): PlayCardDecision[] {
    const phase = this.getPhase(state);
    const style = phase.strategyOverride?.playStyle ?? 'curve';
    switch (style) {
      case 'optimal':
      case 'aggressive':
        return getOptimalPlayDecisions(state);
      case 'curve':
      default:
        return getOnCurvePlayDecisions(state);
    }
  }

  getAttackDecisions(state: GameState): AttackDecision[] {
    const phase = this.getPhase(state);
    const priority = phase.strategyOverride?.attackPriority ?? 'smart';
    switch (priority) {
      case 'face':
        return getFaceAttackDecisions(state);
      case 'trade':
      case 'smart':
      default:
        return getAIAttackDecisions(state);
    }
  }

  shouldUseHeroPower(state: GameState): boolean {
    const player = state.players[state.activePlayer];
    return !player.heroPowerUsed && player.hero.mana >= player.hero.heroPower.cost;
  }

  applyTurnStartEffect(state: GameState): GameState {
    const phase = this.getPhase(state);
    if (phase.turnStartEffect) {
      return phase.turnStartEffect(state, this.bossPlayer);
    }
    return state;
  }
}

export const BOSSES: Record<string, BossDefinition> = {
  '董卓': BOSS_DONGZHUO,
};
