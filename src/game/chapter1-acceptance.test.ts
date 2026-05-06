import { describe, it, expect } from "vitest";
import { adventureChapters } from "./adventure-data";
import { BOSSES, BOSS_ZHANGJIAO, BossAI, getCurrentPhase } from "./boss-ai";
import { cards } from "./cards";

const ch1 = adventureChapters[0];

describe("AC: Stage 1-1 and 1-2 show brief gameplay hints", () => {
  it("stage 1-1 has tutorialHints array with at least one hint", () => {
    const stage = ch1.stages[0];
    expect(stage.tutorialHints).toBeDefined();
    expect(stage.tutorialHints!.length).toBeGreaterThan(0);
  });

  it("stage 1-2 has tutorialHints array with at least one hint", () => {
    const stage = ch1.stages[1];
    expect(stage.tutorialHints).toBeDefined();
    expect(stage.tutorialHints!.length).toBeGreaterThan(0);
  });

  it("stage 1-1 hints mention playing cards", () => {
    const hints = ch1.stages[0].tutorialHints!;
    const mentionsPlay = hints.some(h => /出牌|打出|使用.*牌|play/i.test(h));
    expect(mentionsPlay).toBe(true);
  });

  it("stage 1-2 hints mention attacking", () => {
    const hints = ch1.stages[1].tutorialHints!;
    const mentionsAttack = hints.some(h => /攻击|进攻|attack/i.test(h));
    expect(mentionsAttack).toBe(true);
  });

  it("stages 1-3 through 1-5 do not have tutorialHints (or empty)", () => {
    for (let i = 2; i < 5; i++) {
      const hints = ch1.stages[i].tutorialHints;
      expect(!hints || hints.length === 0).toBe(true);
    }
  });
});

describe("AC: Chapter 1 enemy decks use only common/neutral cards with low cost curve", () => {
  const cardDb = new Map(cards.map(c => [c.name, c]));

  for (const stage of ch1.stages) {
    describe(`stage ${stage.id} (${stage.name})`, () => {
      it("all cards exist in the card database", () => {
        for (const cardName of stage.enemyDeck) {
          expect(cardDb.has(cardName), `card "${cardName}" not found in allCards`).toBe(true);
        }
      });

      it("all cards are common rarity", () => {
        for (const cardName of stage.enemyDeck) {
          const card = cardDb.get(cardName)!;
          expect(card.rarity, `${cardName} should be common but is ${card.rarity}`).toBe("common");
        }
      });

      it("all cards are neutral faction", () => {
        for (const cardName of stage.enemyDeck) {
          const card = cardDb.get(cardName)!;
          expect(card.faction, `${cardName} should be neutral but is ${card.faction}`).toBe("neutral");
        }
      });
    });
  }

  it("average cost of ch1 stage 1 deck is ≤ 2.0 (low cost curve)", () => {
    const deck = ch1.stages[0].enemyDeck;
    const avgCost = deck.reduce((sum, name) => sum + (cardDb.get(name)?.cost ?? 0), 0) / deck.length;
    expect(avgCost).toBeLessThanOrEqual(2.0);
  });

  it("difficulty increases across ch1 stages", () => {
    for (let i = 1; i < ch1.stages.length; i++) {
      expect(ch1.stages[i].difficulty).toBeGreaterThanOrEqual(ch1.stages[i - 1].difficulty);
    }
  });
});

describe("AC: Boss 张角 uses existing boss-ai.ts phases", () => {
  it("ch1 boss is 张角", () => {
    const boss = ch1.stages[ch1.stages.length - 1];
    expect(boss.name).toBe("张角");
    expect(boss.isBoss).toBe(true);
  });

  it("张角 exists in BOSSES registry", () => {
    expect(BOSSES["张角"]).toBeDefined();
    expect(BOSSES["张角"]).toBe(BOSS_ZHANGJIAO);
  });

  it("张角 has at least 2 phases", () => {
    expect(BOSS_ZHANGJIAO.phases.length).toBeGreaterThanOrEqual(2);
  });

  it("张角 boss rules include extraMana and fieldEffect", () => {
    const boss = ch1.stages[ch1.stages.length - 1];
    expect(boss.bossRules).toBeDefined();
    expect(boss.bossRules!.extraMana).toBeGreaterThan(0);
    expect(boss.bossRules!.fieldEffect).toBeTruthy();
    expect(boss.bossRules!.uniqueHeroPower).toBeDefined();
  });
});

describe("AC: All 6 stages in Chapter 1 are playable start to finish", () => {
  it("chapter 1 has exactly 6 stages", () => {
    expect(ch1.stages).toHaveLength(6);
  });

  it("every stage has a 20-card deck", () => {
    for (const stage of ch1.stages) {
      expect(stage.enemyDeck).toHaveLength(20);
    }
  });

  it("every stage has valid rewards", () => {
    for (const stage of ch1.stages) {
      expect(stage.rewards.gold).toBeGreaterThan(0);
      expect(stage.rewards.xp).toBeGreaterThan(0);
    }
  });

  it("every stage has valid star thresholds", () => {
    for (const stage of ch1.stages) {
      const t = stage.starThresholds;
      expect(t.threeStarMinHpPercent).toBeGreaterThan(0);
      expect(t.threeStarMaxTurns).toBeGreaterThan(0);
      expect(t.twoStarMinHpPercent).toBeGreaterThan(0);
      expect(t.twoStarMaxTurns).toBeGreaterThan(0);
    }
  });

  it("stage IDs follow ch1-N pattern", () => {
    const expectedIds = ["ch1-1", "ch1-2", "ch1-3", "ch1-4", "ch1-5", "ch1-boss"];
    expect(ch1.stages.map(s => s.id)).toEqual(expectedIds);
  });
});
