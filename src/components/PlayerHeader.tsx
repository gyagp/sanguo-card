"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { loadPlayer } from "../game/player-store";
import { PlayerProfile, XP_THRESHOLDS, getXPProgress } from "../game/progression";

export default function PlayerHeader() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);

  useEffect(() => {
    setProfile(loadPlayer());

    const handleStorage = () => setProfile(loadPlayer());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  if (!profile) return null;

  const xp = getXPProgress(profile);
  const isMaxLevel = profile.level >= XP_THRESHOLDS.length;

  return (
    <header className="w-full bg-red-950/80 border-b border-yellow-600/30 px-4 py-2">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <Link
          href="/"
          className="text-yellow-400 font-bold text-lg hover:text-yellow-300 transition-colors shrink-0"
        >
          三国卡牌
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-yellow-400 font-bold">Lv.{profile.level}</span>
            {!isMaxLevel && (
              <div className="w-20 h-2 bg-red-900/60 rounded-full overflow-hidden border border-yellow-600/20">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all duration-300"
                  style={{ width: `${xp.percent}%` }}
                />
              </div>
            )}
            {isMaxLevel ? (
              <span className="text-yellow-200/60 text-xs">MAX</span>
            ) : (
              <span className="text-yellow-200/60 text-xs">
                {xp.current}/{xp.needed}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <span className="text-yellow-500">💰</span>
            <span className="text-yellow-100 font-semibold">{profile.gold}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
