import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const pagePath = path.resolve(__dirname, "page.tsx");
const pageContent = fs.readFileSync(pagePath, "utf-8");

describe("Game page acceptance criteria", () => {
  it("game page file exists at src/app/game/page.tsx", () => {
    expect(fs.existsSync(pagePath)).toBe(true);
  });

  it("exports a default component", () => {
    expect(pageContent).toMatch(/export\s+default\s+function\s+\w+/);
  });

  describe("uses useGameState instead of mock data", () => {
    it("imports useGameState hook", () => {
      expect(pageContent).toMatch(/import\s*\{[^}]*useGameState[^}]*\}/);
    });

    it("calls useGameState with deck arguments", () => {
      expect(pageContent).toMatch(/useGameState\s*\(/);
    });

    it("does not contain hardcoded mock player data", () => {
      expect(pageContent).not.toMatch(/const\s+player\s*=\s*\{/);
      expect(pageContent).not.toMatch(/const\s+opponent\s*=\s*\{/);
    });

    it("destructures gameState from useGameState", () => {
      expect(pageContent).toMatch(/\{\s*gameState[\s,]/);
    });
  });

  describe("player hand shows real drawn cards using Card component", () => {
    it("imports Card component", () => {
      expect(pageContent).toMatch(/import\s+Card\s+from/);
    });

    it("renders Card components for player hand", () => {
      expect(pageContent).toMatch(/player\.hand\.map/);
      expect(pageContent).toMatch(/<Card\b/);
    });

    it("passes card data and onClick to Card", () => {
      expect(pageContent).toMatch(/card=\{card\}/);
      expect(pageContent).toMatch(/onClick=\{.*handlePlayCard/);
    });
  });

  describe("board zones show BoardMinion cards", () => {
    it("imports BoardMinion type", () => {
      expect(pageContent).toMatch(/BoardMinion/);
    });

    it("renders player board zone with player.board minions", () => {
      expect(pageContent).toMatch(/player\.board/);
    });

    it("renders opponent board zone with opponent.board minions", () => {
      expect(pageContent).toMatch(/opponent\.board/);
    });

    it("BoardMinionCard displays currentAttack and currentHealth", () => {
      expect(pageContent).toMatch(/minion\.currentAttack/);
      expect(pageContent).toMatch(/minion\.currentHealth/);
    });
  });

  describe("hero portraits show real HP and mana", () => {
    it("renders HeroPortrait for both players", () => {
      expect(pageContent).toMatch(/<HeroPortrait\s+player=\{opponent\}/);
      expect(pageContent).toMatch(/<HeroPortrait\s+player=\{player\}/);
    });

    it("displays hero health", () => {
      expect(pageContent).toMatch(/player\.hero\.health/);
    });

    it("displays hero mana and maxMana", () => {
      expect(pageContent).toMatch(/player\.hero\.mana/);
      expect(pageContent).toMatch(/player\.maxMana/);
    });
  });

  describe("mana bar with filled/empty gems", () => {
    it("has a ManaBar component", () => {
      expect(pageContent).toMatch(/function\s+ManaBar/);
    });

    it("renders gems based on maxMana", () => {
      expect(pageContent).toMatch(/Array\.from\(\{.*length:\s*maxMana/);
    });

    it("distinguishes filled vs empty gems", () => {
      expect(pageContent).toMatch(/i\s*<\s*mana/);
    });
  });

  describe("page structure", () => {
    it("has an end turn button", () => {
      expect(pageContent).toMatch(/<button[\s\S]*?结束回合[\s\S]*?<\/button>/);
    });

    it("calls endTurn on button click", () => {
      expect(pageContent).toMatch(/onClick=\{.*endTurn/);
    });

    it("handles winner display including draw", () => {
      expect(pageContent).toMatch(/winner\s*===\s*"draw"/);
    });

    it("uses responsive Tailwind classes", () => {
      expect(pageContent).toMatch(/sm:/);
      expect(pageContent).toContain("flex");
    });
  });
});
