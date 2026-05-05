"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adventureChapters, AdventureChapter, AdventureStage } from "../../game/adventure-data";
import { loadAdventureProgress, isStageUnlocked, AdventureProgress } from "../../game/player-store";

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= count ? "text-yellow-400" : "text-yellow-900/40"}>
          ★
        </span>
      ))}
    </div>
  );
}

function StageCard({
  stage,
  progress,
  unlocked,
  onClick,
}: {
  stage: AdventureStage;
  progress: AdventureProgress;
  unlocked: boolean;
  onClick: () => void;
}) {
  const stageProgress = progress.stages[stage.id];
  const completed = stageProgress?.completed ?? false;
  const stars = stageProgress?.stars ?? 0;

  const base = stage.isBoss
    ? "border-red-500/60 bg-red-950/80"
    : "border-yellow-600/40 bg-red-950/60";

  if (!unlocked) {
    return (
      <div className={`rounded-lg border border-yellow-600/20 bg-red-950/30 px-4 py-3 opacity-50 cursor-not-allowed`}>
        <div className="flex items-center justify-between">
          <span className="text-yellow-200/40 text-sm">{stage.name}</span>
          <span className="text-yellow-200/30 text-lg">🔒</span>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border ${base} px-4 py-3 text-left transition-all hover:border-yellow-500/70 hover:bg-red-900/80 hover:scale-[1.02] active:scale-100`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {stage.isBoss && <span className="text-red-400 text-lg">👹</span>}
          <span className={`font-semibold ${stage.isBoss ? "text-red-300" : "text-yellow-100"}`}>
            {stage.name}
          </span>
        </div>
        {completed ? <Stars count={stars} /> : <span className="text-yellow-200/40 text-xs">未通关</span>}
      </div>
      <p className="text-xs text-yellow-200/50 mt-1">{stage.description}</p>
      {stage.isBoss && stage.bossRules && (
        <div className="mt-2 pt-2 border-t border-red-500/30">
          <p className="text-xs text-red-300/70">BOSS - {stage.bossRules.uniqueHeroPower?.name}</p>
        </div>
      )}
      <div className="flex items-center gap-3 mt-2 text-xs text-yellow-200/40">
        <span>难度 {"⭐".repeat(Math.min(stage.difficulty, 5))}</span>
        <span>💰{stage.rewards.gold}</span>
        <span>✨{stage.rewards.xp}xp</span>
      </div>
    </button>
  );
}

export default function AdventurePage() {
  const router = useRouter();
  const [progress, setProgress] = useState<AdventureProgress | null>(null);
  const [selectedChapter, setSelectedChapter] = useState(0);

  useEffect(() => {
    setProgress(loadAdventureProgress());
  }, []);

  if (!progress) return null;

  const chapter = adventureChapters[selectedChapter];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-red-950 via-red-900 to-yellow-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-900/20 via-transparent to-transparent" />

      <header className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-yellow-600/30">
        <Link href="/" className="text-yellow-400 hover:text-yellow-300 transition-colors">
          ← 返回
        </Link>
        <h1 className="text-xl font-bold text-yellow-400">冒险模式</h1>
        <div className="w-12" />
      </header>

      <div className="relative z-10 flex overflow-x-auto px-4 py-3 gap-2 border-b border-yellow-600/20">
        {adventureChapters.map((ch, i) => {
          const isUnlocked = progress.chaptersUnlocked.includes(ch.id);
          return (
            <button
              key={ch.id}
              onClick={() => isUnlocked && setSelectedChapter(i)}
              disabled={!isUnlocked}
              className={`flex-shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                i === selectedChapter
                  ? "bg-yellow-600/30 border border-yellow-500/60 text-yellow-300"
                  : isUnlocked
                    ? "border border-yellow-600/20 text-yellow-200/70 hover:text-yellow-200 hover:border-yellow-600/40"
                    : "border border-yellow-600/10 text-yellow-200/30 cursor-not-allowed"
              }`}
            >
              {isUnlocked ? ch.name : `🔒 ${ch.name}`}
            </button>
          );
        })}
      </div>

      <div className="relative z-10 px-4 py-3">
        <p className="text-yellow-200/60 text-sm">{chapter.description}</p>
      </div>

      <div className="relative z-10 flex-1 px-4 pb-6 overflow-y-auto">
        <div className="flex flex-col gap-3 max-w-lg mx-auto">
          {chapter.stages.map((stage) => (
            <StageCard
              key={stage.id}
              stage={stage}
              progress={progress}
              unlocked={isStageUnlocked(stage.id, progress)}
              onClick={() => router.push(`/adventure/${stage.id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
