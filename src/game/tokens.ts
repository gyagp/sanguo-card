import { Card, BoardMinion, Lane } from "./types";

export interface TokenDefinition extends Card {
  collectible: false;
}

function defineToken(
  name: string,
  attack: number,
  health: number,
  faction: Card["faction"],
  extra?: Partial<Card>
): TokenDefinition {
  return {
    name,
    cost: 0,
    attack,
    health,
    description: "",
    rarity: "common",
    type: "minion",
    faction,
    collectible: false,
    ...extra,
  };
}

export const TOKEN_REGISTRY: Record<string, TokenDefinition> = {
  士兵: defineToken("士兵", 1, 1, "neutral"),
  精锐士兵: defineToken("精锐士兵", 2, 1, "neutral"),
  乡勇: defineToken("乡勇", 1, 1, "neutral"),
  张飞: defineToken("张飞", 3, 3, "shu", { charge: true }),
  关羽: defineToken("关羽", 4, 4, "shu", { taunt: true }),
  西凉兵: defineToken("西凉兵", 2, 1, "qun"),
  西凉精锐: defineToken("西凉精锐", 3, 2, "qun"),
  袁军精锐: defineToken("袁军精锐", 3, 3, "neutral"),
  蜀国伏兵: defineToken("蜀国伏兵", 2, 1, "shu"),
  黄巾小兵: defineToken("黄巾小兵", 2, 1, "qun"),
};

export type TokenName = keyof typeof TOKEN_REGISTRY;

export function createTokenMinion(tokenName: TokenName): BoardMinion {
  const def = TOKEN_REGISTRY[tokenName];
  if (!def) throw new Error(`Unknown token: ${tokenName}`);
  return {
    name: def.name,
    cost: def.cost,
    attack: def.attack,
    health: def.health,
    description: def.description,
    type: def.type,
    rarity: def.rarity,
    faction: def.faction,
    taunt: def.taunt,
    charge: def.charge,
    currentAttack: def.attack,
    currentHealth: def.health,
    summoningSickness: def.charge ? false : true,
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
    formationAtkBonus: 0,
    formationHpBonus: 0,
    brotherhoodAtkBonus: 0,
    brotherhoodHpBonus: 0,
    wuChargeBonus: 0,
    wuWeaponBonus: 0,
    wuComboAtkBonus: 0,
    wuComboHpBonus: 0,
    qunDebuff: 0,
    heroSkillCooldownLeft: 0,
    heroSkillAtkBonus: 0,
    heroSkillHpBonus: 0,
    lane: Lane.Center,
    slotIndex: 0,
  };
}
