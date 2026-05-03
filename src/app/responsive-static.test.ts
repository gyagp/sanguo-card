import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

function readSrc(file: string) {
  return readFileSync(join(__dirname, "..", "..", file), "utf-8");
}

describe("Game board responsive design (static analysis)", () => {
  const src = readSrc("src/app/game/page.tsx");

  it("board minion cards scale down for mobile with sm/md breakpoints", () => {
    expect(src).toContain("w-12 h-[4.25rem] sm:w-20 sm:h-[6.5rem] md:w-24 md:h-32");
  });

  it("board zones have responsive min-height", () => {
    expect(src).toContain("min-h-[5rem] sm:min-h-[6.5rem] md:min-h-[9rem]");
  });

  it("mana dots scale with md breakpoint", () => {
    expect(src).toContain("w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-3 md:h-3");
  });

  it("hero portrait scales with sm and md breakpoints", () => {
    expect(src).toContain("w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14");
  });

  it("player hand cards use responsive scaling", () => {
    expect(src).toContain("scale-[0.28] sm:scale-[0.4] md:scale-50");
  });

  it("opponent hand cards scale for mobile", () => {
    expect(src).toContain("w-7 h-10 sm:w-12 sm:h-16 md:w-16 md:h-24");
  });

  it("turn banner text scales for mobile", () => {
    expect(src).toContain("text-xl md:text-3xl");
  });

  it("hero power button scales with breakpoints", () => {
    expect(src).toContain("w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14");
  });

  it("board zone gaps are responsive", () => {
    expect(src).toContain("gap-1 md:gap-2");
  });

  it("does not use overflow-x hidden hack", () => {
    expect(src).not.toContain("overflow-x: hidden");
    expect(src).not.toContain("overflow-x-hidden");
  });

  it("uses max-w-full to prevent horizontal overflow", () => {
    expect(src).toContain("max-w-full");
  });

  it("turn indicator and end turn are merged into one row", () => {
    expect(src).toContain("flex items-center justify-center py-0.5 sm:py-1 md:py-1 gap-1.5 sm:gap-2");
  });
});

describe("Deck builder responsive design (static analysis)", () => {
  const src = readSrc("src/app/deck-builder/page.tsx");

  it("header has responsive padding", () => {
    expect(src).toContain("px-3 md:px-6");
  });

  it("title scales with md breakpoint", () => {
    expect(src).toContain("text-lg md:text-2xl");
  });

  it("card browser and deck panel stack vertically on mobile", () => {
    expect(src).toContain("flex-col overflow-hidden md:flex-row");
  });

  it("deck panel uses full width on mobile, fixed on md+", () => {
    expect(src).toContain("w-full");
    expect(src).toContain("md:w-80");
  });

  it("card/deck divider changes from bottom border to right border at md", () => {
    expect(src).toContain("border-b border-yellow-600/40");
    expect(src).toContain("md:border-b-0 md:border-r");
  });
});

describe("No horizontal overflow on any page", () => {
  it("globals.css does not use overflow-x hidden on body", () => {
    const css = readSrc("src/app/globals.css");
    expect(css).not.toMatch(/body\s*\{[^}]*overflow-x\s*:\s*hidden/);
  });

  it("main menu constrains width with max-w-md", () => {
    const src = readSrc("src/app/page.tsx");
    expect(src).toContain("max-w-md");
  });
});
