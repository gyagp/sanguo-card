import { describe, it, expect } from "vitest";
import { adventureChapters } from "../../../game/adventure-data";
import { cards } from "../../../game/cards";

describe("Stage page helper logic", () => {
  const ch1 = adventureChapters[0];
  const stage1 = ch1.stages[0];

  it("stage has required fields for pre-battle display", () => {
    expect(stage1.name).toBeTruthy();
    expect(stage1.description).toBeTruthy();
    expect(stage1.enemyDeck.length).toBeGreaterThan(0);
    expect(stage1.rewards).toBeDefined();
    expect(stage1.starThresholds).toBeDefined();
    expect(stage1.difficulty).toBeGreaterThan(0);
  });

  it("stage rewards contain gold and xp", () => {
    expect(stage1.rewards.gold).toBeGreaterThan(0);
    expect(stage1.rewards.xp).toBeGreaterThan(0);
  });

  it("star thresholds have three-star and two-star criteria", () => {
    expect(stage1.starThresholds.threeStarMinHpPercent).toBeDefined();
    expect(stage1.starThresholds.threeStarMaxTurns).toBeDefined();
    expect(stage1.starThresholds.twoStarMinHpPercent).toBeDefined();
    expect(stage1.starThresholds.twoStarMaxTurns).toBeDefined();
  });

  it("boss stages have bossRules", () => {
    const bossStage = adventureChapters
      .flatMap((ch) => ch.stages)
      .find((s) => s.isBoss);
    expect(bossStage).toBeDefined();
    expect(bossStage!.bossRules).toBeDefined();
  });

  it("difficultyToAI maps correctly", () => {
    function difficultyToAI(difficulty: number) {
      if (difficulty <= 2) return "easy";
      if (difficulty <= 4) return "normal";
      if (difficulty <= 6) return "hard";
      return "boss";
    }
    expect(difficultyToAI(1)).toBe("easy");
    expect(difficultyToAI(2)).toBe("easy");
    expect(difficultyToAI(3)).toBe("normal");
    expect(difficultyToAI(5)).toBe("hard");
    expect(difficultyToAI(7)).toBe("boss");
  });

  it("resolveEnemyDeck resolves card names to cards", () => {
    const resolvedNames = stage1.enemyDeck.map((name: string) => {
      const card = cards.find((c) => c.name === name);
      return card ? card.name : null;
    });
    const missing = stage1.enemyDeck.filter((_: string, i: number) => resolvedNames[i] === null);
    expect(missing).toEqual([]);
  });

  it("all stages have unique ids", () => {
    const allIds = adventureChapters.flatMap((ch) => ch.stages.map((s) => s.id));
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });
});
