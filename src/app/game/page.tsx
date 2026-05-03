"use client";

import { useGameState } from "../../hooks/useGameState";
import Card from "../../components/Card";
import { cards } from "../../game/cards";
import { createDeck, BoardMinion, PlayerState, Card as CardType, MAX_BOARD_SIZE } from "../../game/types";
import { useMemo, useState, useEffect, useRef, useCallback, forwardRef } from "react";

type AnimKind = "popIn" | "lunge" | "shake" | "death";

interface Particle { px: number; py: number; color: string; }

const PARTICLE_COLORS = ["#ff6b35", "#ffd700", "#ff4444", "#ffaa00", "#ffffff"];

function makeParticles(): Particle[] {
  return Array.from({ length: 8 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 18 + Math.random() * 20;
    return {
      px: Math.cos(angle) * dist,
      py: Math.sin(angle) * dist,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    };
  });
}

function ImpactBurst({ particles }: { particles: Particle[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2"
          style={{
            width: 6, height: 6, borderRadius: "50%",
            backgroundColor: p.color,
            marginLeft: -3, marginTop: -3,
            animation: "impactParticle 0.4s ease-out forwards",
            "--px": `${p.px}px`, "--py": `${p.py}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

interface DyingMinion {
  minion: BoardMinion;
  boardIndex: number;
  side: "player" | "enemy";
  expiry: number;
}

function buildDeck(): CardType[] {
  const pool = [...cards];
  const deck: CardType[] = [];
  while (deck.length < 30) {
    deck.push(pool[deck.length % pool.length]);
  }
  return deck;
}

function ManaBar({ mana, maxMana }: { mana: number; maxMana: number }) {
  if (maxMana === 0) return null;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: maxMana }, (_, i) => (
        <span
          key={i}
          className={`w-3 h-3 rounded-full ${i < mana ? "bg-blue-500" : "bg-gray-600"}`}
        />
      ))}
    </div>
  );
}

function HeroPortrait({ player, onClick, targetable }: { player: PlayerState; onClick?: () => void; targetable?: boolean }) {
  const borderClass = targetable ? "border-red-400 ring-2 ring-red-400" : "border-amber-500";
  const cursor = onClick ? "cursor-pointer" : "";
  return (
    <div className={`flex items-center gap-3 px-4 py-2 ${cursor}`} onClick={(e) => { if (onClick) { e.stopPropagation(); onClick(); } }}>
      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-700 border-2 ${borderClass} flex items-center justify-center text-lg font-bold text-white`}>
        ⚔
      </div>
      <div className="flex flex-col gap-1 text-white text-sm">
        <div className="flex items-center gap-1">
          <span className="text-red-400 font-bold">❤ {player.hero.health}</span>
          <span className="text-blue-400 font-bold ml-2">💧 {player.hero.mana}/{player.maxMana}</span>
        </div>
        <ManaBar mana={player.hero.mana} maxMana={player.maxMana} />
      </div>
    </div>
  );
}

function BoardMinionCard({ minion, onClick, selected, exhausted, targetable, animation, damageNumber, dying, impactParticles }: {
  minion: BoardMinion;
  onClick?: () => void;
  selected?: boolean;
  exhausted?: boolean;
  targetable?: boolean;
  animation?: AnimKind;
  damageNumber?: number | null;
  dying?: boolean;
  impactParticles?: Particle[] | null;
}) {
  const borderColor = selected
    ? "border-yellow-300 ring-2 ring-yellow-400"
    : targetable
      ? "border-red-400 hover:border-red-300"
      : "border-amber-600 hover:border-yellow-400";
  const opacity = exhausted ? "opacity-50" : "";
  const cursor = dying ? "pointer-events-none" : exhausted ? "cursor-not-allowed" : "cursor-pointer";

  const animStyle: React.CSSProperties = {};
  if (dying) Object.assign(animStyle, { animation: "fadeOutDeath 0.5s ease-in forwards" });
  else if (animation === "popIn") Object.assign(animStyle, { animation: "popIn 0.4s ease-out forwards" });
  else if (animation === "lunge") Object.assign(animStyle, { animation: "lunge 0.3s ease-in-out" });
  else if (animation === "shake") Object.assign(animStyle, { animation: "shake 0.3s ease-in-out" });

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={`relative w-20 h-28 sm:w-24 sm:h-32 bg-amber-900 border-2 ${borderColor} rounded-lg flex flex-col items-center justify-between p-1 text-white text-xs sm:text-sm shadow-md transition-colors ${cursor} ${opacity}`}
      style={animStyle}
    >
      <span className="bg-blue-700 rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px]">
        {minion.cost}
      </span>
      <span className="font-bold text-center leading-tight">{minion.name}</span>
      <div className="flex w-full justify-between px-1">
        <span className="bg-yellow-600 rounded px-1 font-bold">{minion.currentAttack}</span>
        <span className="bg-red-700 rounded px-1 font-bold">{minion.currentHealth}</span>
      </div>
      {damageNumber != null && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-2xl font-black text-red-400 drop-shadow-lg" style={{ animation: "floatDamage 0.8s ease-out forwards" }}>
            -{damageNumber}
          </span>
        </div>
      )}
      {impactParticles && <ImpactBurst particles={impactParticles} />}
    </div>
  );
}

const BoardZone = forwardRef<HTMLDivElement, {
  minions: BoardMinion[];
  label: string;
  onDrop?: (handIndex: number) => void;
  onMinionClick?: (index: number) => void;
  selectedIndex?: number | null;
  isEnemy?: boolean;
  hasAttackerSelected?: boolean;
  animations?: Map<number, AnimKind>;
  damageNumbers?: Map<number, number>;
  dyingMinions?: DyingMinion[];
  impactParticles?: Map<number, Particle[]>;
}>(function BoardZone({ minions, label, onDrop, onMinionClick, selectedIndex, isEnemy, hasAttackerSelected, animations, damageNumbers, dyingMinions, impactParticles }, ref) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (!onDrop) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!onDrop) return;
    const handIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (!isNaN(handIndex)) onDrop(handIndex);
  };

  return (
    <div
      ref={ref}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 flex items-center justify-center gap-2 min-h-[7rem] sm:min-h-[9rem] rounded-lg transition-colors ${
        dragOver ? "bg-green-800/40 border-2 border-dashed border-green-400" : "border-2 border-transparent"
      }`}
    >
      {minions.length === 0 && (!dyingMinions || dyingMinions.length === 0) ? (
        <span className="text-gray-500 text-sm italic">{label}</span>
      ) : (
        (() => {
          const slots: React.ReactNode[] = [];
          const dyingByIndex = new Map<number, DyingMinion[]>();
          dyingMinions?.forEach(dm => {
            const arr = dyingByIndex.get(dm.boardIndex) ?? [];
            arr.push(dm);
            dyingByIndex.set(dm.boardIndex, arr);
          });
          let liveIdx = 0;
          const totalSlots = minions.length + (dyingMinions?.length ?? 0);
          for (let slot = 0; slot < totalSlots; slot++) {
            const dying = dyingByIndex.get(slot);
            if (dying) {
              dying.forEach((dm, di) => {
                slots.push(
                  <BoardMinionCard key={`dying-${dm.boardIndex}-${di}`} minion={dm.minion} dying />
                );
              });
              dyingByIndex.delete(slot);
            } else if (liveIdx < minions.length) {
              const i = liveIdx++;
              slots.push(
                <BoardMinionCard
                  key={`live-${i}`}
                  minion={minions[i]}
                  onClick={() => onMinionClick?.(i)}
                  selected={!isEnemy && selectedIndex === i}
                  exhausted={!isEnemy && (minions[i].hasAttacked || minions[i].summoningSickness)}
                  targetable={isEnemy && !!hasAttackerSelected}
                  animation={animations?.get(i)}
                  damageNumber={damageNumbers?.get(i) ?? null}
                  impactParticles={impactParticles?.get(i) ?? null}
                />
              );
            }
          }
          while (liveIdx < minions.length) {
            const i = liveIdx++;
            slots.push(
              <BoardMinionCard
                key={`live-${i}`}
                minion={minions[i]}
                onClick={() => onMinionClick?.(i)}
                selected={!isEnemy && selectedIndex === i}
                exhausted={!isEnemy && (minions[i].hasAttacked || minions[i].summoningSickness)}
                targetable={isEnemy && !!hasAttackerSelected}
                animation={animations?.get(i)}
                damageNumber={damageNumbers?.get(i) ?? null}
                impactParticles={impactParticles?.get(i) ?? null}
              />
            );
          }
          dyingByIndex.forEach((dms, idx) => {
            dms.forEach((dm, di) => {
              slots.push(
                <BoardMinionCard key={`dying-${idx}-${di}`} minion={dm.minion} dying />
              );
            });
          });
          return slots;
        })()
      )}
    </div>
  );
});

export default function GamePage() {
  const [deck1, deck2] = useMemo(() => {
    return [createDeck(buildDeck()), createDeck(buildDeck())];
  }, []);

  const { gameState, winner, playCard, endTurn, attack, attackHero, useHeroPower, isOpponentTurn } = useGameState(deck1, deck2);

  const [selectedAttacker, setSelectedAttacker] = useState<number | null>(null);

  const [playerAnims, setPlayerAnims] = useState<Map<number, AnimKind>>(new Map());
  const [enemyAnims, setEnemyAnims] = useState<Map<number, AnimKind>>(new Map());
  const [playerDmg, setPlayerDmg] = useState<Map<number, number>>(new Map());
  const [enemyDmg, setEnemyDmg] = useState<Map<number, number>>(new Map());
  const [heroDmg, setHeroDmg] = useState<number | null>(null);
  const [dyingMinions, setDyingMinions] = useState<DyingMinion[]>([]);
  const [enemyImpacts, setEnemyImpacts] = useState<Map<number, Particle[]>>(new Map());
  const [heroImpact, setHeroImpact] = useState<Particle[] | null>(null);

  interface FlyingCard { card: CardType; startRect: DOMRect; key: number; }
  const [flyingCards, setFlyingCards] = useState<FlyingCard[]>([]);
  const flyKeyRef = useRef(0);
  const boardZoneRef = useRef<HTMLDivElement>(null);

  const handCardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const timeoutIds = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    return () => {
      timeoutIds.current.forEach(id => clearTimeout(id));
    };
  }, []);

  const safeTimeout = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(() => {
      timeoutIds.current.delete(id);
      fn();
    }, delay);
    timeoutIds.current.add(id);
  }, []);

  const prevPlayerBoardLen = useRef(gameState.players[0].board.length);
  const prevEnemyBoardLen = useRef(gameState.players[1].board.length);

  const triggerAnim = useCallback((setter: typeof setPlayerAnims, index: number, kind: AnimKind, duration: number) => {
    setter(prev => new Map(prev).set(index, kind));
    safeTimeout(() => setter(prev => { const m = new Map(prev); m.delete(index); return m; }), duration);
  }, [safeTimeout]);

  const triggerDmg = useCallback((setter: typeof setPlayerDmg, index: number, amount: number) => {
    setter(prev => new Map(prev).set(index, amount));
    safeTimeout(() => setter(prev => { const m = new Map(prev); m.delete(index); return m; }), 800);
  }, [safeTimeout]);

  const triggerImpact = useCallback((index: number) => {
    const particles = makeParticles();
    setEnemyImpacts(prev => new Map(prev).set(index, particles));
    safeTimeout(() => setEnemyImpacts(prev => { const m = new Map(prev); m.delete(index); return m; }), 400);
  }, [safeTimeout]);

  const triggerHeroImpact = useCallback(() => {
    const particles = makeParticles();
    setHeroImpact(particles);
    safeTimeout(() => setHeroImpact(null), 400);
  }, [safeTimeout]);

  const addDyingMinion = useCallback((minion: BoardMinion, boardIndex: number, side: "player" | "enemy") => {
    const dm: DyingMinion = { minion: { ...minion }, boardIndex, side, expiry: Date.now() + 500 };
    setDyingMinions(prev => [...prev, dm]);
    safeTimeout(() => {
      setDyingMinions(prev => prev.filter(d => d !== dm));
    }, 500);
  }, [safeTimeout]);

  const player = gameState.players[0];
  const opponent = gameState.players[1];

  const handlePlayCard = useCallback((handIndex: number, cardEl?: HTMLElement | null) => {
    const card = player.hand[handIndex];
    if (!card) return;
    const el = cardEl ?? handCardRefs.current.get(handIndex);
    const startRect = el?.getBoundingClientRect();
    const result = playCard(handIndex);
    if (result.success && startRect) {
      const key = flyKeyRef.current++;
      setFlyingCards(prev => [...prev, { card, startRect, key }]);
      safeTimeout(() => setFlyingCards(prev => prev.filter(f => f.key !== key)), 500);
    }
  }, [player.hand, playCard, safeTimeout]);

  useEffect(() => {
    const newLen = player.board.length;
    if (newLen > prevPlayerBoardLen.current) {
      triggerAnim(setPlayerAnims, newLen - 1, "popIn", 400);
    }
    prevPlayerBoardLen.current = newLen;
  }, [player.board.length, triggerAnim]);

  useEffect(() => {
    const newLen = opponent.board.length;
    if (newLen > prevEnemyBoardLen.current) {
      triggerAnim(setEnemyAnims, newLen - 1, "popIn", 400);
    }
    prevEnemyBoardLen.current = newLen;
  }, [opponent.board.length, triggerAnim]);

  const handleFriendlyMinionClick = (index: number) => {
    if (winner !== null) return;
    if (isOpponentTurn) return;
    if (gameState.activePlayer !== 0) return;
    const minion = player.board[index];
    if (minion.hasAttacked || minion.summoningSickness) return;
    setSelectedAttacker(selectedAttacker === index ? null : index);
  };

  const handleEnemyMinionClick = (index: number) => {
    if (selectedAttacker === null) return;
    const attackerIdx = selectedAttacker;

    // Snapshot stats before attack() mutates state via clone
    const attackerAtk = player.board[attackerIdx]?.currentAttack ?? 0;
    const defenderAtk = opponent.board[index]?.currentAttack ?? 0;
    const defenderHealth = opponent.board[index]?.currentHealth ?? 0;
    const attackerHealth = player.board[attackerIdx]?.currentHealth ?? 0;
    const attackerMinion = player.board[attackerIdx];
    const defenderMinion = opponent.board[index];

    const result = attack(attackerIdx, index);
    setSelectedAttacker(null);

    if (result.success) {
      triggerAnim(setPlayerAnims, attackerIdx, "lunge", 300);
      safeTimeout(() => triggerAnim(setEnemyAnims, index, "shake", 300), 150);
      safeTimeout(() => triggerImpact(index), 150);

      if (attackerAtk > 0) {
        safeTimeout(() => triggerDmg(setEnemyDmg, index, attackerAtk), 150);
      }
      if (defenderAtk > 0) {
        triggerDmg(setPlayerDmg, attackerIdx, defenderAtk);
      }

      if (defenderMinion && defenderHealth - attackerAtk <= 0) {
        safeTimeout(() => addDyingMinion(defenderMinion, index, "enemy"), 350);
      }
      if (attackerMinion && attackerHealth - defenderAtk <= 0) {
        safeTimeout(() => addDyingMinion(attackerMinion, attackerIdx, "player"), 350);
      }
    }
  };

  const handleEnemyHeroClick = () => {
    if (selectedAttacker === null) return;
    const attackerIdx = selectedAttacker;
    const attackerAtk = player.board[attackerIdx]?.currentAttack ?? 0;

    const result = attackHero(attackerIdx);
    setSelectedAttacker(null);

    if (result.success) {
      triggerAnim(setPlayerAnims, attackerIdx, "lunge", 300);
      safeTimeout(() => triggerHeroImpact(), 150);

      if (attackerAtk > 0) {
        safeTimeout(() => {
          setHeroDmg(attackerAtk);
          safeTimeout(() => setHeroDmg(null), 800);
        }, 150);
      }
    }
  };

  const handleBoardClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setSelectedAttacker(null);
  };

  const playerDying = dyingMinions.filter(d => d.side === "player");
  const enemyDying = dyingMinions.filter(d => d.side === "enemy");

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 select-none" onClick={handleBoardClick}>
      {/* Winner banner */}
      {winner !== null && (
        <div className="absolute inset-0 z-50 bg-black/70 flex items-center justify-center">
          <span className="text-4xl font-bold text-yellow-400">
            {winner === "draw" ? "平局!" : `玩家 ${winner + 1} 获胜!`}
          </span>
        </div>
      )}

      {/* Opponent hero */}
      <div className="relative">
        <HeroPortrait player={opponent} onClick={handleEnemyHeroClick} targetable={selectedAttacker !== null} />
        {heroDmg != null && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-3xl font-black text-red-400 drop-shadow-lg" style={{ animation: "floatDamage 0.8s ease-out forwards" }}>
              -{heroDmg}
            </span>
          </div>
        )}
        {heroImpact && <ImpactBurst particles={heroImpact} />}
      </div>

      {/* Opponent hand (face down) */}
      <div className="flex items-center justify-center gap-2 py-1 min-h-[5rem]" onClick={handleBoardClick}>
        {opponent.hand.map((_, i) => (
          <div
            key={i}
            className="w-14 h-20 sm:w-16 sm:h-24 bg-red-900 border-2 border-red-700 rounded-lg shadow-md"
          />
        ))}
      </div>

      {/* Opponent board */}
      <BoardZone minions={opponent.board} label="对方战场" isEnemy hasAttackerSelected={selectedAttacker !== null} onMinionClick={handleEnemyMinionClick} animations={enemyAnims} damageNumbers={enemyDmg} dyingMinions={enemyDying} impactParticles={enemyImpacts} />

      {/* Turn indicator */}
      <div className="flex items-center justify-center py-0.5">
        <span className={`text-sm font-bold px-3 py-0.5 rounded-full ${isOpponentTurn ? "bg-red-700 text-red-200" : "bg-green-700 text-green-200"}`}>
          {isOpponentTurn ? "对手回合" : "你的回合"}
        </span>
      </div>

      {/* Divider + End Turn */}
      <div className="flex items-center justify-center py-1">
        <div className="h-px flex-1 bg-amber-700/50" />
        <button
          onClick={() => { endTurn(); setSelectedAttacker(null); }}
          disabled={isOpponentTurn || winner !== null}
          className={`mx-4 px-6 py-2 font-bold rounded-lg shadow-lg transition-colors ${
            isOpponentTurn || winner !== null
              ? "bg-gray-600 text-gray-400 cursor-not-allowed"
              : "bg-amber-700 hover:bg-amber-600 text-white"
          }`}
        >
          结束回合
        </button>
        <div className="h-px flex-1 bg-amber-700/50" />
      </div>

      {/* Turn timer bar */}
      {isOpponentTurn && (
        <div className="w-full h-1 bg-gray-700 overflow-hidden">
          <div className="h-full bg-red-500 animate-[shrink_2s_linear_forwards]" />
        </div>
      )}

      {/* Player board */}
      <BoardZone ref={boardZoneRef} minions={player.board} label="我方战场" onDrop={(i) => handlePlayCard(i)} onMinionClick={handleFriendlyMinionClick} selectedIndex={selectedAttacker} animations={playerAnims} damageNumbers={playerDmg} dyingMinions={playerDying} />

      {/* Player hand */}
      <div className="flex items-center justify-center gap-2 py-2 min-h-[8rem] overflow-x-auto">
        {player.hand.map((card, i) => (
          <div key={i} className="shrink-0 scale-50 origin-bottom -mx-5" ref={el => { if (el) handCardRefs.current.set(i, el); else handCardRefs.current.delete(i); }}>
            <Card
              card={card}
              onClick={(e) => handlePlayCard(i, (e.currentTarget as HTMLElement))}
              draggable
              handIndex={i}
              insufficientMana={card.cost > player.hero.mana || player.board.length >= MAX_BOARD_SIZE}
            />
          </div>
        ))}
      </div>

      {/* Player hero + hero power */}
      <div className="flex items-center justify-center gap-2">
        <HeroPortrait player={player} />
        <button
          onClick={() => useHeroPower()}
          disabled={isOpponentTurn || winner !== null || player.heroPowerUsed || player.hero.mana < player.hero.heroPower.cost}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 font-bold text-sm flex items-center justify-center transition-colors ${
            isOpponentTurn || winner !== null || player.heroPowerUsed || player.hero.mana < player.hero.heroPower.cost
              ? "bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed"
              : "bg-purple-700 border-purple-400 text-white hover:bg-purple-600 cursor-pointer"
          }`}
        >
          {player.hero.heroPower.cost}
        </button>
      </div>

      {/* Flying card animation overlay */}
      {flyingCards.map(fc => {
        const boardRect = boardZoneRef.current?.getBoundingClientRect();
        const targetY = boardRect ? boardRect.top + boardRect.height / 2 : fc.startRect.top - 200;
        const dy = targetY - fc.startRect.top - fc.startRect.height / 2;
        return (
          <div
            key={fc.key}
            className="fixed pointer-events-none z-50"
            style={{
              left: fc.startRect.left,
              top: fc.startRect.top,
              width: fc.startRect.width,
              height: fc.startRect.height,
              ["--fly-dy" as string]: `${dy}px`,
              animation: "cardFly 500ms ease-in-out forwards",
            }}
          >
            <Card card={fc.card} className="!w-full !h-full" />
          </div>
        );
      })}
    </div>
  );
}
