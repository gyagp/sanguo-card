import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const pagePath = path.resolve(__dirname, "page.tsx");
const pageContent = fs.readFileSync(pagePath, "utf-8");

const cssPath = path.resolve(__dirname, "../globals.css");
const cssContent = fs.readFileSync(cssPath, "utf-8");

describe("Card play animation: card flies from hand to board", () => {
  describe("CSS keyframes", () => {
    it("defines a cardFly keyframe animation", () => {
      expect(cssContent).toMatch(/@keyframes\s+cardFly/);
    });

    it("cardFly animates translateY using --fly-dy custom property", () => {
      expect(cssContent).toMatch(/translateY\(var\(--fly-dy\)\)/);
    });

    it("cardFly scales down during flight", () => {
      expect(cssContent).toMatch(/scale\(0\.55\)/);
    });

    it("cardFly fades out at the end", () => {
      expect(cssContent).toMatch(/100%\s*\{[^}]*opacity:\s*0/);
    });
  });

  describe("animation duration and easing", () => {
    it("uses ~500ms duration with easing", () => {
      expect(pageContent).toMatch(/cardFly \$\{500 \* animMultiplier\}ms ease-in-out/);
    });

    it("uses forwards fill mode so final state persists", () => {
      expect(pageContent).toMatch(/cardFly.*forwards/);
    });
  });

  describe("flying card state management", () => {
    it("tracks flying cards in state", () => {
      expect(pageContent).toMatch(/flyingCards/);
      expect(pageContent).toMatch(/setFlyingCards/);
    });

    it("stores start position from hand card bounding rect", () => {
      expect(pageContent).toMatch(/getBoundingClientRect/);
      expect(pageContent).toMatch(/startRect/);
    });

    it("snapshots the card data before engine mutation", () => {
      expect(pageContent).toMatch(/const\s+card\s*=\s*player\.hand\[handIndex\]/);
    });

    it("removes flying card after animation completes (~500ms)", () => {
      expect(pageContent).toMatch(/safeTimeout\(.*setFlyingCards.*500 \* animMultiplier\)/);
    });
  });

  describe("flying card overlay rendering", () => {
    it("renders flying cards with fixed positioning", () => {
      expect(pageContent).toMatch(/className="fixed\s+pointer-events-none/);
    });

    it("sets --fly-dy custom property for vertical translation", () => {
      expect(pageContent).toMatch(/--fly-dy/);
    });

    it("positions overlay at the start rect coordinates", () => {
      expect(pageContent).toMatch(/left:\s*fc\.startRect\.left/);
      expect(pageContent).toMatch(/top:\s*fc\.startRect\.top/);
    });

    it("renders a Card component inside the flying overlay", () => {
      expect(pageContent).toMatch(/<Card\s+card=\{fc\.card\}/);
    });
  });

  describe("board zone ref for target position", () => {
    it("BoardZone uses forwardRef", () => {
      expect(pageContent).toMatch(/forwardRef/);
    });

    it("player board zone has a ref for target calculation", () => {
      expect(pageContent).toMatch(/boardZoneRef/);
    });

    it("calculates target Y from board zone bounding rect", () => {
      expect(pageContent).toMatch(/boardRect.*getBoundingClientRect/);
    });
  });

  describe("handlePlayCard captures state before mutation", () => {
    it("captures card from hand before calling playCard", () => {
      const handleMatch = pageContent.match(/handlePlayCard[\s\S]*?(?=\n\s*\}, \[)/);
      expect(handleMatch).toBeTruthy();
      const body = handleMatch![0];
      const cardCapture = body.indexOf("player.hand[handIndex]");
      const playCardCall = body.indexOf("playCard(handIndex,");
      expect(cardCapture).toBeGreaterThan(-1);
      expect(playCardCall).toBeGreaterThan(-1);
      expect(cardCapture).toBeLessThan(playCardCall);
    });
  });
});
