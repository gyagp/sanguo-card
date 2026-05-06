import {
  Faction,
  HeroPower,
  GameState,
  Lane,
  Deck,
  MAX_BOARD_SIZE,
  STARTING_HP,
  DECK_FACTION_THRESHOLD,
  addMinionToLane,
  removeDeadMinions,
  getDeckFaction,
  getDeckFactionCount,
} from "./types";
import { createTokenMinion } from "./tokens";

export const FACTION_HERO_POWERS: Record<Faction, HeroPower> = {
  shu: {
    name: "仁德",
    cost: 2,
    description: "恢复英雄2点生命值",
    effect: (state, playerIndex) => {
      state.players[playerIndex].hero.health = Math.min(
        state.players[playerIndex].hero.health + 2,
        STARTING_HP
      );
    },
  },
  wei: {
    name: "霸略",
    cost: 2,
    description: "对敌方英雄造成1点伤害",
    effect: (state, playerIndex) => {
      const opponentIndex = (playerIndex === 0 ? 1 : 0) as 0 | 1;
      state.players[opponentIndex].hero.health -= 1;
    },
  },
  wu: {
    name: "制衡",
    cost: 2,
    description: "召唤一个1/1的士兵",
    effect: (state, playerIndex) => {
      const player = state.players[playerIndex];
      if (player.board.length >= MAX_BOARD_SIZE) return;
      addMinionToLane(player, createTokenMinion("士兵"), Lane.Center);
    },
  },
  qun: {
    name: "乱击",
    cost: 2,
    description: "装备一把1/2的短刀",
    effect: (state, playerIndex) => {
      state.players[playerIndex].weapon = { name: "短刀", attack: 1, durability: 2 };
      state.players[playerIndex].heroHasAttacked = false;
    },
  },
  neutral: {
    name: "策略",
    cost: 2,
    description: "对随机一个敌方随从造成1点伤害",
    effect: (state, playerIndex) => {
      const opponentIndex = (playerIndex === 0 ? 1 : 0) as 0 | 1;
      const targets = state.players[opponentIndex].board.filter(m => !m.isImmune);
      if (targets.length === 0) {
        state.players[opponentIndex].hero.health -= 1;
        return;
      }
      const target = targets[Math.floor(Math.random() * targets.length)];
      target.currentHealth -= 1;
      removeDeadMinions(state);
    },
  },
};

export const UPGRADED_FACTION_HERO_POWERS: Partial<Record<Faction, HeroPower>> = {
  wei: {
    name: "霸略·升级",
    cost: 2,
    description: "对敌方英雄造成2点伤害",
    effect: (state, playerIndex) => {
      const opponentIndex = (playerIndex === 0 ? 1 : 0) as 0 | 1;
      state.players[opponentIndex].hero.health -= 2;
    },
  },
  shu: {
    name: "仁德·升级",
    cost: 2,
    description: "恢复英雄3点生命值",
    effect: (state, playerIndex) => {
      state.players[playerIndex].hero.health = Math.min(
        state.players[playerIndex].hero.health + 3,
        STARTING_HP
      );
    },
  },
  wu: {
    name: "制衡·升级",
    cost: 2,
    description: "召唤一个2/1的士兵",
    effect: (state, playerIndex) => {
      const player = state.players[playerIndex];
      if (player.board.length >= MAX_BOARD_SIZE) return;
      addMinionToLane(player, createTokenMinion("精锐士兵"), Lane.Center);
    },
  },
  qun: {
    name: "乱击·升级",
    cost: 2,
    description: "装备一把2/2的短刀",
    effect: (state, playerIndex) => {
      state.players[playerIndex].weapon = { name: "精钢短刀", attack: 2, durability: 2 };
      state.players[playerIndex].heroHasAttacked = false;
    },
  },
};

export function getHeroPowerForPlayer(deck: Deck): HeroPower {
  const faction = getDeckFaction(deck);
  const count = getDeckFactionCount(deck, faction);
  if (faction !== "neutral" && count >= DECK_FACTION_THRESHOLD && UPGRADED_FACTION_HERO_POWERS[faction]) {
    return UPGRADED_FACTION_HERO_POWERS[faction]!;
  }
  return FACTION_HERO_POWERS[faction];
}
