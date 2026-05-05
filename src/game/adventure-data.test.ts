import { describe, it, expect } from "vitest";
import {
  adventureChapters,
  AdventureChapter,
  AdventureStage,
  BossRule,
  StarThresholds,
} from "./adventure-data";

describe("adventure-data types", () => {
  it("exports adventureChapters array", () => {
    expect(Array.isArray(adventureChapters)).toBe(true);
  });
});

describe("chapter structure", () => {
  it("has exactly 5 chapters", () => {
    expect(adventureChapters).toHaveLength(5);
  });

  it("each chapter has id, name, description, and stages", () => {
    for (const ch of adventureChapters) {
      expect(ch.id).toBeTruthy();
      expect(ch.name).toBeTruthy();
      expect(ch.description).toBeTruthy();
      expect(Array.isArray(ch.stages)).toBe(true);
    }
  });

  it("each chapter has exactly 6 stages (5 normal + 1 boss)", () => {
    for (const ch of adventureChapters) {
      expect(ch.stages).toHaveLength(6);
    }
  });

  it("chapter ids are ch1 through ch5", () => {
    const ids = adventureChapters.map((ch) => ch.id);
    expect(ids).toEqual(["ch1", "ch2", "ch3", "ch4", "ch5"]);
  });
});

describe("stage structure", () => {
  const allStages = adventureChapters.flatMap((ch) => ch.stages);

  it("has 30 total stages", () => {
    expect(allStages).toHaveLength(30);
  });

  it("every stage has required fields", () => {
    for (const s of allStages) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.description).toBeTruthy();
      expect(Array.isArray(s.enemyDeck)).toBe(true);
      expect(typeof s.difficulty).toBe("number");
      expect(s.rewards).toBeDefined();
      expect(s.starThresholds).toBeDefined();
      expect(typeof s.isBoss).toBe("boolean");
    }
  });

  it("every stage has a non-empty enemyDeck of card name strings", () => {
    for (const s of allStages) {
      expect(s.enemyDeck.length).toBeGreaterThan(0);
      for (const card of s.enemyDeck) {
        expect(typeof card).toBe("string");
        expect(card.length).toBeGreaterThan(0);
      }
    }
  });

  it("every stage has valid starThresholds", () => {
    for (const s of allStages) {
      const t = s.starThresholds;
      expect(t.threeStarMinHpPercent).toBeGreaterThan(0);
      expect(t.threeStarMinHpPercent).toBeLessThanOrEqual(1);
      expect(t.twoStarMinHpPercent).toBeGreaterThan(0);
      expect(t.twoStarMinHpPercent).toBeLessThanOrEqual(1);
      expect(t.threeStarMinHpPercent).toBeGreaterThanOrEqual(t.twoStarMinHpPercent);
      expect(t.threeStarMaxTurns).toBeLessThanOrEqual(t.twoStarMaxTurns);
    }
  });

  it("every stage has rewards with gold and/or xp", () => {
    for (const s of allStages) {
      const hasGold = typeof s.rewards.gold === "number" && s.rewards.gold > 0;
      const hasXp = typeof s.rewards.xp === "number" && s.rewards.xp > 0;
      expect(hasGold || hasXp).toBe(true);
    }
  });

  it("all stage ids are unique", () => {
    const ids = allStages.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("boss stages", () => {
  it("last stage of each chapter is a boss", () => {
    for (const ch of adventureChapters) {
      const lastStage = ch.stages[ch.stages.length - 1];
      expect(lastStage.isBoss).toBe(true);
    }
  });

  it("non-last stages are not bosses", () => {
    for (const ch of adventureChapters) {
      for (let i = 0; i < ch.stages.length - 1; i++) {
        expect(ch.stages[i].isBoss).toBe(false);
      }
    }
  });

  it("boss stages have bossRules with expected fields", () => {
    for (const ch of adventureChapters) {
      const boss = ch.stages[ch.stages.length - 1];
      expect(boss.bossRules).toBeDefined();
      const rules = boss.bossRules!;
      expect(typeof rules.extraMana).toBe("number");
      expect(rules.extraMana).toBeGreaterThan(0);
      expect(typeof rules.fieldEffect).toBe("string");
      expect(rules.fieldEffect!.length).toBeGreaterThan(0);
      expect(rules.uniqueHeroPower).toBeDefined();
      expect(rules.uniqueHeroPower!.name).toBeTruthy();
      expect(typeof rules.uniqueHeroPower!.cost).toBe("number");
      expect(rules.uniqueHeroPower!.description).toBeTruthy();
    }
  });

  it("normal stages do not have bossRules", () => {
    for (const ch of adventureChapters) {
      for (let i = 0; i < ch.stages.length - 1; i++) {
        expect(ch.stages[i].bossRules).toBeUndefined();
      }
    }
  });
});

describe("difficulty progression", () => {
  it("difficulty generally increases across chapters", () => {
    const chapterMaxDifficulties = adventureChapters.map((ch) =>
      Math.max(...ch.stages.map((s) => s.difficulty))
    );
    for (let i = 1; i < chapterMaxDifficulties.length; i++) {
      expect(chapterMaxDifficulties[i]).toBeGreaterThanOrEqual(chapterMaxDifficulties[i - 1]);
    }
  });
});
