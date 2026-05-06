import { Reward } from "./progression";
import { Lane, TerrainEffect, TerrainType, TERRAIN_DEFINITIONS } from "./types";

export interface StarThresholds {
  threeStarMinHpPercent: number;
  threeStarMaxTurns: number;
  twoStarMinHpPercent: number;
  twoStarMaxTurns: number;
}

export interface BossRule {
  extraMana?: number;
  fieldEffect?: string;
  uniqueHeroPower?: { name: string; cost: number; description: string };
  startingMinion?: { name: string; attack: number; health: number; faction?: string };
  spellDiscount?: number;
  bossHp?: number;
}

export interface AdventureStage {
  id: string;
  name: string;
  description: string;
  enemyDeck: string[];
  difficulty: number;
  rewards: Reward;
  starThresholds: StarThresholds;
  isBoss: boolean;
  bossRules?: BossRule;
  tutorialHints?: string[];
  terrain?: Partial<Record<Lane, TerrainEffect>>;
}

export interface AdventureChapter {
  id: string;
  name: string;
  description: string;
  stages: AdventureStage[];
}

function stage(
  id: string,
  name: string,
  description: string,
  enemyDeck: string[],
  difficulty: number,
  rewards: Reward,
  starThresholds: StarThresholds,
): AdventureStage {
  return { id, name, description, enemyDeck, difficulty, rewards, starThresholds, isBoss: false };
}

function bossStage(
  id: string,
  name: string,
  description: string,
  enemyDeck: string[],
  difficulty: number,
  rewards: Reward,
  starThresholds: StarThresholds,
  bossRules: BossRule,
): AdventureStage {
  return { id, name, description, enemyDeck, difficulty, rewards, starThresholds, isBoss: true, bossRules };
}

export const adventureChapters: AdventureChapter[] = [
  // Chapter 1: 黄巾之乱 (Yellow Turban Rebellion)
  {
    id: "ch1",
    name: "黄巾之乱",
    description: "讨伐黄巾贼，保卫家园",
    stages: [
      {
        ...stage("ch1-1", "黄巾前哨", "击败黄巾斥候",
          ["乡勇", "乡勇", "乡勇", "乡勇", "斥候骑兵", "斥候骑兵", "弓弩手", "弓弩手", "烽火", "烽火",
           "乡勇", "乡勇", "斥候骑兵", "弓弩手", "烽火", "铁剑", "铁剑", "草药", "草药", "长枪兵"],
          1,
          { gold: 10, xp: 20 },
          { threeStarMinHpPercent: 0.8, threeStarMaxTurns: 8, twoStarMinHpPercent: 0.5, twoStarMaxTurns: 12 },
        ),
        tutorialHints: ["将手牌中的卡牌拖入战场来出牌", "法力水晶每回合增长，用来支付卡牌费用"],
      },
      {
        ...stage("ch1-2", "村庄保卫战", "保护村民免遭黄巾劫掠",
          ["乡勇", "乡勇", "乡勇", "斥候骑兵", "斥候骑兵", "弓弩手", "弓弩手", "长枪兵", "长枪兵", "运粮车",
           "烽火", "烽火", "草药", "草药", "铁剑", "铁剑", "乡勇", "弓弩手", "辎重车", "征兵令"],
          2,
          { gold: 15, xp: 25 },
          { threeStarMinHpPercent: 0.7, threeStarMaxTurns: 9, twoStarMinHpPercent: 0.4, twoStarMaxTurns: 13 },
        ),
        tutorialHints: ["点击你的随从然后点击敌方目标来攻击", "消灭敌方英雄即可获胜"],
      },
      stage("ch1-3", "破寨之战", "攻破黄巾营寨",
        ["乡勇", "乡勇", "斥候骑兵", "斥候骑兵", "弓弩手", "弓弩手", "长枪兵", "长枪兵", "辎重车", "辎重车",
         "运粮车", "运粮车", "烽火", "烽火", "征兵令", "征兵令", "草药", "铁剑", "铁剑", "长枪兵"],
        2,
        { gold: 15, xp: 30 },
        { threeStarMinHpPercent: 0.7, threeStarMaxTurns: 10, twoStarMinHpPercent: 0.4, twoStarMaxTurns: 14 },
      ),
      stage("ch1-4", "黄巾精锐", "击败黄巾精锐部队",
        ["长枪兵", "长枪兵", "长枪兵", "弓弩手", "弓弩手", "弓弩手", "辎重车", "辎重车", "运粮车", "运粮车",
         "征兵令", "征兵令", "烽火", "烽火", "草药", "草药", "铁剑", "铁剑", "斥候骑兵", "斥候骑兵"],
        3,
        { gold: 20, xp: 35 },
        { threeStarMinHpPercent: 0.6, threeStarMaxTurns: 10, twoStarMinHpPercent: 0.3, twoStarMaxTurns: 14 },
      ),
      stage("ch1-5", "广宗城下", "攻打黄巾主力",
        ["长枪兵", "长枪兵", "长枪兵", "弓弩手", "弓弩手", "辎重车", "辎重车", "运粮车", "运粮车", "征兵令",
         "征兵令", "烽火", "烽火", "征兵令", "草药", "草药", "铁剑", "铁剑", "长枪兵", "斥候骑兵"],
        3,
        { gold: 25, xp: 40 },
        { threeStarMinHpPercent: 0.5, threeStarMaxTurns: 11, twoStarMinHpPercent: 0.25, twoStarMaxTurns: 15 },
      ),
      {
        ...bossStage("ch1-boss", "张角", "击败黄巾首领张角",
          ["长枪兵", "长枪兵", "弓弩手", "弓弩手", "辎重车", "辎重车", "征兵令", "征兵令", "征兵令", "烽火",
           "运粮车", "运粮车", "烽火", "烽火", "草药", "草药", "长枪兵", "铁剑", "铁剑", "斥候骑兵"],
          4,
          { gold: 50, xp: 80, cards: [{ cardName: "许褚", count: 1 }] },
          { threeStarMinHpPercent: 0.5, threeStarMaxTurns: 12, twoStarMinHpPercent: 0.2, twoStarMaxTurns: 16 },
          { extraMana: 1, fieldEffect: "回合开始时，敌方召唤一个1/1乡勇", uniqueHeroPower: { name: "太平道法", cost: 2, description: "恢复3点生命值并抽一张牌" } },
        ),
        terrain: { [Lane.Center]: TERRAIN_DEFINITIONS[TerrainType.HealingAura] },
      },
    ],
  },

  // Chapter 2: 群雄逐鹿 (Warlords Contend)
  {
    id: "ch2",
    name: "群雄逐鹿",
    description: "诸侯割据，混战不休",
    stages: [
      stage("ch2-1", "虎牢关前", "突破董卓的第一道防线",
        ["乡勇", "乡勇", "长枪兵", "长枪兵", "弓弩手", "弓弩手", "许褚", "赵云", "甘宁", "辎重车",
         "辎重车", "运粮车", "征兵令", "烽火", "烽火", "伏兵", "草药", "草药", "铁剑", "铁剑"],
        4,
        { gold: 20, xp: 40 },
        { threeStarMinHpPercent: 0.6, threeStarMaxTurns: 10, twoStarMinHpPercent: 0.3, twoStarMaxTurns: 14 },
      ),
      stage("ch2-2", "汜水关", "攻克汜水关",
        ["长枪兵", "长枪兵", "弓弩手", "弓弩手", "许褚", "夏侯惇", "甘宁", "赵云", "辎重车", "辎重车",
         "运粮车", "运粮车", "征兵令", "烽火", "烽火", "伏兵", "草药", "草药", "铁剑", "张飞"],
        5,
        { gold: 25, xp: 45 },
        { threeStarMinHpPercent: 0.5, threeStarMaxTurns: 11, twoStarMinHpPercent: 0.25, twoStarMaxTurns: 15 },
      ),
      {
        ...stage("ch2-3", "西凉铁骑", "击败董卓的精锐骑兵",
          ["长枪兵", "长枪兵", "许褚", "许褚", "夏侯惇", "赵云", "甘宁", "张飞", "辎重车", "辎重车",
           "运粮车", "征兵令", "征兵令", "烽火", "伏兵", "伏兵", "草药", "草药", "铁剑", "黄忠"],
          5,
          { gold: 25, xp: 50 },
          { threeStarMinHpPercent: 0.5, threeStarMaxTurns: 11, twoStarMinHpPercent: 0.25, twoStarMaxTurns: 15 },
        ),
        terrain: { [Lane.Left]: TERRAIN_DEFINITIONS[TerrainType.Fire] },
      },
      {
        ...stage("ch2-4", "火烧洛阳", "在焚烧的洛阳城中战斗",
          ["长枪兵", "长枪兵", "许褚", "许褚", "夏侯惇", "夏侯惇", "赵云", "甘宁", "张飞", "黄忠",
           "辎重车", "运粮车", "征兵令", "烽火", "烽火", "伏兵", "伏兵", "草药", "草药", "铁剑"],
          6,
          { gold: 30, xp: 55 },
          { threeStarMinHpPercent: 0.4, threeStarMaxTurns: 12, twoStarMinHpPercent: 0.2, twoStarMaxTurns: 16 },
        ),
        terrain: {
          [Lane.Left]: TERRAIN_DEFINITIONS[TerrainType.Fire],
          [Lane.Center]: TERRAIN_DEFINITIONS[TerrainType.Fire],
          [Lane.Right]: TERRAIN_DEFINITIONS[TerrainType.Fire],
        },
      },
      stage("ch2-5", "追击董卓", "追击逃亡的董卓军",
        ["许褚", "许褚", "夏侯惇", "夏侯惇", "赵云", "赵云", "甘宁", "甘宁", "张飞", "黄忠",
         "辎重车", "运粮车", "征兵令", "征兵令", "伏兵", "伏兵", "烽火", "烽火", "草药", "草药"],
        6,
        { gold: 30, xp: 60 },
        { threeStarMinHpPercent: 0.4, threeStarMaxTurns: 12, twoStarMinHpPercent: 0.2, twoStarMaxTurns: 16 },
      ),
      {
        ...bossStage("ch2-boss", "吕布", "三英战吕布",
          ["许褚", "许褚", "夏侯惇", "夏侯惇", "赵云", "赵云", "甘宁", "甘宁", "张飞", "张飞",
           "辎重车", "运粮车", "征兵令", "征兵令", "伏兵", "伏兵", "烽火", "烽火", "草药", "吕布"],
          7,
          { gold: 80, xp: 120, cards: [{ cardName: "赵云", count: 1 }] },
          { threeStarMinHpPercent: 0.4, threeStarMaxTurns: 13, twoStarMinHpPercent: 0.15, twoStarMaxTurns: 17 },
          { extraMana: 1, fieldEffect: "吕布每回合获得+1攻击力", uniqueHeroPower: { name: "无双", cost: 2, description: "使一个友方随从获得冲锋和+2攻击力" } },
        ),
        terrain: { [Lane.Left]: TERRAIN_DEFINITIONS[TerrainType.Fire], [Lane.Right]: TERRAIN_DEFINITIONS[TerrainType.Fire] },
      },
    ],
  },

  // Chapter 3: 三足鼎立 (Three Kingdoms Form)
  {
    id: "ch3",
    name: "三足鼎立",
    description: "魏蜀吴三国鼎立，各显其能",
    stages: [
      stage("ch3-1", "白马之围", "曹操精锐魏军来袭",
        ["许褚", "许褚", "许褚", "夏侯惇", "夏侯惇", "夏侯惇", "典韦", "典韦", "长枪兵", "长枪兵",
         "辎重车", "辎重车", "征兵令", "征兵令", "烽火", "烽火", "伏兵", "草药", "草药", "铁剑"],
        5,
        { gold: 25, xp: 50 },
        { threeStarMinHpPercent: 0.5, threeStarMaxTurns: 11, twoStarMinHpPercent: 0.25, twoStarMaxTurns: 15 },
      ),
      {
        ...stage("ch3-2", "延津之战", "蜀国猛将出阵",
          ["张飞", "张飞", "赵云", "赵云", "赵云", "黄忠", "黄忠", "长枪兵", "长枪兵", "辎重车",
           "辎重车", "运粮车", "征兵令", "烽火", "烽火", "伏兵", "草药", "草药", "空城计", "铁剑"],
          6,
          { gold: 30, xp: 55 },
        { threeStarMinHpPercent: 0.5, threeStarMaxTurns: 11, twoStarMinHpPercent: 0.25, twoStarMaxTurns: 15 },
        ),
        terrain: { [Lane.Center]: TERRAIN_DEFINITIONS[TerrainType.HealingAura] },
      },
      stage("ch3-3", "江东之战", "东吴水军精锐",
        ["甘宁", "甘宁", "甘宁", "太史慈", "太史慈", "孙策", "孙策", "长枪兵", "长枪兵", "辎重车",
         "辎重车", "运粮车", "征兵令", "烽火", "烽火", "草船借箭", "草船借箭", "连环计", "草药", "草药"],
        6,
        { gold: 30, xp: 60 },
        { threeStarMinHpPercent: 0.4, threeStarMaxTurns: 12, twoStarMinHpPercent: 0.2, twoStarMaxTurns: 16 },
      ),
      stage("ch3-4", "官渡对峙", "魏军精锐出击",
        ["许褚", "许褚", "夏侯惇", "夏侯惇", "典韦", "典韦", "长枪兵", "辎重车", "运粮车", "运粮车",
         "征兵令", "征兵令", "伏兵", "伏兵", "烽火", "烽火", "草药", "草药", "曹操", "铁剑"],
        7,
        { gold: 35, xp: 65 },
        { threeStarMinHpPercent: 0.4, threeStarMaxTurns: 12, twoStarMinHpPercent: 0.2, twoStarMaxTurns: 16 },
      ),
      stage("ch3-5", "荆州争夺", "三国混战",
        ["张飞", "赵云", "甘宁", "甘宁", "典韦", "典韦", "夏侯惇", "黄忠", "太史慈", "孙策",
         "征兵令", "征兵令", "伏兵", "伏兵", "烽火", "烽火", "草药", "草药", "连环计", "空城计"],
        7,
        { gold: 35, xp: 70 },
        { threeStarMinHpPercent: 0.3, threeStarMaxTurns: 13, twoStarMinHpPercent: 0.15, twoStarMaxTurns: 17 },
      ),
      bossStage("ch3-boss", "袁绍", "击败袁绍，三分天下",
        ["夏侯惇", "夏侯惇", "赵云", "赵云", "甘宁", "甘宁", "典韦", "典韦", "张飞", "黄忠",
         "征兵令", "征兵令", "伏兵", "伏兵", "烽火", "烽火", "草药", "草药", "孙策", "太史慈"],
        8,
        { gold: 100, xp: 150, cards: [{ cardName: "夏侯惇", count: 1 }] },
        { threeStarMinHpPercent: 0.3, threeStarMaxTurns: 14, twoStarMinHpPercent: 0.1, twoStarMaxTurns: 18 },
        { extraMana: 1, startingMinion: { name: "袁军精锐", attack: 3, health: 3 }, fieldEffect: "袁绍开局自带一个3/3袁军精锐，所有随从每回合+1生命值", uniqueHeroPower: { name: "四世三公", cost: 2, description: "召唤一个3/3的袁军精锐" } },
      ),
    ],
  },

  // Chapter 4: 赤壁之战 (Battle of Red Cliffs)
  {
    id: "ch4",
    name: "赤壁之战",
    description: "孙刘联军运筹帷幄，以智取胜",
    stages: [
      stage("ch4-1", "长坂坡", "赵云七进七出",
        ["许褚", "许褚", "夏侯惇", "夏侯惇", "辎重车", "辎重车", "运粮车", "运粮车", "征兵令", "征兵令",
         "烽火", "烽火", "伏兵", "伏兵", "草药", "草药", "草船借箭", "连环计", "空城计", "张飞"],
        7,
        { gold: 30, xp: 60 },
        { threeStarMinHpPercent: 0.4, threeStarMaxTurns: 12, twoStarMinHpPercent: 0.2, twoStarMaxTurns: 16 },
      ),
      stage("ch4-2", "舌战群儒", "以智取胜",
        ["甘宁", "甘宁", "太史慈", "太史慈", "辎重车", "辎重车", "运粮车", "运粮车", "征兵令", "征兵令",
         "烽火", "烽火", "伏兵", "伏兵", "草药", "草药", "草船借箭", "草船借箭", "连环计", "空城计"],
        7,
        { gold: 35, xp: 65 },
        { threeStarMinHpPercent: 0.4, threeStarMaxTurns: 12, twoStarMinHpPercent: 0.2, twoStarMaxTurns: 16 },
      ),
      {
        ...stage("ch4-3", "草船借箭", "借箭十万",
          ["赵云", "赵云", "甘宁", "甘宁", "典韦", "典韦", "辎重车", "运粮车", "征兵令", "征兵令",
           "伏兵", "伏兵", "烽火", "烽火", "草药", "草药", "草船借箭", "草船借箭", "连环计", "空城计"],
          8,
          { gold: 35, xp: 70 },
          { threeStarMinHpPercent: 0.3, threeStarMaxTurns: 13, twoStarMinHpPercent: 0.15, twoStarMaxTurns: 17 },
        ),
        terrain: { [Lane.Right]: TERRAIN_DEFINITIONS[TerrainType.Stealth] },
      },
      stage("ch4-4", "连环计", "实施庞统的连环计",
        ["张飞", "张飞", "黄忠", "黄忠", "太史慈", "孙策", "辎重车", "运粮车", "征兵令", "征兵令",
         "伏兵", "伏兵", "烽火", "烽火", "草药", "草药", "连环计", "连环计", "草船借箭", "空城计"],
        8,
        { gold: 40, xp: 75 },
        { threeStarMinHpPercent: 0.3, threeStarMaxTurns: 13, twoStarMinHpPercent: 0.15, twoStarMaxTurns: 17 },
      ),
      {
        ...stage("ch4-5", "火烧战船", "火攻曹操水军",
          ["赵云", "赵云", "典韦", "典韦", "张飞", "黄忠", "太史慈", "孙策", "辎重车", "运粮车",
           "征兵令", "伏兵", "伏兵", "烽火", "烽火", "草药", "草药", "连环计", "草船借箭", "火烧赤壁"],
          9,
          { gold: 40, xp: 80 },
          { threeStarMinHpPercent: 0.3, threeStarMaxTurns: 13, twoStarMinHpPercent: 0.1, twoStarMaxTurns: 17 },
        ),
        terrain: {
          [Lane.Left]: TERRAIN_DEFINITIONS[TerrainType.Fire],
          [Lane.Center]: TERRAIN_DEFINITIONS[TerrainType.Fire],
        },
      },
      bossStage("ch4-boss", "曹操", "击败曹操",
        ["赵云", "赵云", "典韦", "典韦", "张飞", "张飞", "黄忠", "黄忠", "孙策", "太史慈",
         "征兵令", "伏兵", "伏兵", "连环计", "连环计", "草药", "草药", "草船借箭", "曹操", "火烧赤壁"],
        10,
        { gold: 150, xp: 200, cards: [{ cardName: "甘宁", count: 1 }] },
        { threeStarMinHpPercent: 0.25, threeStarMaxTurns: 15, twoStarMinHpPercent: 0.1, twoStarMaxTurns: 19 },
        { extraMana: 1, spellDiscount: 1, fieldEffect: "曹操的法术牌费用减少1点，每回合获得一张随机法术", uniqueHeroPower: { name: "挟天子以令诸侯", cost: 3, description: "夺取一个攻击力最低的敌方随从" } },
      ),
    ],
  },

  // Chapter 5: 天下归一 (Unification)
  {
    id: "ch5",
    name: "天下归一",
    description: "最终决战，一统天下",
    stages: [
      stage("ch5-1", "汉中争夺", "争夺战略要地汉中",
        ["赵云", "赵云", "典韦", "典韦", "张飞", "张飞", "黄忠", "黄忠", "太史慈", "孙策",
         "征兵令", "伏兵", "伏兵", "烽火", "烽火", "草药", "草药", "连环计", "刘备", "关羽"],
        8,
        { gold: 40, xp: 70 },
        { threeStarMinHpPercent: 0.4, threeStarMaxTurns: 13, twoStarMinHpPercent: 0.2, twoStarMaxTurns: 17 },
      ),
      stage("ch5-2", "夷陵之战", "东吴的反击",
        ["甘宁", "甘宁", "太史慈", "太史慈", "孙策", "孙策", "典韦", "典韦", "张飞", "黄忠",
         "征兵令", "伏兵", "伏兵", "烽火", "烽火", "草药", "草药", "连环计", "孙权", "火烧赤壁"],
        9,
        { gold: 40, xp: 75 },
        { threeStarMinHpPercent: 0.3, threeStarMaxTurns: 13, twoStarMinHpPercent: 0.15, twoStarMaxTurns: 17 },
      ),
      stage("ch5-3", "五丈原", "诸葛亮北伐",
        ["张飞", "张飞", "赵云", "赵云", "黄忠", "黄忠", "典韦", "太史慈", "孙策", "关羽",
         "征兵令", "伏兵", "伏兵", "烽火", "烽火", "草药", "草药", "空城计", "刘备", "诸葛亮"],
        9,
        { gold: 45, xp: 80 },
        { threeStarMinHpPercent: 0.3, threeStarMaxTurns: 14, twoStarMinHpPercent: 0.1, twoStarMaxTurns: 18 },
      ),
      stage("ch5-4", "合肥之战", "张辽威震逍遥津",
        ["许褚", "许褚", "夏侯惇", "夏侯惇", "典韦", "典韦", "张飞", "黄忠", "太史慈", "关羽",
         "征兵令", "伏兵", "伏兵", "连环计", "烽火", "烽火", "草药", "草药", "曹操", "吕布"],
        10,
        { gold: 50, xp: 90 },
        { threeStarMinHpPercent: 0.25, threeStarMaxTurns: 14, twoStarMinHpPercent: 0.1, twoStarMaxTurns: 18 },
      ),
      stage("ch5-5", "天命所归", "最终之战前奏",
        ["张飞", "张飞", "黄忠", "黄忠", "太史慈", "太史慈", "孙策", "典韦", "关羽", "关羽",
         "征兵令", "伏兵", "伏兵", "连环计", "连环计", "草药", "草药", "刘备", "曹操", "吕布"],
        10,
        { gold: 50, xp: 100 },
        { threeStarMinHpPercent: 0.2, threeStarMaxTurns: 15, twoStarMinHpPercent: 0.1, twoStarMaxTurns: 19 },
      ),
      {
        ...bossStage("ch5-boss", "司马懿", "击败司马懿，一统天下",
          ["张飞", "张飞", "黄忠", "黄忠", "太史慈", "太史慈", "典韦", "典韦", "关羽", "关羽",
           "伏兵", "伏兵", "连环计", "连环计", "草药", "草药", "草船借箭", "空城计", "司马懿", "诸葛亮"],
          10,
          { gold: 200, xp: 300, cards: [{ cardName: "诸葛亮", count: 1 }] },
          { threeStarMinHpPercent: 0.2, threeStarMaxTurns: 16, twoStarMinHpPercent: 0.05, twoStarMaxTurns: 20 },
          { extraMana: 3, bossHp: 40, fieldEffect: "司马懿拥有40点生命值，每回合复制你使用的上一张法术", uniqueHeroPower: { name: "鹰视狼顾", cost: 2, description: "窥视对手手牌并将其中一张法术牌变为草药" } },
        ),
        terrain: { [Lane.Center]: TERRAIN_DEFINITIONS[TerrainType.Stealth] },
      },
    ],
  },
];
