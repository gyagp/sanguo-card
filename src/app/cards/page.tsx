"use client";

import { useState } from "react";
import { cards } from "../../game/cards";
import { Card as CardData } from "../../game/types";
import Card from "../../components/Card";

const rarities: CardData["rarity"][] = ["common", "rare", "epic", "legendary"];
const factions: CardData["faction"][] = ["wei", "shu", "wu", "qun", "neutral"];
const types: CardData["type"][] = ["minion", "spell", "weapon"];

const factionLabels: Record<CardData["faction"], string> = {
  wei: "魏 Wei",
  shu: "蜀 Shu",
  wu: "吴 Wu",
  qun: "群 Qun",
  neutral: "中立 Neutral",
};

const rarityColors: Record<CardData["rarity"], string> = {
  common: "bg-gray-500",
  rare: "bg-blue-500",
  epic: "bg-purple-500",
  legendary: "bg-orange-500",
};

export default function CardsPage() {
  const [filterRarity, setFilterRarity] = useState<CardData["rarity"] | "all">("all");
  const [filterFaction, setFilterFaction] = useState<CardData["faction"] | "all">("all");
  const [filterType, setFilterType] = useState<CardData["type"] | "all">("all");

  const filtered = cards.filter((c) => {
    if (filterRarity !== "all" && c.rarity !== filterRarity) return false;
    if (filterFaction !== "all" && c.faction !== filterFaction) return false;
    if (filterType !== "all" && c.type !== filterType) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4 md:p-8">
      <h1 className="text-4xl font-bold text-center mb-2">Card Gallery</h1>
      <p className="text-center text-gray-400 mb-8">
        {filtered.length} of {cards.length} cards
      </p>

      <div className="flex flex-col items-center gap-3 mb-8 md:flex-row md:flex-wrap md:justify-center md:gap-4">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm text-gray-400">Rarity:</span>
          {(["all", ...rarities] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRarity(r)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                filterRarity === r
                  ? r === "all"
                    ? "bg-white text-black"
                    : `${rarityColors[r as CardData["rarity"]]} text-white`
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm text-gray-400">Faction:</span>
          {(["all", ...factions] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterFaction(f)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                filterFaction === f
                  ? "bg-white text-black"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {f === "all" ? "All" : factionLabels[f as CardData["faction"]]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm text-gray-400">Type:</span>
          {(["all", ...types] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                filterType === t
                  ? "bg-white text-black"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-6 px-2">
        {filtered.map((card, i) => (
          <div key={`${card.name}-${i}`} className="scale-75 sm:scale-90 md:scale-100 origin-top -m-4 sm:-m-2 md:m-0">
            <Card card={card} />
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-500 mt-12 text-lg">
          No cards match the selected filters.
        </p>
      )}
    </div>
  );
}
