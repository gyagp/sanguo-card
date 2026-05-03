import { Card } from "./types";

export const cards: Card[] = [
  // === COMMON (10) ===
  { name: "Village Militia", cost: 1, attack: 1, health: 2, description: "Taunt", rarity: "common", type: "minion", faction: "neutral" },
  { name: "Scout Rider", cost: 1, attack: 2, health: 1, description: "Charge", rarity: "common", type: "minion", faction: "neutral" },
  { name: "Grain Transport", cost: 2, attack: 1, health: 4, description: "Battlecry: Restore 2 health to your hero", rarity: "common", type: "minion", faction: "neutral" },
  { name: "Crossbowman", cost: 2, attack: 3, health: 2, description: "Battlecry: Deal 1 damage to an enemy minion", rarity: "common", type: "minion", faction: "neutral" },
  { name: "Spearman", cost: 3, attack: 3, health: 3, description: "Taunt. Battlecry: Gain +1 Attack if you control another minion", rarity: "common", type: "minion", faction: "neutral" },
  { name: "Supply Cart", cost: 2, attack: 0, health: 5, description: "Taunt. Deathrattle: Draw a card", rarity: "common", type: "minion", faction: "neutral" },
  { name: "Iron Sword", cost: 1, attack: 2, health: 2, description: "2 attack, 2 durability", rarity: "common", type: "weapon", faction: "neutral" },
  { name: "Signal Fire", cost: 1, attack: 0, health: 0, description: "Deal 2 damage to a minion", rarity: "common", type: "spell", faction: "neutral" },
  { name: "Conscription", cost: 3, attack: 0, health: 0, description: "Summon two 1/1 Militia", rarity: "common", type: "spell", faction: "neutral" },
  { name: "Herbal Medicine", cost: 2, attack: 0, health: 0, description: "Restore 5 health", rarity: "common", type: "spell", faction: "neutral" },

  // === RARE (10) ===
  { name: "Zhang Fei", cost: 5, attack: 5, health: 5, description: "Charge. Battlecry: Gain Taunt until next turn", rarity: "rare", type: "minion", faction: "shu" },
  { name: "Zhao Yun", cost: 4, attack: 4, health: 4, description: "Divine Shield. Charge", rarity: "rare", type: "minion", faction: "shu" },
  { name: "Xu Chu", cost: 4, attack: 5, health: 4, description: "Enrage: +3 Attack", rarity: "rare", type: "minion", faction: "wei" },
  { name: "Xiahou Dun", cost: 5, attack: 4, health: 5, description: "Battlecry: Deal 2 damage to an enemy and gain +2 Attack", rarity: "rare", type: "minion", faction: "wei" },
  { name: "Gan Ning", cost: 3, attack: 3, health: 3, description: "Stealth. Deathrattle: Equip a 2/2 weapon", rarity: "rare", type: "minion", faction: "wu" },
  { name: "Huang Zhong", cost: 6, attack: 6, health: 4, description: "Battlecry: Deal 3 damage to an enemy minion", rarity: "rare", type: "minion", faction: "shu" },
  { name: "Ambush", cost: 3, attack: 0, health: 0, description: "Deal 3 damage to all enemy minions", rarity: "rare", type: "spell", faction: "neutral" },
  { name: "Borrowed Arrows", cost: 4, attack: 0, health: 0, description: "Draw 3 cards. If your hand is empty, draw 5 instead", rarity: "rare", type: "spell", faction: "wu" },
  { name: "Green Dragon Blade", cost: 3, attack: 3, health: 3, description: "3 attack, 3 durability. Windfury while equipped", rarity: "rare", type: "weapon", faction: "shu" },
  { name: "Serpent Spear", cost: 4, attack: 4, health: 2, description: "4 attack, 2 durability. After attacking, deal 1 damage to adjacent minions", rarity: "rare", type: "weapon", faction: "qun" },

  // === EPIC (7) ===
  { name: "Lu Bu", cost: 7, attack: 8, health: 5, description: "Charge. Windfury. Cannot be targeted by spells", rarity: "epic", type: "minion", faction: "qun" },
  { name: "Sun Ce", cost: 5, attack: 5, health: 5, description: "Battlecry: Return an enemy minion to their hand", rarity: "epic", type: "minion", faction: "wu" },
  { name: "Dian Wei", cost: 6, attack: 7, health: 5, description: "Deathrattle: Deal damage equal to this minion's attack to a random enemy", rarity: "epic", type: "minion", faction: "wei" },
  { name: "Taishi Ci", cost: 5, attack: 4, health: 6, description: "Battlecry: Challenge an enemy minion. Both minions attack each other", rarity: "epic", type: "minion", faction: "wu" },
  { name: "Chain Stratagem", cost: 6, attack: 0, health: 0, description: "Freeze all enemy minions. Deal 2 damage to each frozen minion", rarity: "epic", type: "spell", faction: "wu" },
  { name: "Empty Fort Strategy", cost: 4, attack: 0, health: 0, description: "Your hero is Immune until your next turn. Draw 2 cards", rarity: "epic", type: "spell", faction: "shu" },
  { name: "Sky Piercer Halberd", cost: 5, attack: 5, health: 2, description: "5 attack, 2 durability. Battlecry: Destroy the enemy's weapon", rarity: "epic", type: "weapon", faction: "qun" },

  // === LEGENDARY (7) ===
  { name: "Liu Bei", cost: 6, attack: 4, health: 6, description: "Battlecry: Summon Zhang Fei (3/3 Charge) and Guan Yu (4/4 Taunt)", rarity: "legendary", type: "minion", faction: "shu" },
  { name: "Cao Cao", cost: 8, attack: 6, health: 6, description: "Battlecry: Take control of an enemy minion with 3 or less Attack", rarity: "legendary", type: "minion", faction: "wei" },
  { name: "Sun Quan", cost: 7, attack: 5, health: 7, description: "Battlecry: Give all friendly minions +2/+2 and Divine Shield", rarity: "legendary", type: "minion", faction: "wu" },
  { name: "Zhuge Liang", cost: 8, attack: 3, health: 8, description: "Spell Damage +3. At the end of your turn, add a random spell to your hand", rarity: "legendary", type: "minion", faction: "shu" },
  { name: "Guan Yu", cost: 7, attack: 6, health: 6, description: "Taunt. Divine Shield. Deathrattle: Equip a 5/3 Green Dragon Blade", rarity: "legendary", type: "minion", faction: "shu" },
  { name: "Sima Yi", cost: 9, attack: 5, health: 7, description: "Battlecry: Copy all spells your opponent cast last turn into your hand", rarity: "legendary", type: "minion", faction: "wei" },
  { name: "Red Cliffs Inferno", cost: 10, attack: 0, health: 0, description: "Deal 8 damage to all enemy minions. Deal 4 damage to the enemy hero", rarity: "legendary", type: "spell", faction: "wu" },
];
