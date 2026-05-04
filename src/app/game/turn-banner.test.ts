import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const pageSrc = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
const cssSrc = readFileSync(resolve(__dirname, "../globals.css"), "utf-8");

describe("Turn banner acceptance criteria", () => {
  describe("'Your Turn' banner slides in at start of player turn", () => {
    it("sets turnBanner to 'your' when isOpponentTurn is false", () => {
      expect(pageSrc).toContain('setTurnBanner(isOpponentTurn ? "enemy" : "your")');
    });

    it("renders '你的回合' text for player turn", () => {
      expect(pageSrc).toContain('turnBanner === "your" ? "你的回合" : "对手回合"');
    });

    it("uses green styling for player turn banner", () => {
      expect(pageSrc).toContain("bg-green-800/90 text-green-100 border-2 border-green-400");
    });
  });

  describe("'Enemy Turn' banner slides in at start of opponent turn", () => {
    it("sets turnBanner to 'enemy' when isOpponentTurn is true", () => {
      expect(pageSrc).toContain('isOpponentTurn ? "enemy" : "your"');
    });

    it("renders '对手回合' text for enemy turn", () => {
      expect(pageSrc).toContain("对手回合");
    });

    it("uses red styling for enemy turn banner", () => {
      expect(pageSrc).toContain("bg-red-800/90 text-red-100 border-2 border-red-400");
    });
  });

  describe("Banner auto-dismisses after ~1.5s with fade-out", () => {
    it("sets banner to null after 1500ms timeout", () => {
      expect(pageSrc).toContain("setTurnBanner(null)");
      expect(pageSrc).toMatch(/setTimeout\(.*1500/s);
    });

    it("uses turnBannerIn animation with duration based on animMultiplier", () => {
      expect(pageSrc).toMatch(/turnBannerIn \$\{1\.5 \* animMultiplier\}s ease-out forwards/);
    });

    it("CSS keyframe fades out at 100%", () => {
      expect(cssSrc).toContain("@keyframes turnBannerIn");
      const keyframeMatch = cssSrc.match(/@keyframes turnBannerIn\s*\{[\s\S]*?\n\}/);
      expect(keyframeMatch).not.toBeNull();
      const keyframe = keyframeMatch![0];
      expect(keyframe).toContain("opacity: 0");
      expect(keyframe).toMatch(/100%.*opacity:\s*0/s);
    });

    it("CSS keyframe starts with slide-in from left", () => {
      const keyframeMatch = cssSrc.match(/@keyframes turnBannerIn\s*\{[\s\S]*?\n\}/);
      const keyframe = keyframeMatch![0];
      expect(keyframe).toMatch(/0%.*translateX\(-100%\)/s);
    });
  });

  describe("Timer cleanup (unmount safety)", () => {
    it("tracks timer in a ref for cleanup", () => {
      expect(pageSrc).toContain("turnBannerTimerRef");
      expect(pageSrc).toContain("useRef<ReturnType<typeof setTimeout> | null>(null)");
    });

    it("clears previous timer before setting new one", () => {
      const clearBeforeSet = pageSrc.match(
        /clearTimeout\(turnBannerTimerRef\.current\)[\s\S]*?turnBannerTimerRef\.current\s*=\s*setTimeout/
      );
      expect(clearBeforeSet).not.toBeNull();
    });

    it("cleans up timer on unmount", () => {
      const unmountCleanup = pageSrc.match(
        /return\s*\(\)\s*=>\s*\{[\s\S]*?clearTimeout\(turnBannerTimerRef\.current\)/
      );
      expect(unmountCleanup).not.toBeNull();
    });
  });

  describe("Overlay positioning", () => {
    it("renders as a fixed overlay with pointer-events-none", () => {
      expect(pageSrc).toContain("fixed inset-0 flex items-center justify-center pointer-events-none");
    });

    it("conditionally renders only when turnBanner is set", () => {
      expect(pageSrc).toContain("turnBanner && (");
    });

    it("skips banner on first render", () => {
      expect(pageSrc).toContain("isFirstRender = useRef(true)");
      expect(pageSrc).toMatch(/if\s*\(isFirstRender\.current\)/);
    });
  });
});
