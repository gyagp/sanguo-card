import { PlayerProfile, OwnedCard, STARTER_CARDS, XP_THRESHOLDS, PACK_PRICE, UPGRADE_COSTS, DUPLICATE_COST_PER_LEVEL } from "./progression";
import { Card, Rarity } from "./types";
import { cards } from "./cards";
import { adventureChapters } from "./adventure-data";

const MAX_UPGRADE_LEVEL = 3;

const STORAGE_KEY = "sanguo-card-player";
const ADVENTURE_STORAGE_KEY = "sanguo-card-adventure";

export interface StageProgress {
  completed: boolean;
  stars: number;
}

export interface AdventureProgress {
  stages: Record<string, StageProgress>;
  chaptersUnlocked: string[];
}

export function initializeNewPlayer(): PlayerProfile {
  return {
    gold: 0,
    xp: 0,
    level: 1,
    ownedCards: STARTER_CARDS.map((cardName) => ({
      cardName,
      count: 2,
      upgradeLevel: 0,
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
      player.ownedCards.push({ cardName, count, upgradeLevel: 0 });
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
      player.ownedCards.push({ cardName, count, upgradeLevel: 0 });
    }
  }

  savePlayer(player);
  return { success: true, cards: result, player };
}

export interface UpgradeResult {
  success: boolean;
  reason?: string;
  player: PlayerProfile;
}

export function upgradeCard(cardName: string): UpgradeResult {
  const player = loadPlayer();
  const owned = player.ownedCards.find((c) => c.cardName === cardName);

  if (!owned) {
    return { success: false, reason: "card_not_owned", player };
  }

  if (owned.upgradeLevel >= MAX_UPGRADE_LEVEL) {
    return { success: false, reason: "max_level", player };
  }

  const nextLevel = owned.upgradeLevel + 1;
  const goldCost = UPGRADE_COSTS[nextLevel];
  const dupCost = DUPLICATE_COST_PER_LEVEL[nextLevel];

  if (player.gold < goldCost) {
    return { success: false, reason: "not_enough_gold", player };
  }

  if (owned.count < 1 + dupCost) {
    return { success: false, reason: "not_enough_duplicates", player };
  }

  player.gold -= goldCost;
  owned.count -= dupCost;
  owned.upgradeLevel += 1;

  savePlayer(player);
  return { success: true, player };
}

export function getUpgradedStats(
  baseCard: Card,
  upgradeLevel: number
): { attack: number; health: number } {
  let attack = baseCard.attack;
  let health = baseCard.health;

  if (upgradeLevel >= 1) attack += 1;
  if (upgradeLevel >= 2) health += 1;
  if (upgradeLevel >= 3) attack += 1;

  return { attack, health };
}

function initializeAdventureProgress(): AdventureProgress {
  return {
    stages: {},
    chaptersUnlocked: [adventureChapters[0].id],
  };
}

export function saveAdventureProgress(progress: AdventureProgress): void {
  localStorage.setItem(ADVENTURE_STORAGE_KEY, JSON.stringify(progress));
}

export function loadAdventureProgress(): AdventureProgress {
  const raw = localStorage.getItem(ADVENTURE_STORAGE_KEY);
  if (!raw) {
    const progress = initializeAdventureProgress();
    saveAdventureProgress(progress);
    return progress;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const progress = initializeAdventureProgress();
    saveAdventureProgress(progress);
    return progress;
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).stages !== "object" ||
    (parsed as Record<string, unknown>).stages === null ||
    !Array.isArray((parsed as Record<string, unknown>).chaptersUnlocked)
  ) {
    const progress = initializeAdventureProgress();
    saveAdventureProgress(progress);
    return progress;
  }
  return parsed as AdventureProgress;
}

export function isStageUnlocked(stageId: string, progress?: AdventureProgress): boolean {
  const p = progress ?? loadAdventureProgress();
  for (const chapter of adventureChapters) {
    if (!p.chaptersUnlocked.includes(chapter.id)) continue;
    for (let i = 0; i < chapter.stages.length; i++) {
      if (chapter.stages[i].id === stageId) {
        if (i === 0) return true;
        const prevStage = chapter.stages[i - 1];
        const prevProgress = p.stages[prevStage.id];
        return !!prevProgress?.completed;
      }
    }
  }
  return false;
}

export function completeStage(stageId: string, stars: number, progress?: AdventureProgress): AdventureProgress {
  const p = progress ?? loadAdventureProgress();
  const existing = p.stages[stageId];
  p.stages[stageId] = {
    completed: true,
    stars: existing ? Math.max(existing.stars, stars) : stars,
  };

  for (const chapter of adventureChapters) {
    const bossStage = chapter.stages[chapter.stages.length - 1];
    if (bossStage.id === stageId && bossStage.isBoss) {
      const chapterIndex = adventureChapters.indexOf(chapter);
      if (chapterIndex < adventureChapters.length - 1) {
        const nextChapterId = adventureChapters[chapterIndex + 1].id;
        if (!p.chaptersUnlocked.includes(nextChapterId)) {
          p.chaptersUnlocked.push(nextChapterId);
        }
      }
    }
  }

  saveAdventureProgress(p);
  return p;
}
