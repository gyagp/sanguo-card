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
  Lane,
  TerrainEffect,
} from "../game/types";
import { AIDifficulty, createAI, AIDecision, AIStrategy } from "../game/ai";
import { BossAI } from "../game/boss-ai";
import { getHeroPowerForPlayer, FACTION_HERO_POWERS, UPGRADED_FACTION_HERO_POWERS } from "../game/hero-powers";

export interface BossHeroPowerOverride {
  name: string;
  cost: number;
  description: string;
}

export interface BossInitConfig {
  bossHp?: number;
  startingMinion?: { name: string; attack: number; health: number; faction?: string };
  spellDiscount?: number;
  terrain?: Partial<Record<Lane, TerrainEffect>>;
}

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}

function collectAIDecisions(state: GameState, difficulty: AIDifficulty, bossAI?: BossAI): AIDecision[] {
  const ai: AIStrategy = bossAI ?? createAI(difficulty);
  const decisions: AIDecision[] = [];

  const sim = cloneState(state);

  if (bossAI) {
    bossAI.applyTurnStartEffect(sim);
  }

  if (ai.shouldUseHeroPower(sim)) {
    decisions.push({ type: 'useHeroPower' });
    engineUseHeroPower(sim, { base: FACTION_HERO_POWERS, upgraded: UPGRADED_FACTION_HERO_POWERS });
  }

  const playDecisions = ai.getPlayDecisions(sim);
  const sortedPlays = [...playDecisions].sort((a, b) => b.cardIndex - a.cardIndex);
  for (const play of sortedPlays) {
    decisions.push(play);
    enginePlayCard(sim, play.cardIndex, play.spellTarget, undefined, play.lane, play.slotIndex, play.targetLane);
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
      enginePlayCard(next, decision.cardIndex, decision.spellTarget, undefined, decision.lane, decision.slotIndex, decision.targetLane);
      break;
    case 'attack':
      if (decision.targetIndex === 'hero') {
        engineAttackHero(next, decision.attackerIndex);
      } else {
        engineAttackMinion(next, decision.attackerIndex, decision.targetIndex);
      }
      break;
    case 'useHeroPower':
      engineUseHeroPower(next, { base: FACTION_HERO_POWERS, upgraded: UPGRADED_FACTION_HERO_POWERS });
      break;
    case 'endTurn':
      engineEndTurn(next);
      startTurn(next);
      break;
  }
  return next;
}

export function useGameState(deck1: Deck, deck2: Deck, aiDifficulty?: AIDifficulty, bossAI?: BossAI, extraMana?: number, bossHeroPower?: BossHeroPowerOverride, bossInit?: BossInitConfig) {
  const [gameState, setGameState] = useState<GameState>(() => {
    const state = initializeGame(deck1, deck2, getHeroPowerForPlayer);
    if (bossHeroPower) {
      state.players[1].hero.heroPower = {
        ...state.players[1].hero.heroPower,
        name: bossHeroPower.name,
        cost: bossHeroPower.cost,
        description: bossHeroPower.description,
      };
    }
    if (bossInit?.bossHp) {
      state.players[1].hero.health = bossInit.bossHp;
    }
    if (bossInit?.startingMinion) {
      const m = bossInit.startingMinion;
      state.players[1].board.push({
        name: m.name, cost: 0, attack: m.attack, health: m.health, description: "",
        rarity: "common" as const, type: "minion" as const, faction: (m.faction ?? "neutral") as "neutral",
        currentAttack: m.attack, currentHealth: m.health,
        summoningSickness: false, hasAttacked: false, hasDivineShield: false,
        isStealth: false, isFrozen: false, freezeTurnsLeft: 0, isImmune: false,
        windfuryAttacksLeft: 1, enrageActive: false, enrageBonus: 0,
        factionAttackBonus: 0, factionHealthBonus: 0,
        formationAtkBonus: 0, formationHpBonus: 0,
        brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0,
        wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0, qunDebuff: 0, heroSkillCooldownLeft: 0, heroSkillAtkBonus: 0, heroSkillHpBonus: 0,
        lane: Lane.Center, slotIndex: 0,
      });
    }
    if (bossInit?.spellDiscount) {
      const discount = bossInit.spellDiscount;
      for (const card of state.players[1].hand) {
        if (card.type === "spell") card.cost = Math.max(0, card.cost - discount);
      }
      const deck = state.players[1].deck as unknown as import("../game/types").Card[];
      for (const card of deck) {
        if (card.type === "spell") card.cost = Math.max(0, card.cost - discount);
      }
    }
    if (bossInit?.terrain) {
      for (const [lane, effect] of Object.entries(bossInit.terrain)) {
        state.terrain[lane as Lane] = effect;
      }
    }
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

  const playCard = useCallback((handIndex: number, targetIndex?: number, lane?: Lane, targetLane?: Lane): PlayCardResult => {
    const next = cloneState(gameState);
    const result = enginePlayCard(next, handIndex, targetIndex, undefined, lane, undefined, targetLane);
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

    if (bossAI) {
      bossAI.applyTurnStartEffect(next);
    }

    if (extraMana && extraMana > 0) {
      next.players[1].hero.mana = Math.min(10, next.players[1].hero.mana + extraMana);
    }

    setGameState(next);
    setIsOpponentTurn(true);

    clearAITimers();

    if (aiDifficulty) {
      const decisions = collectAIDecisions(next, aiDifficulty, bossAI);
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
  }, [gameState, aiDifficulty, bossAI, extraMana, clearAITimers]);

  const heroPower = useCallback((): HeroPowerResult => {
    const next = cloneState(gameState);
    const result = engineUseHeroPower(next, { base: FACTION_HERO_POWERS, upgraded: UPGRADED_FACTION_HERO_POWERS });
    if (result.success) setGameState(next);
    return result;
  }, [gameState]);

  const resetGame = useCallback(() => {
    clearAITimers();
    const state = initializeGame(deck1, deck2, getHeroPowerForPlayer);
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
