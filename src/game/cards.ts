import { Card, GameState, BoardMinion, MAX_BOARD_SIZE, MAX_HAND_SIZE, EffectContext, drawCard, STARTING_HP, gameEventBus, EventListener, GameEvent, applyFreeze, Lane, addMinionToLane } from "./types";

export const cards: Card[] = [
  // === 普通 (10) ===
  {
    name: "乡勇", cost: 1, attack: 1, health: 2, description: "嘲讽",
    rarity: "common", type: "minion", faction: "neutral",
    taunt: true,
  },
  {
    name: "斥候骑兵", cost: 1, attack: 2, health: 1, description: "冲锋",
    rarity: "common", type: "minion", faction: "neutral",
    charge: true,
  },
  {
    name: "运粮车", cost: 2, attack: 1, health: 4, description: "战吼：为你的英雄恢复2点生命值",
    rarity: "common", type: "minion", faction: "neutral",
    battlecry: (state: GameState, context) => {
      state.players[context.player].hero.health += 2;
      return state;
    },
  },
  {
    name: "弓弩手", cost: 2, attack: 3, health: 2, description: "战吼：对一个敌方随从造成1点伤害",
    rarity: "common", type: "minion", faction: "neutral",
    battlecry: (state: GameState, context) => {
      const enemy = context.player === 0 ? 1 : 0;
      const targets = state.players[enemy].board;
      if (targets.length > 0) {
        const target = targets[Math.floor(Math.random() * targets.length)];
        target.currentHealth -= 1;
      }
      return state;
    },
  },
  {
    name: "长枪兵", cost: 3, attack: 3, health: 3, description: "嘲讽。战吼：若你控制其他随从，获得+1攻击力",
    rarity: "common", type: "minion", faction: "neutral",
    taunt: true,
    battlecry: (state: GameState, context) => {
      const board = state.players[context.player].board;
      if (board.length > 1) {
        const self = board[board.length - 1];
        self.currentAttack += 1;
      }
      return state;
    },
  },
  {
    name: "辎重车", cost: 2, attack: 0, health: 5, description: "嘲讽。亡语：抽一张牌",
    rarity: "common", type: "minion", faction: "neutral",
    taunt: true,
    deathrattle: (state: GameState, context) => {
      const player = state.players[context.player];
      if (player.deck.length > 0) {
        const deck = player.deck as unknown as Card[];
        const card = deck.shift()!;
        if (player.hand.length < 10) {
          player.hand.push(card);
        }
      }
      return state;
    },
  },
  {
    name: "铁剑", cost: 1, attack: 2, health: 2, description: "2攻击力，2耐久度",
    rarity: "common", type: "weapon", faction: "neutral",
  },
  {
    name: "烽火", cost: 1, attack: 0, health: 0, description: "对一个敌方随从造成2点伤害",
    rarity: "common", type: "spell", faction: "neutral",
    targetType: "enemy_minion",
    effect: (state: GameState, context: EffectContext) => {
      const damage = 2 + (context.spellDamage ?? 0);
      const enemy = state.players[context.player === 0 ? 1 : 0];
      if (context.targetIndex !== undefined && enemy.board[context.targetIndex]) {
        enemy.board[context.targetIndex].currentHealth -= damage;
      } else if (enemy.board.length > 0) {
        const target = enemy.board[Math.floor(Math.random() * enemy.board.length)];
        target.currentHealth -= damage;
      }
      return state;
    },
  },
  {
    name: "征兵令", cost: 3, attack: 0, health: 0, description: "召唤两个1/1的乡勇",
    rarity: "common", type: "spell", faction: "neutral",
    effect: (state: GameState, context: EffectContext) => {
      const player = state.players[context.player];
      for (let i = 0; i < 2 && player.board.length < MAX_BOARD_SIZE; i++) {
        const token: BoardMinion = {
          name: "乡勇", cost: 0, attack: 1, health: 1, description: "", rarity: "common",
          type: "minion", faction: "neutral",
          currentAttack: 1, currentHealth: 1,
          summoningSickness: true, hasAttacked: false, hasDivineShield: false,
          isStealth: false, isFrozen: false, freezeTurnsLeft: 0, isImmune: false,
          windfuryAttacksLeft: 1, enrageActive: false, enrageBonus: 0,
          factionAttackBonus: 0, factionHealthBonus: 0,
          shuAdjacencyAtkBonus: 0, shuAdjacencyHpBonus: 0,
          brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0, wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0, qunDebuff: 0,
          lane: Lane.Center, slotIndex: 0,
        };
        addMinionToLane(player, token, Lane.Center);
      }
      return state;
    },
  },
  {
    name: "草药", cost: 2, attack: 0, health: 0, description: "恢复5点生命值",
    rarity: "common", type: "spell", faction: "neutral",
    effect: (state: GameState, context: EffectContext) => {
      const hero = state.players[context.player].hero;
      hero.health = Math.min(hero.health + 5, STARTING_HP);
      return state;
    },
  },

  // === 稀有 (10) ===
  {
    name: "张飞", cost: 5, attack: 5, health: 5, description: "冲锋。战吼：获得嘲讽",
    rarity: "rare", type: "minion", faction: "shu",
    charge: true,
    battlecry: (state: GameState, context) => {
      const board = state.players[context.player].board;
      const self = board[board.length - 1];
      self.taunt = true;
      return state;
    },
  },
  {
    name: "赵云", cost: 4, attack: 4, health: 4, description: "圣盾。冲锋",
    rarity: "rare", type: "minion", faction: "shu",
    divineShield: true,
    charge: true,
  },
  {
    name: "许褚", cost: 4, attack: 5, health: 4, description: "激怒：+3攻击力",
    rarity: "rare", type: "minion", faction: "wei",
    enrage: (state: GameState, context) => {
      const self = context.sourceCard as BoardMinion;
      self.currentAttack += 3;
      self.enrageBonus = 3;
      self.enrageActive = true;
      return state;
    },
  },
  {
    name: "夏侯惇", cost: 5, attack: 4, health: 5, description: "战吼：对一个敌方随从造成2点伤害并获得+2攻击力",
    rarity: "rare", type: "minion", faction: "wei",
    battlecry: (state: GameState, context) => {
      const enemy = context.player === 0 ? 1 : 0;
      const targets = state.players[enemy].board;
      if (targets.length > 0) {
        const target = targets[Math.floor(Math.random() * targets.length)];
        target.currentHealth -= 2;
      }
      const board = state.players[context.player].board;
      const self = board[board.length - 1];
      self.currentAttack += 2;
      return state;
    },
  },
  {
    name: "甘宁", cost: 3, attack: 3, health: 3, description: "潜行。亡语：装备一把2/2的武器",
    rarity: "rare", type: "minion", faction: "wu",
    stealth: true,
    deathrattle: (state: GameState, context) => {
      state.players[context.player].weapon = { name: "甘宁之刃", attack: 2, durability: 2 };
      state.players[context.player].heroWindfuryAttacksLeft = 1;
      return state;
    },
  },
  {
    name: "黄忠", cost: 6, attack: 6, health: 4, description: "战吼：对一个敌方随从造成3点伤害",
    rarity: "rare", type: "minion", faction: "shu",
    battlecry: (state: GameState, context) => {
      const enemy = context.player === 0 ? 1 : 0;
      const targets = state.players[enemy].board;
      if (targets.length > 0) {
        const target = targets[Math.floor(Math.random() * targets.length)];
        target.currentHealth -= 3;
      }
      return state;
    },
  },
  {
    name: "伏兵", cost: 3, attack: 0, health: 0, description: "对所有敌方随从造成3点伤害",
    rarity: "rare", type: "spell", faction: "neutral",
    effect: (state: GameState, context: EffectContext) => {
      const damage = 3 + (context.spellDamage ?? 0);
      const enemy = state.players[context.player === 0 ? 1 : 0];
      for (const minion of enemy.board) {
        minion.currentHealth -= damage;
      }
      return state;
    },
  },
  {
    name: "草船借箭", cost: 4, attack: 0, health: 0, description: "抽3张牌。若你没有手牌，改为抽5张",
    rarity: "rare", type: "spell", faction: "wu",
    effect: (state: GameState, context: EffectContext) => {
      const player = state.players[context.player];
      const count = player.hand.length === 0 ? 5 : 3;
      for (let i = 0; i < count; i++) {
        drawCard(player);
      }
      return state;
    },
  },
  {
    name: "青龙偃月刀", cost: 3, attack: 3, health: 3, description: "3攻击力，3耐久度。装备时获得风怒",
    rarity: "rare", type: "weapon", faction: "shu",
    windfury: true,
  },
  {
    name: "丈八蛇矛", cost: 4, attack: 4, health: 2, description: "4攻击力，2耐久度。攻击后对相邻随从造成1点伤害",
    rarity: "rare", type: "weapon", faction: "qun",
  },

  // === 史诗 (7) ===
  {
    name: "吕布", cost: 7, attack: 8, health: 5, description: "冲锋。风怒。无法被法术指定",
    rarity: "epic", type: "minion", faction: "qun",
    charge: true,
    windfury: true,
    spellImmune: true,
  },
  {
    name: "孙策", cost: 5, attack: 5, health: 5, description: "战吼：将一个敌方随从移回对手手牌",
    rarity: "epic", type: "minion", faction: "wu",
    battlecry: (state: GameState, context) => {
      const enemy = context.player === 0 ? 1 : 0;
      const enemyBoard = state.players[enemy].board;
      if (enemyBoard.length > 0) {
        const idx = Math.floor(Math.random() * enemyBoard.length);
        const minion = enemyBoard.splice(idx, 1)[0];
        const card: Card = {
          name: minion.name, cost: minion.cost, attack: minion.attack,
          health: minion.health, description: minion.description,
          rarity: minion.rarity, type: minion.type, faction: minion.faction,
        };
        state.players[enemy].hand.push(card);
      }
      return state;
    },
  },
  {
    name: "典韦", cost: 6, attack: 7, health: 5, description: "亡语：对一个随机敌人造成等同于本随从攻击力的伤害",
    rarity: "epic", type: "minion", faction: "wei",
    deathrattle: (state: GameState, context) => {
      const enemy = context.player === 0 ? 1 : 0;
      const sourceMinion = context.sourceCard as BoardMinion;
      const dmg = sourceMinion.currentAttack;
      const enemyBoard = state.players[enemy].board;
      if (enemyBoard.length > 0) {
        const target = enemyBoard[Math.floor(Math.random() * enemyBoard.length)];
        target.currentHealth -= dmg;
      } else {
        state.players[enemy].hero.health -= dmg;
      }
      return state;
    },
  },
  {
    name: "太史慈", cost: 5, attack: 4, health: 6, description: "战吼：挑战一个敌方随从，双方互相攻击",
    rarity: "epic", type: "minion", faction: "wu",
    battlecry: (state: GameState, context) => {
      const enemy = context.player === 0 ? 1 : 0;
      const enemyBoard = state.players[enemy].board;
      if (enemyBoard.length > 0) {
        const board = state.players[context.player].board;
        const self = board[board.length - 1];
        const target = enemyBoard[Math.floor(Math.random() * enemyBoard.length)];
        self.currentHealth -= target.currentAttack;
        target.currentHealth -= self.currentAttack;
      }
      return state;
    },
  },
  {
    name: "连环计", cost: 6, attack: 0, health: 0, description: "冻结所有敌方随从。对每个被冻结的随从造成2点伤害",
    rarity: "epic", type: "spell", faction: "wu",
    effect: (state: GameState, context: EffectContext) => {
      const damage = 2 + (context.spellDamage ?? 0);
      const enemy = state.players[context.player === 0 ? 1 : 0];
      const casterPlayer = state.players[context.player];
      for (const minion of enemy.board) {
        applyFreeze(minion, casterPlayer);
        minion.currentHealth -= damage;
      }
      return state;
    },
  },
  {
    name: "空城计", cost: 4, attack: 0, health: 0, description: "你的英雄在下回合前免疫。抽2张牌",
    rarity: "epic", type: "spell", faction: "shu",
    effect: (state: GameState, context: EffectContext) => {
      const player = state.players[context.player];
      player.hero.isImmune = true;
      for (let i = 0; i < 2; i++) {
        drawCard(player);
      }
      return state;
    },
  },
  {
    name: "方天画戟", cost: 5, attack: 5, health: 2, description: "5攻击力，2耐久度。战吼：摧毁敌方武器",
    rarity: "epic", type: "weapon", faction: "qun",
    battlecry: (state: GameState, context) => {
      const enemy = context.player === 0 ? 1 : 0;
      state.players[enemy].weapon = null;
      return state;
    },
  },

  // === 传说 (7) ===
  {
    name: "刘备", cost: 6, attack: 4, health: 6, description: "战吼：召唤张飞（3/3冲锋）和关羽（4/4嘲讽）",
    rarity: "legendary", type: "minion", faction: "shu",
    battlecry: (state: GameState, context) => {
      const player = state.players[context.player];
      const makeMinion = (name: string, atk: number, hp: number, extra: Partial<BoardMinion>): BoardMinion => ({
        name, cost: 0, attack: atk, health: hp, description: "",
        rarity: "common", type: "minion", faction: "shu",
        currentAttack: atk, currentHealth: hp,
        summoningSickness: extra.charge ? false : true,
        hasAttacked: false, hasDivineShield: false, isStealth: false,
        isFrozen: false, freezeTurnsLeft: 0, isImmune: false, windfuryAttacksLeft: 1, enrageActive: false, enrageBonus: 0,
        factionAttackBonus: 0, factionHealthBonus: 0,
        shuAdjacencyAtkBonus: 0, shuAdjacencyHpBonus: 0,
        brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0, wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0, qunDebuff: 0,
        lane: Lane.Center, slotIndex: 0,
        ...extra,
      });
      if (player.board.length < MAX_BOARD_SIZE) {
        addMinionToLane(player, makeMinion("张飞", 3, 3, { charge: true, summoningSickness: false }), Lane.Left);
      }
      if (player.board.length < MAX_BOARD_SIZE) {
        addMinionToLane(player, makeMinion("关羽", 4, 4, { taunt: true }), Lane.Right);
      }
      return state;
    },
  },
  {
    name: "曹操", cost: 8, attack: 6, health: 6, description: "战吼：夺取一个攻击力不超过3的敌方随从",
    rarity: "legendary", type: "minion", faction: "wei",
    battlecry: (state: GameState, context) => {
      const enemy = context.player === 0 ? 1 : 0;
      const enemyBoard = state.players[enemy].board;
      const myBoard = state.players[context.player].board;
      const stealable = enemyBoard.filter(m => m.currentAttack <= 3);
      if (stealable.length > 0 && myBoard.length < MAX_BOARD_SIZE) {
        const target = stealable[Math.floor(Math.random() * stealable.length)];
        const idx = enemyBoard.indexOf(target);
        enemyBoard.splice(idx, 1);
        target.summoningSickness = true;
        target.hasAttacked = false;
        myBoard.push(target);
      }
      return state;
    },
  },
  {
    name: "孙权", cost: 7, attack: 5, health: 7, description: "战吼：使所有友方随从获得+2/+2和圣盾",
    rarity: "legendary", type: "minion", faction: "wu",
    battlecry: (state: GameState, context) => {
      const board = state.players[context.player].board;
      for (const minion of board) {
        if (minion.name !== "孙权") {
          minion.currentAttack += 2;
          minion.currentHealth += 2;
          minion.hasDivineShield = true;
        }
      }
      return state;
    },
  },
  {
    name: "诸葛亮", cost: 8, attack: 3, health: 8, description: "法术伤害+3。每回合结束时，将一张随机法术牌加入你的手牌",
    rarity: "legendary", type: "minion", faction: "shu",
    spellDamage: 3,
    onPlay: (_state: GameState, minion: BoardMinion, player: 0 | 1) => {
      const listener: EventListener = (event: GameEvent) => {
        if (event.player !== player || !event.state) return;
        const owner = event.state.players[player];
        if (!owner.board.some(m => m.name === "诸葛亮")) {
          gameEventBus.off("turn_end", listener);
          return;
        }
        if (owner.hand.length >= MAX_HAND_SIZE) return;
        const spell = spellCardPool[Math.floor(Math.random() * spellCardPool.length)];
        owner.hand.push({ ...spell });
      };
      gameEventBus.on("turn_end", listener);
      minion.registeredListeners = minion.registeredListeners ?? [];
      minion.registeredListeners.push({ type: "turn_end", listener });
    },
  },
  {
    name: "关羽", cost: 7, attack: 6, health: 6, description: "嘲讽。圣盾。亡语：装备一把5/3的青龙偃月刀",
    rarity: "legendary", type: "minion", faction: "shu",
    taunt: true,
    divineShield: true,
    deathrattle: (state: GameState, context) => {
      state.players[context.player].weapon = { name: "青龙偃月刀", attack: 5, durability: 3 };
      state.players[context.player].heroWindfuryAttacksLeft = 1;
      return state;
    },
  },
  {
    name: "司马懿", cost: 9, attack: 5, health: 7, description: "战吼：将对手上回合使用的所有法术复制到你的手牌",
    rarity: "legendary", type: "minion", faction: "wei",
    battlecry: (state: GameState, context) => {
      const enemy = context.player === 0 ? 1 : 0;
      const enemySpells = state.spellsPlayed[enemy];
      const myHand = state.players[context.player].hand;
      for (const spell of enemySpells) {
        if (myHand.length < MAX_HAND_SIZE) {
          myHand.push({ ...spell });
        }
      }
      return state;
    },
  },
  {
    name: "火烧赤壁", cost: 10, attack: 0, health: 0, description: "对所有敌方随从造成8点伤害。对敌方英雄造成4点伤害",
    rarity: "legendary", type: "spell", faction: "wu",
    effect: (state: GameState, context: EffectContext) => {
      const minionDamage = 8 + (context.spellDamage ?? 0);
      const heroDamage = 4 + (context.spellDamage ?? 0);
      const enemy = state.players[context.player === 0 ? 1 : 0];
      for (const minion of enemy.board) {
        minion.currentHealth -= minionDamage;
      }
      enemy.hero.health -= heroDamage;
      return state;
    },
  },
];

const spellCardPool = cards.filter(c => c.type === "spell");
