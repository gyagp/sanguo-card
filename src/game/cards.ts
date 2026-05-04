import { Card } from "./types";

export const cards: Card[] = [
  // === 普通 (10) ===
  { name: "乡勇", cost: 1, attack: 1, health: 2, description: "嘲讽", rarity: "common", type: "minion", faction: "neutral" },
  { name: "斥候骑兵", cost: 1, attack: 2, health: 1, description: "冲锋", rarity: "common", type: "minion", faction: "neutral" },
  { name: "运粮车", cost: 2, attack: 1, health: 4, description: "战吼：为你的英雄恢复2点生命值", rarity: "common", type: "minion", faction: "neutral" },
  { name: "弓弩手", cost: 2, attack: 3, health: 2, description: "战吼：对一个敌方随从造成1点伤害", rarity: "common", type: "minion", faction: "neutral" },
  { name: "长枪兵", cost: 3, attack: 3, health: 3, description: "嘲讽。战吼：若你控制其他随从，获得+1攻击力", rarity: "common", type: "minion", faction: "neutral" },
  { name: "辎重车", cost: 2, attack: 0, health: 5, description: "嘲讽。亡语：抽一张牌", rarity: "common", type: "minion", faction: "neutral" },
  { name: "铁剑", cost: 1, attack: 2, health: 2, description: "2攻击力，2耐久度", rarity: "common", type: "weapon", faction: "neutral" },
  { name: "烽火", cost: 1, attack: 0, health: 0, description: "对一个随从造成2点伤害", rarity: "common", type: "spell", faction: "neutral" },
  { name: "征兵令", cost: 3, attack: 0, health: 0, description: "召唤两个1/1的乡勇", rarity: "common", type: "spell", faction: "neutral" },
  { name: "草药", cost: 2, attack: 0, health: 0, description: "恢复5点生命值", rarity: "common", type: "spell", faction: "neutral" },

  // === 稀有 (10) ===
  { name: "张飞", cost: 5, attack: 5, health: 5, description: "冲锋。战吼：获得嘲讽直到下一回合", rarity: "rare", type: "minion", faction: "shu" },
  { name: "赵云", cost: 4, attack: 4, health: 4, description: "圣盾。冲锋", rarity: "rare", type: "minion", faction: "shu" },
  { name: "许褚", cost: 4, attack: 5, health: 4, description: "激怒：+3攻击力", rarity: "rare", type: "minion", faction: "wei" },
  { name: "夏侯惇", cost: 5, attack: 4, health: 5, description: "战吼：对一个敌人造成2点伤害并获得+2攻击力", rarity: "rare", type: "minion", faction: "wei" },
  { name: "甘宁", cost: 3, attack: 3, health: 3, description: "潜行。亡语：装备一把2/2的武器", rarity: "rare", type: "minion", faction: "wu" },
  { name: "黄忠", cost: 6, attack: 6, health: 4, description: "战吼：对一个敌方随从造成3点伤害", rarity: "rare", type: "minion", faction: "shu" },
  { name: "伏兵", cost: 3, attack: 0, health: 0, description: "对所有敌方随从造成3点伤害", rarity: "rare", type: "spell", faction: "neutral" },
  { name: "草船借箭", cost: 4, attack: 0, health: 0, description: "抽3张牌。若你没有手牌，改为抽5张", rarity: "rare", type: "spell", faction: "wu" },
  { name: "青龙偃月刀", cost: 3, attack: 3, health: 3, description: "3攻击力，3耐久度。装备时获得风怒", rarity: "rare", type: "weapon", faction: "shu" },
  { name: "丈八蛇矛", cost: 4, attack: 4, health: 2, description: "4攻击力，2耐久度。攻击后对相邻随从造成1点伤害", rarity: "rare", type: "weapon", faction: "qun" },

  // === 史诗 (7) ===
  { name: "吕布", cost: 7, attack: 8, health: 5, description: "冲锋。风怒。无法被法术指定", rarity: "epic", type: "minion", faction: "qun" },
  { name: "孙策", cost: 5, attack: 5, health: 5, description: "战吼：将一个敌方随从移回对手手牌", rarity: "epic", type: "minion", faction: "wu" },
  { name: "典韦", cost: 6, attack: 7, health: 5, description: "亡语：对一个随机敌人造成等同于本随从攻击力的伤害", rarity: "epic", type: "minion", faction: "wei" },
  { name: "太史慈", cost: 5, attack: 4, health: 6, description: "战吼：挑战一个敌方随从，双方互相攻击", rarity: "epic", type: "minion", faction: "wu" },
  { name: "连环计", cost: 6, attack: 0, health: 0, description: "冻结所有敌方随从。对每个被冻结的随从造成2点伤害", rarity: "epic", type: "spell", faction: "wu" },
  { name: "空城计", cost: 4, attack: 0, health: 0, description: "你的英雄在下回合前免疫。抽2张牌", rarity: "epic", type: "spell", faction: "shu" },
  { name: "方天画戟", cost: 5, attack: 5, health: 2, description: "5攻击力，2耐久度。战吼：摧毁敌方武器", rarity: "epic", type: "weapon", faction: "qun" },

  // === 传说 (7) ===
  { name: "刘备", cost: 6, attack: 4, health: 6, description: "战吼：召唤张飞（3/3冲锋）和关羽（4/4嘲讽）", rarity: "legendary", type: "minion", faction: "shu" },
  { name: "曹操", cost: 8, attack: 6, health: 6, description: "战吼：夺取一个攻击力不超过3的敌方随从", rarity: "legendary", type: "minion", faction: "wei" },
  { name: "孙权", cost: 7, attack: 5, health: 7, description: "战吼：使所有友方随从获得+2/+2和圣盾", rarity: "legendary", type: "minion", faction: "wu" },
  { name: "诸葛亮", cost: 8, attack: 3, health: 8, description: "法术伤害+3。每回合结束时，将一张随机法术牌加入你的手牌", rarity: "legendary", type: "minion", faction: "shu" },
  { name: "关羽", cost: 7, attack: 6, health: 6, description: "嘲讽。圣盾。亡语：装备一把5/3的青龙偃月刀", rarity: "legendary", type: "minion", faction: "shu" },
  { name: "司马懿", cost: 9, attack: 5, health: 7, description: "战吼：将对手上回合使用的所有法术复制到你的手牌", rarity: "legendary", type: "minion", faction: "wei" },
  { name: "火烧赤壁", cost: 10, attack: 0, health: 0, description: "对所有敌方随从造成8点伤害。对敌方英雄造成4点伤害", rarity: "legendary", type: "spell", faction: "wu" },
];
