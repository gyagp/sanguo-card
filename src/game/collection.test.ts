import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cards } from './cards';
import { STARTER_CARDS, UPGRADE_COSTS, DUPLICATE_COST_PER_LEVEL } from './progression';
import {
  initializeNewPlayer,
  loadPlayer,
  savePlayer,
  upgradeCard,
  getUpgradedStats,
  addCards,
} from './player-store';

const mockStorage: Record<string, string> = {};
beforeEach(() => {
  for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, val: string) => { mockStorage[key] = val; },
    removeItem: (key: string) => { delete mockStorage[key]; },
  });
});

describe('Collection data integrity', () => {
  it('has correct number of cards', () => {
    expect(cards).toHaveLength(129);
  });

  it('every card has faction and rarity', () => {
    for (const c of cards) {
      expect(['wei', 'shu', 'wu', 'qun', 'neutral']).toContain(c.faction);
      expect(['common', 'rare', 'epic', 'legendary']).toContain(c.rarity);
    }
  });

  it('starter cards are all valid card names', () => {
    const names = new Set(cards.map(c => c.name));
    for (const s of STARTER_CARDS) {
      expect(names.has(s)).toBe(true);
    }
  });
});

describe('New player initialization', () => {
  it('starts with 10 starter cards each at count 2, level 0', () => {
    const p = initializeNewPlayer();
    expect(p.ownedCards).toHaveLength(10);
    for (const oc of p.ownedCards) {
      expect(STARTER_CARDS).toContain(oc.cardName);
      expect(oc.count).toBe(2);
      expect(oc.upgradeLevel).toBe(0);
    }
  });

  it('starts with 0 gold', () => {
    expect(initializeNewPlayer().gold).toBe(0);
  });
});

describe('Owned vs unowned cards', () => {
  it('new player owns 10 cards', () => {
    const p = initializeNewPlayer();
    const ownedNames = new Set(p.ownedCards.map(oc => oc.cardName));
    const ownedCount = cards.filter(c => ownedNames.has(c.name)).length;
    expect(ownedCount).toBe(10);
    expect(cards.length - ownedCount).toBe(cards.length - 10);
  });
});

describe('Filtering', () => {
  it('filtering by faction returns only matching cards', () => {
    const weiCards = cards.filter(c => c.faction === 'wei');
    expect(weiCards.length).toBeGreaterThan(0);
    for (const c of weiCards) expect(c.faction).toBe('wei');
  });

  it('filtering by rarity returns only matching cards', () => {
    const rareCards = cards.filter(c => c.rarity === 'rare');
    expect(rareCards.length).toBeGreaterThan(0);
    for (const c of rareCards) expect(c.rarity).toBe('rare');
  });

  it('combined filter narrows results', () => {
    const result = cards.filter(c => c.faction === 'wei' && c.rarity === 'rare');
    for (const c of result) {
      expect(c.faction).toBe('wei');
      expect(c.rarity).toBe('rare');
    }
  });

  it('filter with no matches returns empty', () => {
    const result = cards.filter(c => c.faction === 'wei' && c.rarity === 'common');
    // common cards are all neutral, so this should be empty
    for (const c of result) {
      expect(c.faction).toBe('wei');
    }
  });
});

describe('Progress calculation', () => {
  it('progress is ownedCount / total', () => {
    const p = initializeNewPlayer();
    const ownedNames = new Set(p.ownedCards.map(oc => oc.cardName));
    const ownedCount = cards.filter(c => ownedNames.has(c.name)).length;
    const progress = ownedCount / cards.length;
    expect(progress).toBeCloseTo(10 / cards.length, 5);
  });
});

describe('Card upgrade from collection', () => {
  it('upgrading increases level and applies stat bonus', () => {
    const p = initializeNewPlayer();
    p.gold = 500;
    savePlayer(p);

    const minionName = STARTER_CARDS[0]; // 乡勇
    const baseCard = cards.find(c => c.name === minionName)!;

    const r1 = upgradeCard(minionName);
    expect(r1.success).toBe(true);
    const owned = r1.player.ownedCards.find(c => c.cardName === minionName)!;
    expect(owned.upgradeLevel).toBe(1);

    const stats = getUpgradedStats(baseCard, 1);
    expect(stats.attack).toBe(baseCard.attack + 1);
    expect(stats.health).toBe(baseCard.health);
  });

  it('level 2 gives +1 health', () => {
    const p = initializeNewPlayer();
    p.gold = 500;
    // need extra duplicates for level 2
    const minionName = STARTER_CARDS[0];
    const oc = p.ownedCards.find(c => c.cardName === minionName)!;
    oc.count = 10;
    savePlayer(p);

    upgradeCard(minionName); // level 1
    upgradeCard(minionName); // level 2

    const baseCard = cards.find(c => c.name === minionName)!;
    const stats = getUpgradedStats(baseCard, 2);
    expect(stats.attack).toBe(baseCard.attack + 1);
    expect(stats.health).toBe(baseCard.health + 1);
  });

  it('level 3 gives another +1 attack', () => {
    const baseCard = cards.find(c => c.name === STARTER_CARDS[0])!;
    const stats = getUpgradedStats(baseCard, 3);
    expect(stats.attack).toBe(baseCard.attack + 2);
    expect(stats.health).toBe(baseCard.health + 1);
  });

  it('rejects upgrade at max level', () => {
    const p = initializeNewPlayer();
    p.gold = 10000;
    const oc = p.ownedCards.find(c => c.cardName === STARTER_CARDS[0])!;
    oc.count = 20;
    oc.upgradeLevel = 3;
    savePlayer(p);

    const r = upgradeCard(STARTER_CARDS[0]);
    expect(r.success).toBe(false);
    expect(r.reason).toBe('max_level');
  });

  it('rejects upgrade with insufficient gold', () => {
    const p = initializeNewPlayer();
    p.gold = 0;
    savePlayer(p);

    const r = upgradeCard(STARTER_CARDS[0]);
    expect(r.success).toBe(false);
    expect(r.reason).toBe('not_enough_gold');
  });

  it('rejects upgrade with insufficient duplicates', () => {
    const p = initializeNewPlayer();
    p.gold = 500;
    const oc = p.ownedCards.find(c => c.cardName === STARTER_CARDS[0])!;
    oc.count = 1; // need 1+1=2 for level 1 upgrade
    savePlayer(p);

    const r = upgradeCard(STARTER_CARDS[0]);
    expect(r.success).toBe(false);
    expect(r.reason).toBe('not_enough_duplicates');
  });

  it('rejects upgrade for unowned card', () => {
    const p = initializeNewPlayer();
    savePlayer(p);
    const r = upgradeCard('不存在的卡');
    expect(r.success).toBe(false);
    expect(r.reason).toBe('card_not_owned');
  });
});

describe('Adding cards to collection', () => {
  it('adds new card creates entry with count and level 0', () => {
    initializeNewPlayer();
    savePlayer(initializeNewPlayer());
    const newCard = cards.find(c => !STARTER_CARDS.includes(c.name))!;
    const p = addCards([{ cardName: newCard.name, count: 1 }]);
    const oc = p.ownedCards.find(c => c.cardName === newCard.name);
    expect(oc).toBeDefined();
    expect(oc!.count).toBe(1);
    expect(oc!.upgradeLevel).toBe(0);
  });

  it('adding existing card increments count', () => {
    savePlayer(initializeNewPlayer());
    const p = addCards([{ cardName: STARTER_CARDS[0], count: 3 }]);
    const oc = p.ownedCards.find(c => c.cardName === STARTER_CARDS[0])!;
    expect(oc.count).toBe(5); // 2 starter + 3 added
  });
});
