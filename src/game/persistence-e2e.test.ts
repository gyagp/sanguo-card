import { describe, it, expect, beforeEach } from "vitest";
import {
  initializeNewPlayer,
  savePlayer,
  loadPlayer,
  addGold,
  addXP,
  addCards,
  openCardPack,
  upgradeCard,
} from "./player-store";
import { PACK_PRICE, UPGRADE_COSTS, DUPLICATE_COST_PER_LEVEL } from "./progression";

beforeEach(() => {
  localStorage.clear();
});

describe("persistence end-to-end", () => {
  it("full flow: init → earn gold → buy pack → upgrade card → reload → state intact", () => {
    const initial = loadPlayer();
    expect(initial.level).toBe(1);
    expect(initial.gold).toBe(0);
    expect(initial.xp).toBe(0);
    expect(initial.ownedCards).toHaveLength(10);

    addGold(30);
    addXP(50);
    addGold(30);
    addXP(50);

    let player = loadPlayer();
    expect(player.gold).toBe(60);
    expect(player.xp).toBe(100);
    expect(player.level).toBe(2);

    addGold(PACK_PRICE - 60 + UPGRADE_COSTS[1]);
    player = loadPlayer();
    const goldBeforePack = player.gold;
    expect(goldBeforePack).toBe(PACK_PRICE + UPGRADE_COSTS[1]);

    const packResult = openCardPack();
    expect(packResult.success).toBe(true);
    expect(packResult.cards).toHaveLength(5);
    expect(packResult.player.gold).toBe(goldBeforePack - PACK_PRICE);

    addCards([{ cardName: "乡勇", count: 5 }]);

    const upgradeResult = upgradeCard("乡勇");
    expect(upgradeResult.success).toBe(true);
    const upgradedCard = upgradeResult.player.ownedCards.find((c) => c.cardName === "乡勇")!;
    expect(upgradedCard.upgradeLevel).toBe(1);
    expect(upgradeResult.player.gold).toBe(0);

    const raw = localStorage.getItem("sanguo-card-player");
    expect(raw).toBeTruthy();

    const reloaded = loadPlayer();
    expect(reloaded.level).toBe(2);
    expect(reloaded.xp).toBe(100);
    expect(reloaded.gold).toBe(0);

    const reloadedCard = reloaded.ownedCards.find((c) => c.cardName === "乡勇")!;
    expect(reloadedCard.upgradeLevel).toBe(1);
    const packXiangyongCards = packResult.cards.filter((c) => c.cardName === "乡勇").length;
    expect(reloadedCard.count).toBe(2 + 5 + packXiangyongCards - DUPLICATE_COST_PER_LEVEL[1]);
  });

  it("player level and XP survive reload after multiple XP gains", () => {
    addXP(250);
    expect(loadPlayer().level).toBe(3);

    addXP(200);
    const before = loadPlayer();
    expect(before.xp).toBe(450);
    expect(before.level).toBe(4);

    const reloaded = loadPlayer();
    expect(reloaded.xp).toBe(450);
    expect(reloaded.level).toBe(4);
  });

  it("gold balance correct after multiple transactions and reload", () => {
    addGold(500);
    addGold(-75);
    addGold(PACK_PRICE);

    openCardPack();

    addGold(30);
    addGold(10);

    const expected = 500 - 75 + PACK_PRICE - PACK_PRICE + 30 + 10;
    const reloaded = loadPlayer();
    expect(reloaded.gold).toBe(expected);
  });

  it("card collection with upgrade levels persisted across simulated reload", () => {
    addGold(10000);
    addCards([{ cardName: "关羽", count: 10 }]);
    addCards([{ cardName: "张飞", count: 8 }]);

    upgradeCard("关羽");
    upgradeCard("关羽");
    upgradeCard("关羽");

    upgradeCard("张飞");
    upgradeCard("张飞");

    const snapshot = JSON.parse(localStorage.getItem("sanguo-card-player")!);

    localStorage.clear();
    localStorage.setItem("sanguo-card-player", JSON.stringify(snapshot));

    const reloaded = loadPlayer();
    const guanyu = reloaded.ownedCards.find((c) => c.cardName === "关羽")!;
    expect(guanyu.upgradeLevel).toBe(3);
    expect(guanyu.count).toBe(10 - 1 - 2 - 3);

    const zhangfei = reloaded.ownedCards.find((c) => c.cardName === "张飞")!;
    expect(zhangfei.upgradeLevel).toBe(2);
    expect(zhangfei.count).toBe(8 - 1 - 2);

    const totalGoldSpent = UPGRADE_COSTS[1] * 2 + UPGRADE_COSTS[2] * 2 + UPGRADE_COSTS[3];
    expect(reloaded.gold).toBe(10000 - totalGoldSpent);
  });

  it("corrupted localStorage causes loadPlayer to throw (no try-catch in parser)", () => {
    addGold(999);
    addXP(500);
    localStorage.setItem("sanguo-card-player", "not valid json{{{");

    expect(() => loadPlayer()).toThrow();
  });

  it("partial localStorage data returns fresh player", () => {
    addGold(999);
    localStorage.setItem("sanguo-card-player", JSON.stringify({ gold: 100 }));

    const player = loadPlayer();
    expect(player.level).toBe(1);
    expect(player.gold).toBe(0);
    expect(player.ownedCards).toHaveLength(10);
  });
});
