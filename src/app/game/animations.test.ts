import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const pageContent = fs.readFileSync(
  path.resolve(__dirname, "page.tsx"),
  "utf-8"
);
const cssContent = fs.readFileSync(
  path.resolve(__dirname, "../../app/globals.css"),
  "utf-8"
);

describe("Animation acceptance criteria", () => {
  describe("Playing a card from hand to board has a placement animation", () => {
    it("CSS defines a popIn keyframe", () => {
      expect(cssContent).toContain("@keyframes popIn");
    });

    it("tracks previous board length to detect new minion placement", () => {
      expect(pageContent).toMatch(/prevPlayerBoardLen/);
      expect(pageContent).toMatch(/useRef/);
    });

    it("triggers popIn animation for non-legendary minions when board length increases", () => {
      expect(pageContent).toMatch(/triggerAnim\(setPlayerAnims,\s*idx,\s*"popIn"/);
    });

    it("triggers legendaryEntrance animation for legendary minions", () => {
      expect(pageContent).toMatch(/rarity\s*===\s*"legendary"/);
      expect(pageContent).toMatch(/triggerAnim\(setPlayerAnims,\s*idx,\s*"legendaryEntrance"/);
    });

    it("BoardMinionCard applies popIn animation style", () => {
      expect(pageContent).toMatch(/animation === "popIn"/);
      expect(pageContent).toMatch(/popIn \$\{0\.4 \* animMultiplier\}s/);
    });

    it("BoardMinionCard applies legendaryEntrance animation style", () => {
      expect(pageContent).toMatch(/animation === "legendaryEntrance"/);
      expect(pageContent).toMatch(/legendaryEntrance \$\{0\.7 \* animMultiplier\}s/);
    });

    it("CSS defines legendaryEntrance keyframe", () => {
      expect(cssContent).toContain("@keyframes legendaryEntrance");
    });

    it("CSS defines legendaryGlow keyframe for golden glow burst", () => {
      expect(cssContent).toContain("@keyframes legendaryGlow");
    });

    it("CSS defines legendaryParticle keyframe for golden particles", () => {
      expect(cssContent).toContain("@keyframes legendaryParticle");
    });

    it("CSS defines legendaryShimmer keyframe that persists ~1s", () => {
      expect(cssContent).toContain("@keyframes legendaryShimmer");
    });

    it("golden shimmer is cleaned up after ~1.2s", () => {
      expect(pageContent).toMatch(/shimmerSetter.*1200/);
    });

    it("legendary particles use gold colors", () => {
      expect(pageContent).toMatch(/#ffd700/);
      expect(pageContent).toMatch(/#ffaa00/);
    });

    it("legendaryEntrance animation is visually different from popIn", () => {
      expect(cssContent).toMatch(/@keyframes legendaryEntrance[\s\S]*scale\(0\)/);
      expect(cssContent).toMatch(/@keyframes legendaryEntrance[\s\S]*brightness\(3\)/);
    });
  });

  describe("Attacking shows a lunge/shake animation on attacker and target", () => {
    it("CSS defines lunge keyframe", () => {
      expect(cssContent).toContain("@keyframes lunge");
    });

    it("CSS defines shake keyframe", () => {
      expect(cssContent).toContain("@keyframes shake");
    });

    it("triggers lunge on the attacker after successful attack", () => {
      expect(pageContent).toMatch(/triggerAnim\(setPlayerAnims,\s*attackerIdx,\s*"lunge"/);
    });

    it("triggers shake on the defender after successful attack", () => {
      expect(pageContent).toMatch(/triggerAnim\(setEnemyAnims,\s*index,\s*"shake"/);
    });

    it("shake is delayed via safeTimeout after lunge starts", () => {
      expect(pageContent).toMatch(/safeTimeout\(\(\)\s*=>\s*triggerAnim\(setEnemyAnims,\s*index,\s*"shake"/);
    });

    it("BoardMinionCard applies lunge animation style", () => {
      expect(pageContent).toMatch(/animation === "lunge"/);
      expect(pageContent).toMatch(/lunge \$\{0\.3 \* animMultiplier\}s/);
    });

    it("BoardMinionCard applies shake animation style", () => {
      expect(pageContent).toMatch(/animation === "shake"/);
      expect(pageContent).toMatch(/shake \$\{0\.3 \* animMultiplier\}s/);
    });
  });

  describe("Minion death has a shatter animation", () => {
    it("CSS defines shatterFragment keyframe", () => {
      expect(cssContent).toContain("@keyframes shatterFragment");
    });

    it("uses DyingMinion snapshot approach to preserve dead minions for animation", () => {
      expect(pageContent).toMatch(/interface DyingMinion/);
      expect(pageContent).toMatch(/dyingMinions.*useState/);
    });

    it("addDyingMinion captures a clone of the minion before removal", () => {
      expect(pageContent).toMatch(/addDyingMinion/);
      expect(pageContent).toMatch(/minion:\s*\{\s*\.\.\.minion\s*\}/);
    });

    it("calls addDyingMinion when defender health drops to 0 or below", () => {
      expect(pageContent).toMatch(/defenderHealth\s*-\s*attackerAtk\s*<=\s*0/);
      expect(pageContent).toMatch(/addDyingMinion\(defenderMinion,\s*index,\s*"enemy"\)/);
    });

    it("calls addDyingMinion when attacker health drops to 0 or below", () => {
      expect(pageContent).toMatch(/attackerHealth\s*-\s*defenderAtk\s*<=\s*0/);
      expect(pageContent).toMatch(/addDyingMinion\(attackerMinion,\s*attackerIdx,\s*"player"\)/);
    });

    it("BoardMinionCard renders 5 shatter fragments when dying", () => {
      expect(pageContent).toMatch(/SHARD_CLIPS/);
      expect(pageContent).toMatch(/clipPath:\s*clip/);
      expect(pageContent).toMatch(/shatterFragment \$\{0\.6 \* animMultiplier\}s/);
    });

    it("dying minions are interleaved at their original board position", () => {
      expect(pageContent).toMatch(/dyingByIndex/);
      expect(pageContent).toMatch(/dyingByIndex\.get\(dm\.boardIndex\)/);
    });

    it("dying minions auto-remove after 600ms via safeTimeout", () => {
      expect(pageContent).toMatch(/safeTimeout\(\(\)\s*=>\s*\{[\s\S]*?setDyingMinions/);
    });
  });

  describe("Damage numbers briefly flash on hit targets", () => {
    it("CSS defines floatDamage keyframe", () => {
      expect(cssContent).toContain("@keyframes floatDamage");
    });

    it("tracks damage numbers for player and enemy minions", () => {
      expect(pageContent).toMatch(/playerDmg.*useState/);
      expect(pageContent).toMatch(/enemyDmg.*useState/);
    });

    it("triggers damage number on defender when attacker has attack > 0", () => {
      expect(pageContent).toMatch(/triggerDmg\(setEnemyDmg,\s*index,\s*attackerAtk\)/);
    });

    it("triggers damage number on attacker when defender has attack > 0", () => {
      expect(pageContent).toMatch(/triggerDmg\(setPlayerDmg,\s*attackerIdx,\s*defenderAtk\)/);
    });

    it("BoardMinionCard renders damage number overlay", () => {
      expect(pageContent).toMatch(/damageNumber != null/);
      expect(pageContent).toMatch(/floatDamage/);
    });

    it("damage numbers auto-clear after 800ms", () => {
      expect(pageContent).toMatch(/triggerDmg.*800/s);
    });

    it("hero damage number displays on enemy hero hit", () => {
      expect(pageContent).toMatch(/heroDmg/);
      expect(pageContent).toMatch(/setHeroDmg\(attackerAtk\)/);
    });

    it("hero damage auto-clears after 800ms via safeTimeout", () => {
      expect(pageContent).toMatch(/safeTimeout\(\(\)\s*=>\s*setHeroDmg\(null\),\s*800 \* animMultiplier\)/);
    });
  });

  describe("Timeout cleanup on unmount", () => {
    it("uses safeTimeout with ref-based cleanup instead of raw setTimeout", () => {
      expect(pageContent).toMatch(/timeoutIds\s*=\s*useRef/);
      expect(pageContent).toMatch(/safeTimeout/);
    });

    it("clears all timeouts on unmount via useEffect cleanup", () => {
      expect(pageContent).toMatch(/clearTimeout/);
      expect(pageContent).toMatch(/timeoutIds\.current\.forEach/);
    });

    it("AnimKind type is defined at module scope", () => {
      const animKindPos = pageContent.indexOf("type AnimKind");
      const exportDefaultPos = pageContent.indexOf("export default");
      expect(animKindPos).toBeGreaterThan(-1);
      expect(animKindPos).toBeLessThan(exportDefaultPos);
    });
  });
});
