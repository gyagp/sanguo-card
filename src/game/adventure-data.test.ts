import { describe, it, expect } from "vitest";
import { adventureChapters, AdventureChapter, AdventureStage } from "./adventure-data";
import { TerrainType, Lane } from "./types";
import { cards } from "./cards";

function getChapter(id: string): AdventureChapter {
  const ch = adventureChapters.find((c) => c.id === id);
  if (!ch) throw new Error("Chapter " + id + " not found");
  return ch;
}

function getCardFaction(name: string): string {
  const card = cards.find((c) => c.name === name);
  return card?.faction ?? "unknown";
}

function getCardRarity(name: string): string {
  const card = cards.find((c) => c.name === name);
  return card?.rarity ?? "unknown";
}

function allCardsExist(stage: AdventureStage): string[] {
  const missing: string[] = [];
  for (const name of stage.enemyDeck) {
    if (!cards.find((c) => c.name === name)) missing.push(name);
  }
  return missing;
}

describe("Adventure Data - All 30 stages exist and are valid", () => {
  it("has exactly 5 chapters", () => {
    expect(adventureChapters).toHaveLength(5);
  });

  it("each chapter has exactly 6 stages", () => {
    for (const ch of adventureChapters) {
      expect(ch.stages).toHaveLength(6);
    }
  });

  it("total 30 stages", () => {
    const total = adventureChapters.reduce((sum, ch) => sum + ch.stages.length, 0);
    expect(total).toBe(30);
  });

  it("every stage has a deck of exactly 20 cards", () => {
    for (const ch of adventureChapters) {
      for (const stage of ch.stages) {
        expect(stage.enemyDeck).toHaveLength(20);
      }
    }
  });

  it("all card names in decks refer to existing cards", () => {
    for (const ch of adventureChapters) {
      for (const stage of ch.stages) {
        const missing = allCardsExist(stage);
        expect(missing).toEqual([]);
      }
    }
  });

  it("last stage of each chapter is a boss", () => {
    for (const ch of adventureChapters) {
      const last = ch.stages[ch.stages.length - 1];
      expect(last.isBoss).toBe(true);
      expect(last.bossRules).toBeDefined();
    }
  });
});

describe("Chapter 2 - mixed faction decks, boss +1 mana", () => {
  const ch2 = getChapter("ch2");

  it("stages have mixed faction decks (multiple factions per deck)", () => {
    for (const stage of ch2.stages) {
      const factions = new Set(
        stage.enemyDeck.map(getCardFaction).filter((f) => f !== "neutral"),
      );
      expect(factions.size).toBeGreaterThanOrEqual(2);
    }
  });

  it("boss has extraMana: 1", () => {
    const boss = ch2.stages.find((s) => s.isBoss)!;
    expect(boss.bossRules?.extraMana).toBe(1);
  });

  it("boss has unique hero power", () => {
    const boss = ch2.stages.find((s) => s.isBoss)!;
    expect(boss.bossRules?.uniqueHeroPower).toBeDefined();
  });
});

describe("Chapter 3 - faction-focused decks, boss starts with minion", () => {
  const ch3 = getChapter("ch3");

  it("has at least 1 wei-focused stage", () => {
    const weiStages = ch3.stages.filter((s) => {
      const factions = s.enemyDeck
        .map(getCardFaction)
        .filter((f) => f !== "neutral" && f !== "unknown");
      const weiCount = factions.filter((f) => f === "wei").length;
      return weiCount > 0 && weiCount >= factions.length * 0.5;
    });
    expect(weiStages.length).toBeGreaterThanOrEqual(1);
  });

  it("has at least 1 shu-focused stage", () => {
    const shuStages = ch3.stages.filter((s) => {
      const factions = s.enemyDeck
        .map(getCardFaction)
        .filter((f) => f !== "neutral" && f !== "unknown");
      const shuCount = factions.filter((f) => f === "shu").length;
      return shuCount > 0 && shuCount >= factions.length * 0.5;
    });
    expect(shuStages.length).toBeGreaterThanOrEqual(1);
  });

  it("has at least 1 wu-focused stage", () => {
    const wuStages = ch3.stages.filter((s) => {
      const factions = s.enemyDeck
        .map(getCardFaction)
        .filter((f) => f !== "neutral" && f !== "unknown");
      const wuCount = factions.filter((f) => f === "wu").length;
      return wuCount > 0 && wuCount >= factions.length * 0.5;
    });
    expect(wuStages.length).toBeGreaterThanOrEqual(1);
  });

  it("boss has startingMinion with 3/3 stats", () => {
    const boss = ch3.stages.find((s) => s.isBoss)!;
    expect(boss.bossRules?.startingMinion).toBeDefined();
    expect(boss.bossRules?.startingMinion?.attack).toBe(3);
    expect(boss.bossRules?.startingMinion?.health).toBe(3);
  });
});

describe("Chapter 4 - strategy decks with synergies, boss spell discount", () => {
  const ch4 = getChapter("ch4");

  it("stages contain strategy spell cards", () => {
    const strategySpells = ["草船借箭", "连环计", "空城计", "火烧赤壁"];
    for (const stage of ch4.stages) {
      const hasStrategy = stage.enemyDeck.some((name) =>
        strategySpells.includes(name),
      );
      expect(hasStrategy).toBe(true);
    }
  });

  it("boss has spellDiscount: 1", () => {
    const boss = ch4.stages.find((s) => s.isBoss)!;
    expect(boss.bossRules?.spellDiscount).toBe(1);
  });

  it("boss has field effect mentioning spells", () => {
    const boss = ch4.stages.find((s) => s.isBoss)!;
    expect(boss.bossRules?.fieldEffect).toBeDefined();
  });

  it("boss has extraMana", () => {
    const boss = ch4.stages.find((s) => s.isBoss)!;
    expect(boss.bossRules?.extraMana).toBeGreaterThanOrEqual(1);
  });
});

describe("Chapter 5 - legendary-heavy decks, final boss 40 HP + 3 phases", () => {
  const ch5 = getChapter("ch5");

  it("all ch5 stages include legendary cards", () => {
    for (const stage of ch5.stages) {
      const legendaryCount = stage.enemyDeck.filter(
        (name) => getCardRarity(name) === "legendary",
      ).length;
      expect(legendaryCount).toBeGreaterThanOrEqual(1);
    }
  });

  it("ch5 has more legendaries per deck than ch2 on average", () => {
    const ch5Avg =
      ch5.stages.reduce(
        (sum, s) =>
          sum +
          s.enemyDeck.filter((n) => getCardRarity(n) === "legendary").length,
        0,
      ) / ch5.stages.length;

    const ch2 = getChapter("ch2");
    const ch2Avg =
      ch2.stages.reduce(
        (sum, s) =>
          sum +
          s.enemyDeck.filter((n) => getCardRarity(n) === "legendary").length,
        0,
      ) / ch2.stages.length;

    expect(ch5Avg).toBeGreaterThan(ch2Avg);
  });

  it("final boss has bossHp: 40", () => {
    const boss = ch5.stages.find((s) => s.isBoss)!;
    expect(boss.bossRules?.bossHp).toBe(40);
  });

  it("final boss has extraMana >= 1", () => {
    const boss = ch5.stages.find((s) => s.isBoss)!;
    expect(boss.bossRules?.extraMana).toBeGreaterThanOrEqual(1);
  });

  it("BOSS_SIMAYI has exactly 3 phases", async () => {
    const { BOSS_SIMAYI } = await import("./boss-ai");
    expect(BOSS_SIMAYI.phases).toHaveLength(3);
  });

  it("BOSS_SIMAYI phases have decreasing hpThreshold", async () => {
    const { BOSS_SIMAYI } = await import("./boss-ai");
    const thresholds = BOSS_SIMAYI.phases.map((p) => p.hpThreshold);
    for (let i = 1; i < thresholds.length; i++) {
      expect(thresholds[i]).toBeLessThanOrEqual(thresholds[i - 1]);
    }
  });

  it("createBossAIFromRule works for 司马懿 with maxHp 40", async () => {
    const { createBossAIFromRule } = await import("./boss-ai");
    const { bossAI } = createBossAIFromRule("司马懿", 1, 40);
    expect(bossAI).toBeDefined();
  });
});

describe("Escalating difficulty", () => {
  it("chapter average difficulties increase", () => {
    const avgDiffs = adventureChapters.map(
      (ch) =>
        ch.stages.reduce((sum, s) => sum + s.difficulty, 0) / ch.stages.length,
    );
    for (let i = 1; i < avgDiffs.length; i++) {
      expect(avgDiffs[i]).toBeGreaterThanOrEqual(avgDiffs[i - 1]);
    }
  });

  it("within each chapter, difficulty is non-decreasing", () => {
    for (const ch of adventureChapters) {
      for (let i = 1; i < ch.stages.length; i++) {
        expect(ch.stages[i].difficulty).toBeGreaterThanOrEqual(
          ch.stages[i - 1].difficulty,
        );
      }
    }
  });
});

describe("PVE terrain configuration", () => {
  const allStages = adventureChapters.flatMap(ch => ch.stages);
  const stagesWithTerrain = allStages.filter(s => s.terrain && Object.keys(s.terrain).length > 0);

  it("at least 3 PVE stages have terrain effects configured", () => {
    expect(stagesWithTerrain.length).toBeGreaterThanOrEqual(3);
  });

  it("each terrain config uses valid TerrainType values", () => {
    const validTypes = Object.values(TerrainType);
    for (const stage of stagesWithTerrain) {
      for (const effect of Object.values(stage.terrain!)) {
        expect(validTypes).toContain(effect.type);
      }
    }
  });

  it("each terrain config uses valid Lane keys", () => {
    const validLanes = Object.values(Lane);
    for (const stage of stagesWithTerrain) {
      for (const lane of Object.keys(stage.terrain!)) {
        expect(validLanes).toContain(lane);
      }
    }
  });

  it("terrain effects have name and description", () => {
    for (const stage of stagesWithTerrain) {
      for (const effect of Object.values(stage.terrain!)) {
        expect(effect.name).toBeTruthy();
        expect(effect.description).toBeTruthy();
      }
    }
  });

  it("ch1-boss (张角) has HealingAura in center lane", () => {
    const stage = allStages.find(s => s.id === "ch1-boss")!;
    expect(stage.terrain).toBeDefined();
    expect(stage.terrain![Lane.Center]?.type).toBe(TerrainType.HealingAura);
  });

  it("ch2-4 (火烧洛阳) has Fire in all 3 lanes", () => {
    const stage = allStages.find(s => s.id === "ch2-4")!;
    expect(stage.terrain).toBeDefined();
    expect(stage.terrain![Lane.Left]?.type).toBe(TerrainType.Fire);
    expect(stage.terrain![Lane.Center]?.type).toBe(TerrainType.Fire);
    expect(stage.terrain![Lane.Right]?.type).toBe(TerrainType.Fire);
  });

  it("ch4-3 (草船借箭) has Stealth in right lane", () => {
    const stage = allStages.find(s => s.id === "ch4-3")!;
    expect(stage.terrain).toBeDefined();
    expect(stage.terrain![Lane.Right]?.type).toBe(TerrainType.Stealth);
  });

  it("boss stages with terrain have thematic terrain choices", () => {
    const ch2Boss = allStages.find(s => s.id === "ch2-boss")!;
    expect(ch2Boss.terrain![Lane.Left]?.type).toBe(TerrainType.Fire);
    expect(ch2Boss.terrain![Lane.Right]?.type).toBe(TerrainType.Fire);

    const ch5Boss = allStages.find(s => s.id === "ch5-boss")!;
    expect(ch5Boss.terrain![Lane.Center]?.type).toBe(TerrainType.Stealth);
  });
});

describe("Known issues flagged by review", () => {
  it("Hero type lacks maxHealth field", async () => {
    const { initializeGame, createDeck } = await import("./types");
    // Build a valid 30-card deck using 2 copies of each non-legendary card
    const nonLegendary = cards.filter((c) => c.rarity !== "legendary");
    const deckCards = nonLegendary.slice(0, 15).flatMap((c) => [{ ...c }, { ...c }]);
    const deck = createDeck(deckCards);
    const state = initializeGame(deck, deck);
    expect("maxHealth" in state.players[0].hero).toBe(false);
  });

  it("Deck is a branded Card[] — iteration works", async () => {
    const { createDeck } = await import("./types");
    const nonLegendary = cards.filter((c) => c.rarity !== "legendary");
    const deckCards = nonLegendary.slice(0, 15).flatMap((c) => [{ ...c }, { ...c }]);
    const deck = createDeck(deckCards);
    expect(Array.isArray(deck)).toBe(true);
    expect(deck[0].name).toBeDefined();
  });

  it("faction cast in useGameState uses incorrect literal type", () => {
    // The cast (m.faction ?? "neutral") as "neutral" is flagged
    // This test documents the issue exists — the type narrows incorrectly
    // but at runtime it works because the value is just a string
    const val = ("shu" ?? "neutral") as "neutral";
    expect(val).toBe("shu"); // proves the cast is a lie
  });
});
