import {
  PlayerProfile,
  OwnedCard,
  CardPack,
  Reward,
  XP_THRESHOLDS,
  UPGRADE_COSTS,
  PACK_PRICE,
  DEFAULT_PACK,
  STARTER_CARDS,
} from "./progression";

describe("progression interfaces", () => {
  test("PlayerProfile has required fields", () => {
    const profile: PlayerProfile = {
      gold: 500,
      xp: 150,
      level: 2,
      ownedCards: [],
    };
    expect(profile.gold).toBe(500);
    expect(profile.xp).toBe(150);
    expect(profile.level).toBe(2);
    expect(profile.ownedCards).toEqual([]);
  });

  test("OwnedCard has required fields", () => {
    const card: OwnedCard = { cardName: "乡勇", count: 2, upgradeLevel: 1 };
    expect(card.cardName).toBe("乡勇");
    expect(card.count).toBe(2);
    expect(card.upgradeLevel).toBe(1);
  });

  test("CardPack has required fields and optional guaranteedRarity", () => {
    const pack: CardPack = { id: "p1", name: "Test", price: 100, cardCount: 5 };
    expect(pack.guaranteedRarity).toBeUndefined();

    const pack2: CardPack = { id: "p2", name: "Test2", price: 200, cardCount: 3, guaranteedRarity: "epic" };
    expect(pack2.guaranteedRarity).toBe("epic");
  });

  test("Reward interface supports all optional fields", () => {
    const reward: Reward = {};
    expect(reward.gold).toBeUndefined();

    const fullReward: Reward = {
      gold: 50,
      xp: 25,
      cards: [{ cardName: "弓弩手", count: 1 }],
      packs: [{ packId: "standard", count: 1 }],
    };
    expect(fullReward.gold).toBe(50);
    expect(fullReward.cards).toHaveLength(1);
    expect(fullReward.packs).toHaveLength(1);
  });
});

describe("progression constants", () => {
  test("XP_THRESHOLDS has 10 levels, starts at 0, monotonically increasing", () => {
    expect(XP_THRESHOLDS).toHaveLength(10);
    expect(XP_THRESHOLDS[0]).toBe(0);
    for (let i = 1; i < XP_THRESHOLDS.length; i++) {
      expect(XP_THRESHOLDS[i]).toBeGreaterThan(XP_THRESHOLDS[i - 1]);
    }
  });

  test("UPGRADE_COSTS has entries for levels 1-5", () => {
    expect(Object.keys(UPGRADE_COSTS)).toHaveLength(5);
    for (let i = 1; i <= 5; i++) {
      expect(UPGRADE_COSTS[i]).toBeGreaterThan(0);
    }
  });

  test("PACK_PRICE is a positive number", () => {
    expect(PACK_PRICE).toBeGreaterThan(0);
    expect(PACK_PRICE).toBe(100);
  });

  test("DEFAULT_PACK is a valid CardPack", () => {
    expect(DEFAULT_PACK.id).toBe("standard");
    expect(DEFAULT_PACK.price).toBe(PACK_PRICE);
    expect(DEFAULT_PACK.cardCount).toBeGreaterThan(0);
    expect(DEFAULT_PACK.guaranteedRarity).toBe("rare");
  });

  test("STARTER_CARDS has exactly 10 common cards", () => {
    expect(STARTER_CARDS).toHaveLength(10);
    const uniqueCards = new Set(STARTER_CARDS);
    expect(uniqueCards.size).toBe(10);
  });
});
