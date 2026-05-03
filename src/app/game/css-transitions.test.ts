import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const gamePageSrc = fs.readFileSync(
  path.resolve(__dirname, "page.tsx"),
  "utf-8"
);
const cardSrc = fs.readFileSync(
  path.resolve(__dirname, "../../components/Card.tsx"),
  "utf-8"
);
const globalsCss = fs.readFileSync(
  path.resolve(__dirname, "../globals.css"),
  "utf-8"
);

describe("AC: Cards in hand scale up on hover with shadow", () => {
  it("Card component has hover:scale class", () => {
    expect(cardSrc).toMatch(/hover:scale-\d+/);
  });

  it("Card component has hover:shadow class", () => {
    expect(cardSrc).toMatch(/hover:shadow-/);
  });

  it("Card component has transition-all with duration", () => {
    expect(cardSrc).toMatch(/transition-all/);
    expect(cardSrc).toMatch(/duration-\d+/);
  });

  it("Card component has ease-out easing", () => {
    expect(cardSrc).toMatch(/ease-out/);
  });

  it("opponent hand cards have hover:scale transition", () => {
    expect(gamePageSrc).toMatch(/transition-transform.*hover:scale/s);
  });
});

describe("AC: Health/mana number changes animate (color flash on damage)", () => {
  it("healthFlash keyframe exists in globals.css", () => {
    expect(globalsCss).toContain("@keyframes healthFlash");
  });

  it("healFlash keyframe exists in globals.css", () => {
    expect(globalsCss).toContain("@keyframes healFlash");
  });

  it("manaFlash keyframe exists in globals.css", () => {
    expect(globalsCss).toContain("@keyframes manaFlash");
  });

  it("healthFlash scales up and changes color", () => {
    const match = globalsCss.match(/@keyframes healthFlash \{[\s\S]*?\n\}/);
    expect(match).toBeTruthy();
    expect(match![0]).toContain("scale(1.4)");
    expect(match![0]).toContain("#ff0000");
  });

  it("manaFlash scales and changes color", () => {
    const match = globalsCss.match(/@keyframes manaFlash \{[\s\S]*?\n\}/);
    expect(match).toBeTruthy();
    expect(match![0]).toContain("scale(1.3)");
  });

  it("HeroPortrait tracks previous health to detect changes", () => {
    expect(gamePageSrc).toContain("prevHealthRef");
    expect(gamePageSrc).toContain("prevManaRef");
  });

  it("HeroPortrait applies healthFlash animation on damage", () => {
    expect(gamePageSrc).toMatch(/animation:.*healthFlash/);
  });

  it("HeroPortrait applies manaFlash animation on mana change", () => {
    expect(gamePageSrc).toMatch(/animation:.*manaFlash/);
  });

  it("HeroPortrait applies healFlash animation on healing", () => {
    expect(gamePageSrc).toMatch(/animation:.*healFlash/);
  });

  it("minion health/attack flash keyframes exist", () => {
    expect(globalsCss).toContain("@keyframes minionHealthFlash");
    expect(globalsCss).toContain("@keyframes minionAttackFlash");
  });

  it("timers are cleaned up on unmount", () => {
    expect(gamePageSrc).toContain("clearTimeout(healthTimerRef.current)");
    expect(gamePageSrc).toContain("clearTimeout(manaTimerRef.current)");
  });
});

describe("AC: Board zone highlights smoothly on drag-over", () => {
  it("BoardZone has transition-all with duration for smooth highlight", () => {
    expect(gamePageSrc).toMatch(/transition-all duration-300/);
  });

  it("BoardZone has ease-out for smooth animation", () => {
    expect(gamePageSrc).toMatch(/transition-all duration-300 ease-out/);
  });

  it("BoardZone changes background on dragOver state", () => {
    expect(gamePageSrc).toContain("bg-green-800/40");
  });

  it("BoardZone shows dashed border on drag-over", () => {
    expect(gamePageSrc).toContain("border-dashed border-green-400");
  });

  it("BoardZone has inner glow shadow on drag-over", () => {
    expect(gamePageSrc).toContain("shadow-[inset_0_0_20px_rgba(74,222,128,0.15)]");
  });

  it("BoardZone reverts to transparent border when not dragging", () => {
    expect(gamePageSrc).toContain("border-transparent");
  });

  it("dragOver state is managed via onDragOver and onDragLeave", () => {
    expect(gamePageSrc).toContain("handleDragOver");
    expect(gamePageSrc).toContain("handleDragLeave");
    expect(gamePageSrc).toContain("setDragOver(true)");
    expect(gamePageSrc).toContain("setDragOver(false)");
  });
});

describe("AC: All interactive elements have transition properties", () => {
  it("Card component has transition-all", () => {
    expect(cardSrc).toContain("transition-all");
  });

  it("BoardMinionCard has transition-all duration-200", () => {
    expect(gamePageSrc).toMatch(/BoardMinionCard[\s\S]*?transition-all duration-200/);
  });

  it("BoardMinionCard has hover border color changes", () => {
    expect(gamePageSrc).toContain("hover:border-yellow-400");
    expect(gamePageSrc).toContain("hover:border-red-300");
  });

  it("HeroPortrait circle has transition-all duration-200", () => {
    expect(gamePageSrc).toMatch(/rounded-full bg-gray-700 border-2.*transition-all duration-200/);
  });

  it("End Turn button has transition-all duration-200", () => {
    expect(gamePageSrc).toMatch(/结束回合[\s\S]*?transition-all/);
    expect(gamePageSrc).toMatch(/hover:bg-amber-600 hover:scale-105/);
  });

  it("Hero power button has transition-all duration-200", () => {
    expect(gamePageSrc).toMatch(/heroPower[\s\S]*?transition-all duration-200/);
  });

  it("Hero power button scales on hover", () => {
    expect(gamePageSrc).toContain("hover:scale-110");
  });

  it("ManaBar dots have transition-colors with duration", () => {
    expect(gamePageSrc).toMatch(/transition-colors duration-300/);
  });

  it("Play Again button has transition and hover effects", () => {
    expect(gamePageSrc).toMatch(/transition-all hover:scale-105[\s\S]*?再来一局/);
  });

  it("opponent hand cards have transition-transform", () => {
    expect(gamePageSrc).toContain("transition-transform duration-200");
  });
});
