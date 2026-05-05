import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGameState } from "../../hooks/useGameState";
import {
  Card,
  Deck,
  createDeck,
  attackMinion,
  attackHero,
  checkWinCondition,
  initializeGame,
  startTurn,
  playCard,
  endTurn,
  GameState,
  BoardMinion,
} from "../../game/types";

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

function placeMinion(
  state: GameState,
  playerIdx: 0 | 1,
  overrides: Partial<BoardMinion> = {}
): BoardMinion {
  const minion: BoardMinion = {
    name: "Placed",
    cost: 1,
    attack: 2,
    health: 3,
    description: "",
    rarity: "common",
    type: "minion",
    faction: "neutral",
    currentAttack: 2,
    currentHealth: 3,
    summoningSickness: false,
    hasAttacked: false,
    hasDivineShield: false,
    isStealth: false,
    isFrozen: false,
    freezeTurnsLeft: 0,
    isImmune: false,
    windfuryAttacksLeft: 1,
    enrageActive: false,
    enrageBonus: 0, factionAttackBonus: 0, factionHealthBonus: 0, shuAdjacencyAtkBonus: 0, shuAdjacencyHpBonus: 0, brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0, wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0,
    ...overrides,
  };
  state.players[playerIdx].board.push(minion);
  return minion;
}

describe("attackMinion engine", () => {
  it("deals mutual damage and marks attacker as attacked", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.activePlayer = 0;
    placeMinion(state, 0, { currentAttack: 3, currentHealth: 5 });
    placeMinion(state, 1, { currentAttack: 2, currentHealth: 4 });

    const result = attackMinion(state, 0, 0);
    expect(result.success).toBe(true);
    expect(state.players[0].board[0].currentHealth).toBe(3); // 5 - 2
    expect(state.players[1].board[0].currentHealth).toBe(1); // 4 - 3
    expect(state.players[0].board[0].hasAttacked).toBe(true);
  });

  it("removes dead minions after combat", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.activePlayer = 0;
    placeMinion(state, 0, { currentAttack: 5, currentHealth: 5 });
    placeMinion(state, 1, { currentAttack: 2, currentHealth: 3 });

    attackMinion(state, 0, 0);
    expect(state.players[1].board.length).toBe(0);
    expect(state.players[0].board.length).toBe(1);
  });

  it("both minions can die in mutual kill", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.activePlayer = 0;
    placeMinion(state, 0, { currentAttack: 3, currentHealth: 2 });
    placeMinion(state, 1, { currentAttack: 2, currentHealth: 3 });

    attackMinion(state, 0, 0);
    expect(state.players[0].board.length).toBe(0);
    expect(state.players[1].board.length).toBe(0);
  });

  it("rejects attack from minion with summoning sickness", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.activePlayer = 0;
    placeMinion(state, 0, { summoningSickness: true });
    placeMinion(state, 1);

    const result = attackMinion(state, 0, 0);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/summoning sickness/i);
  });

  it("rejects attack from minion that already attacked", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.activePlayer = 0;
    placeMinion(state, 0, { hasAttacked: true });
    placeMinion(state, 1);

    const result = attackMinion(state, 0, 0);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already attacked/i);
  });

  it("rejects invalid attacker index", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.activePlayer = 0;
    placeMinion(state, 1);

    const result = attackMinion(state, 0, 0);
    expect(result.success).toBe(false);
  });
});

describe("attackHero engine", () => {
  it("deals damage to enemy hero", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.activePlayer = 0;
    placeMinion(state, 0, { currentAttack: 5 });

    const hpBefore = state.players[1].hero.health;
    const result = attackHero(state, 0);
    expect(result.success).toBe(true);
    expect(state.players[1].hero.health).toBe(hpBefore - 5);
    expect(state.players[0].board[0].hasAttacked).toBe(true);
  });

  it("triggers win condition when hero dies", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.activePlayer = 0;
    placeMinion(state, 0, { currentAttack: 30 });
    state.players[1].hero.health = 5;

    attackHero(state, 0);
    expect(checkWinCondition(state)).toBe(0);
    expect(state.phase).toBe("ended");
  });

  it("rejects attack from minion with 0 attack", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.activePlayer = 0;
    placeMinion(state, 0, { currentAttack: 0 });

    const result = attackHero(state, 0);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/0 attack/i);
  });
});

describe("checkWinCondition draw handling", () => {
  it("returns draw when both heroes are dead", () => {
    const state = initializeGame(makeDeck(), makeDeck());
    state.players[0].hero.health = 0;
    state.players[1].hero.health = 0;
    expect(checkWinCondition(state)).toBe("draw");
  });
});

describe("useGameState attack integration", () => {
  it("attack updates board state via hook", () => {
    const deck1 = makeDeck({ cost: 1 });
    const deck2 = makeDeck({ cost: 1 });
    const { result } = renderHook(() => useGameState(deck1, deck2));

    // Play a minion for player 0
    act(() => { result.current.playCard(0); });
    // End turn to player 1
    act(() => { result.current.endTurn(); });
    // Play a minion for player 1
    act(() => { result.current.playCard(0); });
    // End turn back to player 0 (removes summoning sickness)
    act(() => { result.current.endTurn(); });

    const p0BoardBefore = result.current.gameState.players[0].board.length;
    const p1BoardBefore = result.current.gameState.players[1].board.length;
    expect(p0BoardBefore).toBeGreaterThanOrEqual(1);
    expect(p1BoardBefore).toBeGreaterThanOrEqual(1);

    // Attack enemy minion
    let attackResult: ReturnType<typeof result.current.attack>;
    act(() => {
      attackResult = result.current.attack(0, 0);
    });
    expect(attackResult!.success).toBe(true);
  });

  it("attackHero deals damage to opponent hero via hook", () => {
    const deck1 = makeDeck({ cost: 1 });
    const deck2 = makeDeck({ cost: 1 });
    const { result } = renderHook(() => useGameState(deck1, deck2));

    // Play a minion
    act(() => { result.current.playCard(0); });
    // End turn twice to clear summoning sickness
    act(() => { result.current.endTurn(); });
    act(() => { result.current.endTurn(); });

    const hpBefore = result.current.gameState.players[1].hero.health;

    let attackResult: ReturnType<typeof result.current.attackHero>;
    act(() => {
      attackResult = result.current.attackHero(0);
    });
    expect(attackResult!.success).toBe(true);
    expect(result.current.gameState.players[1].hero.health).toBeLessThan(hpBefore);
  });
});
