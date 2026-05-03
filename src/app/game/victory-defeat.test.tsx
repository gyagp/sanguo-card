import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import * as fs from "fs";
import * as path from "path";

const mockState = {
  gameState: {
    players: [
      {
        hero: { health: 30, mana: 3, armor: 0, heroPower: { name: "", cost: 2, description: "" } },
        hand: [],
        board: [],
        deck: { cards: [] },
        maxMana: 3,
        heroPowerUsed: false,
      },
      {
        hero: { health: 30, mana: 0, armor: 0, heroPower: { name: "", cost: 2, description: "" } },
        hand: [],
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
  resetGame: vi.fn(),
};

vi.mock("../../hooks/useGameState", () => ({
  useGameState: vi.fn(() => mockState),
}));

import GamePage from "./page";

describe("Victory/Defeat overlay acceptance criteria", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockState.winner = null;
    mockState.isOpponentTurn = false;
    mockState.resetGame.mockClear();
  });

  it("does not show overlay when no winner", () => {
    render(<GamePage />);
    expect(screen.queryByText("VICTORY")).toBeNull();
    expect(screen.queryByText("DEFEAT")).toBeNull();
    expect(screen.queryByText("DRAW")).toBeNull();
  });

  describe("AC1: Victory shows celebratory animation with golden particles and large VICTORY text", () => {
    it("renders VICTORY text when player 0 wins", () => {
      mockState.winner = 0;
      render(<GamePage />);
      expect(screen.getByText("VICTORY")).toBeDefined();
      expect(screen.getByText("胜利!")).toBeDefined();
    });

    it("VICTORY text has golden color class", () => {
      mockState.winner = 0;
      render(<GamePage />);
      const title = screen.getByText("VICTORY");
      expect(title.className).toContain("text-yellow-400");
    });

    it("VICTORY text has large font size", () => {
      mockState.winner = 0;
      render(<GamePage />);
      const title = screen.getByText("VICTORY");
      expect(title.className).toMatch(/text-7xl|text-8xl/);
    });

    it("VICTORY overlay has golden gradient background", () => {
      mockState.winner = 0;
      render(<GamePage />);
      const overlay = screen.getByText("VICTORY").closest(".absolute.inset-0.z-50");
      expect(overlay).toBeDefined();
      const bg = overlay!.querySelector(".bg-gradient-to-b");
      expect(bg).toBeDefined();
      expect(bg!.className).toContain("yellow-900");
    });

    it("renders golden particles for victory", () => {
      mockState.winner = 0;
      render(<GamePage />);
      const overlay = screen.getByText("VICTORY").closest(".absolute.inset-0.z-50");
      const particles = overlay!.querySelectorAll(".rounded-full.pointer-events-none");
      expect(particles.length).toBe(30);
    });

    it("victory particles use victoryParticle animation", () => {
      mockState.winner = 0;
      render(<GamePage />);
      const overlay = screen.getByText("VICTORY").closest(".absolute.inset-0.z-50");
      const particle = overlay!.querySelector(".rounded-full.pointer-events-none") as HTMLElement;
      expect(particle.style.animation).toContain("victoryParticle");
    });
  });

  describe("AC2: Defeat shows somber animation with shatter/fade and DEFEAT text", () => {
    it("renders DEFEAT text when player 1 wins", () => {
      mockState.winner = 1;
      render(<GamePage />);
      expect(screen.getByText("DEFEAT")).toBeDefined();
      expect(screen.getByText("失败!")).toBeDefined();
    });

    it("DEFEAT text has red color class", () => {
      mockState.winner = 1;
      render(<GamePage />);
      const title = screen.getByText("DEFEAT");
      expect(title.className).toContain("text-red-400");
    });

    it("renders somber particles for defeat", () => {
      mockState.winner = 1;
      render(<GamePage />);
      const overlay = screen.getByText("DEFEAT").closest(".absolute.inset-0.z-50");
      const particles = overlay!.querySelectorAll(".rounded-full.pointer-events-none");
      expect(particles.length).toBe(20);
    });

    it("defeat particles use defeatParticle animation", () => {
      mockState.winner = 1;
      render(<GamePage />);
      const overlay = screen.getByText("DEFEAT").closest(".absolute.inset-0.z-50");
      const particle = overlay!.querySelector(".rounded-full.pointer-events-none") as HTMLElement;
      expect(particle.style.animation).toContain("defeatParticle");
    });

    it("defeat overlay has red gradient background", () => {
      mockState.winner = 1;
      render(<GamePage />);
      const bg = screen.getByText("DEFEAT").closest(".absolute.inset-0.z-50")!.querySelector(".bg-gradient-to-b");
      expect(bg!.className).toContain("red-900");
    });
  });

  describe("AC3: Screen includes a Play Again button", () => {
    it("renders Play Again button on victory", () => {
      mockState.winner = 0;
      render(<GamePage />);
      const btn = screen.getByRole("button", { name: /再来一局/ });
      expect(btn).toBeDefined();
    });

    it("renders Play Again button on defeat", () => {
      mockState.winner = 1;
      render(<GamePage />);
      const btn = screen.getByRole("button", { name: /再来一局/ });
      expect(btn).toBeDefined();
    });

    it("clicking Play Again calls resetGame", () => {
      mockState.winner = 0;
      render(<GamePage />);
      const btn = screen.getByRole("button", { name: /再来一局/ });
      fireEvent.click(btn);
      expect(mockState.resetGame).toHaveBeenCalledTimes(1);
    });
  });

  describe("AC4: Animation builds over ~2s with eased entrance", () => {
    it("overlay container has fade-in animation", () => {
      mockState.winner = 0;
      render(<GamePage />);
      const overlay = screen.getByText("VICTORY").closest(".absolute.inset-0.z-50") as HTMLElement;
      expect(overlay.style.animation).toContain("resultOverlayIn");
    });

    it("title text has 2s entrance animation with cubic-bezier easing", () => {
      mockState.winner = 0;
      render(<GamePage />);
      const title = screen.getByText("VICTORY") as HTMLElement;
      expect(title.style.animation).toContain("resultTextIn");
      expect(title.style.animation).toContain("2s");
      expect(title.style.animation).toContain("cubic-bezier");
    });

    it("button has delayed entrance animation", () => {
      mockState.winner = 0;
      render(<GamePage />);
      const btn = screen.getByRole("button", { name: /再来一局/ }) as HTMLElement;
      expect(btn.style.animation).toContain("resultButtonIn");
      expect(btn.style.animation).toContain("1.5s");
    });

    it("CSS keyframes for resultTextIn are defined in globals.css", () => {
      const css = fs.readFileSync(path.resolve(__dirname, "../globals.css"), "utf-8");
      expect(css).toContain("@keyframes resultTextIn");
      expect(css).toContain("scale(3)");
      expect(css).toContain("blur(10px)");
    });

    it("CSS keyframes for victoryParticle and defeatParticle are defined", () => {
      const css = fs.readFileSync(path.resolve(__dirname, "../globals.css"), "utf-8");
      expect(css).toContain("@keyframes victoryParticle");
      expect(css).toContain("@keyframes defeatParticle");
    });
  });

  describe("Draw condition", () => {
    it("renders DRAW text when result is draw", () => {
      mockState.winner = "draw";
      render(<GamePage />);
      expect(screen.getByText("DRAW")).toBeDefined();
      expect(screen.getByText("平局!")).toBeDefined();
    });

    it("draw uses blue color scheme", () => {
      mockState.winner = "draw";
      render(<GamePage />);
      const title = screen.getByText("DRAW");
      expect(title.className).toContain("text-blue-400");
    });

    it("draw has Play Again button", () => {
      mockState.winner = "draw";
      render(<GamePage />);
      expect(screen.getByRole("button", { name: /再来一局/ })).toBeDefined();
    });
  });
});
