import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const pagePath = path.resolve(__dirname, "page.tsx");
const pageContent = fs.readFileSync(pagePath, "utf-8");

const cardPath = path.resolve(__dirname, "../../components/Card.tsx");
const cardContent = fs.readFileSync(cardPath, "utf-8");

describe("Drag-and-drop: cards in hand are draggable", () => {
  it("Card component accepts a draggable prop", () => {
    expect(cardContent).toMatch(/draggable\??\s*:\s*boolean/);
  });

  it("Card component accepts a handIndex prop", () => {
    expect(cardContent).toMatch(/handIndex\??\s*:\s*number/);
  });

  it("Card sets draggable attribute based on prop", () => {
    expect(cardContent).toMatch(/draggable=\{/);
  });

  it("Card has an onDragStart handler that sets dataTransfer data", () => {
    expect(cardContent).toMatch(/onDragStart/);
    expect(cardContent).toMatch(/setData\(/);
    expect(cardContent).toMatch(/handIndex/);
  });

  it("game page passes draggable prop to Card components", () => {
    expect(pageContent).toMatch(/<Card[\s\S]*?draggable/);
  });

  it("game page passes handIndex to Card components", () => {
    expect(pageContent).toMatch(/<Card[\s\S]*?handIndex=\{i\}/);
  });
});

describe("Drag-and-drop: board zone is a valid drop target", () => {
  it("LaneBoardZone has onDragOver handler", () => {
    expect(pageContent).toMatch(/onDragOver/);
  });

  it("LaneBoardZone calls preventDefault on dragover to allow drops", () => {
    expect(pageContent).toMatch(/e\.preventDefault\(\)/);
  });

  it("LaneBoardZone has onDrop handler", () => {
    expect(pageContent).toMatch(/onDrop/);
  });

  it("LaneBoardZone has onDragLeave handler", () => {
    expect(pageContent).toMatch(/onDragLeave/);
  });

  it("LaneBoardZone shows visual highlight on dragover", () => {
    expect(pageContent).toMatch(/isDragTarget/);
    expect(pageContent).toMatch(/border-dashed/);
    expect(pageContent).toMatch(/border-green/);
  });

  it("LaneBoardZone tracks dragOverLane state", () => {
    expect(pageContent).toMatch(/useState<Lane \| null>\(null\)/);
    expect(pageContent).toMatch(/setDragOverLane\(lane\)/);
    expect(pageContent).toMatch(/setDragOverLane\(null\)/);
  });
});

describe("Drag-and-drop: dropping a card calls playCard", () => {
  it("LaneBoardZone reads handIndex from dataTransfer on drop", () => {
    expect(pageContent).toMatch(/getData\(["']text\/plain["']\)/);
    expect(pageContent).toMatch(/parseInt\(/);
  });

  it("LaneBoardZone calls onDrop callback with parsed handIndex and lane", () => {
    expect(pageContent).toMatch(/onDrop\(handIndex, lane\)/);
  });

  it("player board zone passes handlePlayCard as onDrop", () => {
    expect(pageContent).toMatch(/onDrop=\{.*handlePlayCard/);
  });

  it("opponent board zone does not accept drops", () => {
    const opponentBoardMatch = pageContent.match(
      /<LaneBoardZone[\s\S]*?minions=\{opponent\.board\}[^/]*/
    );
    expect(opponentBoardMatch).toBeTruthy();
    expect(opponentBoardMatch![0]).not.toMatch(/onDrop/);
  });
});

describe("Drag-and-drop: insufficient mana feedback", () => {
  it("Card component accepts insufficientMana prop", () => {
    expect(cardContent).toMatch(/insufficientMana\??\s*:\s*boolean/);
  });

  it("Card prevents drag when insufficientMana is true", () => {
    expect(cardContent).toMatch(/!insufficientMana/);
  });

  it("Card prevents dragStart when insufficientMana is true", () => {
    expect(cardContent).toMatch(/if\s*\(insufficientMana\)/);
    expect(cardContent).toMatch(/e\.preventDefault\(\)/);
  });

  it("Card shows visual feedback for insufficient mana (opacity/grayscale)", () => {
    expect(cardContent).toMatch(/insufficientMana.*opacity/);
    expect(cardContent).toMatch(/cursor-not-allowed/);
  });

  it("game page computes insufficientMana based on card cost vs player mana", () => {
    expect(pageContent).toMatch(/insufficientMana=\{card\.cost\s*>\s*player\.hero\.mana/);
  });
});

describe("Drag-and-drop: board respects MAX_BOARD_SIZE", () => {
  it("imports MAX_BOARD_SIZE from game types", () => {
    expect(pageContent).toMatch(/MAX_BOARD_SIZE/);
  });

  it("disables cards when board is full", () => {
    expect(pageContent).toMatch(/player\.board\.length\s*>=\s*MAX_BOARD_SIZE/);
  });

  it("includes board full check in insufficientMana computation", () => {
    const insufficientManaMatch = pageContent.match(/insufficientMana=\{([^}]+)\}/);
    expect(insufficientManaMatch).toBeTruthy();
    expect(insufficientManaMatch![1]).toContain("MAX_BOARD_SIZE");
    expect(insufficientManaMatch![1]).toContain("card.cost");
  });
});
