import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const pagePath = path.resolve(__dirname, "page.tsx");
const pageContent = fs.readFileSync(pagePath, "utf-8");

const cssPath = path.resolve(__dirname, "../globals.css");
const cssContent = fs.readFileSync(cssPath, "utf-8");

describe("Spell casting visual effects", () => {
  describe("Spell-specific color palette", () => {
    it("defines SPELL_COLORS distinct from PARTICLE_COLORS", () => {
      expect(pageContent).toMatch(/const SPELL_COLORS\s*=\s*\[/);
      const spellMatch = pageContent.match(/const SPELL_COLORS\s*=\s*\[([^\]]+)\]/);
      const particleMatch = pageContent.match(/const PARTICLE_COLORS\s*=\s*\[([^\]]+)\]/);
      expect(spellMatch).not.toBeNull();
      expect(particleMatch).not.toBeNull();
      expect(spellMatch![1]).not.toEqual(particleMatch![1]);
    });
  });

  describe("Spell particle trail", () => {
    it("defines makeSpellParticles function", () => {
      expect(pageContent).toMatch(/function makeSpellParticles/);
    });

    it("makeSpellParticles generates multiple particles", () => {
      const match = pageContent.match(/Array\.from\(\{\s*length:\s*(\d+)\s*\}[^)]*\)/g);
      expect(match).not.toBeNull();
      const spellParticleMatch = pageContent.match(/function makeSpellParticles[\s\S]*?Array\.from\(\{\s*length:\s*(\d+)\s*\}/);
      expect(spellParticleMatch).not.toBeNull();
      const count = parseInt(spellParticleMatch![1]);
      expect(count).toBeGreaterThanOrEqual(6);
    });

    it("spell particles have tx, ty, color, delay, and size properties", () => {
      expect(pageContent).toMatch(/interface SpellTrailParticle\s*\{[^}]*tx:\s*number/);
      expect(pageContent).toMatch(/interface SpellTrailParticle\s*\{[^}]*ty:\s*number/);
      expect(pageContent).toMatch(/interface SpellTrailParticle\s*\{[^}]*color:\s*string/);
      expect(pageContent).toMatch(/interface SpellTrailParticle\s*\{[^}]*delay:\s*number/);
      expect(pageContent).toMatch(/interface SpellTrailParticle\s*\{[^}]*size:\s*number/);
    });

    it("defines SpellBurst component for rendering particles", () => {
      expect(pageContent).toMatch(/function SpellBurst/);
    });

    it("SpellBurst renders with fixed positioning and pointer-events-none", () => {
      const spellBurstSection = pageContent.match(/function SpellBurst[\s\S]*?^}/m);
      expect(spellBurstSection).not.toBeNull();
      expect(spellBurstSection![0]).toMatch(/fixed/);
      expect(spellBurstSection![0]).toMatch(/pointer-events-none/);
    });

    it("spell particles use spellTrail animation", () => {
      expect(pageContent).toMatch(/animation:.*spellTrail/);
    });
  });

  describe("CSS keyframes for spell effects", () => {
    it("defines spellTrail keyframe", () => {
      expect(cssContent).toMatch(/@keyframes\s+spellTrail/);
    });

    it("spellTrail uses --tx and --ty custom properties for direction", () => {
      expect(cssContent).toMatch(/translate\(var\(--tx\),\s*var\(--ty\)\)/);
    });

    it("spellTrail animates opacity from visible to invisible", () => {
      const trailSection = cssContent.match(/@keyframes\s+spellTrail\s*\{[\s\S]*?\n\}/);
      expect(trailSection).not.toBeNull();
      expect(trailSection![0]).toMatch(/opacity:\s*1/);
      expect(trailSection![0]).toMatch(/opacity:\s*0/);
    });

    it("defines spellFlash keyframe", () => {
      expect(cssContent).toMatch(/@keyframes\s+spellFlash/);
    });

    it("spellFlash fades in and out", () => {
      const flashSection = cssContent.match(/@keyframes\s+spellFlash\s*\{[\s\S]*?\n\}/);
      expect(flashSection).not.toBeNull();
      expect(flashSection![0]).toMatch(/0%\s*\{[^}]*opacity:\s*0/);
      expect(flashSection![0]).toMatch(/100%\s*\{[^}]*opacity:\s*0/);
    });
  });

  describe("Spell effect triggers only for spell cards", () => {
    it("checks card.type === 'spell' before creating spell effects", () => {
      expect(pageContent).toMatch(/card\.type\s*===\s*["']spell["']/);
    });

    it("spell effect is separate from minion popIn animation", () => {
      const spellBlock = pageContent.match(/card\.type\s*===\s*["']spell["'][\s\S]*?\}/);
      expect(spellBlock).not.toBeNull();
      expect(spellBlock![0]).not.toMatch(/popIn/);
    });
  });

  describe("Spell flash overlay", () => {
    it("tracks spellFlash state", () => {
      expect(pageContent).toMatch(/spellFlash.*useState|useState.*spellFlash/);
    });

    it("renders flash overlay with radial gradient", () => {
      expect(pageContent).toMatch(/radial-gradient/);
    });

    it("flash overlay uses spellFlash animation", () => {
      expect(pageContent).toMatch(/animation:\s*["']?spellFlash\s+0\.6s/);
    });

    it("flash duration is approximately 600ms", () => {
      const flashTimeout = pageContent.match(/setSpellFlash\(false\)\s*,\s*(\d+)/);
      expect(flashTimeout).not.toBeNull();
      expect(parseInt(flashTimeout![1])).toBe(600);
    });
  });

  describe("Cleanup and lifecycle", () => {
    it("spell effects are cleaned up via safeTimeout", () => {
      const spellSection = pageContent.match(/card\.type\s*===\s*["']spell["'][\s\S]*?setSpellFlash\(false\)/);
      expect(spellSection).not.toBeNull();
      expect(spellSection![0]).toMatch(/safeTimeout/);
    });

    it("spell effect particles are removed after animation completes", () => {
      expect(pageContent).toMatch(/setSpellEffects\(prev\s*=>\s*prev\.filter/);
    });
  });
});
