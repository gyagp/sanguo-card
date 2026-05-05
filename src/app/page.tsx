"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { loadPlayer } from "../game/player-store";
import { PlayerProfile, XP_THRESHOLDS, getXPProgress, LEVEL_UNLOCKS } from "../game/progression";

const menuItems = [
  { label: "开始对战", href: "/game", icon: "⚔" },
  { label: "组建卡组", href: "/deck-builder", icon: "📜" },
  { label: "卡牌收藏", href: "/collection", icon: "🃏" },
  { label: "商店", href: "/shop", icon: "🏪" },
  { label: "卡牌图鉴", href: "/cards", icon: "📖" },
  { label: "设置", href: "/settings", icon: "⚙" },
] as const;

export default function Home() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);

  useEffect(() => {
    setProfile(loadPlayer());
  }, []);

  const xp = profile ? getXPProgress(profile) : null;
  const isMaxLevel = profile ? profile.level >= XP_THRESHOLDS.length : false;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-red-950 via-red-900 to-yellow-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-900/20 via-transparent to-transparent" />

      <main className="relative z-10 flex flex-col items-center gap-6 sm:gap-8 md:gap-12 px-4 sm:px-6 md:px-8 w-full max-w-sm sm:max-w-md">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-wider text-yellow-400 drop-shadow-[0_2px_8px_rgba(234,179,8,0.4)] md:text-6xl">
            三国卡牌
          </h1>
          <p className="text-lg tracking-widest text-yellow-200/60">
            三国卡牌对战
          </p>
        </div>

        {profile && (
          <div className="w-full rounded-lg border border-yellow-600/40 bg-red-950/60 px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏯</span>
                <span className="text-yellow-400 font-bold text-xl">Lv.{profile.level}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-yellow-500 text-lg">💰</span>
                <span className="text-yellow-100 font-bold text-lg">{profile.gold}</span>
              </div>
            </div>

            <div className="mb-1 flex items-center justify-between text-xs text-yellow-200/60">
              <span>经验值</span>
              {isMaxLevel ? (
                <span className="text-yellow-400">满级</span>
              ) : (
                <span>{xp!.current} / {xp!.needed}</span>
              )}
            </div>
            <div className="w-full h-3 bg-red-900/60 rounded-full overflow-hidden border border-yellow-600/20">
              <div
                className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full transition-all duration-500"
                style={{ width: `${isMaxLevel ? 100 : xp!.percent}%` }}
              />
            </div>

            <div className="mt-3 pt-3 border-t border-yellow-600/20">
              <p className="text-xs text-yellow-200/50 mb-2">等级解锁</p>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(LEVEL_UNLOCKS).map(([lvl, feature]) => {
                  const unlocked = profile.level >= Number(lvl);
                  return (
                    <div
                      key={lvl}
                      className={`flex items-center gap-1.5 text-xs rounded px-2 py-1 ${
                        unlocked
                          ? "text-yellow-300 bg-yellow-900/20"
                          : "text-yellow-200/30 bg-red-900/20"
                      }`}
                    >
                      <span>{unlocked ? "✓" : "🔒"}</span>
                      <span>Lv.{lvl}</span>
                      <span className="truncate">{feature}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <nav className="flex flex-col gap-4 w-full">
          {menuItems.map(({ label, href, icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center justify-center gap-3 rounded-lg border border-yellow-600/40 bg-red-950/60 px-8 py-4 text-xl font-semibold text-yellow-100 shadow-lg transition-all hover:border-yellow-500/70 hover:bg-red-900/80 hover:shadow-yellow-900/30 hover:scale-105 active:scale-100"
            >
              <span className="text-2xl transition-transform group-hover:scale-110">
                {icon}
              </span>
              {label}
            </Link>
          ))}
        </nav>

        <div className="w-full rounded-lg border border-yellow-600/30 bg-red-950/50 px-5 py-4 text-yellow-100/90 text-sm leading-relaxed">
          <h2 className="text-center text-lg font-bold text-yellow-400 mb-3">玩法说明</h2>
          <ul className="space-y-2">
            <li><span className="text-yellow-400 font-bold">目标：</span>将对方英雄的生命值降至0即可获胜。</li>
            <li><span className="text-yellow-400 font-bold">法力水晶：</span>每回合获得1颗法力水晶（上限10颗），用于打出卡牌。</li>
            <li><span className="text-yellow-400 font-bold">出牌：</span>点击手牌中的卡牌将其打出到战场（需要足够的法力值）。</li>
            <li><span className="text-yellow-400 font-bold">攻击：</span>点击己方随从，再点击敌方随从或英雄进行攻击。随从在打出的回合不能攻击。</li>
            <li><span className="text-yellow-400 font-bold">英雄技能：</span>每回合可使用一次英雄技能（消耗2点法力）。</li>
            <li><span className="text-yellow-400 font-bold">回合结束：</span>点击"结束回合"按钮将回合交给对手。</li>
          </ul>
          <div className="mt-3 pt-3 border-t border-yellow-600/20 text-xs text-yellow-200/50 space-y-1">
            <p><span className="text-yellow-400">随从卡：</span>召唤随从到战场，拥有攻击力和生命值。</p>
            <p><span className="text-yellow-400">法术卡：</span>立即产生效果（如造成伤害、恢复生命等）。</p>
            <p><span className="text-yellow-400">武器卡：</span>装备武器后英雄可以直接攻击。</p>
          </div>
        </div>
      </main>
    </div>
  );
}
