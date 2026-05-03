import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const pagePath = path.resolve(__dirname, "page.tsx");
const pageContent = fs.readFileSync(pagePath, "utf-8");

describe("Click-to-attack: selecting a friendly minion as attacker", () => {
  it("tracks selectedAttacker state", () => {
    expect(pageContent).toMatch(/useState<number\s*\|\s*null>\(null\)/);
  });

  it("has a handleFriendlyMinionClick handler", () => {
    expect(pageContent).toMatch(/handleFriendlyMinionClick/);
  });

  it("sets selectedAttacker on friendly minion click", () => {
    expect(pageContent).toMatch(/setSelectedAttacker/);
  });

  it("passes selectedIndex to player BoardZone", () => {
    expect(pageContent).toMatch(/selectedIndex=\{selectedAttacker\}/);
  });

  it("BoardMinionCard shows visual highlight when selected", () => {
    expect(pageContent).toMatch(/selected\s*\?/);
    expect(pageContent).toMatch(/border-yellow-300/);
    expect(pageContent).toMatch(/ring-2/);
    expect(pageContent).toMatch(/ring-yellow-400/);
  });

  it("prevents selecting minions with summoning sickness", () => {
    expect(pageContent).toMatch(/summoningSickness/);
  });

  it("prevents selecting minions that already attacked", () => {
    expect(pageContent).toMatch(/hasAttacked/);
  });

  it("guards against selecting when there is a winner", () => {
    expect(pageContent).toMatch(/if\s*\(winner\s*!==\s*null\)\s*return/);
  });

  it("guards against selecting when it is not the player's turn", () => {
    expect(pageContent).toMatch(/activePlayer\s*!==\s*0/);
  });
});

describe("Click-to-attack: clicking enemy minion triggers attack", () => {
  it("has a handleEnemyMinionClick handler", () => {
    expect(pageContent).toMatch(/handleEnemyMinionClick/);
  });

  it("calls attack with selectedAttacker and target index", () => {
    expect(pageContent).toMatch(/attack\(attackerIdx,\s*index\)/);
  });

  it("clears selectedAttacker after attacking a minion", () => {
    const handler = pageContent.match(
      /handleEnemyMinionClick[\s\S]*?setSelectedAttacker\(null\)/
    );
    expect(handler).toBeTruthy();
  });

  it("only attacks when an attacker is selected", () => {
    expect(pageContent).toMatch(
      /if\s*\(selectedAttacker\s*===\s*null\)\s*return/
    );
  });

  it("passes onMinionClick to enemy BoardZone", () => {
    expect(pageContent).toMatch(
      /onMinionClick=\{handleEnemyMinionClick\}/
    );
  });

  it("marks enemy minions as targetable when attacker is selected", () => {
    expect(pageContent).toMatch(/hasAttackerSelected=\{selectedAttacker\s*!==\s*null\}/);
  });

  it("BoardMinionCard shows targetable visual when enemy and attacker selected", () => {
    expect(pageContent).toMatch(/targetable\s*\?/);
    expect(pageContent).toMatch(/border-red-400/);
  });
});

describe("Click-to-attack: clicking enemy hero triggers attackHero", () => {
  it("has a handleEnemyHeroClick handler", () => {
    expect(pageContent).toMatch(/handleEnemyHeroClick/);
  });

  it("calls attackHero with selectedAttacker", () => {
    expect(pageContent).toMatch(/attackHero\(attackerIdx\)/);
  });

  it("clears selectedAttacker after attacking hero", () => {
    const handler = pageContent.match(
      /handleEnemyHeroClick[\s\S]*?setSelectedAttacker\(null\)/
    );
    expect(handler).toBeTruthy();
  });

  it("HeroPortrait accepts onClick and targetable props", () => {
    expect(pageContent).toMatch(/<HeroPortrait\s+player=\{opponent\}[^>]*onClick=\{handleEnemyHeroClick\}/);
    expect(pageContent).toMatch(/<HeroPortrait\s+player=\{opponent\}[^>]*targetable=\{selectedAttacker\s*!==\s*null\}/);
  });

  it("HeroPortrait shows targetable border when targetable", () => {
    expect(pageContent).toMatch(/targetable\s*\?\s*"border-red-400/);
  });
});

describe("Click-to-attack: deselection", () => {
  it("toggles off when clicking the same friendly minion", () => {
    expect(pageContent).toMatch(/selectedAttacker\s*===\s*index\s*\?\s*null\s*:\s*index/);
  });

  it("clicking empty board space deselects", () => {
    expect(pageContent).toMatch(/handleBoardClick/);
    expect(pageContent).toMatch(/setSelectedAttacker\(null\)/);
  });

  it("board click handler checks event target", () => {
    expect(pageContent).toMatch(/e\.target\s*===\s*e\.currentTarget/);
  });

  it("end turn clears selectedAttacker", () => {
    expect(pageContent).toMatch(/endTurn\(\)[\s\S]*?setSelectedAttacker\(null\)/);
  });

  it("minion clicks stop propagation to prevent board deselect", () => {
    expect(pageContent).toMatch(/e\.stopPropagation\(\)/);
  });
});

describe("Click-to-attack: exhausted minions are dimmed and not selectable", () => {
  it("BoardMinionCard accepts exhausted prop", () => {
    expect(pageContent).toMatch(/exhausted\??\s*:\s*boolean/);
  });

  it("exhausted minions have reduced opacity", () => {
    expect(pageContent).toMatch(/exhausted\s*\?\s*"opacity-50"/);
  });

  it("exhausted minions show cursor-not-allowed", () => {
    expect(pageContent).toMatch(/exhausted\s*\?\s*"cursor-not-allowed"/);
  });

  it("friendly minions pass exhausted based on hasAttacked or summoningSickness", () => {
    expect(pageContent).toMatch(
      /exhausted=\{!isEnemy\s*&&\s*\(minions\[i\]\.hasAttacked\s*\|\|\s*minions\[i\]\.summoningSickness\)\}/
    );
  });

  it("handleFriendlyMinionClick prevents selecting exhausted minions", () => {
    const handler = pageContent.match(
      /handleFriendlyMinionClick[\s\S]*?hasAttacked[\s\S]*?summoningSickness/
    );
    expect(handler).toBeTruthy();
  });
});
