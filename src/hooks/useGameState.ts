"use client";

import { useState, useCallback } from "react";
import {
  GameState,
  Deck,
  initializeGame,
  startTurn,
  endTurn as engineEndTurn,
  playCard as enginePlayCard,
  attackMinion as engineAttackMinion,
  attackHero as engineAttackHero,
  useHeroPower as engineUseHeroPower,
  checkWinCondition,
  PlayCardResult,
  AttackResult,
  HeroPowerResult,
} from "../game/types";

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}

export function useGameState(deck1: Deck, deck2: Deck) {
  const [gameState, setGameState] = useState<GameState>(() => {
    const state = initializeGame(deck1, deck2);
    startTurn(state);
    return state;
  });

  const winner = checkWinCondition(gameState);

  const playCard = useCallback((handIndex: number): PlayCardResult => {
    const next = cloneState(gameState);
    const result = enginePlayCard(next, handIndex);
    if (result.success) setGameState(next);
    return result;
  }, [gameState]);

  const attackMinionAction = useCallback(
    (attackerIndex: number, defenderIndex: number): AttackResult => {
      const next = cloneState(gameState);
      const result = engineAttackMinion(next, attackerIndex, defenderIndex);
      if (result.success) setGameState(next);
      return result;
    },
    [gameState],
  );

  const attackHeroAction = useCallback(
    (attackerIndex: number): AttackResult => {
      const next = cloneState(gameState);
      const result = engineAttackHero(next, attackerIndex);
      if (result.success) setGameState(next);
      return result;
    },
    [gameState],
  );

  const endTurn = useCallback((): void => {
    const next = cloneState(gameState);
    engineEndTurn(next);
    startTurn(next);
    setGameState(next);
  }, [gameState]);

  const heroPower = useCallback((): HeroPowerResult => {
    const next = cloneState(gameState);
    const result = engineUseHeroPower(next);
    if (result.success) setGameState(next);
    return result;
  }, [gameState]);

  return {
    gameState,
    winner,
    playCard,
    attack: attackMinionAction,
    attackHero: attackHeroAction,
    endTurn,
    useHeroPower: heroPower,
  };
}
