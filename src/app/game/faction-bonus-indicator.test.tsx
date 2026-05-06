import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const mockGainNode = { connect: vi.fn(), gain: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() } };
globalThis.AudioContext = vi.fn().mockImplementation(() => ({
  createGain: vi.fn(() => mockGainNode),
  createOscillator: vi.fn(() => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn(), frequency: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, type: 'sine' })),
  createBufferSource: vi.fn(() => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn(), buffer: null })),
  destination: {},
  currentTime: 0,
  close: vi.fn(),
  resume: vi.fn(),
  suspend: vi.fn(),
  state: 'running',
})) as unknown as typeof AudioContext;

vi.mock("./audio-manager", () => {
  const noop = vi.fn();
  const instance = {
    startBGM: noop, stopBGM: noop, setMuted: noop, setVolume: noop,
    playCardPlay: noop, playAttack: noop, playDamage: noop, playHeroPower: noop,
    playTurnStart: noop, playVictory: noop, playDefeat: noop, playCardDraw: noop,
    muted: false, volume: 1,
  };
  return { AudioManager: { getInstance: vi.fn(() => instance) } };
});

const mockState = {
  gameState: {
    players: [
      {
        hero: { health: 30, mana: 3, armor: 0, heroPower: { name: "", cost: 2, description: "" } },
        hand: [],
        board: [] as Array<{ name: string; attack: number; health: number; faction: string; [k: string]: unknown }>,
        deck: { cards: [] },
        maxMana: 3,
        heroPowerUsed: false,
        deckFaction: "wei" as string,
        hasDeckFactionBonus: false,
      },
      {
        hero: { health: 30, mana: 0, armor: 0, heroPower: { name: "", cost: 2, description: "" } },
        hand: [],
        board: [],
        deck: { cards: [] },
        maxMana: 0,
        heroPowerUsed: false,
        deckFaction: "neutral" as string,
        hasDeckFactionBonus: false,
      },
    ],
    activePlayer: 0,
    turn: 1,
    phase: "playing" as const,
  },
  winner: null as number | string | null,
  isOpponentTurn: false,
  playCard: vi.fn(() => ({ success: true })),
  endTurn: vi.fn(),
  attack: vi.fn(() => ({ success: true })),
  attackHero: vi.fn(() => ({ success: true })),
  useHeroPower: vi.fn(() => ({ success: true })),
  resetGame: vi.fn(),
};

vi.mock("../../hooks/useGameState", () => ({
  useGameState: vi.fn(() => mockState),
}));

import GamePage from "./page";

function renderGamePage() {
  render(<GamePage />);
  fireEvent.click(screen.getByText("随机卡组"));
}

const FACTION_NAMES: Record<string, string> = {
  wei: "魏", shu: "蜀", wu: "吴", qun: "群", neutral: "中立",
};

function setPlayerFaction(faction: string, hasDeckBonus: boolean, boardMinions: Array<{ name: string; attack: number; health: number; faction: string }> = []) {
  const p = mockState.gameState.players[0];
  p.deckFaction = faction;
  p.hasDeckFactionBonus = hasDeckBonus;
  p.board = boardMinions.map((m, i) => ({ ...m, maxHealth: m.health, hasAttacked: false, attacksThisTurn: 0, lane: ["left", "center", "right"][Math.floor(i / 2)], slotIndex: i % 2 })) as typeof p.board;
}

describe("FactionBonusIndicator acceptance criteria", () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    mockState.winner = null;
    mockState.isOpponentTurn = false;
    setPlayerFaction("wei", false, []);
  });

  describe("AC1: Faction icon/name displayed", () => {
    it("shows faction name for wei", () => {
      setPlayerFaction("wei", false);
      renderGamePage();
      expect(screen.getByText("魏")).toBeDefined();
    });

    it("shows faction name for shu", () => {
      setPlayerFaction("shu", false);
      renderGamePage();
      expect(screen.getByText("蜀")).toBeDefined();
    });

    it("shows faction name for wu", () => {
      setPlayerFaction("wu", false);
      renderGamePage();
      expect(screen.getByText("吴")).toBeDefined();
    });

    it("shows faction name for qun", () => {
      setPlayerFaction("qun", false);
      renderGamePage();
      expect(screen.getByText("群")).toBeDefined();
    });

    it("shows faction name for neutral", () => {
      setPlayerFaction("neutral", false);
      renderGamePage();
      expect(screen.getByText("中立")).toBeDefined();
    });

    it("shows faction icon emoji for wei (🔵)", () => {
      setPlayerFaction("wei", false);
      renderGamePage();
      expect(screen.getByText("🔵")).toBeDefined();
    });
  });

  describe("AC2: Active synergy tier highlighted", () => {
    it("renders synergy tier dots for non-neutral factions", () => {
      setPlayerFaction("wei", false);
      renderGamePage();
      const button = screen.getByText("魏").closest("button")!;
      const dots = button.querySelectorAll(".rounded-full");
      expect(dots.length).toBe(3);
    });

    it("no dots are highlighted with 0 faction minions on board", () => {
      setPlayerFaction("wei", false, []);
      renderGamePage();
      const button = screen.getByText("魏").closest("button")!;
      const dots = button.querySelectorAll(".rounded-full");
      dots.forEach(dot => {
        expect(dot.className).toContain("bg-gray-600");
      });
    });

    it("first tier highlighted with 2+ faction minions on board", () => {
      setPlayerFaction("wei", false, [
        { name: "a", attack: 1, health: 1, faction: "wei" },
        { name: "b", attack: 1, health: 1, faction: "wei" },
      ]);
      renderGamePage();
      const button = screen.getByText("魏").closest("button")!;
      const dots = Array.from(button.querySelectorAll(".rounded-full"));
      expect(dots[0].className).toContain("bg-amber-400");
      expect(dots[1].className).toContain("bg-gray-600");
      expect(dots[2].className).toContain("bg-gray-600");
    });

    it("all tiers highlighted with 6+ faction minions", () => {
      const minions = Array.from({ length: 6 }, (_, i) => ({ name: `m${i}`, attack: 1, health: 1, faction: "wei" }));
      setPlayerFaction("wei", false, minions);
      renderGamePage();
      const button = screen.getByText("魏").closest("button")!;
      const dots = Array.from(button.querySelectorAll(".rounded-full"));
      dots.forEach(dot => {
        expect(dot.className).toContain("bg-amber-400");
      });
    });

    it("no synergy dots for neutral faction", () => {
      setPlayerFaction("neutral", false);
      renderGamePage();
      const button = screen.getByText("中立").closest("button")!;
      const dots = button.querySelectorAll(".rounded-full");
      expect(dots.length).toBe(0);
    });
  });

  describe("AC3: Deck bonus (20+) shown as active/inactive", () => {
    it("shows star when deck bonus is active", () => {
      setPlayerFaction("wei", true);
      renderGamePage();
      expect(screen.getByText("★")).toBeDefined();
    });

    it("button has amber border when deck bonus active", () => {
      setPlayerFaction("wei", true);
      renderGamePage();
      const button = screen.getByText("魏").closest("button")!;
      expect(button.className).toContain("border-amber-500");
    });

    it("button has gray border when deck bonus inactive", () => {
      setPlayerFaction("wei", false);
      renderGamePage();
      const button = screen.getByText("魏").closest("button")!;
      expect(button.className).toContain("border-gray-600");
    });

    it("no star when deck bonus is inactive", () => {
      setPlayerFaction("wei", false);
      renderGamePage();
      expect(screen.queryByText("★")).toBeNull();
    });
  });

  describe("AC4: Hover/click shows passive ability descriptions", () => {
    it("details popup not visible by default", () => {
      setPlayerFaction("wei", true);
      renderGamePage();
      expect(screen.queryByText("魏国势力")).toBeNull();
    });

    it("click toggles details popup", () => {
      setPlayerFaction("wei", true);
      renderGamePage();
      const button = screen.getByText("魏").closest("button")!;
      fireEvent.click(button);
      expect(screen.getByText(/魏国势力/)).toBeDefined();
    });

    it("shows 激活 label when deck bonus is active", () => {
      setPlayerFaction("wei", true);
      renderGamePage();
      const button = screen.getByText("魏").closest("button")!;
      fireEvent.click(button);
      expect(screen.getByText("激活")).toBeDefined();
    });

    it("shows 未激活 label when deck bonus is inactive", () => {
      setPlayerFaction("wei", false);
      renderGamePage();
      const button = screen.getByText("魏").closest("button")!;
      fireEvent.click(button);
      expect(screen.getByText("未激活")).toBeDefined();
    });

    it("shows passive ability descriptions when deck bonus active", () => {
      setPlayerFaction("wei", true);
      renderGamePage();
      const button = screen.getByText("魏").closest("button")!;
      fireEvent.click(button);
      expect(screen.getByText(/法术费用减少1/)).toBeDefined();
      expect(screen.getByText(/使用法术时额外抽一张牌/)).toBeDefined();
      expect(screen.getByText(/冰冻效果持续2回合/)).toBeDefined();
    });

    it("does not show passive descriptions when deck bonus inactive", () => {
      setPlayerFaction("wei", false);
      renderGamePage();
      const button = screen.getByText("魏").closest("button")!;
      fireEvent.click(button);
      expect(screen.queryByText(/法术费用减少1/)).toBeNull();
    });

    it("shows synergy tier details with counts in popup", () => {
      setPlayerFaction("wei", false);
      renderGamePage();
      const button = screen.getByText("魏").closest("button")!;
      fireEvent.click(button);
      expect(screen.getByText(/场上协同/)).toBeDefined();
      expect(screen.getByText(/2个/)).toBeDefined();
    });

    it("mouseEnter shows details, mouseLeave hides", () => {
      setPlayerFaction("wei", false);
      renderGamePage();
      const button = screen.getByText("魏").closest("button")!;
      fireEvent.mouseEnter(button);
      expect(screen.getByText(/魏国势力/)).toBeDefined();
      fireEvent.mouseLeave(button);
      expect(screen.queryByText("魏国势力")).toBeNull();
    });

    it("second click hides details", () => {
      setPlayerFaction("wei", false);
      renderGamePage();
      const button = screen.getByText("魏").closest("button")!;
      fireEvent.click(button);
      expect(screen.getByText(/魏国势力/)).toBeDefined();
      fireEvent.click(button);
      expect(screen.queryByText("魏国势力")).toBeNull();
    });
  });
});
