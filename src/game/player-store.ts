import { PlayerProfile, OwnedCard, STARTER_CARDS, XP_THRESHOLDS, PACK_PRICE } from "./progression";
import { Rarity } from "./types";
import { cards } from "./cards";

const STORAGE_KEY = "sanguo-card-player";

export function initializeNewPlayer(): PlayerProfile {
  return {
    gold: 0,
    xp: 0,
    level: 1,
    ownedCards: STARTER_CARDS.map((cardName) => ({
      cardName,
      count: 2,
      upgradeLevel: 1,
    })),
  };
}

export function savePlayer(profile: PlayerProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function loadPlayer(): PlayerProfile {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const player = initializeNewPlayer();
    savePlayer(player);
    return player;
  }
  const parsed = JSON.parse(raw);
  if (
    typeof parsed.gold !== "number" ||
    typeof parsed.xp !== "number" ||
    typeof parsed.level !== "number" ||
    !Array.isArray(parsed.ownedCards)
  ) {
    const player = initializeNewPlayer();
    savePlayer(player);
    return player;
  }
  return parsed as PlayerProfile;
}

export function addGold(amount: number): PlayerProfile {
  const player = loadPlayer();
  player.gold += amount;
  savePlayer(player);
  return player;
}

function computeLevel(xp: number): number {
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

export function addXP(amount: number): PlayerProfile {
  const player = loadPlayer();
  player.xp += amount;
  player.level = computeLevel(player.xp);
  savePlayer(player);
  return player;
}

export function addCards(cards: { cardName: string; count: number }[]): PlayerProfile {
  const player = loadPlayer();
  for (const { cardName, count } of cards) {
    const existing = player.ownedCards.find((c) => c.cardName === cardName);
    if (existing) {
      existing.count += count;
    } else {
      player.ownedCards.push({ cardName, count, upgradeLevel: 1 });
    }
  }
  savePlayer(player);
  return player;
}

export function getOwnedCards(): OwnedCard[] {
  return loadPlayer().ownedCards;
}

export interface PackResult {
  success: boolean;
  cards: { cardName: string; rarity: Rarity }[];
  player: PlayerProfile;
}

const RARITY_WEIGHTS: { rarity: Rarity; weight: number }[] = [
  { rarity: "common", weight: 0.70 },
  { rarity: "rare", weight: 0.20 },
  { rarity: "epic", weight: 0.08 },
  { rarity: "legendary", weight: 0.02 },
];

function rollRarity(): Rarity {
  const roll = Math.random();
  let cumulative = 0;
  for (const { rarity, weight } of RARITY_WEIGHTS) {
    cumulative += weight;
    if (roll < cumulative) return rarity;
  }
  return "common";
}

function pickRandomCard(rarity: Rarity): string {
  const pool = cards.filter((c) => c.rarity === rarity);
  if (pool.length === 0) {
    const fallback = cards.filter((c) => c.rarity === "common");
    return fallback[Math.floor(Math.random() * fallback.length)].name;
  }
  return pool[Math.floor(Math.random() * pool.length)].name;
}

export function openCardPack(): PackResult {
  const player = loadPlayer();
  if (player.gold < PACK_PRICE) {
    return { success: false, cards: [], player };
  }

  player.gold -= PACK_PRICE;

  const result: { cardName: string; rarity: Rarity }[] = [];
  for (let i = 0; i < 5; i++) {
    const rarity = rollRarity();
    result.push({ cardName: pickRandomCard(rarity), rarity });
  }

  const hasRareOrAbove = result.some(
    (c) => c.rarity === "rare" || c.rarity === "epic" || c.rarity === "legendary"
  );
  if (!hasRareOrAbove) {
    const upgradeIndex = Math.floor(Math.random() * 5);
    const pityRarity: Rarity = "rare";
    result[upgradeIndex] = {
      cardName: pickRandomCard(pityRarity),
      rarity: pityRarity,
    };
  }

  const cardAdditions = result.map((c) => ({ cardName: c.cardName, count: 1 }));
  for (const { cardName, count } of cardAdditions) {
    const existing = player.ownedCards.find((c) => c.cardName === cardName);
    if (existing) {
      existing.count += count;
    } else {
      player.ownedCards.push({ cardName, count, upgradeLevel: 1 });
    }
  }

  savePlayer(player);
  return { success: true, cards: result, player };
}
