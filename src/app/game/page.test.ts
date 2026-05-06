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

describe("Lane UI acceptance criteria", () => {
  it("renders 3 lanes (left/center/right) using ALL_LANES", () => {
    expect(pageContent).toMatch(/ALL_LANES\.map/);
    expect(pageContent).toMatch(/ALL_LANES/);
  });

  it("defines lane labels for left/center/right as 左/中/右", () => {
    expect(pageContent).toMatch(/LANE_LABELS/);
    expect(pageContent).toMatch(/\[Lane\.Left\]:\s*"左"/);
    expect(pageContent).toMatch(/\[Lane\.Center\]:\s*"中"/);
    expect(pageContent).toMatch(/\[Lane\.Right\]:\s*"右"/);
  });

  it("renders lane dividers between lanes", () => {
    expect(pageContent).toMatch(/bg-amber-700\/50/);
    expect(pageContent).toMatch(/laneIdx > 0/);
  });

  it("each lane renders MAX_LANE_SIZE slots", () => {
    expect(pageContent).toMatch(/MAX_LANE_SIZE/);
    expect(pageContent).toMatch(/Array\.from\(\{ length: MAX_LANE_SIZE \}\)/);
  });

  it("renders LaneSlot component for each slot", () => {
    expect(pageContent).toMatch(/<LaneSlot/);
    expect(pageContent).toMatch(/function LaneSlot/);
  });

  it("LaneBoardZone component exists as a forwardRef", () => {
    expect(pageContent).toMatch(/const LaneBoardZone = forwardRef/);
    expect(pageContent).toMatch(/function LaneBoardZone\(/);
  });

  it("displays terrain effect icons when terrain is present", () => {
    expect(pageContent).toMatch(/TERRAIN_ICONS/);
    expect(pageContent).toMatch(/laneTerrain\.type/);
    expect(pageContent).toMatch(/laneTerrain\.name/);
  });

  it("defines terrain colors for fire, healing, and stealth", () => {
    expect(pageContent).toMatch(/TERRAIN_COLORS/);
    expect(pageContent).toMatch(/TerrainType\.Fire/);
    expect(pageContent).toMatch(/TerrainType\.HealingAura/);
    expect(pageContent).toMatch(/TerrainType\.Stealth/);
  });

  it("applies terrain-specific border and background colors to lanes", () => {
    expect(pageContent).toMatch(/border-red-500/);
    expect(pageContent).toMatch(/bg-red-900/);
    expect(pageContent).toMatch(/border-green-500/);
    expect(pageContent).toMatch(/bg-green-900/);
    expect(pageContent).toMatch(/border-purple-500/);
    expect(pageContent).toMatch(/bg-purple-900/);
  });

  it("LaneBoardZone accepts terrain prop", () => {
    expect(pageContent).toMatch(/terrain\??\s*:\s*Record<Lane,\s*TerrainEffect/);
  });

  describe("attack UI lane restrictions", () => {
    it("validTargetIndices filters by getReachableLanes for attacker", () => {
      expect(pageContent).toMatch(/getReachableLanes\(attackerMinion\.lane\)/);
      expect(pageContent).toMatch(/reachable\.includes\(m\.lane\)/);
    });

    it("valid targets get targetable prop (red border highlight)", () => {
      expect(pageContent).toMatch(/targetable=\{.*validTargetIndices.*\.has\(/);
    });

    it("invalid targets get dimmed prop (opacity-50 + pointer-events-none)", () => {
      expect(pageContent).toMatch(/dimmed=\{.*validTargetIndices.*!validTargetIndices\.has\(/);
    });

    it("dimmed minions have opacity-50 and cursor-not-allowed", () => {
      expect(pageContent).toMatch(/exhausted \|\| dimmed \? "opacity-50"/);
      expect(pageContent).toMatch(/exhausted \|\| dimmed \? "cursor-not-allowed pointer-events-none"/);
    });

    it("hero targetability respects lane-scoped taunt", () => {
      expect(pageContent).toMatch(/isHeroTargetable/);
      expect(pageContent).toMatch(/getReachableLanes\(attackerMinion\.lane\)/);
      expect(pageContent).toMatch(/hasTaunt && !m\.taunt/);
    });

    it("spell targeting uses getSpellReachableLanes", () => {
      expect(pageContent).toMatch(/getSpellReachableLanes\(player\)/);
      expect(pageContent).toMatch(/m\.spellImmune/);
    });
  });

  describe("lane AOE spell targeting", () => {
    it("pendingLaneAoe state exists for lane AOE selection step", () => {
      expect(pageContent).toMatch(/pendingLaneAoe/);
      expect(pageContent).toMatch(/setPendingLaneAoe/);
    });

    it("lane_aoe cards trigger lane selection UI instead of immediate play", () => {
      expect(pageContent).toMatch(/lane_aoe/);
      expect(pageContent).toMatch(/setPendingLaneAoe\(/);
    });

    it("lane AOE prompt shows '选择目标战线' label", () => {
      expect(pageContent).toMatch(/选择目标战线/);
    });

    it("lane AOE prompt renders a button per lane (左/中/右)", () => {
      expect(pageContent).toMatch(/ALL_LANES\.map\(lane =>/);
      expect(pageContent).toMatch(/pendingLaneAoe/);
    });

    it("clicking a lane button calls handlePlayCard with targetLane", () => {
      expect(pageContent).toMatch(/handlePlayCard\(handIndex, cardEl, undefined, lane\)/);
    });
  });

  describe("lane labels visible", () => {
    it("LANE_LABELS maps Left/Center/Right to 左/中/右", () => {
      expect(pageContent).toMatch(/\[Lane\.Left\]:\s*"左"/);
      expect(pageContent).toMatch(/\[Lane\.Center\]:\s*"中"/);
      expect(pageContent).toMatch(/\[Lane\.Right\]:\s*"右"/);
    });

    it("lane labels rendered in LaneBoardZone", () => {
      expect(pageContent).toMatch(/LANE_LABELS\[lane\]/);
    });
  });

  it("drag-and-drop targets specific lane via dragOverLane state", () => {
    expect(pageContent).toMatch(/dragOverLane/);
    expect(pageContent).toMatch(/setDragOverLane/);
    expect(pageContent).toMatch(/makeLaneHandlers\(lane\)/);
  });

  it("drop handler passes lane to onDrop callback", () => {
    expect(pageContent).toMatch(/onDrop\(handIndex, lane\)/);
  });

  it("lane selection prompt shows lane capacity", () => {
    expect(pageContent).toMatch(/LANE_LABELS\[lane\]/);
    expect(pageContent).toMatch(/MAX_LANE_SIZE/);
    expect(pageContent).toMatch(/laneCount/);
  });
});

describe("Trap card UI", () => {
  it("renders face-down trap icons for opponent's active traps", () => {
    expect(pageContent).toMatch(/opponent\.activeTraps/);
    expect(pageContent).toMatch(/陷阱/);
    expect(pageContent).toMatch(/\?/);
  });

  it("uses optional chaining or nullish coalescing for activeTraps access", () => {
    expect(pageContent).toMatch(/activeTraps\?\./);
  });

  it("shows trap count indicator", () => {
    expect(pageContent).toMatch(/陷阱 ×/);
  });

  it("has trap reveal animation state and effect", () => {
    expect(pageContent).toMatch(/revealedTraps/);
    expect(pageContent).toMatch(/setRevealedTraps/);
    expect(pageContent).toMatch(/prevOpponentTrapsRef/);
  });

  it("RevealedTrap interface is defined at module scope, not inside component", () => {
    const componentMatch = pageContent.match(/export\s+default\s+function\s+\w+/);
    expect(componentMatch).not.toBeNull();
    const interfaceMatch = pageContent.match(/interface\s+RevealedTrap/);
    expect(interfaceMatch).not.toBeNull();
    const componentPos = componentMatch!.index!;
    const interfacePos = interfaceMatch!.index!;
    expect(interfacePos).toBeLessThan(componentPos);
  });

  it("trap face-down icons use composite keys, not bare array index", () => {
    // The key should contain trap.card.name or similar, not just bare index
    expect(pageContent).toMatch(/trap\.card\.name/);
  });

  it("trapPulse animation is applied to face-down trap icons", () => {
    expect(pageContent).toMatch(/trapPulse/);
  });

  it("trap reveal animation cleans up after timeout", () => {
    expect(pageContent).toMatch(/setRevealedTraps\(prev\s*=>\s*prev\.filter/);
  });
});
