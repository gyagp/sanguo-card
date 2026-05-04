import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import * as fs from "fs";
import * as path from "path";

const mockState = {
  gameState: {
    players: [
      {
        hero: { health: 30, mana: 3, armor: 0, heroPower: { name: "", cost: 2, description: "" } },
        hand: [{ name: "Card1", cost: 1, attack: 2, health: 3, description: "", rarity: "common", type: "minion", faction: "neutral" }],
        board: [],
        deck: { cards: [] },
        maxMana: 3,
        heroPowerUsed: false,
      },
      {
        hero: { health: 30, mana: 0, armor: 0, heroPower: { name: "", cost: 2, description: "" } },
        hand: [{ name: "Card2", cost: 1, attack: 1, health: 1, description: "", rarity: "common", type: "minion", faction: "neutral" }],
        board: [],
        deck: { cards: [] },
        maxMana: 0,
        heroPowerUsed: false,
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
};

vi.mock("../../hooks/useGameState", () => ({
  useGameState: vi.fn(() => mockState),
}));

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

import GamePage from "./page";

function renderGamePage() {
  render(<GamePage />);
  fireEvent.click(screen.getByText("随机卡组"));
}

describe("End Turn button acceptance criteria", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockState.isOpponentTurn = false;
    mockState.winner = null;
    mockState.endTurn.mockClear();
  });

  describe("AC1: End Turn button calls endTurn and starts opponent simulated turn", () => {
    it("renders an End Turn button", () => {
      renderGamePage();
      const btn = screen.getByRole("button", { name: /结束回合/ });
      expect(btn).toBeDefined();
    });

    it("calls endTurn when clicked", () => {
      renderGamePage();
      const btn = screen.getByRole("button", { name: /结束回合/ });
      fireEvent.click(btn);
      expect(mockState.endTurn).toHaveBeenCalledTimes(1);
    });
  });

  describe("AC2: Button shows active/disabled state based on whose turn", () => {
    it("button is enabled during player turn", () => {
      renderGamePage();
      const btn = screen.getByRole("button", { name: /结束回合/ });
      expect(btn).not.toBeDisabled();
    });

    it("button is disabled during opponent turn", () => {
      mockState.isOpponentTurn = true;
      renderGamePage();
      const btn = screen.getByRole("button", { name: /结束回合/ });
      expect(btn).toBeDisabled();
    });

    it("button is disabled when there is a winner", () => {
      mockState.winner = 0;
      renderGamePage();
      const btn = screen.getByRole("button", { name: /结束回合/ });
      expect(btn).toBeDisabled();
    });

    it("button has active styling during player turn", () => {
      renderGamePage();
      const btn = screen.getByRole("button", { name: /结束回合/ });
      expect(btn.className).toContain("bg-amber-700");
    });

    it("button has disabled styling during opponent turn", () => {
      mockState.isOpponentTurn = true;
      renderGamePage();
      const btn = screen.getByRole("button", { name: /结束回合/ });
      expect(btn.className).toContain("bg-gray-600");
      expect(btn.className).toContain("cursor-not-allowed");
    });
  });

  describe("AC3: Turn indicator displays whose turn it is", () => {
    it("shows player turn indicator during player turn", () => {
      renderGamePage();
      expect(screen.getByText("你的回合")).toBeDefined();
    });

    it("shows opponent turn indicator during opponent turn", () => {
      mockState.isOpponentTurn = true;
      renderGamePage();
      expect(screen.getByText("对手回合")).toBeDefined();
    });

    it("turn indicator has green styling during player turn", () => {
      renderGamePage();
      const indicator = screen.getByText("你的回合");
      expect(indicator.className).toContain("bg-green-700");
    });

    it("turn indicator has red styling during opponent turn", () => {
      mockState.isOpponentTurn = true;
      renderGamePage();
      const indicator = screen.getByText("对手回合");
      expect(indicator.className).toContain("bg-red-700");
    });
  });

  describe("AC4: Visual turn timer bar animates during the turn", () => {
    it("shows timer bar during opponent turn", () => {
      mockState.isOpponentTurn = true;
      renderGamePage();
      const timerBar = document.querySelector("[class*='animate-']");
      expect(timerBar).not.toBeNull();
    });

    it("does not show timer bar during player turn", () => {
      renderGamePage();
      const animatedElements = document.querySelectorAll("[class*='animate-']");
      const shrinkBars = Array.from(animatedElements).filter(el =>
        el.className.includes("shrink")
      );
      expect(shrinkBars.length).toBe(0);
    });

    it("timer bar has shrink animation keyframes defined in CSS", () => {
      const css = fs.readFileSync(path.resolve(__dirname, "../globals.css"), "utf-8");
      expect(css).toContain("@keyframes shrink");
      expect(css).toMatch(/from\s*\{\s*width:\s*100%/);
      expect(css).toMatch(/to\s*\{\s*width:\s*0%/);
    });
  });
});

describe("useGameState endTurn simulates opponent turn", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("endTurn sets isOpponentTurn=true then back to false after timeout", async () => {
    const actualModule = await vi.importActual<typeof import("../../hooks/useGameState")>("../../hooks/useGameState");
    const { createDeck } = await import("../../game/types");
    type Card = import("../../game/types").Card;

    function makeCard(i: number): Card {
      return { name: `C${i}`, cost: 1, attack: 1, health: 1, description: "", rarity: "common", type: "minion", faction: "neutral" };
    }
    const cards = Array.from({ length: 30 }, (_, i) => makeCard(i));
    const d1 = createDeck(cards);
    const d2 = createDeck([...cards]);

    const { result } = renderHook(() => actualModule.useGameState(d1, d2));

    expect(result.current.isOpponentTurn).toBe(false);

    act(() => {
      result.current.endTurn();
    });

    expect(result.current.isOpponentTurn).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(result.current.isOpponentTurn).toBe(false);
  });
});
