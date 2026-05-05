"use client";

import { useGameState } from "../../hooks/useGameState";
import Card from "../../components/Card";
import VolumeControl from "../../components/VolumeControl";
import { AudioManager } from "./audio-manager";
import { cards } from "../../game/cards";
import { AIDifficulty } from "../../game/ai";
import { createDeck, BoardMinion, PlayerState, Card as CardType, MAX_BOARD_SIZE, MAX_DECK_SIZE, Deck } from "../../game/types";
import { useMemo, useState, useEffect, useRef, useCallback, forwardRef } from "react";

const STORAGE_KEY = 'sanguo-card-decks';
const STORAGE_KEY_ANIMATION_SPEED = 'sanguo-card-animation-speed';
const STORAGE_KEY_AUTO_END_TURN = 'sanguo-card-auto-end-turn';
const STORAGE_KEY_SHOW_DAMAGE_NUMBERS = 'sanguo-card-show-damage-numbers';

type AnimationSpeed = 'fast' | 'normal' | 'slow';

function getAnimationMultiplier(speed: AnimationSpeed): number {
  switch (speed) {
    case 'fast': return 0.5;
    case 'normal': return 1;
    case 'slow': return 2;
  }
}

interface SavedDeck {
  id: string;
  name: string;
  cards: CardType[];
}

type AnimKind = "popIn" | "legendaryEntrance" | "lunge" | "shake" | "death";

interface Particle { px: number; py: number; color: string; }

const PARTICLE_COLORS = ["#ff6b35", "#ffd700", "#ff4444", "#ffaa00", "#ffffff"];
const SPELL_COLORS = ["#7b68ee", "#9370db", "#6a5acd", "#ba55d3", "#dda0dd", "#ffffff"];

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

interface SpellTrailParticle { tx: number; ty: number; color: string; delay: number; size: number; }

function makeSpellParticles(startRect: DOMRect, targetY: number): SpellTrailParticle[] {
  const cx = startRect.left + startRect.width / 2;
  const cy = startRect.top + startRect.height / 2;
  return Array.from({ length: 12 }, (_, i) => {
    const spread = (Math.random() - 0.5) * 80;
    const targetCenterX = window.innerWidth / 2;
    return {
      tx: targetCenterX - cx + spread,
      ty: targetY - cy + (Math.random() - 0.5) * 40,
      color: SPELL_COLORS[Math.floor(Math.random() * SPELL_COLORS.length)],
      delay: i * 30,
      size: 4 + Math.random() * 6,
    };
  });
}

function SpellBurst({ particles, origin }: { particles: SpellTrailParticle[]; origin: { x: number; y: number } }) {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 55 }}>
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: origin.x,
            top: origin.y,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 6px ${p.color}`,
            animation: `spellTrail 0.5s ease-out ${p.delay}ms forwards`,
            "--tx": `${p.tx}px`,
            "--ty": `${p.ty}px`,
            opacity: 0,
            animationFillMode: "forwards",
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

const GOLD_COLORS = ["#ffd700", "#ffaa00", "#fff5a0", "#ff8c00", "#ffe066"];

interface LegendaryParticle { x: number; y: number; color: string; delay: number; size: number; }

function makeLegendaryParticles(): LegendaryParticle[] {
  return Array.from({ length: 14 }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 25 + Math.random() * 30;
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      color: GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)],
      delay: i * 40,
      size: 3 + Math.random() * 5,
    };
  });
}

function LegendaryBurst({ particles }: { particles: LegendaryParticle[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: p.size, height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 4px ${p.color}`,
            marginLeft: -p.size / 2, marginTop: -p.size / 2,
            animation: `legendaryParticle 0.8s ease-out ${p.delay}ms forwards`,
            "--lp-x": `${p.x}px`, "--lp-y": `${p.y}px`,
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

function buildRandomDeck(difficulty?: AIDifficulty): CardType[] {
  let pool: CardType[];
  if (difficulty === 'easy') {
    pool = cards.filter(c => c.rarity === 'common');
  } else if (difficulty === 'normal') {
    pool = cards.filter(c => c.rarity === 'common' || c.rarity === 'rare');
  } else {
    pool = [...cards];
  }
  const deck: CardType[] = [];
  while (deck.length < MAX_DECK_SIZE) {
    deck.push(pool[deck.length % pool.length]);
  }
  return deck;
}

function loadSavedDecks(): SavedDeck[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((d: SavedDeck) => d && d.id && d.name && Array.isArray(d.cards) && d.cards.length === MAX_DECK_SIZE);
  } catch {
    return [];
  }
}

function ManaBar({ mana, maxMana }: { mana: number; maxMana: number }) {
  if (maxMana === 0) return null;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: maxMana }, (_, i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-3 md:h-3 rounded-full transition-colors duration-300 ${i < mana ? "bg-blue-500" : "bg-gray-600"}`}
        />
      ))}
    </div>
  );
}

function HeroPortrait({ player, onClick, targetable }: { player: PlayerState; onClick?: () => void; targetable?: boolean }) {
  const borderClass = targetable ? "border-red-400 ring-2 ring-red-400" : "border-amber-500";
  const cursor = onClick ? "cursor-pointer" : "";

  const prevHealthRef = useRef(player.hero.health);
  const prevManaRef = useRef(player.hero.mana);
  const [healthFlash, setHealthFlash] = useState<"damage" | "heal" | null>(null);
  const [manaFlash, setManaFlash] = useState(false);
  const healthTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (player.hero.health !== prevHealthRef.current) {
      setHealthFlash(player.hero.health < prevHealthRef.current ? "damage" : "heal");
      if (healthTimerRef.current) clearTimeout(healthTimerRef.current);
      healthTimerRef.current = setTimeout(() => setHealthFlash(null), 500);
      prevHealthRef.current = player.hero.health;
    }
  }, [player.hero.health]);

  useEffect(() => {
    if (player.hero.mana !== prevManaRef.current) {
      setManaFlash(true);
      if (manaTimerRef.current) clearTimeout(manaTimerRef.current);
      manaTimerRef.current = setTimeout(() => setManaFlash(false), 400);
      prevManaRef.current = player.hero.mana;
    }
  }, [player.hero.mana]);

  useEffect(() => {
    return () => {
      if (healthTimerRef.current) clearTimeout(healthTimerRef.current);
      if (manaTimerRef.current) clearTimeout(manaTimerRef.current);
    };
  }, []);

  const healthStyle: React.CSSProperties = healthFlash
    ? { animation: `${healthFlash === "damage" ? "healthFlash" : "healFlash"} 0.5s ease-out` }
    : {};
  const manaStyle: React.CSSProperties = manaFlash
    ? { animation: "manaFlash 0.4s ease-out" }
    : {};

  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 md:gap-3 px-1.5 sm:px-2 md:px-4 py-1 sm:py-1.5 md:py-2 ${cursor}`} onClick={(e) => { if (onClick) { e.stopPropagation(); onClick(); } }}>
      <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 rounded-full bg-gray-700 border-2 ${borderClass} flex items-center justify-center text-sm sm:text-base md:text-lg font-bold text-white transition-all duration-200`}>
        ⚔
      </div>
      <div className="flex flex-col gap-0.5 md:gap-1 text-white text-[10px] sm:text-xs md:text-sm">
        <div className="flex items-center gap-1">
          <span className="text-red-400 font-bold inline-block" style={healthStyle}>❤ {player.hero.health}</span>
          <span className="text-blue-400 font-bold ml-2 inline-block" style={manaStyle}>💧 {player.hero.mana}/{player.maxMana}</span>
        </div>
        <ManaBar mana={player.hero.mana} maxMana={player.maxMana} />
      </div>
    </div>
  );
}

function BoardMinionCard({ minion, onClick, selected, exhausted, targetable, animation, damageNumber, dying, impactParticles, legendaryParticles, legendaryShimmer, animMultiplier = 1, showDamageNumbers = true }: {
  minion: BoardMinion;
  onClick?: () => void;
  selected?: boolean;
  exhausted?: boolean;
  targetable?: boolean;
  animation?: AnimKind;
  damageNumber?: number | null;
  dying?: boolean;
  impactParticles?: Particle[] | null;
  legendaryParticles?: LegendaryParticle[] | null;
  legendaryShimmer?: boolean;
  animMultiplier?: number;
  showDamageNumbers?: boolean;
}) {
  const borderColor = selected
    ? "border-yellow-300 ring-2 ring-yellow-400"
    : targetable
      ? "border-red-400 hover:border-red-300"
      : "border-amber-600 hover:border-yellow-400";
  const opacity = exhausted ? "opacity-50" : "";
  const cursor = dying ? "pointer-events-none" : exhausted ? "cursor-not-allowed" : "cursor-pointer";

  const animStyle: React.CSSProperties = {};
  if (!dying) {
    if (animation === "popIn") Object.assign(animStyle, { animation: `popIn ${0.4 * animMultiplier}s ease-out forwards` });
    else if (animation === "legendaryEntrance") Object.assign(animStyle, { animation: `legendaryEntrance ${0.7 * animMultiplier}s ease-out forwards, legendaryGlow ${1.2 * animMultiplier}s ease-out forwards` });
    else if (animation === "lunge") Object.assign(animStyle, { animation: `lunge ${0.3 * animMultiplier}s ease-in-out` });
    else if (animation === "shake") Object.assign(animStyle, { animation: `shake ${0.3 * animMultiplier}s ease-in-out` });
  }
  if (legendaryShimmer) {
    animStyle.boxShadow = "0 0 12px 4px rgba(255, 215, 0, 0.4), 0 0 24px 8px rgba(255, 165, 0, 0.2)";
  }

  const SHARD_CLIPS = [
    "polygon(0% 0%, 50% 0%, 50% 50%, 0% 50%)",
    "polygon(50% 0%, 100% 0%, 100% 50%, 50% 50%)",
    "polygon(0% 50%, 50% 50%, 50% 100%, 0% 100%)",
    "polygon(50% 50%, 100% 50%, 100% 100%, 50% 100%)",
    "polygon(25% 10%, 75% 10%, 75% 90%, 25% 90%)",
  ];
  const SHARD_OFFSETS: [string, string, string][] = [
    ["-40px", "-40px", "-30deg"],
    ["40px", "-40px", "25deg"],
    ["-35px", "40px", "35deg"],
    ["35px", "40px", "-20deg"],
    ["0px", "-50px", "40deg"],
  ];

  if (dying) {
    return (
      <div className={`relative w-12 h-[4.25rem] sm:w-20 sm:h-[6.5rem] md:w-24 md:h-32 pointer-events-none`}>
        {SHARD_CLIPS.map((clip, i) => (
          <div
            key={i}
            className={`absolute inset-0 bg-amber-900 border-2 border-amber-600 rounded-lg flex flex-col items-center justify-between p-0.5 sm:p-1 text-white text-[8px] sm:text-[10px] md:text-sm shadow-md`}
            style={{
              clipPath: clip,
              "--shard-x": SHARD_OFFSETS[i][0],
              "--shard-y": SHARD_OFFSETS[i][1],
              "--shard-rot": SHARD_OFFSETS[i][2],
              animation: `shatterFragment ${0.6 * animMultiplier}s ease-out forwards`,
              animationDelay: `${i * 30}ms`,
            } as React.CSSProperties}
          >
            <span className="bg-blue-700 rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px]">
              {minion.cost}
            </span>
            <span className="font-bold text-center leading-tight">{minion.name}</span>
            <div className="flex w-full justify-between px-1">
              <span className="bg-yellow-600 rounded px-1 font-bold">{minion.currentAttack}</span>
              <span className="bg-red-700 rounded px-1 font-bold">{minion.currentHealth}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={`relative w-12 h-[4.25rem] sm:w-20 sm:h-[6.5rem] md:w-24 md:h-32 border-2 ${borderColor} rounded-lg flex flex-col items-center justify-between p-0.5 sm:p-1 text-white text-[8px] sm:text-[10px] md:text-sm shadow-md transition-all duration-200 ${cursor} ${opacity} overflow-hidden`}
      style={{
        ...animStyle,
        backgroundImage: `url(/card-art/${encodeURIComponent(minion.name)}.png)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#78350f",
      }}
    >
      <span className="bg-blue-700 rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center font-bold text-[8px] sm:text-[10px]">
        {minion.cost}
      </span>
      <span className="font-bold text-center leading-tight truncate max-w-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{minion.name}</span>
      <div className="flex w-full justify-between px-0.5 sm:px-1">
        <span className="bg-yellow-600 rounded px-0.5 sm:px-1 font-bold">{minion.currentAttack}</span>
        <span className="bg-red-700 rounded px-0.5 sm:px-1 font-bold">{minion.currentHealth}</span>
      </div>
      {showDamageNumbers && damageNumber != null && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-lg sm:text-2xl font-black text-red-400 drop-shadow-lg" style={{ animation: `floatDamage ${0.8 * animMultiplier}s ease-out forwards` }}>
            -{damageNumber}
          </span>
        </div>
      )}
      {impactParticles && <ImpactBurst particles={impactParticles} />}
      {legendaryParticles && <LegendaryBurst particles={legendaryParticles} />}
      {legendaryShimmer && (
        <div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(255,215,0,0.3) 0%, transparent 50%, rgba(255,165,0,0.3) 100%)",
            animation: "legendaryShimmer 1s ease-out forwards",
            zIndex: 15,
          }}
        />
      )}
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
  legendaryParticles?: Map<number, LegendaryParticle[]>;
  legendaryShimmer?: Set<number>;
  animMultiplier?: number;
  showDamageNumbers?: boolean;
}>(function BoardZone({ minions, label, onDrop, onMinionClick, selectedIndex, isEnemy, hasAttackerSelected, animations, damageNumbers, dyingMinions, impactParticles, legendaryParticles, legendaryShimmer, animMultiplier, showDamageNumbers }, ref) {
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
      className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2 min-h-[5rem] sm:min-h-[6.5rem] md:min-h-[9rem] rounded-lg transition-all duration-300 ease-out px-1 sm:px-2 md:px-3 flex-wrap ${
        dragOver ? "bg-green-800/40 border-2 border-dashed border-green-400 shadow-[inset_0_0_20px_rgba(74,222,128,0.15)]" : "border-2 border-transparent"
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
                  <BoardMinionCard key={`dying-${dm.boardIndex}-${di}`} minion={dm.minion} dying animMultiplier={animMultiplier} />
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
                  exhausted={!isEnemy && ((minions[i].hasAttacked && minions[i].windfuryAttacksLeft <= 0) || minions[i].summoningSickness)}
                  targetable={isEnemy && !!hasAttackerSelected}
                  animation={animations?.get(i)}
                  damageNumber={damageNumbers?.get(i) ?? null}
                  impactParticles={impactParticles?.get(i) ?? null}
                  legendaryParticles={legendaryParticles?.get(i) ?? null}
                  legendaryShimmer={legendaryShimmer?.has(i)}
                  animMultiplier={animMultiplier}
                  showDamageNumbers={showDamageNumbers}
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
                legendaryParticles={legendaryParticles?.get(i) ?? null}
                legendaryShimmer={legendaryShimmer?.has(i)}
                animMultiplier={animMultiplier}
                showDamageNumbers={showDamageNumbers}
              />
            );
          }
          dyingByIndex.forEach((dms, idx) => {
            dms.forEach((dm, di) => {
              slots.push(
                <BoardMinionCard key={`dying-${idx}-${di}`} minion={dm.minion} dying animMultiplier={animMultiplier} />
              );
            });
          });
          return slots;
        })()
      )}
    </div>
  );
});

const VICTORY_PARTICLE_COUNT = 30;
const DEFEAT_PARTICLE_COUNT = 20;

interface ResultParticle {
  x: number;
  y: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
}

function makeResultParticles(type: "victory" | "defeat"): ResultParticle[] {
  const count = type === "victory" ? VICTORY_PARTICLE_COUNT : DEFEAT_PARTICLE_COUNT;
  const colors = type === "victory"
    ? ["#ffd700", "#ffaa00", "#fff4b0", "#ff6b35", "#ffffff"]
    : ["#666666", "#444444", "#888888", "#333333", "#555555"];
  return Array.from({ length: count }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 1.5,
    duration: 1.5 + Math.random() * 2,
    size: 3 + Math.random() * 6,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
}

function VictoryDefeatOverlay({ winner, onPlayAgain }: { winner: 0 | 1 | "draw"; onPlayAgain: () => void }) {
  const isVictory = winner === 0;
  const isDraw = winner === "draw";
  const type = isVictory ? "victory" : isDraw ? "draw" : "defeat";
  const particlesRef = useRef(makeResultParticles(isVictory || isDraw ? "victory" : "defeat"));

  const title = isVictory ? "胜利" : isDraw ? "平局" : "失败";
  const subtitle = isVictory ? "大获全胜！" : isDraw ? "不分胜负！" : "卷土重来！";

  const bgClass = isVictory
    ? "from-yellow-900/80 via-black/80 to-yellow-900/80"
    : isDraw
      ? "from-blue-900/80 via-black/80 to-blue-900/80"
      : "from-red-900/80 via-black/80 to-red-900/80";

  const textColor = isVictory ? "text-yellow-400" : isDraw ? "text-blue-400" : "text-red-400";
  const glowColor = isVictory ? "drop-shadow-[0_0_30px_rgba(255,215,0,0.8)]" : isDraw ? "drop-shadow-[0_0_30px_rgba(100,149,237,0.8)]" : "drop-shadow-[0_0_30px_rgba(255,0,0,0.6)]";

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ animation: "resultOverlayIn 0.6s ease-out forwards" }}
    >
      <div className={`absolute inset-0 bg-gradient-to-b ${bgClass}`} style={{ animation: "resultBgFade 0.8s ease-out forwards" }} />

      {particlesRef.current.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `${type === "defeat" ? "defeatParticle" : "victoryParticle"} ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}

      <div className="relative flex flex-col items-center gap-4 z-10">
        <div
          className={`text-5xl sm:text-7xl md:text-8xl font-black tracking-wider ${textColor} ${glowColor}`}
          style={{ animation: "resultTextIn 2s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
        >
          {title}
        </div>
        <div
          className="text-2xl sm:text-3xl text-white/80 font-bold"
          style={{ animation: "resultSubtitleIn 1.5s ease-out 0.5s both" }}
        >
          {subtitle}
        </div>
        <button
          onClick={onPlayAgain}
          className="mt-8 px-8 py-3 rounded-lg text-lg font-bold text-white bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 border border-amber-500/50 shadow-lg cursor-pointer transition-all hover:scale-105"
          style={{ animation: "resultButtonIn 0.8s ease-out 1.5s both" }}
        >
          再来一局
        </button>
      </div>
    </div>
  );
}

function DeckSelectScreen({ onStart }: { onStart: (deck: Deck, difficulty: AIDifficulty) => void }) {
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);
  const [difficulty, setDifficulty] = useState<AIDifficulty>("normal");

  useEffect(() => {
    setSavedDecks(loadSavedDecks());
  }, []);

  const difficultyOptions: { value: AIDifficulty; label: string; desc: string; color: string }[] = [
    { value: "easy", label: "简单", desc: "适合新手", color: "from-green-700 to-green-900 border-green-500/50" },
    { value: "normal", label: "普通", desc: "均衡挑战", color: "from-amber-700 to-amber-900 border-amber-500/50" },
    { value: "hard", label: "困难", desc: "高手对决", color: "from-red-700 to-red-900 border-red-500/50" },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      <h1 className="text-2xl sm:text-3xl font-bold text-amber-400 mb-6">选择难度</h1>

      <div className="flex gap-3 mb-8 w-full max-w-md">
        {difficultyOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setDifficulty(opt.value)}
            className={`flex-1 px-3 py-3 rounded-lg font-bold text-center border-2 transition-all cursor-pointer ${
              difficulty === opt.value
                ? `bg-gradient-to-r ${opt.color} scale-105 shadow-lg`
                : "bg-gray-800 border-gray-600/50 opacity-60 hover:opacity-80"
            }`}
          >
            <div className="text-lg">{opt.label}</div>
            <div className="text-xs text-white/60 mt-0.5">{opt.desc}</div>
          </button>
        ))}
      </div>

      <h2 className="text-xl font-bold text-amber-400 mb-4">选择卡组</h2>

      <div className="flex flex-col gap-3 w-full max-w-md">
        <button
          onClick={() => onStart(createDeck(buildRandomDeck()), difficulty)}
          className="px-6 py-4 rounded-lg font-bold text-lg bg-gradient-to-r from-green-700 to-green-900 hover:from-green-600 hover:to-green-800 border border-green-500/50 shadow-lg transition-all hover:scale-105 cursor-pointer"
        >
          随机卡组
        </button>

        {savedDecks.length > 0 && (
          <div className="mt-4 border-t border-gray-700 pt-4">
            <p className="text-sm text-gray-400 mb-3">已保存的卡组</p>
            {savedDecks.map(deck => (
              <button
                key={deck.id}
                onClick={() => onStart(createDeck(deck.cards), difficulty)}
                className="w-full px-6 py-3 mb-2 rounded-lg font-bold text-left bg-gradient-to-r from-amber-800 to-amber-950 hover:from-amber-700 hover:to-amber-900 border border-amber-600/50 shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
              >
                {deck.name}
                <span className="text-xs text-amber-400/70 ml-2">({deck.cards.length}张)</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GameInner({ playerDeck, difficulty }: { playerDeck: Deck; difficulty: AIDifficulty }) {
  const [deck1, deck2] = useMemo(() => {
    return [playerDeck, createDeck(buildRandomDeck(difficulty))];
  }, [playerDeck, difficulty]);

  const { gameState, winner, playCard, endTurn, attack, attackHero, useHeroPower, isOpponentTurn, resetGame } = useGameState(deck1, deck2, difficulty);

  const [selectedAttacker, setSelectedAttacker] = useState<number | null>(null);

  const audioRef = useRef(AudioManager.getInstance());

  const [animationSpeed, setAnimationSpeed] = useState<AnimationSpeed>('normal');
  const [autoEndTurn, setAutoEndTurn] = useState(false);
  const [showDamageNumbers, setShowDamageNumbers] = useState(true);
  const animMultiplier = getAnimationMultiplier(animationSpeed);

  useEffect(() => {
    const speed = localStorage.getItem(STORAGE_KEY_ANIMATION_SPEED) as AnimationSpeed | null;
    if (speed === 'fast' || speed === 'normal' || speed === 'slow') setAnimationSpeed(speed);
    setAutoEndTurn(localStorage.getItem(STORAGE_KEY_AUTO_END_TURN) === 'true');
    setShowDamageNumbers(localStorage.getItem(STORAGE_KEY_SHOW_DAMAGE_NUMBERS) !== 'false');
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    audio.startBGM();
    return () => { audio.stopBGM(); };
  }, []);

  const [playerAnims, setPlayerAnims] = useState<Map<number, AnimKind>>(new Map());
  const [enemyAnims, setEnemyAnims] = useState<Map<number, AnimKind>>(new Map());
  const [playerDmg, setPlayerDmg] = useState<Map<number, number>>(new Map());
  const [enemyDmg, setEnemyDmg] = useState<Map<number, number>>(new Map());
  const [heroDmg, setHeroDmg] = useState<number | null>(null);
  const [dyingMinions, setDyingMinions] = useState<DyingMinion[]>([]);
  const [enemyImpacts, setEnemyImpacts] = useState<Map<number, Particle[]>>(new Map());
  const [heroImpact, setHeroImpact] = useState<Particle[] | null>(null);
  const [playerLegendaryParticles, setPlayerLegendaryParticles] = useState<Map<number, LegendaryParticle[]>>(new Map());
  const [enemyLegendaryParticles, setEnemyLegendaryParticles] = useState<Map<number, LegendaryParticle[]>>(new Map());
  const [playerLegendaryShimmer, setPlayerLegendaryShimmer] = useState<Set<number>>(new Set());
  const [enemyLegendaryShimmer, setEnemyLegendaryShimmer] = useState<Set<number>>(new Set());

  interface SpellEffect { particles: SpellTrailParticle[]; origin: { x: number; y: number }; key: number; }
  const [turnBanner, setTurnBanner] = useState<"your" | "enemy" | null>(null);
  const turnBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setTurnBanner(isOpponentTurn ? "enemy" : "your");
    audioRef.current.playTurnStart();
    if (turnBannerTimerRef.current) clearTimeout(turnBannerTimerRef.current);
    turnBannerTimerRef.current = setTimeout(() => {
      setTurnBanner(null);
      turnBannerTimerRef.current = null;
    }, 1500 * animMultiplier);
  }, [isOpponentTurn, animMultiplier]);

  useEffect(() => {
    return () => {
      if (turnBannerTimerRef.current) clearTimeout(turnBannerTimerRef.current);
    };
  }, []);

  const [spellEffects, setSpellEffects] = useState<SpellEffect[]>([]);
  const [spellFlash, setSpellFlash] = useState(false);
  const spellKeyRef = useRef(0);

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
    safeTimeout(() => setter(prev => { const m = new Map(prev); m.delete(index); return m; }), duration * animMultiplier);
  }, [safeTimeout, animMultiplier]);

  const triggerDmg = useCallback((setter: typeof setPlayerDmg, index: number, amount: number) => {
    setter(prev => new Map(prev).set(index, amount));
    safeTimeout(() => setter(prev => { const m = new Map(prev); m.delete(index); return m; }), 800 * animMultiplier);
  }, [safeTimeout, animMultiplier]);

  const triggerImpact = useCallback((index: number) => {
    const particles = makeParticles();
    setEnemyImpacts(prev => new Map(prev).set(index, particles));
    safeTimeout(() => setEnemyImpacts(prev => { const m = new Map(prev); m.delete(index); return m; }), 400 * animMultiplier);
  }, [safeTimeout, animMultiplier]);

  const triggerHeroImpact = useCallback(() => {
    const particles = makeParticles();
    setHeroImpact(particles);
    safeTimeout(() => setHeroImpact(null), 400 * animMultiplier);
  }, [safeTimeout, animMultiplier]);

  const addDyingMinion = useCallback((minion: BoardMinion, boardIndex: number, side: "player" | "enemy") => {
    const dm: DyingMinion = { minion: { ...minion }, boardIndex, side, expiry: Date.now() + 600 * animMultiplier };
    setDyingMinions(prev => [...prev, dm]);
    safeTimeout(() => {
      setDyingMinions(prev => prev.filter(d => d !== dm));
    }, 600 * animMultiplier);
  }, [safeTimeout, animMultiplier]);

  const player = gameState.players[0];
  const opponent = gameState.players[1];

  const handlePlayCard = useCallback((handIndex: number, cardEl?: HTMLElement | null) => {
    const card = player.hand[handIndex];
    if (!card) return;
    const el = cardEl ?? handCardRefs.current.get(handIndex);
    const startRect = el?.getBoundingClientRect();
    const result = playCard(handIndex);
    if (result.success && startRect) {
      audioRef.current.playCardPlay();
      const key = flyKeyRef.current++;
      setFlyingCards(prev => [...prev, { card, startRect, key }]);
      safeTimeout(() => setFlyingCards(prev => prev.filter(f => f.key !== key)), 500 * animMultiplier);

      if (card.type === "spell") {
        const boardRect = boardZoneRef.current?.getBoundingClientRect();
        const targetY = boardRect ? boardRect.top + boardRect.height / 2 : startRect.top - 200;
        const origin = { x: startRect.left + startRect.width / 2, y: startRect.top + startRect.height / 2 };
        const particles = makeSpellParticles(startRect, targetY);
        const spellKey = spellKeyRef.current++;
        setSpellEffects(prev => [...prev, { particles, origin, key: spellKey }]);
        safeTimeout(() => setSpellEffects(prev => prev.filter(e => e.key !== spellKey)), 700 * animMultiplier);

        safeTimeout(() => {
          setSpellFlash(true);
          safeTimeout(() => setSpellFlash(false), 600 * animMultiplier);
        }, 200 * animMultiplier);
      }
    }
  }, [player.hand, playCard, safeTimeout]);

  const triggerLegendaryEffects = useCallback((
    particleSetter: typeof setPlayerLegendaryParticles,
    shimmerSetter: typeof setPlayerLegendaryShimmer,
    index: number,
  ) => {
    const particles = makeLegendaryParticles();
    particleSetter(prev => new Map(prev).set(index, particles));
    shimmerSetter(prev => new Set(prev).add(index));
    safeTimeout(() => particleSetter(prev => { const m = new Map(prev); m.delete(index); return m; }), 900 * animMultiplier);
    safeTimeout(() => shimmerSetter(prev => { const s = new Set(prev); s.delete(index); return s; }), 1200 * animMultiplier);
  }, [safeTimeout, animMultiplier]);

  useEffect(() => {
    const newLen = player.board.length;
    if (newLen > prevPlayerBoardLen.current) {
      const idx = newLen - 1;
      const minion = player.board[idx];
      if (minion.rarity === "legendary") {
        triggerAnim(setPlayerAnims, idx, "legendaryEntrance", 700);
        triggerLegendaryEffects(setPlayerLegendaryParticles, setPlayerLegendaryShimmer, idx);
      } else {
        triggerAnim(setPlayerAnims, idx, "popIn", 400);
      }
    }
    prevPlayerBoardLen.current = newLen;
  }, [player.board.length, player.board, triggerAnim, triggerLegendaryEffects]);

  useEffect(() => {
    const newLen = opponent.board.length;
    if (newLen > prevEnemyBoardLen.current) {
      const idx = newLen - 1;
      const minion = opponent.board[idx];
      if (minion.rarity === "legendary") {
        triggerAnim(setEnemyAnims, idx, "legendaryEntrance", 700);
        triggerLegendaryEffects(setEnemyLegendaryParticles, setEnemyLegendaryShimmer, idx);
      } else {
        triggerAnim(setEnemyAnims, idx, "popIn", 400);
      }
    }
    prevEnemyBoardLen.current = newLen;
  }, [opponent.board.length, opponent.board, triggerAnim, triggerLegendaryEffects]);

  const handleFriendlyMinionClick = (index: number) => {
    if (winner !== null) return;
    if (isOpponentTurn) return;
    if (gameState.activePlayer !== 0) return;
    const minion = player.board[index];
    if ((minion.hasAttacked && minion.windfuryAttacksLeft <= 0) || minion.summoningSickness) return;
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
      audioRef.current.playAttack();
      triggerAnim(setPlayerAnims, attackerIdx, "lunge", 300);
      safeTimeout(() => triggerAnim(setEnemyAnims, index, "shake", 300), 150 * animMultiplier);
      safeTimeout(() => triggerImpact(index), 150 * animMultiplier);

      if (attackerAtk > 0) {
        safeTimeout(() => {
          audioRef.current.playDamage();
          triggerDmg(setEnemyDmg, index, attackerAtk);
        }, 150 * animMultiplier);
      }
      if (defenderAtk > 0) {
        triggerDmg(setPlayerDmg, attackerIdx, defenderAtk);
      }

      if (defenderMinion && defenderHealth - attackerAtk <= 0) {
        safeTimeout(() => addDyingMinion(defenderMinion, index, "enemy"), 350 * animMultiplier);
      }
      if (attackerMinion && attackerHealth - defenderAtk <= 0) {
        safeTimeout(() => addDyingMinion(attackerMinion, attackerIdx, "player"), 350 * animMultiplier);
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
      audioRef.current.playAttack();
      triggerAnim(setPlayerAnims, attackerIdx, "lunge", 300);
      safeTimeout(() => triggerHeroImpact(), 150 * animMultiplier);

      if (attackerAtk > 0) {
        safeTimeout(() => {
          audioRef.current.playDamage();
          setHeroDmg(attackerAtk);
          safeTimeout(() => setHeroDmg(null), 800 * animMultiplier);
        }, 150 * animMultiplier);
      }
    }
  };

  const handleBoardClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setSelectedAttacker(null);
  };

  const autoEndTurnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => { if (autoEndTurnTimerRef.current) clearTimeout(autoEndTurnTimerRef.current); };
  }, []);

  useEffect(() => {
    if (!autoEndTurn || isOpponentTurn || winner !== null) return;
    const p = gameState.players[0];
    const hasPlayableCard = p.hand.some(c =>
      c.cost <= p.hero.mana && (c.type === 'spell' || p.board.length < MAX_BOARD_SIZE)
    );
    const hasAvailableAttack = p.board.some(m => !(m.hasAttacked && m.windfuryAttacksLeft <= 0) && !m.summoningSickness && m.currentAttack > 0);
    const canHeroAttack = p.weapon !== null && !p.heroHasAttacked;
    const canUseHeroPower = !p.heroPowerUsed && p.hero.mana >= p.hero.heroPower.cost;
    if (!hasPlayableCard && !hasAvailableAttack && !canHeroAttack && !canUseHeroPower) {
      autoEndTurnTimerRef.current = setTimeout(() => {
        endTurn();
        setSelectedAttacker(null);
        autoEndTurnTimerRef.current = null;
      }, 500 * animMultiplier);
    }
    return () => {
      if (autoEndTurnTimerRef.current) {
        clearTimeout(autoEndTurnTimerRef.current);
        autoEndTurnTimerRef.current = null;
      }
    };
  }, [gameState, autoEndTurn, isOpponentTurn, winner, endTurn, animMultiplier]);

  const playerDying = dyingMinions.filter(d => d.side === "player");
  const enemyDying = dyingMinions.filter(d => d.side === "enemy");

  useEffect(() => {
    if (winner === null) return;
    audioRef.current.stopBGM();
    if (winner === 0) audioRef.current.playVictory();
    else audioRef.current.playDefeat();
  }, [winner]);

  const prevHandLen = useRef(player.hand.length);
  useEffect(() => {
    if (player.hand.length > prevHandLen.current) {
      audioRef.current.playCardDraw();
    }
    prevHandLen.current = player.hand.length;
  }, [player.hand.length]);

  return (
    <div className="flex flex-col h-screen w-full bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 select-none overflow-hidden" onClick={handleBoardClick}>
      <div className="absolute top-2 right-2 z-50">
        <VolumeControl />
      </div>

      {/* Victory/Defeat overlay */}
      {winner !== null && (
        <VictoryDefeatOverlay winner={winner} onPlayAgain={resetGame} />
      )}

      {/* Opponent hero */}
      <div className="relative px-2 sm:px-3 md:px-4 shrink-0">
        <HeroPortrait player={opponent} onClick={handleEnemyHeroClick} targetable={selectedAttacker !== null} />
        {showDamageNumbers && heroDmg != null && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-3xl font-black text-red-400 drop-shadow-lg" style={{ animation: `floatDamage ${0.8 * animMultiplier}s ease-out forwards` }}>
              -{heroDmg}
            </span>
          </div>
        )}
        {heroImpact && <ImpactBurst particles={heroImpact} />}
      </div>

      {/* Opponent hand (face down) */}
      <div className="flex items-center justify-center gap-0.5 sm:gap-1 md:gap-2 py-0.5 sm:py-1 md:py-1 min-h-[2.5rem] sm:min-h-[4rem] md:min-h-[5rem] px-2 sm:px-3 md:px-4 shrink-0 flex-wrap" onClick={handleBoardClick}>
        {opponent.hand.map((_, i) => (
          <div
            key={i}
            className="w-7 h-10 sm:w-12 sm:h-16 md:w-16 md:h-24 bg-red-900 border-2 border-red-700 rounded-lg shadow-md transition-transform duration-200 hover:scale-105"
          />
        ))}
      </div>

      {/* Opponent board */}
      <BoardZone minions={opponent.board} label="对方战场" isEnemy hasAttackerSelected={selectedAttacker !== null} onMinionClick={handleEnemyMinionClick} animations={enemyAnims} damageNumbers={enemyDmg} dyingMinions={enemyDying} impactParticles={enemyImpacts} legendaryParticles={enemyLegendaryParticles} legendaryShimmer={enemyLegendaryShimmer} animMultiplier={animMultiplier} showDamageNumbers={showDamageNumbers} />

      {/* Turn banner overlay */}
      {turnBanner && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 50 }}>
          <div
            className={`px-6 py-2 md:px-12 md:py-4 rounded-lg text-xl md:text-3xl font-bold tracking-widest shadow-2xl ${
              turnBanner === "your"
                ? "bg-green-800/90 text-green-100 border-2 border-green-400"
                : "bg-red-800/90 text-red-100 border-2 border-red-400"
            }`}
            style={{ animation: `turnBannerIn ${1.5 * animMultiplier}s ease-out forwards` }}
          >
            {turnBanner === "your" ? "你的回合" : "对手回合"}
          </div>
        </div>
      )}

      {/* Turn indicator + End Turn */}
      <div className="flex items-center justify-center py-0.5 sm:py-1 md:py-1 gap-1.5 sm:gap-2 px-2 sm:px-3 shrink-0">
        <div className="h-px flex-1 bg-amber-700/50" />
        <span className={`text-[10px] sm:text-xs md:text-sm font-bold px-1.5 sm:px-2 md:px-3 py-0.5 rounded-full whitespace-nowrap ${isOpponentTurn ? "bg-red-700 text-red-200" : "bg-green-700 text-green-200"}`}>
          {isOpponentTurn ? "对手回合" : "你的回合"}
        </span>
        <button
          onClick={() => { endTurn(); setSelectedAttacker(null); }}
          disabled={isOpponentTurn || winner !== null}
          className={`px-3 sm:px-4 md:px-6 py-1 sm:py-1.5 md:py-2 font-bold text-xs sm:text-sm md:text-base rounded-lg shadow-lg transition-all duration-200 whitespace-nowrap ${
            isOpponentTurn || winner !== null
              ? "bg-gray-600 text-gray-400 cursor-not-allowed"
              : "bg-amber-700 hover:bg-amber-600 hover:scale-105 hover:shadow-xl text-white"
          }`}
        >
          结束回合
        </button>
        <div className="h-px flex-1 bg-amber-700/50" />
      </div>

      {/* Turn timer bar */}
      {isOpponentTurn && (
        <div className="w-full h-1 bg-gray-700 overflow-hidden shrink-0">
          <div className="h-full bg-red-500 animate-[shrink_2s_linear_forwards]" />
        </div>
      )}

      {/* Player board */}
      <BoardZone ref={boardZoneRef} minions={player.board} label="我方战场" onDrop={(i) => handlePlayCard(i)} onMinionClick={handleFriendlyMinionClick} selectedIndex={selectedAttacker} animations={playerAnims} damageNumbers={playerDmg} dyingMinions={playerDying} legendaryParticles={playerLegendaryParticles} legendaryShimmer={playerLegendaryShimmer} animMultiplier={animMultiplier} showDamageNumbers={showDamageNumbers} />

      {/* Player hand */}
      <div className="flex items-center justify-center gap-0.5 sm:gap-1 md:gap-2 py-0.5 sm:py-1.5 md:py-2 min-h-[4rem] sm:min-h-[5.5rem] md:min-h-[8rem] px-2 sm:px-3 shrink-0 flex-wrap">
        {player.hand.map((card, i) => (
          <div key={i} className="shrink-0 scale-[0.28] sm:scale-[0.4] md:scale-50 origin-bottom -mx-8 sm:-mx-6 md:-mx-5" ref={el => { if (el) handCardRefs.current.set(i, el); else handCardRefs.current.delete(i); }}>
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
      <div className="flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 shrink-0 pb-1">
        <HeroPortrait player={player} />
        <button
          onClick={() => { audioRef.current.playHeroPower(); useHeroPower(); }}
          disabled={isOpponentTurn || winner !== null || player.heroPowerUsed || player.hero.mana < player.hero.heroPower.cost}
          className={`w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 rounded-full border-2 font-bold text-[10px] sm:text-xs md:text-sm flex items-center justify-center transition-all duration-200 ${
            isOpponentTurn || winner !== null || player.heroPowerUsed || player.hero.mana < player.hero.heroPower.cost
              ? "bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed"
              : "bg-purple-700 border-purple-400 text-white hover:bg-purple-600 hover:scale-110 cursor-pointer"
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
              animation: `cardFly ${500 * animMultiplier}ms ease-in-out forwards`,
            }}
          >
            <Card card={fc.card} className="!w-full !h-full" />
          </div>
        );
      })}

      {/* Spell particle trail effects */}
      {spellEffects.map(se => (
        <SpellBurst key={se.key} particles={se.particles} origin={se.origin} />
      ))}

      {/* Spell screen flash overlay */}
      {spellFlash && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            zIndex: 60,
            background: "radial-gradient(circle, rgba(123,104,238,0.4) 0%, rgba(75,0,130,0.2) 60%, transparent 100%)",
            animation: `spellFlash ${0.6 * animMultiplier}s ease-out forwards`,
          }}
        />
      )}
    </div>
  );
}

export default function GamePage() {
  const [playerDeck, setPlayerDeck] = useState<Deck | null>(null);
  const [difficulty, setDifficulty] = useState<AIDifficulty>("normal");

  if (!playerDeck) {
    return <DeckSelectScreen onStart={(deck, diff) => { setPlayerDeck(deck); setDifficulty(diff); }} />;
  }

  return <GameInner playerDeck={playerDeck} difficulty={difficulty} />;
}
