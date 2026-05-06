"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { adventureChapters, AdventureStage, AdventureChapter } from "../../../../../game/adventure-data";
import { cards } from "../../../../../game/cards";
import { Card, createDeck, Deck } from "../../../../../game/types";
import { useGameState, BossInitConfig } from "../../../../../hooks/useGameState";
import { AIDifficulty, buildFactionDeck } from "../../../../../game/ai";
import { createBossAIFromRule } from "../../../../../game/boss-ai";
import { loadAdventureProgress, isStageUnlocked, completeStage, addGold, addXP, addCards } from "../../../../../game/player-store";

function findStage(chapterId: string, stageId: string): { chapter: AdventureChapter; stage: AdventureStage } | null {
  const chapter = adventureChapters.find((ch) => ch.id === chapterId);
  if (!chapter) return null;
  const stage = chapter.stages.find((s) => s.id === stageId);
  if (!stage) return null;
  return { chapter, stage };
}

function resolveEnemyDeck(cardNames: string[]): Card[] {
  const resolved: Card[] = [];
  for (const name of cardNames) {
    const card = cards.find((c) => c.name === name);
    if (card) resolved.push({ ...card });
  }
  return resolved;
}

function difficultyToAI(difficulty: number): AIDifficulty {
  if (difficulty <= 2) return "easy";
  if (difficulty <= 4) return "normal";
  if (difficulty <= 6) return "hard";
  return "boss";
}

function StageInfoScreen({
  chapter,
  stage,
  onStartBattle,
}: {
  chapter: AdventureChapter;
  stage: AdventureStage;
  onStartBattle: () => void;
}) {
  const enemyCards = useMemo(() => resolveEnemyDeck(stage.enemyDeck), [stage.enemyDeck]);

  const uniqueCards = useMemo(() => {
    const seen = new Map<string, { card: Card; count: number }>();
    for (const card of enemyCards) {
      const entry = seen.get(card.name);
      if (entry) entry.count++;
      else seen.set(card.name, { card, count: 1 });
    }
    return Array.from(seen.values());
  }, [enemyCards]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-red-950 via-red-900 to-yellow-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-900/20 via-transparent to-transparent" />

      <header className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-yellow-600/30">
        <Link href="/adventure" className="text-yellow-400 hover:text-yellow-300 transition-colors">
          ← 返回
        </Link>
        <h1 className="text-xl font-bold text-yellow-400">{chapter.name}</h1>
        <div className="w-12" />
      </header>

      <div className="relative z-10 flex-1 px-4 py-6 overflow-y-auto">
        <div className="max-w-lg mx-auto space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-yellow-100">
              {stage.isBoss && <span className="text-red-400 mr-2">👹</span>}
              {stage.name}
            </h2>
            <p className="text-yellow-200/60 mt-2">{stage.description}</p>
            <div className="flex items-center justify-center gap-4 mt-3 text-sm text-yellow-200/50">
              <span>难度 {"⭐".repeat(Math.min(stage.difficulty, 5))}</span>
            </div>
          </div>

          {stage.isBoss && stage.bossRules && (
            <div className="rounded-lg border border-red-500/40 bg-red-950/80 p-4">
              <h3 className="text-red-300 font-semibold mb-2">BOSS 特殊规则</h3>
              {stage.bossRules.extraMana && (
                <p className="text-sm text-red-200/70">额外法力值: +{stage.bossRules.extraMana}</p>
              )}
              {stage.bossRules.bossHp && (
                <p className="text-sm text-red-200/70">Boss 生命值: {stage.bossRules.bossHp}</p>
              )}
              {stage.bossRules.startingMinion && (
                <p className="text-sm text-red-200/70">开局随从: {stage.bossRules.startingMinion.name} ({stage.bossRules.startingMinion.attack}/{stage.bossRules.startingMinion.health})</p>
              )}
              {stage.bossRules.spellDiscount && (
                <p className="text-sm text-red-200/70">法术减费: -{stage.bossRules.spellDiscount}</p>
              )}
              {stage.bossRules.fieldEffect && (
                <p className="text-sm text-red-200/70">场地效果: {stage.bossRules.fieldEffect}</p>
              )}
              {stage.bossRules.uniqueHeroPower && (
                <div className="mt-2">
                  <p className="text-sm text-red-200/70">
                    英雄技能: {stage.bossRules.uniqueHeroPower.name} ({stage.bossRules.uniqueHeroPower.cost}费)
                  </p>
                  <p className="text-xs text-red-200/50">{stage.bossRules.uniqueHeroPower.description}</p>
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg border border-yellow-600/30 bg-red-950/60 p-4">
            <h3 className="text-yellow-300 font-semibold mb-2">通关奖励</h3>
            <div className="flex gap-4 text-sm text-yellow-200/70">
              {stage.rewards.gold && <span>💰 {stage.rewards.gold} 金币</span>}
              {stage.rewards.xp && <span>✨ {stage.rewards.xp} 经验</span>}
            </div>
            {stage.rewards.cards && stage.rewards.cards.length > 0 && (
              <div className="mt-2 text-sm text-yellow-200/70">
                <span>卡牌奖励: </span>
                {stage.rewards.cards.map((r, i) => (
                  <span key={i}>
                    {r.cardName} x{r.count}
                    {i < stage.rewards.cards!.length - 1 && ", "}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-yellow-600/30 bg-red-950/60 p-4">
            <h3 className="text-yellow-300 font-semibold mb-3">敌方卡组预览</h3>
            <div className="grid grid-cols-2 gap-2">
              {uniqueCards.map(({ card, count }) => (
                <div
                  key={card.name}
                  className="flex items-center gap-2 rounded border border-yellow-600/20 bg-red-950/40 px-3 py-2"
                >
                  <span className="text-yellow-400 text-xs font-mono w-5">{card.cost}费</span>
                  <span className="text-yellow-100 text-sm flex-1 truncate">{card.name}</span>
                  {card.attack !== undefined && (
                    <span className="text-red-300 text-xs">{card.attack}/{card.health}</span>
                  )}
                  {count > 1 && <span className="text-yellow-200/40 text-xs">x{count}</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-yellow-600/30 bg-red-950/60 p-4">
            <h3 className="text-yellow-300 font-semibold mb-2">星级评价标准</h3>
            <div className="space-y-1 text-sm text-yellow-200/60">
              <p>⭐⭐⭐ 英雄血量 ≥ {stage.starThresholds.threeStarMinHpPercent}% 且 回合数 ≤ {stage.starThresholds.threeStarMaxTurns}</p>
              <p>⭐⭐ 英雄血量 ≥ {stage.starThresholds.twoStarMinHpPercent}% 且 回合数 ≤ {stage.starThresholds.twoStarMaxTurns}</p>
              <p>⭐ 通关即可</p>
            </div>
          </div>

          <button
            onClick={onStartBattle}
            className="w-full rounded-lg border-2 border-yellow-500/60 bg-gradient-to-r from-red-800 to-red-700 px-6 py-4 text-xl font-bold text-yellow-300 transition-all hover:border-yellow-400 hover:from-red-700 hover:to-red-600 hover:scale-[1.02] active:scale-100"
          >
            ⚔️ 开始战斗
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StagePage() {
  const params = useParams();
  const router = useRouter();
  const chapterId = params.chapterId as string;
  const stageId = params.stageId as string;

  const [battling, setBattling] = useState(false);
  const [result, setResult] = useState<{ chapter: AdventureChapter; stage: AdventureStage } | null>(null);

  useEffect(() => {
    const found = findStage(chapterId, stageId);
    if (!found) {
      router.replace("/adventure");
      return;
    }
    const progress = loadAdventureProgress();
    if (!isStageUnlocked(stageId, progress)) {
      router.replace("/adventure");
      return;
    }
    setResult(found);
  }, [chapterId, stageId, router]);

  if (!result) return null;

  if (!battling) {
    return (
      <StageInfoScreen
        chapter={result.chapter}
        stage={result.stage}
        onStartBattle={() => setBattling(true)}
      />
    );
  }

  return <BattleWrapper stage={result.stage} chapterId={result.chapter.id} />;
}

function BattleWrapper({ stage, chapterId }: { stage: AdventureStage; chapterId: string }) {
  const router = useRouter();
  const [playerDeck, setPlayerDeck] = useState<Deck | null>(null);

  if (!playerDeck) {
    return <DeckPicker stage={stage} onSelect={setPlayerDeck} onBack={() => router.replace(`/adventure/stage/${chapterId}/${stage.id}`)} />;
  }

  return <AdventureBattle stage={stage} playerDeck={playerDeck} chapterId={chapterId} />;
}

function DeckPicker({ stage, onSelect, onBack }: { stage: AdventureStage; onSelect: (deck: Deck) => void; onBack: () => void }) {
  const STORAGE_KEY = "sanguo-card-decks";

  const [savedDecks, setSavedDecks] = useState<{ id: string; name: string; cards: Card[] }[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSavedDecks(JSON.parse(raw));
    } catch {}
  }, []);

  function buildRandomDeck(): Card[] {
    return buildFactionDeck(cards);
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-red-950 via-red-900 to-yellow-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-900/20 via-transparent to-transparent" />

      <header className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-yellow-600/30">
        <button onClick={onBack} className="text-yellow-400 hover:text-yellow-300 transition-colors">
          ← 返回
        </button>
        <h1 className="text-xl font-bold text-yellow-400">选择卡组</h1>
        <div className="w-12" />
      </header>

      <div className="relative z-10 flex-1 px-4 py-6 overflow-y-auto">
        <div className="max-w-lg mx-auto space-y-3">
          <button
            onClick={() => onSelect(createDeck(buildRandomDeck()))}
            className="w-full rounded-lg border border-yellow-600/40 bg-red-950/60 px-4 py-3 text-left text-yellow-100 hover:border-yellow-500/70 hover:bg-red-900/80 transition-all"
          >
            🎲 随机卡组
          </button>
          {savedDecks.map((d) => (
            <button
              key={d.id}
              onClick={() => onSelect(createDeck(d.cards))}
              className="w-full rounded-lg border border-yellow-600/40 bg-red-950/60 px-4 py-3 text-left text-yellow-100 hover:border-yellow-500/70 hover:bg-red-900/80 transition-all"
            >
              📦 {d.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TutorialHints({ hints }: { hints: string[] }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || hints.length === 0) return null;
  return (
    <div className="relative mx-2 mt-2 rounded-lg border border-yellow-500/50 bg-yellow-900/40 px-4 py-3">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-1 right-2 text-yellow-200/50 hover:text-yellow-200 text-sm"
      >
        ✕
      </button>
      <div className="space-y-1 text-sm text-yellow-200/90">
        {hints.map((hint, i) => (
          <p key={i}>💡 {hint}</p>
        ))}
      </div>
    </div>
  );
}

function AdventureBattle({ stage, playerDeck, chapterId }: { stage: AdventureStage; playerDeck: Deck; chapterId: string }) {
  const router = useRouter();
  const [selectedAttacker, setSelectedAttacker] = useState<number | null>(null);
  const enemyCards = useMemo(() => resolveEnemyDeck(stage.enemyDeck), [stage.enemyDeck]);
  const aiDifficulty = useMemo(() => difficultyToAI(stage.difficulty), [stage.difficulty]);

  const paddedEnemy = useMemo(() => {
    const deck = [...enemyCards];
    const factionCounts = new Map<string, number>();
    for (const c of deck) {
      if (c.faction !== 'neutral') {
        factionCounts.set(c.faction, (factionCounts.get(c.faction) ?? 0) + 1);
      }
    }
    let dominantFaction: string | null = null;
    let maxCount = 0;
    for (const [f, count] of factionCounts) {
      if (count > maxCount) { maxCount = count; dominantFaction = f; }
    }
    const fillPool = dominantFaction
      ? enemyCards.filter(c => c.faction === dominantFaction || c.faction === 'neutral')
      : enemyCards;
    while (deck.length < 30) {
      deck.push({ ...fillPool[Math.floor(Math.random() * fillPool.length)] });
    }
    return createDeck(deck);
  }, [enemyCards]);

  const bossConfig = useMemo(() => {
    if (!stage.isBoss || !stage.bossRules) return null;
    const maxHp = stage.bossRules.bossHp ?? 30;
    return createBossAIFromRule(stage.name, 1, maxHp, stage.bossRules.extraMana);
  }, [stage.isBoss, stage.bossRules, stage.name]);

  const bossHeroPower = useMemo(() => {
    if (!stage.bossRules?.uniqueHeroPower) return undefined;
    const uhp = stage.bossRules.uniqueHeroPower;
    return { name: uhp.name, cost: uhp.cost, description: uhp.description };
  }, [stage.bossRules?.uniqueHeroPower]);

  const bossInit = useMemo((): BossInitConfig | undefined => {
    const hasTerrain = stage.terrain && Object.keys(stage.terrain).length > 0;
    if (stage.isBoss && stage.bossRules) {
      const rules = stage.bossRules;
      return {
        bossHp: rules.bossHp,
        startingMinion: rules.startingMinion,
        spellDiscount: rules.spellDiscount,
        terrain: stage.terrain,
      };
    }
    if (hasTerrain) {
      return { terrain: stage.terrain };
    }
    return undefined;
  }, [stage.isBoss, stage.bossRules, stage.terrain]);

  const { gameState, winner, isOpponentTurn, playCard, attack, attackHero, endTurn, useHeroPower } = useGameState(
    playerDeck,
    paddedEnemy,
    aiDifficulty,
    bossConfig?.bossAI,
    bossConfig?.extraMana,
    bossHeroPower,
    bossInit,
  );

  const [earnedStars, setEarnedStars] = useState(0);
  const [isFirstClear, setIsFirstClear] = useState(false);
  const rewardsGrantedRef = useRef(false);

  useEffect(() => {
    if (winner !== 0 || !gameState || rewardsGrantedRef.current) return;
    rewardsGrantedRef.current = true;

    const hpPercent = (gameState.players[0].hero.health / 30) * 100;
    const turns = gameState.turn;
    let stars = 1;
    if (hpPercent >= stage.starThresholds.twoStarMinHpPercent && turns <= stage.starThresholds.twoStarMaxTurns) stars = 2;
    if (hpPercent >= stage.starThresholds.threeStarMinHpPercent && turns <= stage.starThresholds.threeStarMaxTurns) stars = 3;
    setEarnedStars(stars);

    const prevProgress = loadAdventureProgress();
    const wasCompleted = !!prevProgress.stages[stage.id]?.completed;
    setIsFirstClear(!wasCompleted);

    completeStage(stage.id, stars);

    if (!wasCompleted) {
      if (stage.rewards.gold) addGold(stage.rewards.gold);
      if (stage.rewards.xp) addXP(stage.rewards.xp);
      if (stage.rewards.cards && stage.rewards.cards.length > 0) {
        addCards(stage.rewards.cards);
      }
    }
  }, [winner, gameState, stage]);

  const enemyMaxHp = stage.bossRules?.bossHp ?? 30;

  if (!gameState) return null;

  if (winner !== null) {
    const playerWon = winner === 0;
    const isDraw = winner === "draw";

    if (!playerWon) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-red-950 via-red-900 to-yellow-900">
          <div className="text-center space-y-6">
            <h1 className={`text-5xl font-black ${isDraw ? "text-yellow-200/60" : "text-red-400"}`}
              style={{ textShadow: isDraw ? "0 0 20px rgba(200,200,100,0.4)" : "0 0 20px rgba(255,0,0,0.4)" }}
            >
              {isDraw ? "握手言和" : "💀 战败"}
            </h1>
            {!isDraw && <p className="text-red-200/60 text-lg">卷土重来！</p>}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  rewardsGrantedRef.current = false;
                  router.replace(`/adventure/stage/${chapterId}/${stage.id}`);
                }}
                className="rounded-lg border-2 border-yellow-500/60 bg-gradient-to-r from-red-800 to-red-700 px-8 py-3 text-yellow-300 font-bold hover:from-red-700 hover:to-red-600 transition-all hover:scale-105"
              >
                ⚔️ 再试一次
              </button>
              <button
                onClick={() => router.push("/adventure")}
                className="rounded-lg border border-yellow-600/40 bg-red-950/60 px-8 py-3 text-yellow-200/70 font-semibold hover:border-yellow-500/60 transition-colors"
              >
                返回地图
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-yellow-950 via-red-950 to-yellow-900">
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-black text-yellow-400"
            style={{ textShadow: "0 0 30px rgba(255,215,0,0.6)" }}
          >
            🎉 胜利!
          </h1>

          <div className="flex justify-center gap-2 text-4xl">
            {[1, 2, 3].map((i) => (
              <span key={i} className={i <= earnedStars ? "drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]" : "opacity-30"}>
                {i <= earnedStars ? "⭐" : "☆"}
              </span>
            ))}
          </div>

          {isFirstClear ? (
            <div className="space-y-2">
              <p className="text-yellow-300/80 text-sm font-semibold">首次通关奖励</p>
              <div className="flex flex-col items-center gap-1 text-lg text-yellow-200/80">
                {stage.rewards.gold && <p>💰 +{stage.rewards.gold} 金币</p>}
                {stage.rewards.xp && <p>✨ +{stage.rewards.xp} 经验</p>}
                {stage.rewards.cards && stage.rewards.cards.map((r, i) => (
                  <p key={i}>🃏 +{r.cardName} x{r.count}</p>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-yellow-200/50 text-sm">已领取过通关奖励</p>
          )}

          <button
            onClick={() => router.push("/adventure")}
            className="rounded-lg border-2 border-yellow-500/60 bg-gradient-to-r from-red-800 to-red-700 px-8 py-3 text-yellow-300 font-bold hover:from-red-700 hover:to-red-600 transition-all hover:scale-105"
          >
            返回冒险地图
          </button>
        </div>
      </div>
    );
  }

  const p = gameState.players[0];
  const e = gameState.players[1];
  const isPlayerTurn = !isOpponentTurn;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-red-950 via-red-900 to-yellow-900 text-yellow-100">
      <div className="flex items-center justify-between px-4 py-2 border-b border-yellow-600/30 text-sm">
        <span>回合 {gameState.turn}</span>
        <span className="font-bold">{stage.name}</span>
        <span>法力 {p.hero.mana}/{p.maxMana}</span>
      </div>

      {stage.tutorialHints && <TutorialHints hints={stage.tutorialHints} />}

      <div className="flex-1 flex flex-col px-2 py-2 gap-2 overflow-y-auto">
        <div className="text-center text-sm text-red-300">
          <button
            onClick={() => {
              if (selectedAttacker !== null) {
                attackHero(selectedAttacker);
                setSelectedAttacker(null);
              }
            }}
            className="hover:text-red-200 transition-colors"
          >
            敌方英雄 ❤️{e.hero.health}/{enemyMaxHp}
            {selectedAttacker !== null && " ← 点击攻击"}
          </button>
        </div>

        <div className="flex gap-1 justify-center min-h-[60px] flex-wrap">
          {e.board.map((m, i) => (
            <button
              key={i}
              onClick={() => {
                if (selectedAttacker !== null) {
                  attack(selectedAttacker, i);
                  setSelectedAttacker(null);
                }
              }}
              className={`rounded border px-2 py-1 text-xs transition-colors ${
                selectedAttacker !== null
                  ? "border-red-400 bg-red-900/80 hover:border-red-300 cursor-pointer"
                  : "border-red-500/40 bg-red-950/60"
              }`}
            >
              <div className="font-semibold truncate max-w-[60px]">{m.name}</div>
              <div className="text-red-300">{m.attack}/{m.health}</div>
              {m.taunt && <div className="text-yellow-500 text-[10px]">嘲讽</div>}
            </button>
          ))}
        </div>

        <div className="border-t border-yellow-600/20 my-1" />

        <div className="flex gap-1 justify-center min-h-[60px] flex-wrap">
          {p.board.map((m, i) => (
            <button
              key={i}
              onClick={() => {
                if (!isPlayerTurn) return;
                setSelectedAttacker(selectedAttacker === i ? null : i);
              }}
              className={`rounded border px-2 py-1 text-xs transition-colors ${
                selectedAttacker === i
                  ? "border-yellow-400 bg-yellow-900/40 ring-2 ring-yellow-400/50"
                  : "border-yellow-600/40 bg-red-950/60 hover:border-yellow-500/60"
              } ${isPlayerTurn ? "cursor-pointer" : "cursor-default"}`}
            >
              <div className="font-semibold truncate max-w-[60px]">{m.name}</div>
              <div className="text-yellow-300">{m.attack}/{m.health}</div>
              {m.taunt && <div className="text-yellow-500 text-[10px]">嘲讽</div>}
            </button>
          ))}
        </div>

        <div className="text-center text-sm">
          我方英雄 ❤️{p.hero.health}/30
        </div>

        <div className="flex gap-1 justify-center overflow-x-auto py-2">
          {p.hand.map((card, i) => (
            <button
              key={i}
              onClick={() => playCard(i)}
              disabled={!isPlayerTurn || card.cost > p.hero.mana}
              className={`rounded border px-2 py-1 text-xs min-w-[50px] transition-colors ${
                isPlayerTurn && card.cost <= p.hero.mana
                  ? "border-yellow-500/60 bg-red-900/80 hover:border-yellow-400 cursor-pointer"
                  : "border-yellow-600/20 bg-red-950/40 opacity-50 cursor-not-allowed"
              }`}
            >
              <div className="text-yellow-400">{card.cost}费</div>
              <div className="font-semibold truncate max-w-[50px]">{card.name}</div>
              {card.attack !== undefined && <div>{card.attack}/{card.health}</div>}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-yellow-600/30">
        <button
          onClick={() => useHeroPower()}
          disabled={!isPlayerTurn}
          className="rounded border border-yellow-600/40 bg-red-950/60 px-3 py-2 text-sm hover:border-yellow-500 transition-colors disabled:opacity-40"
        >
          英雄技能
        </button>
        <button
          onClick={() => endTurn()}
          disabled={!isPlayerTurn}
          className="rounded border-2 border-yellow-500/60 bg-red-800 px-4 py-2 text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-40"
        >
          结束回合
        </button>
      </div>
    </div>
  );
}
