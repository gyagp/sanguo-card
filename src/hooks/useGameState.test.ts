import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGameState } from "./useGameState";
import {
  Card,
  Deck,
  createDeck,
  GameState,
} from "../game/types";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    name: "Test Minion",
    cost: 1,
    attack: 2,
    health: 3,
    description: "",
    rarity: "common",
    type: "minion",
    faction: "neutral",
    ...overrides,
  };
}

function makeDeck(cardOverrides: Partial<Card> = {}): Deck {
  const cards: Card[] = [];
  for (let i = 0; i < 30; i++) {
    cards.push(makeCard({ name: `Card ${i}`, ...cardOverrides }));
  }
  return createDeck(cards);
}

describe("useGameState", () => {
  it("initializes a GameState from the engine", () => {
    const deck1 = makeDeck();
    const deck2 = makeDeck();
    const { result } = renderHook(() => useGameState(deck1, deck2));

    const gs = result.current.gameState;
    expect(gs).toBeDefined();
    expect(gs.players).toHaveLength(2);
    expect(gs.phase).toBe("playing");
    expect(gs.turn).toBe(1);
    expect(gs.activePlayer).toBe(0);
    // startTurn was called, so player should have mana
    expect(gs.players[0].hero.mana).toBeGreaterThan(0);
  });

  it("exposes playCard, attack, endTurn, useHeroPower actions", () => {
    const { result } = renderHook(() => useGameState(makeDeck(), makeDeck()));
    expect(typeof result.current.playCard).toBe("function");
    expect(typeof result.current.attack).toBe("function");
    expect(typeof result.current.endTurn).toBe("function");
    expect(typeof result.current.useHeroPower).toBe("function");
  });

  it("exposes attackHero action", () => {
    const { result } = renderHook(() => useGameState(makeDeck(), makeDeck()));
    expect(typeof result.current.attackHero).toBe("function");
  });

  it("exposes winner (null at start)", () => {
    const { result } = renderHook(() => useGameState(makeDeck(), makeDeck()));
    expect(result.current.winner).toBeNull();
  });

  it("playCard updates state on success", () => {
    const deck1 = makeDeck({ cost: 1 });
    const deck2 = makeDeck();
    const { result } = renderHook(() => useGameState(deck1, deck2));

    const handBefore = result.current.gameState.players[0].hand.length;
    const boardBefore = result.current.gameState.players[0].board.length;

    act(() => {
      result.current.playCard(0);
    });

    expect(result.current.gameState.players[0].hand.length).toBe(handBefore - 1);
    expect(result.current.gameState.players[0].board.length).toBe(boardBefore + 1);
  });

  it("playCard returns failure for insufficient mana", () => {
    const deck1 = makeDeck({ cost: 10 });
    const deck2 = makeDeck();
    const { result } = renderHook(() => useGameState(deck1, deck2));

    let playResult: ReturnType<typeof result.current.playCard>;
    act(() => {
      playResult = result.current.playCard(0);
    });

    expect(playResult!.success).toBe(false);
  });

  it("endTurn switches active player and re-renders", () => {
    const { result } = renderHook(() => useGameState(makeDeck(), makeDeck()));
    expect(result.current.gameState.activePlayer).toBe(0);

    act(() => {
      result.current.endTurn();
    });

    expect(result.current.gameState.activePlayer).toBe(1);
    expect(result.current.gameState.turn).toBe(2);
  });

  it("endTurn twice returns to original player on next turn", () => {
    const { result } = renderHook(() => useGameState(makeDeck(), makeDeck()));

    act(() => {
      result.current.endTurn();
    });
    act(() => {
      result.current.endTurn();
    });

    expect(result.current.gameState.activePlayer).toBe(0);
    expect(result.current.gameState.turn).toBe(3);
  });

  it("useHeroPower costs mana and cannot be used twice", () => {
    const deck1 = makeDeck({ cost: 1 });
    const deck2 = makeDeck();
    const { result } = renderHook(() => useGameState(deck1, deck2));

    // Need at least 2 mana - end turn twice to get turn 2
    act(() => { result.current.endTurn(); });
    act(() => { result.current.endTurn(); });

    const manaBefore = result.current.gameState.players[0].hero.mana;

    let r1: ReturnType<typeof result.current.useHeroPower>;
    act(() => {
      r1 = result.current.useHeroPower();
    });
    expect(r1!.success).toBe(true);
    expect(result.current.gameState.players[0].hero.mana).toBe(manaBefore - 2);

    let r2: ReturnType<typeof result.current.useHeroPower>;
    act(() => {
      r2 = result.current.useHeroPower();
    });
    expect(r2!.success).toBe(false);
  });

  it("state changes cause re-renders (reference changes)", () => {
    const { result } = renderHook(() => useGameState(makeDeck(), makeDeck()));
    const stateBefore = result.current.gameState;

    act(() => {
      result.current.endTurn();
    });

    expect(result.current.gameState).not.toBe(stateBefore);
  });

  it("failed actions do not change state reference", () => {
    const deck1 = makeDeck({ cost: 10 });
    const { result } = renderHook(() => useGameState(deck1, makeDeck()));
    const stateBefore = result.current.gameState;

    act(() => {
      result.current.playCard(0);
    });

    expect(result.current.gameState).toBe(stateBefore);
  });
});
