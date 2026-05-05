import { Rarity } from "./types";

export interface OwnedCard {
  cardName: string;
  count: number;
  upgradeLevel: number;
}

export interface PlayerProfile {
  gold: number;
  xp: number;
  level: number;
  ownedCards: OwnedCard[];
}

export interface CardPack {
  id: string;
  name: string;
  price: number;
  cardCount: number;
  guaranteedRarity?: Rarity;
}

export interface Reward {
  gold?: number;
  xp?: number;
  cards?: { cardName: string; count: number }[];
  packs?: { packId: string; count: number }[];
}

export const XP_THRESHOLDS: number[] = [
  0,    // level 1
  100,  // level 2
  250,  // level 3
  450,  // level 4
  700,  // level 5
  1000, // level 6
  1400, // level 7
  1900, // level 8
  2500, // level 9
  3200, // level 10
];

export const UPGRADE_COSTS: Record<number, number> = {
  1: 50,
  2: 100,
  3: 200,
  4: 400,
  5: 800,
};

export const DUPLICATE_COST_PER_LEVEL: Record<number, number> = { 1: 1, 2: 2, 3: 3 };

export const PACK_PRICE = 100;

export const DEFAULT_PACK: CardPack = {
  id: "standard",
  name: "标准卡包",
  price: PACK_PRICE,
  cardCount: 5,
  guaranteedRarity: "rare",
};

export const STARTER_CARDS: string[] = [
  "乡勇",
  "斥候骑兵",
  "运粮车",
  "弓弩手",
  "长枪兵",
  "辎重车",
  "铁剑",
  "烽火",
  "征兵令",
  "草药",
];
