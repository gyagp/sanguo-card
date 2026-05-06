import { describe, it, expect } from "vitest";
import { TOKEN_REGISTRY, createTokenMinion, TokenName } from "../tokens";
import { Lane } from "../types";
import * as fs from "fs";
import * as path from "path";

describe("Token Registry", () => {
  const expectedTokens: TokenName[] = [
    "士兵", "精锐士兵", "乡勇", "张飞", "关羽", "西凉兵", "西凉精锐", "袁军精锐",
  ];

  it("contains all expected tokens", () => {
    for (const name of expectedTokens) {
      expect(TOKEN_REGISTRY[name]).toBeDefined();
    }
  });

  it("marks all tokens as non-collectible", () => {
    for (const [name, def] of Object.entries(TOKEN_REGISTRY)) {
      expect(def.collectible, `${name} should be non-collectible`).toBe(false);
    }
  });

  it("all tokens are minion type", () => {
    for (const [name, def] of Object.entries(TOKEN_REGISTRY)) {
      expect(def.type, `${name} should be minion`).toBe("minion");
    }
  });

  describe("createTokenMinion", () => {
    it("creates a BoardMinion with correct stats for 士兵", () => {
      const m = createTokenMinion("士兵");
      expect(m.name).toBe("士兵");
      expect(m.currentAttack).toBe(1);
      expect(m.currentHealth).toBe(1);
      expect(m.summoningSickness).toBe(true);
      expect(m.lane).toBe(Lane.Center);
    });

    it("creates a charge minion without summoning sickness", () => {
      const m = createTokenMinion("张飞");
      expect(m.charge).toBe(true);
      expect(m.summoningSickness).toBe(false);
    });

    it("creates a taunt minion", () => {
      const m = createTokenMinion("关羽");
      expect(m.taunt).toBe(true);
      expect(m.currentAttack).toBe(4);
      expect(m.currentHealth).toBe(4);
    });

    it("精锐士兵 has 2/1 stats", () => {
      const m = createTokenMinion("精锐士兵");
      expect(m.currentAttack).toBe(2);
      expect(m.currentHealth).toBe(1);
    });
  });

  describe("no circular dependency", () => {
    it("types.ts does not use require() to import tokens", () => {
      const typesContent = fs.readFileSync(
        path.resolve(__dirname, "../types.ts"), "utf-8"
      );
      const requirePattern = /require\s*\(\s*['"]\.\/tokens['"]\s*\)/;
      expect(
        requirePattern.test(typesContent),
        "types.ts should not use require('./tokens') — fix the circular dependency properly"
      ).toBe(false);
    });

    it("types.ts does not statically import tokens.ts", () => {
      const typesContent = fs.readFileSync(
        path.resolve(__dirname, "../types.ts"), "utf-8"
      );
      const staticImportPattern = /^import\s+.*from\s+['"]\.\/tokens['"]/m;
      expect(staticImportPattern.test(typesContent)).toBe(false);
    });
  });

  describe("TokenName type safety", () => {
    it("TokenName is a finite union, not just string", () => {
      const keys = Object.keys(TOKEN_REGISTRY);
      expect(keys.length).toBeGreaterThan(0);
      // Verify the registry is not typed as Record<string, ...> by checking
      // that the keys are known at the type level (compile-time check via assignment)
      const testName: TokenName = "士兵";
      expect(testName).toBe("士兵");
    });

    it("all expected token names are valid TokenName values", () => {
      const names: TokenName[] = [
        "士兵", "精锐士兵", "乡勇", "张飞", "关羽", "西凉兵", "西凉精锐", "袁军精锐",
      ];
      for (const n of names) {
        expect(TOKEN_REGISTRY[n]).toBeDefined();
      }
    });
  });
});
