"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
import { AIDifficulty, createAI, AIDecision } from "../game/ai";

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}

function collectAIDecisions(state: GameState, difficulty: AIDifficulty): AIDecision[] {
  const ai = createAI(difficulty);
  const decisions: AIDecision[] = [];

  const sim = cloneState(state);

  if (ai.shouldUseHeroPower(sim)) {
    decisions.push({ type: 'useHeroPower' });
    engineUseHeroPower(sim);
  }

  const playDecisions = ai.getPlayDecisions(sim);
  const sortedPlays = [...playDecisions].sort((a, b) => b.cardIndex - a.cardIndex);
  for (const play of sortedPlays) {
    decisions.push(play);
    enginePlayCard(sim, play.cardIndex);
  }

  const attackDecisions = ai.getAttackDecisions(sim);
  decisions.push(...attackDecisions);

  decisions.push({ type: 'endTurn' });
  return decisions;
}

function executeAIDecision(state: GameState, decision: AIDecision): GameState {
  const next = cloneState(state);
  switch (decision.type) {
    case 'playCard':
      enginePlayCard(next, decision.cardIndex);
      break;
    case 'attack':
      if (decision.targetIndex === 'hero') {
        engineAttackHero(next, decision.attackerIndex);
      } else {
        engineAttackMinion(next, decision.attackerIndex, decision.targetIndex);
      }
      break;
    case 'useHeroPower':
      engineUseHeroPower(next);
      break;
    case 'endTurn':
      engineEndTurn(next);
      startTurn(next);
      break;
  }
  return next;
}

export function useGameState(deck1: Deck, deck2: Deck, aiDifficulty?: AIDifficulty) {
  const [gameState, setGameState] = useState<GameState>(() => {
    const state = initializeGame(deck1, deck2);
    startTurn(state);
    return state;
  });
  const [isOpponentTurn, setIsOpponentTurn] = useState(false);
  const aiTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const winner = checkWinCondition(gameState);

  const clearAITimers = useCallback(() => {
    for (const timer of aiTimersRef.current) {
      clearTimeout(timer);
    }
    aiTimersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearAITimers();
  }, [clearAITimers]);

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
    setIsOpponentTurn(true);

    clearAITimers();

    if (aiDifficulty) {
      const decisions = collectAIDecisions(next, aiDifficulty);
      const actionDecisions = decisions.filter(d => d.type !== 'endTurn');
      // 2s budget: 200ms initial pause, up to 1800ms for actions, 200ms before endTurn
      const delayPerAction = actionDecisions.length > 0
        ? Math.max(1, Math.min(300, Math.floor(1800 / actionDecisions.length)))
        : 0;

      const stateSnapshots: GameState[] = [];
      let cumulativeState = next;
      for (const decision of decisions) {
        cumulativeState = executeAIDecision(cumulativeState, decision);
        stateSnapshots.push(cumulativeState);
      }

      let actionIndex = 0;
      for (let i = 0; i < decisions.length; i++) {
        const isEndTurn = decisions[i].type === 'endTurn';
        const delay = isEndTurn
          ? (actionDecisions.length > 0 ? 200 + (actionDecisions.length * delayPerAction) + 200 : 500)
          : 200 + (actionIndex * delayPerAction);

        if (!isEndTurn) actionIndex++;

        const snapshot = stateSnapshots[i];
        const timer = setTimeout(() => {
          setGameState(snapshot);
          if (isEndTurn) {
            setIsOpponentTurn(false);
          }
        }, delay);
        aiTimersRef.current.push(timer);
      }
    } else {
      const timer = setTimeout(() => {
        setGameState((prev) => {
          const next = cloneState(prev);
          engineEndTurn(next);
          startTurn(next);
          return next;
        });
        setIsOpponentTurn(false);
      }, 2000);
      aiTimersRef.current.push(timer);
    }
  }, [gameState, aiDifficulty, clearAITimers]);

  const heroPower = useCallback((): HeroPowerResult => {
    const next = cloneState(gameState);
    const result = engineUseHeroPower(next);
    if (result.success) setGameState(next);
    return result;
  }, [gameState]);

  const resetGame = useCallback(() => {
    clearAITimers();
    const state = initializeGame(deck1, deck2);
    startTurn(state);
    setGameState(state);
    setIsOpponentTurn(false);
  }, [deck1, deck2, clearAITimers]);

  return {
    gameState,
    winner,
    isOpponentTurn,
    playCard,
    attack: attackMinionAction,
    attackHero: attackHeroAction,
    endTurn,
    useHeroPower: heroPower,
    resetGame,
  };
}
