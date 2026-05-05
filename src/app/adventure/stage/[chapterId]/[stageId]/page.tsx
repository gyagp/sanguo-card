"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { adventureChapters, AdventureStage, AdventureChapter } from "../../../../../game/adventure-data";
import { cards } from "../../../../../game/cards";
import { Card, createDeck, Deck } from "../../../../../game/types";
import { useGameState } from "../../../../../hooks/useGameState";
import { AIDifficulty } from "../../../../../game/ai";
import { loadAdventureProgress, isStageUnlocked, completeStage } from "../../../../../game/player-store";

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

  return <AdventureBattle stage={stage} playerDeck={playerDeck} />;
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
    const pool = cards.filter((c) => c.rarity !== "legendary");
    const deck: Card[] = [];
    for (let i = 0; i < 30; i++) {
      deck.push({ ...pool[Math.floor(Math.random() * pool.length)] });
    }
    return deck;
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

function AdventureBattle({ stage, playerDeck }: { stage: AdventureStage; playerDeck: Deck }) {
  const router = useRouter();
  const [selectedAttacker, setSelectedAttacker] = useState<number | null>(null);
  const enemyCards = useMemo(() => resolveEnemyDeck(stage.enemyDeck), [stage.enemyDeck]);
  const aiDifficulty = useMemo(() => difficultyToAI(stage.difficulty), [stage.difficulty]);

  const paddedEnemy = useMemo(() => {
    const deck = [...enemyCards];
    while (deck.length < 30) {
      deck.push({ ...enemyCards[Math.floor(Math.random() * enemyCards.length)] });
    }
    return createDeck(deck);
  }, [enemyCards]);

  const { gameState, winner, isOpponentTurn, playCard, attack, attackHero, endTurn, useHeroPower } = useGameState(
    playerDeck,
    paddedEnemy,
    aiDifficulty,
  );

  useEffect(() => {
    if (winner === 0 && gameState) {
      const hpPercent = (gameState.players[0].hero.health / 30) * 100;
      const turns = gameState.turn;
      let stars = 1;
      if (hpPercent >= stage.starThresholds.twoStarMinHpPercent && turns <= stage.starThresholds.twoStarMaxTurns) stars = 2;
      if (hpPercent >= stage.starThresholds.threeStarMinHpPercent && turns <= stage.starThresholds.threeStarMaxTurns) stars = 3;
      completeStage(stage.id, stars);
    }
  }, [winner, gameState, stage]);

  if (!gameState) return null;

  if (winner !== null) {
    const playerWon = winner === 0;
    const isDraw = winner === "draw";
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-red-950 via-red-900 to-yellow-900">
        <div className="text-center space-y-6">
          <h1 className={`text-4xl font-bold ${playerWon ? "text-yellow-400" : isDraw ? "text-yellow-200/60" : "text-red-400"}`}>
            {playerWon ? "🎉 胜利!" : isDraw ? "握手言和" : "💀 战败"}
          </h1>
          {playerWon && (
            <div className="text-yellow-200/70 space-y-1">
              {stage.rewards.gold && <p>💰 +{stage.rewards.gold} 金币</p>}
              {stage.rewards.xp && <p>✨ +{stage.rewards.xp} 经验</p>}
            </div>
          )}
          <button
            onClick={() => router.push("/adventure")}
            className="rounded-lg border border-yellow-500/60 bg-red-800 px-8 py-3 text-yellow-300 font-semibold hover:bg-red-700 transition-colors"
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
            敌方英雄 ❤️{e.hero.health}/30
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
