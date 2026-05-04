import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

vi.mock("../../hooks/useGameState", () => ({
  useGameState: vi.fn(() => ({
    gameState: {
      players: [
        { hero: { health: 30, mana: 0, heroPower: { name: "t", cost: 2, description: "" } }, board: [], hand: [], deck: [], maxMana: 0, heroPowerUsed: false },
        { hero: { health: 30, mana: 0, heroPower: { name: "t", cost: 2, description: "" } }, board: [], hand: [], deck: [], maxMana: 0, heroPowerUsed: false },
      ],
      activePlayer: 0,
      turn: 1,
      phase: "playing" as const,
    },
    winner: null,
    playCard: vi.fn(() => ({ success: false })),
    endTurn: vi.fn(),
    attack: vi.fn(() => ({ success: false })),
    attackHero: vi.fn(() => ({ success: false })),
    useHeroPower: vi.fn(),
    isOpponentTurn: false,
    resetGame: vi.fn(),
  })),
}));

vi.mock("../../components/Card", () => ({
  default: ({ card }: { card: { name: string } }) => <div data-testid="card">{card.name}</div>,
}));

vi.mock("../../components/VolumeControl", () => ({
  default: () => <div data-testid="volume-control" />,
}));

import GamePage from "./page";
import { MAX_DECK_SIZE } from "../../game/types";
import type { Card } from "../../game/types";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    name: "乡勇",
    cost: 1,
    attack: 1,
    health: 2,
    description: "嘲讽",
    rarity: "common",
    type: "minion",
    faction: "neutral",
    ...overrides,
  };
}

function makeDeck(size = MAX_DECK_SIZE): Card[] {
  return Array.from({ length: size }, (_, i) => makeCard({ name: `Card${i}` }));
}

function saveDeckToStorage(decks: Array<{ id: string; name: string; cards: Card[] }>) {
  localStorage.setItem("sanguo-card-decks", JSON.stringify(decks));
}

describe("Deck selection before battle", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows deck select screen with title and random deck button", () => {
    render(<GamePage />);
    expect(screen.getByText("选择卡组")).toBeInTheDocument();
    expect(screen.getByText("随机卡组")).toBeInTheDocument();
  });

  it("shows saved decks that have exactly 30 cards", () => {
    saveDeckToStorage([
      { id: "1", name: "我的卡组", cards: makeDeck(30) },
    ]);
    render(<GamePage />);
    expect(screen.getByText("已保存的卡组")).toBeInTheDocument();
    expect(screen.getByText(/我的卡组/)).toBeInTheDocument();
  });

  it("filters out saved decks with fewer than 30 cards", () => {
    saveDeckToStorage([
      { id: "1", name: "不完整卡组", cards: makeDeck(10) },
    ]);
    render(<GamePage />);
    expect(screen.queryByText(/不完整卡组/)).not.toBeInTheDocument();
    expect(screen.queryByText("已保存的卡组")).not.toBeInTheDocument();
  });

  it("shows multiple saved decks", () => {
    saveDeckToStorage([
      { id: "1", name: "蜀国卡组", cards: makeDeck(30) },
      { id: "2", name: "魏国卡组", cards: makeDeck(30) },
    ]);
    render(<GamePage />);
    expect(screen.getByText(/蜀国卡组/)).toBeInTheDocument();
    expect(screen.getByText(/魏国卡组/)).toBeInTheDocument();
  });

  it("clicking random deck transitions to game screen", () => {
    render(<GamePage />);
    fireEvent.click(screen.getByText("随机卡组"));
    expect(screen.queryByText("选择卡组")).not.toBeInTheDocument();
    expect(screen.getByText("结束回合")).toBeInTheDocument();
  });

  it("clicking a saved deck transitions to game screen", () => {
    saveDeckToStorage([
      { id: "1", name: "我的卡组", cards: makeDeck(30) },
    ]);
    render(<GamePage />);
    fireEvent.click(screen.getByText(/我的卡组/));
    expect(screen.queryByText("选择卡组")).not.toBeInTheDocument();
    expect(screen.getByText("结束回合")).toBeInTheDocument();
  });

  it("displays card count for each saved deck", () => {
    saveDeckToStorage([
      { id: "1", name: "测试卡组", cards: makeDeck(30) },
    ]);
    render(<GamePage />);
    expect(screen.getByText("(30张)")).toBeInTheDocument();
  });

  it("handles corrupted localStorage gracefully", () => {
    localStorage.setItem("sanguo-card-decks", "not-valid-json{{{");
    render(<GamePage />);
    expect(screen.getByText("选择卡组")).toBeInTheDocument();
    expect(screen.getByText("随机卡组")).toBeInTheDocument();
  });

  it("handles empty localStorage", () => {
    render(<GamePage />);
    expect(screen.getByText("随机卡组")).toBeInTheDocument();
    expect(screen.queryByText("已保存的卡组")).not.toBeInTheDocument();
  });

  it("filters out decks with missing required fields", () => {
    localStorage.setItem("sanguo-card-decks", JSON.stringify([
      { id: "1", name: "", cards: makeDeck(30) },
      { cards: makeDeck(30) },
      { id: "3", name: "有效卡组", cards: makeDeck(30) },
    ]));
    render(<GamePage />);
    expect(screen.getByText(/有效卡组/)).toBeInTheDocument();
  });
});
