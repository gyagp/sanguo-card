import { getCardArt } from "./card-art";
import { cards as allCards } from "./cards";

const FACTION_COLORS: Record<string, { dominant: RegExp[]; label: string }> = {
  wei: {
    dominant: [/#1e3a8a/i, /#2563eb/i, /#3b82f6/i, /#1e40af/i, /#60a5fa/i],
    label: "blue",
  },
  shu: {
    dominant: [/#166534/i, /#16a34a/i, /#22c55e/i, /#15803d/i],
    label: "green",
  },
  wu: {
    dominant: [/#dc2626/i, /#b91c1c/i, /#991b1b/i, /#ef4444/i],
    label: "red",
  },
  qun: {
    dominant: [/#b45309/i, /#d97706/i, /#fbbf24/i, /#92400e/i, /#f97316/i],
    label: "amber",
  },
  neutral: {
    dominant: [/#6b7280/i, /#4b5563/i, /#9ca3af/i, /#64748b/i, /#94a3b8/i, /#475569/i],
    label: "gray",
  },
};

function countColorMatches(svg: string, patterns: RegExp[]): number {
  let count = 0;
  for (const p of patterns) {
    const matches = svg.match(new RegExp(p.source, "gi"));
    if (matches) count += matches.length;
  }
  return count;
}

describe("card-art faction color palettes", () => {
  const minionCards = allCards.filter(
    (c) => c.type === "minion" && getCardArt(c.name)
  );

  describe("getCardArt returns art for all defined cards", () => {
    test("every card with art returns a valid SVG string", () => {
      for (const card of allCards) {
        const art = getCardArt(card.name);
        if (art) {
          expect(art).toContain("<svg");
          expect(art).toContain("</svg>");
        }
      }
    });

    test("getCardArt returns null for unknown card", () => {
      expect(getCardArt("不存在的卡牌")).toBeNull();
    });
  });

  describe("Wei (魏) faction cards use blue-dominant colors", () => {
    const weiMinions = minionCards.filter((c) => c.faction === "wei");

    test.each(weiMinions.map((c) => [c.name]))("%s has blue clothing/armor", (name) => {
      const svg = getCardArt(name)!;
      const blueCount = countColorMatches(svg, FACTION_COLORS.wei.dominant);
      expect(blueCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Shu (蜀) faction cards use green-dominant colors", () => {
    const shuMinions = minionCards.filter((c) => c.faction === "shu");

    test.each(shuMinions.map((c) => [c.name]))("%s has green clothing/armor", (name) => {
      const svg = getCardArt(name)!;
      const greenCount = countColorMatches(svg, FACTION_COLORS.shu.dominant);
      expect(greenCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Wu (吴) faction cards use red-dominant colors", () => {
    const wuMinions = minionCards.filter((c) => c.faction === "wu");

    test.each(wuMinions.map((c) => [c.name]))("%s has red clothing/armor", (name) => {
      const svg = getCardArt(name)!;
      const redCount = countColorMatches(svg, FACTION_COLORS.wu.dominant);
      expect(redCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Qun (群) faction cards use amber-dominant colors", () => {
    const qunMinions = minionCards.filter((c) => c.faction === "qun");

    test.each(qunMinions.map((c) => [c.name]))("%s has amber clothing/armor", (name) => {
      const svg = getCardArt(name)!;
      const amberCount = countColorMatches(svg, FACTION_COLORS.qun.dominant);
      expect(amberCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Neutral faction cards use gray-dominant colors", () => {
    const neutralMinions = minionCards.filter((c) => c.faction === "neutral");

    test.each(neutralMinions.map((c) => [c.name]))("%s has gray clothing/armor", (name) => {
      const svg = getCardArt(name)!;
      const grayCount = countColorMatches(svg, FACTION_COLORS.neutral.dominant);
      expect(grayCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Each card has unique art", () => {
    test("no two cards share the same SVG", () => {
      const arts = allCards
        .map((c) => getCardArt(c.name))
        .filter((a): a is string => a !== null);
      const unique = new Set(arts);
      expect(unique.size).toBe(arts.length);
    });
  });

  describe("Faction color dominance — faction colors outnumber other faction colors", () => {
    for (const faction of ["wei", "shu", "wu", "qun"] as const) {
      const factionMinions = minionCards.filter((c) => c.faction === faction);
      const otherFactions = Object.keys(FACTION_COLORS).filter(
        (f) => f !== faction && f !== "neutral"
      );

      test.each(factionMinions.map((c) => [c.name]))(
        `%s (${faction}) has more ${FACTION_COLORS[faction].label} than other faction colors`,
        (name) => {
          const svg = getCardArt(name)!;
          const ownCount = countColorMatches(svg, FACTION_COLORS[faction].dominant);
          for (const other of otherFactions) {
            const otherCount = countColorMatches(
              svg,
              FACTION_COLORS[other as keyof typeof FACTION_COLORS].dominant
            );
            expect(ownCount).toBeGreaterThan(otherCount);
          }
        }
      );
    }
  });
});
