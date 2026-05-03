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

  describe("board layout zones", () => {
    it("has opponent hand area", () => {
      expect(pageContent).toContain("Opponent hand");
    });

    it("has opponent board area", () => {
      expect(pageContent).toContain("Opponent board");
    });

    it("has player board area", () => {
      expect(pageContent).toContain("Player board");
    });

    it("has player hand area", () => {
      expect(pageContent).toContain("Player hand");
    });
  });

  describe("hero portraits", () => {
    it("renders HeroPortrait for opponent", () => {
      expect(pageContent).toMatch(/HeroPortrait.*side="opponent"/);
    });

    it("renders HeroPortrait for player", () => {
      expect(pageContent).toMatch(/HeroPortrait.*side="player"/);
    });

    it("displays HP", () => {
      expect(pageContent).toMatch(/hero\.hp/);
    });

    it("displays mana", () => {
      expect(pageContent).toMatch(/hero\.mana/);
    });
  });

  it("has an end turn button", () => {
    expect(pageContent).toMatch(/<button[\s\S]*?结束回合[\s\S]*?<\/button>/);
  });

  describe("responsive Tailwind CSS", () => {
    it("uses Tailwind utility classes", () => {
      expect(pageContent).toMatch(/className="/);
    });

    it("uses responsive breakpoints", () => {
      expect(pageContent).toMatch(/sm:/);
    });

    it("uses flexbox layout", () => {
      expect(pageContent).toContain("flex");
    });
  });
});
