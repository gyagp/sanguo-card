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

  describe("settings wiring from localStorage", () => {
    it("reads animation speed from localStorage", () => {
      expect(pageContent).toMatch(/localStorage\.getItem\(STORAGE_KEY_ANIMATION_SPEED\)/);
    });

    it("reads auto-end-turn from localStorage", () => {
      expect(pageContent).toMatch(/localStorage\.getItem\(STORAGE_KEY_AUTO_END_TURN\)/);
    });

    it("reads show-damage-numbers from localStorage", () => {
      expect(pageContent).toMatch(/localStorage\.getItem\(STORAGE_KEY_SHOW_DAMAGE_NUMBERS\)/);
    });

    it("computes animMultiplier from animation speed", () => {
      expect(pageContent).toMatch(/getAnimationMultiplier\(animationSpeed\)/);
    });

    it("applies animMultiplier to animation durations", () => {
      const matches = pageContent.match(/\*\s*animMultiplier/g);
      expect(matches!.length).toBeGreaterThanOrEqual(5);
    });

    it("passes showDamageNumbers to BoardZone/BoardMinionCard", () => {
      expect(pageContent).toMatch(/showDamageNumbers=\{showDamageNumbers\}/);
    });

    it("conditionally renders damage numbers based on showDamageNumbers", () => {
      expect(pageContent).toMatch(/showDamageNumbers\s*&&\s*damageNumber/);
    });

    it("auto-end-turn effect checks for playable cards, available attacks, and hero power", () => {
      expect(pageContent).toMatch(/hasPlayableCard/);
      expect(pageContent).toMatch(/hasAvailableAttack/);
      expect(pageContent).toMatch(/canUseHeroPower/);
    });

    it("auto-end-turn effect has cleanup to prevent timer leaks", () => {
      const autoEndEffect = pageContent.match(/useEffect\(\(\)\s*=>\s*\{[\s\S]*?autoEndTurnTimerRef[\s\S]*?\}, \[/);
      expect(autoEndEffect).not.toBeNull();
      const effectBody = autoEndEffect![0];
      expect(effectBody).toMatch(/return\s*\(\)\s*=>\s*\{/);
      expect(effectBody).toMatch(/clearTimeout\(autoEndTurnTimerRef\.current\)/);
    });

    it("auto-end-turn delay is scaled by animMultiplier", () => {
      expect(pageContent).toMatch(/500\s*\*\s*animMultiplier/);
    });

    it("validates animation speed before applying", () => {
      expect(pageContent).toMatch(/speed\s*===\s*'fast'\s*\|\|\s*speed\s*===\s*'normal'\s*\|\|\s*speed\s*===\s*'slow'/);
    });
  });

  describe("audio wiring", () => {
    it("imports AudioManager", () => {
      expect(pageContent).toMatch(/import\s*\{[^}]*AudioManager[^}]*\}\s*from\s*["']\.\/audio-manager["']/);
    });

    it("starts BGM on mount and stops on unmount", () => {
      expect(pageContent).toMatch(/audio\.startBGM\(\)/);
      expect(pageContent).toMatch(/audio\.stopBGM\(\)/);
    });

    it("plays card play sound on successful card play", () => {
      expect(pageContent).toMatch(/playCardPlay\(\)/);
    });

    it("plays attack sound on minion attack", () => {
      expect(pageContent).toMatch(/playAttack\(\)/);
    });

    it("plays damage sound on damage dealt", () => {
      expect(pageContent).toMatch(/playDamage\(\)/);
    });

    it("plays hero power sound", () => {
      expect(pageContent).toMatch(/playHeroPower\(\)/);
    });

    it("plays turn start sound on turn change", () => {
      expect(pageContent).toMatch(/playTurnStart\(\)/);
    });

    it("plays victory sound on win", () => {
      expect(pageContent).toMatch(/playVictory\(\)/);
    });

    it("plays defeat sound on loss", () => {
      expect(pageContent).toMatch(/playDefeat\(\)/);
    });

    it("plays card draw sound when hand grows", () => {
      expect(pageContent).toMatch(/playCardDraw\(\)/);
    });
  });
});
