import {
  GameState,
  BoardMinion,
  Card,
  Lane,
  ALL_LANES,
  MAX_BOARD_SIZE,
  MAX_LANE_SIZE,
  addMinionToLane,
  getLaneCount,
  removeDeadMinions,
  drawCard,
  MAX_HAND_SIZE,
} from './types';
import { BossRule } from './adventure-data';
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
    lane: Lane.Center, slotIndex: 0,
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
        const player = state.players[bossPlayer];
        if (player.board.length < MAX_BOARD_SIZE) {
          addMinionToLane(player, createToken('西凉兵', 2, 1, 'qun'), Lane.Center);
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
        if (state.players[bossPlayer].board.length < MAX_BOARD_SIZE) {
          addMinionToLane(state.players[bossPlayer], createToken('西凉精锐', 3, 2, 'qun'), Lane.Center);
        }
        return state;
      },
    },
  ],
};

export const BOSS_ZHANGJIAO: BossDefinition = {
  name: '张角',
  phases: [
    {
      name: '太平道',
      hpThreshold: 1.0,
      strategyOverride: { playStyle: 'curve', attackPriority: 'smart' },
      turnStartEffect: (state: GameState, bossPlayer: 0 | 1): GameState => {
        if (state.players[bossPlayer].board.length < MAX_BOARD_SIZE) {
          addMinionToLane(state.players[bossPlayer], createToken('乡勇', 1, 1, 'neutral'), Lane.Center);
        }
        return state;
      },
    },
    {
      name: '黄天当立',
      hpThreshold: 0.4,
      strategyOverride: { playStyle: 'optimal', attackPriority: 'face' },
      turnStartEffect: (state: GameState, bossPlayer: 0 | 1): GameState => {
        if (state.players[bossPlayer].board.length < MAX_BOARD_SIZE) {
          addMinionToLane(state.players[bossPlayer], createToken('乡勇', 1, 1, 'neutral'), Lane.Center);
        }
        state.players[bossPlayer].hero.health = Math.min(30, state.players[bossPlayer].hero.health + 3);
        drawCard(state.players[bossPlayer]);
        return state;
      },
    },
  ],
};

export const BOSS_LVBU: BossDefinition = {
  name: '吕布',
  phases: [
    {
      name: '无双',
      hpThreshold: 1.0,
      strategyOverride: { playStyle: 'aggressive', attackPriority: 'face' },
      turnStartEffect: (state: GameState, bossPlayer: 0 | 1): GameState => {
        for (const minion of state.players[bossPlayer].board) {
          if (minion.name === '吕布') {
            minion.currentAttack += 1;
          }
        }
        return state;
      },
    },
    {
      name: '困兽',
      hpThreshold: 0.3,
      strategyOverride: { playStyle: 'optimal', attackPriority: 'face' },
      turnStartEffect: (state: GameState, bossPlayer: 0 | 1): GameState => {
        for (const minion of state.players[bossPlayer].board) {
          if (minion.name === '吕布') {
            minion.currentAttack += 2;
          }
        }
        return state;
      },
    },
  ],
};

export const BOSS_YUANSHAO: BossDefinition = {
  name: '袁绍',
  phases: [
    {
      name: '四世三公',
      hpThreshold: 1.0,
      strategyOverride: { playStyle: 'curve', attackPriority: 'smart' },
      turnStartEffect: (state: GameState, bossPlayer: 0 | 1): GameState => {
        for (const minion of state.players[bossPlayer].board) {
          minion.currentHealth += 1;
        }
        return state;
      },
    },
    {
      name: '溃败',
      hpThreshold: 0.35,
      strategyOverride: { playStyle: 'optimal', attackPriority: 'face' },
      turnStartEffect: (state: GameState, bossPlayer: 0 | 1): GameState => {
        for (const minion of state.players[bossPlayer].board) {
          minion.currentHealth += 1;
        }
        if (state.players[bossPlayer].board.length < MAX_BOARD_SIZE) {
          addMinionToLane(state.players[bossPlayer], createToken('袁军精锐', 3, 3, 'neutral'), Lane.Center);
        }
        return state;
      },
    },
  ],
};

export const BOSS_CAOCAO: BossDefinition = {
  name: '曹操',
  phases: [
    {
      name: '挟天子',
      hpThreshold: 1.0,
      strategyOverride: { playStyle: 'optimal', attackPriority: 'smart' },
      turnStartEffect: (state: GameState, bossPlayer: 0 | 1): GameState => {
        const player = state.players[bossPlayer];
        if (player.hand.length < MAX_HAND_SIZE) {
          const spells = player.deck.filter((c: Card) => c.type === 'spell');
          if (spells.length > 0) {
            const spell = { ...spells[Math.floor(Math.random() * spells.length)] };
            player.hand.push(spell);
          }
        }
        return state;
      },
    },
    {
      name: '绝地反击',
      hpThreshold: 0.3,
      strategyOverride: { playStyle: 'optimal', attackPriority: 'face' },
      turnStartEffect: (state: GameState, bossPlayer: 0 | 1): GameState => {
        const player = state.players[bossPlayer];
        if (player.hand.length < MAX_HAND_SIZE) {
          const spells = player.deck.filter((c: Card) => c.type === 'spell');
          if (spells.length > 0) {
            const spell = { ...spells[Math.floor(Math.random() * spells.length)] };
            player.hand.push(spell);
          }
        }
        const opponentIndex = bossPlayer === 0 ? 1 : 0;
        const oppBoard = state.players[opponentIndex].board;
        if (oppBoard.length > 0) {
          let lowestIdx = 0;
          for (let i = 1; i < oppBoard.length; i++) {
            if (oppBoard[i].currentAttack < oppBoard[lowestIdx].currentAttack) lowestIdx = i;
          }
          const stolen = oppBoard.splice(lowestIdx, 1)[0];
          const bossPlayer2 = state.players[bossPlayer];
          if (bossPlayer2.board.length < MAX_BOARD_SIZE) {
            stolen.summoningSickness = true;
            stolen.hasAttacked = false;
            const targetLane = ALL_LANES.find(l => getLaneCount(bossPlayer2, l) < MAX_LANE_SIZE) ?? Lane.Center;
            addMinionToLane(bossPlayer2, stolen, targetLane);
          }
        }
        return state;
      },
    },
  ],
};

const HERB_CARD: Card = {
  name: '草药', cost: 1, attack: 0, health: 0, type: 'spell', rarity: 'common', faction: 'neutral', description: '恢复3点生命值',
};

function replaceOneSpellWithHerb(hand: Card[]): void {
  for (let i = 0; i < hand.length; i++) {
    if (hand[i].type === 'spell' && hand[i].name !== '草药') {
      hand[i] = { ...HERB_CARD };
      break;
    }
  }
}

export const BOSS_SIMAYI: BossDefinition = {
  name: '司马懿',
  phases: [
    {
      name: '鹰视狼顾',
      hpThreshold: 1.0,
      strategyOverride: { playStyle: 'optimal', attackPriority: 'smart' },
    },
    {
      name: '诡计',
      hpThreshold: 0.5,
      strategyOverride: { playStyle: 'optimal', attackPriority: 'smart' },
      turnStartEffect: (state: GameState, bossPlayer: 0 | 1): GameState => {
        const opponentIndex = bossPlayer === 0 ? 1 : 0;
        replaceOneSpellWithHerb(state.players[opponentIndex].hand);
        return state;
      },
    },
    {
      name: '天命',
      hpThreshold: 0.25,
      strategyOverride: { playStyle: 'optimal', attackPriority: 'face' },
      turnStartEffect: (state: GameState, bossPlayer: 0 | 1): GameState => {
        const opponentIndex = bossPlayer === 0 ? 1 : 0;
        replaceOneSpellWithHerb(state.players[opponentIndex].hand);
        for (const minion of state.players[bossPlayer].board) {
          minion.currentAttack += 1;
        }
        return state;
      },
    },
  ],
};

export function createBossAIFromRule(bossName: string, bossPlayer: 0 | 1 = 1, maxHp: number = 30, extraMana?: number): { bossAI: BossAI; extraMana: number } {
  const bossDef = BOSSES[bossName];
  if (!bossDef) {
    const fallback: BossDefinition = {
      name: bossName,
      phases: [{ name: 'default', hpThreshold: 1.0, strategyOverride: { playStyle: 'optimal', attackPriority: 'smart' } }],
    };
    return { bossAI: new BossAI(fallback, bossPlayer, maxHp), extraMana: extraMana ?? 0 };
  }
  return { bossAI: new BossAI(bossDef, bossPlayer, maxHp), extraMana: extraMana ?? 0 };
}

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
  '张角': BOSS_ZHANGJIAO,
  '吕布': BOSS_LVBU,
  '袁绍': BOSS_YUANSHAO,
  '曹操': BOSS_CAOCAO,
  '司马懿': BOSS_SIMAYI,
};
