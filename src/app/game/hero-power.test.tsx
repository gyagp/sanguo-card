import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const mockState = {
  gameState: {
    players: [
      {
        hero: { health: 30, mana: 3, armor: 0, heroPower: { name: "火攻", cost: 2, description: "Deal 1 damage" } },
        hand: [{ name: "Card1", cost: 1, attack: 2, health: 3, description: "", rarity: "common", type: "minion", faction: "neutral" }],
        board: [],
        deck: { cards: [] },
        maxMana: 3,
        heroPowerUsed: false,
      },
      {
        hero: { health: 30, mana: 0, armor: 0, heroPower: { name: "火攻", cost: 2, description: "Deal 1 damage" } },
        hand: [
          { name: "C1", cost: 1, attack: 1, health: 1, description: "", rarity: "common", type: "minion", faction: "neutral" },
          { name: "C2", cost: 2, attack: 2, health: 2, description: "", rarity: "common", type: "minion", faction: "neutral" },
          { name: "C3", cost: 3, attack: 3, health: 3, description: "", rarity: "common", type: "minion", faction: "neutral" },
        ],
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

describe("Hero power button acceptance criteria", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockState.isOpponentTurn = false;
    mockState.winner = null;
    mockState.gameState.players[0].heroPowerUsed = false;
    mockState.gameState.players[0].hero.mana = 3;
    mockState.useHeroPower.mockClear();
  });

  describe("AC1: Hero power button is displayed near the hero portrait", () => {
    it("renders a hero power button showing the cost", () => {
      renderGamePage();
      const buttons = screen.getAllByRole("button");
      const heroPowerBtn = buttons.find((b) => b.textContent === "2" && b.classList.contains("rounded-full"));
      expect(heroPowerBtn).toBeDefined();
    });
  });

  describe("AC2: Clicking hero power calls useHeroPower and deducts mana", () => {
    it("calls useHeroPower when clicked", () => {
      renderGamePage();
      const buttons = screen.getAllByRole("button");
      const heroPowerBtn = buttons.find((b) => b.textContent === "2" && b.classList.contains("rounded-full"))!;
      fireEvent.click(heroPowerBtn);
      expect(mockState.useHeroPower).toHaveBeenCalledTimes(1);
    });
  });

  describe("AC3: Hero power button is grayed out when already used or insufficient mana", () => {
    it("is disabled when hero power already used this turn", () => {
      mockState.gameState.players[0].heroPowerUsed = true;
      renderGamePage();
      const buttons = screen.getAllByRole("button");
      const heroPowerBtn = buttons.find((b) => b.textContent === "2" && b.classList.contains("rounded-full"))!;
      expect(heroPowerBtn).toBeDisabled();
      expect(heroPowerBtn.className).toContain("gray");
    });

    it("is disabled when insufficient mana", () => {
      mockState.gameState.players[0].hero.mana = 1;
      renderGamePage();
      const buttons = screen.getAllByRole("button");
      const heroPowerBtn = buttons.find((b) => b.textContent === "2" && b.classList.contains("rounded-full"))!;
      expect(heroPowerBtn).toBeDisabled();
      expect(heroPowerBtn.className).toContain("gray");
    });

    it("is enabled when not used and has enough mana", () => {
      renderGamePage();
      const buttons = screen.getAllByRole("button");
      const heroPowerBtn = buttons.find((b) => b.textContent === "2" && b.classList.contains("rounded-full"))!;
      expect(heroPowerBtn).not.toBeDisabled();
      expect(heroPowerBtn.className).toContain("purple");
    });

    it("is disabled during opponent turn", () => {
      mockState.isOpponentTurn = true;
      renderGamePage();
      const buttons = screen.getAllByRole("button");
      const heroPowerBtn = buttons.find((b) => b.textContent === "2" && b.classList.contains("rounded-full"))!;
      expect(heroPowerBtn).toBeDisabled();
    });
  });
});

describe("Opponent hand face-down display", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockState.isOpponentTurn = false;
    mockState.winner = null;
  });

  describe("AC4: Opponent hand shows correct number of face-down cards", () => {
    it("renders face-down cards matching opponent hand size", () => {
      renderGamePage();
      const faceDownCards = document.querySelectorAll(".bg-red-900.border-red-700");
      expect(faceDownCards.length).toBe(mockState.gameState.players[1].hand.length);
    });

    it("face-down cards do not show card names or stats", () => {
      renderGamePage();
      const faceDownCards = document.querySelectorAll(".bg-red-900.border-red-700");
      faceDownCards.forEach((card) => {
        expect(card.textContent).toBe("");
      });
    });

    it("updates count when opponent hand size changes", () => {
      mockState.gameState.players[1].hand = [
        { name: "C1", cost: 1, attack: 1, health: 1, description: "", rarity: "common", type: "minion", faction: "neutral" },
        { name: "C2", cost: 2, attack: 2, health: 2, description: "", rarity: "common", type: "minion", faction: "neutral" },
      ];
      renderGamePage();
      const faceDownCards = document.querySelectorAll(".bg-red-900.border-red-700");
      expect(faceDownCards.length).toBe(2);
    });
  });
});
