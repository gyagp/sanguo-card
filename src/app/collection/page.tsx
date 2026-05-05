"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cards } from "../../game/cards";
import { Card as CardData } from "../../game/types";
import Card from "../../components/Card";
import {
  loadPlayer,
  upgradeCard,
  getUpgradedStats,
} from "../../game/player-store";
import {
  OwnedCard,
  PlayerProfile,
  UPGRADE_COSTS,
  DUPLICATE_COST_PER_LEVEL,
} from "../../game/progression";

const factions: CardData["faction"][] = ["wei", "shu", "wu", "qun", "neutral"];
const rarities: CardData["rarity"][] = ["common", "rare", "epic", "legendary"];

const factionLabels: Record<CardData["faction"], string> = {
  wei: "魏",
  shu: "蜀",
  wu: "吴",
  qun: "群",
  neutral: "中立",
};

const rarityLabels: Record<CardData["rarity"], string> = {
  common: "普通",
  rare: "稀有",
  epic: "史诗",
  legendary: "传说",
};

const rarityColors: Record<CardData["rarity"], string> = {
  common: "bg-gray-500",
  rare: "bg-blue-500",
  epic: "bg-purple-500",
  legendary: "bg-orange-500",
};

export default function CollectionPage() {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [filterFaction, setFilterFaction] = useState<CardData["faction"] | "all">("all");
  const [filterRarity, setFilterRarity] = useState<CardData["rarity"] | "all">("all");
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  useEffect(() => {
    setPlayer(loadPlayer());
  }, []);

  if (!player) return null;

  const ownedMap = new Map<string, OwnedCard>();
  for (const oc of player.ownedCards) {
    ownedMap.set(oc.cardName, oc);
  }

  const ownedCount = cards.filter((c) => ownedMap.has(c.name)).length;

  const filtered = cards.filter((c) => {
    if (filterFaction !== "all" && c.faction !== filterFaction) return false;
    if (filterRarity !== "all" && c.rarity !== filterRarity) return false;
    return true;
  });

  const selectedBaseCard = selectedCard
    ? cards.find((c) => c.name === selectedCard)
    : null;
  const selectedOwned = selectedCard ? ownedMap.get(selectedCard) : null;

  function handleUpgrade(cardName: string) {
    const result = upgradeCard(cardName);
    setPlayer(result.player);
    if (!result.success) {
      if (result.reason === "not_enough_gold") alert("金币不足！");
      else if (result.reason === "not_enough_duplicates") alert("重复卡牌不足！");
      else if (result.reason === "max_level") alert("已达最高等级！");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-950 via-red-900 to-yellow-900 text-white p-4 md:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-900/20 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            ← 返回
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-yellow-400 drop-shadow-[0_2px_8px_rgba(234,179,8,0.4)]">
            卡牌收藏
          </h1>
          <div className="text-yellow-200 text-sm">
            💰 {player.gold}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-yellow-200 mb-1">
            <span>收藏进度</span>
            <span>{ownedCount} / {cards.length} 张</span>
          </div>
          <div className="w-full h-3 bg-red-950/80 rounded-full border border-yellow-600/30 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all duration-500"
              style={{ width: `${(ownedCount / cards.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col items-center gap-3 mb-8 md:flex-row md:flex-wrap md:justify-center md:gap-4">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-yellow-200/60">势力：</span>
            {(["all", ...factions] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterFaction(f)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  filterFaction === f
                    ? "bg-yellow-500 text-black"
                    : "bg-red-950/60 text-yellow-200 border border-yellow-600/30 hover:bg-red-900/80"
                }`}
              >
                {f === "all" ? "全部" : factionLabels[f as CardData["faction"]]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-yellow-200/60">品质：</span>
            {(["all", ...rarities] as const).map((r) => (
              <button
                key={r}
                onClick={() => setFilterRarity(r)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  filterRarity === r
                    ? r === "all"
                      ? "bg-yellow-500 text-black"
                      : `${rarityColors[r as CardData["rarity"]]} text-white`
                    : "bg-red-950/60 text-yellow-200 border border-yellow-600/30 hover:bg-red-900/80"
                }`}
              >
                {r === "all" ? "全部" : rarityLabels[r as CardData["rarity"]]}
              </button>
            ))}
          </div>
        </div>

        {/* Card grid */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-6 px-2">
          {filtered.map((card) => {
            const owned = ownedMap.get(card.name);
            const isOwned = !!owned;
            return (
              <div
                key={card.name}
                className="relative scale-75 sm:scale-90 md:scale-100 origin-top -m-4 sm:-m-2 md:m-0 cursor-pointer"
                onClick={() => isOwned && setSelectedCard(card.name)}
              >
                <div className={isOwned ? "" : "grayscale opacity-50 pointer-events-none"}>
                  <Card card={card} />
                </div>
                {!isOwned && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl opacity-70">🔒</span>
                  </div>
                )}
                {isOwned && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-2 text-xs">
                    <span className="bg-black/70 px-2 py-0.5 rounded text-yellow-300">
                      ×{owned.count}
                    </span>
                    {owned.upgradeLevel > 0 && (
                      <span className="bg-black/70 px-2 py-0.5 rounded text-green-400">
                        Lv.{owned.upgradeLevel}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-yellow-200/50 mt-12 text-lg">
            没有符合条件的卡牌
          </p>
        )}

        {/* Upgrade modal */}
        {selectedCard && selectedBaseCard && selectedOwned && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            onClick={() => setSelectedCard(null)}
          >
            <div
              className="bg-gradient-to-b from-red-950 to-red-900 border border-yellow-600/50 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-yellow-400 text-center mb-4">
                {selectedBaseCard.name}
              </h2>
              <div className="flex justify-center mb-4">
                <Card card={selectedBaseCard} />
              </div>
              <div className="space-y-2 text-sm text-yellow-100 mb-4">
                <div className="flex justify-between">
                  <span>数量</span>
                  <span>×{selectedOwned.count}</span>
                </div>
                <div className="flex justify-between">
                  <span>等级</span>
                  <span>Lv.{selectedOwned.upgradeLevel} / 3</span>
                </div>
                {selectedBaseCard.type === "minion" && (
                  <div className="flex justify-between">
                    <span>当前属性</span>
                    <span>
                      ⚔ {getUpgradedStats(selectedBaseCard, selectedOwned.upgradeLevel).attack}{" "}
                      / ❤ {getUpgradedStats(selectedBaseCard, selectedOwned.upgradeLevel).health}
                    </span>
                  </div>
                )}
              </div>

              {selectedOwned.upgradeLevel < 3 ? (
                <>
                  <div className="text-xs text-yellow-200/60 mb-3 space-y-1">
                    <div>升级费用：{UPGRADE_COSTS[selectedOwned.upgradeLevel + 1]} 金币</div>
                    <div>
                      需要重复卡：{DUPLICATE_COST_PER_LEVEL[selectedOwned.upgradeLevel + 1]} 张
                      （当前 {Math.max(0, selectedOwned.count - 1)} 张可用）
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpgrade(selectedCard)}
                    className="w-full py-2 rounded-lg bg-yellow-500 text-black font-bold hover:bg-yellow-400 transition-colors"
                  >
                    升级
                  </button>
                </>
              ) : (
                <div className="text-center text-green-400 font-bold">
                  已达最高等级
                </div>
              )}

              <button
                onClick={() => setSelectedCard(null)}
                className="w-full mt-3 py-2 rounded-lg border border-yellow-600/40 text-yellow-200 hover:bg-red-900/80 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
