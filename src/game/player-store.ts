import { PlayerProfile, OwnedCard, STARTER_CARDS, XP_THRESHOLDS } from "./progression";

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
