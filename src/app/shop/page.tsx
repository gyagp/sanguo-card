"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { loadPlayer, openCardPack, PackResult } from "../../game/player-store";
import { cards as allCards } from "../../game/cards";
import { Card as CardData, Rarity } from "../../game/types";
import Card from "../../components/Card";
import { PACK_PRICE } from "../../game/progression";

type ShopPhase = "idle" | "revealing" | "done";

const rarityLabel: Record<Rarity, string> = {
  common: "普通",
  rare: "精良",
  epic: "史诗",
  legendary: "传说",
};

const rarityOverlayColor: Record<Rarity, string> = {
  common: "from-gray-400/30",
  rare: "from-blue-500/40",
  epic: "from-purple-500/50",
  legendary: "from-yellow-400/60",
};

const rarityTextColor: Record<Rarity, string> = {
  common: "text-gray-300",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

export default function ShopPage() {
  const [mounted, setMounted] = useState(false);
  const [gold, setGold] = useState(0);
  const [phase, setPhase] = useState<ShopPhase>("idle");
  const [packCards, setPackCards] = useState<{ cardName: string; rarity: Rarity }[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    const player = loadPlayer();
    setGold(player.gold);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const revealNext = useCallback((cards: { cardName: string; rarity: Rarity }[], current: number) => {
    if (current >= cards.length) {
      setPhase("done");
      return;
    }
    setRevealedCount(current + 1);
    timerRef.current = setTimeout(() => {
      revealNext(cards, current + 1);
    }, 600);
  }, []);

  const handleBuyPack = useCallback(() => {
    setErrorMsg("");
    const result: PackResult = openCardPack();
    if (!result.success) {
      setErrorMsg("金币不足！需要 " + PACK_PRICE + " 金币");
      return;
    }
    setGold(result.player.gold);
    setPackCards(result.cards);
    setRevealedCount(0);
    setPhase("revealing");
    timerRef.current = setTimeout(() => {
      revealNext(result.cards, 0);
    }, 300);
  }, [revealNext]);

  const handleDone = useCallback(() => {
    setPhase("idle");
    setPackCards([]);
    setRevealedCount(0);
    const player = loadPlayer();
    setGold(player.gold);
  }, []);

  if (!mounted) return null;

  const cardDataMap = new Map(allCards.map((c) => [c.name, c]));

  function getCardData(cardName: string): CardData | undefined {
    return cardDataMap.get(cardName);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-950 via-red-900 to-yellow-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-900/20 via-transparent to-transparent" />

      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-yellow-400 hover:text-yellow-300 transition-colors">
          &larr; 返回主菜单
        </Link>
        <h1 className="text-3xl font-bold text-yellow-400 drop-shadow-[0_2px_8px_rgba(234,179,8,0.4)]">
          商店
        </h1>
        <div className="flex items-center gap-2 bg-red-950/60 border border-yellow-600/40 rounded-lg px-4 py-2">
          <span className="text-yellow-400 text-lg">$</span>
          <span className="text-yellow-100 font-bold text-lg">{gold}</span>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center px-4 pb-8">
        {phase === "idle" && (
          <div className="flex flex-col items-center gap-8 mt-12">
            <div className="bg-red-950/60 border border-yellow-600/40 rounded-xl p-8 flex flex-col items-center gap-6 shadow-lg max-w-md w-full">
              <h2 className="text-2xl font-bold text-yellow-400">标准卡包</h2>
              <div className="text-6xl">🎴</div>
              <p className="text-yellow-100/80 text-center">
                包含5张随机卡牌，至少保证1张精良或以上品质
              </p>
              <div className="flex items-center gap-2 text-yellow-400 text-xl font-bold">
                <span>$ {PACK_PRICE}</span>
              </div>
              <button
                onClick={handleBuyPack}
                disabled={gold < PACK_PRICE}
                className={`
                  px-8 py-3 rounded-lg text-xl font-bold transition-all
                  ${gold >= PACK_PRICE
                    ? "bg-yellow-600 hover:bg-yellow-500 text-red-950 hover:scale-105 active:scale-100 shadow-lg"
                    : "bg-gray-600 text-gray-400 cursor-not-allowed"
                  }
                `}
              >
                购买卡包
              </button>
              {errorMsg && (
                <p className="text-red-400 text-sm">{errorMsg}</p>
              )}
            </div>
          </div>
        )}

        {(phase === "revealing" || phase === "done") && (
          <div className="flex flex-col items-center gap-8 mt-8">
            <h2 className="text-2xl font-bold text-yellow-400">
              {phase === "revealing" ? "开启卡包..." : "获得卡牌！"}
            </h2>
            <div className="flex flex-wrap justify-center gap-6">
              {packCards.map((pc, i) => {
                const revealed = i < revealedCount;
                const cardData = getCardData(pc.cardName);

                if (!revealed) {
                  return (
                    <div
                      key={i}
                      className="w-44 h-64 rounded-xl border-2 border-yellow-600/30 bg-red-950/80 flex items-center justify-center shadow-lg"
                    >
                      <span className="text-4xl opacity-40">?</span>
                    </div>
                  );
                }

                return (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div
                      className={`
                        relative rounded-xl overflow-visible
                        ${pc.rarity === "legendary" ? "animate-pulse" : ""}
                      `}
                      style={{
                        animation: revealed ? "cardReveal 0.4s ease-out" : undefined,
                      }}
                    >
                      <div className={`absolute -inset-2 rounded-2xl bg-gradient-to-t ${rarityOverlayColor[pc.rarity]} to-transparent pointer-events-none`} />
                      {cardData ? (
                        <Card card={cardData} />
                      ) : (
                        <div className="w-44 h-64 rounded-xl border-2 border-yellow-600/40 bg-red-950/60 flex items-center justify-center">
                          <span className="text-yellow-100">{pc.cardName}</span>
                        </div>
                      )}
                    </div>
                    <span className={`text-sm font-bold ${rarityTextColor[pc.rarity]}`}>
                      {rarityLabel[pc.rarity]}
                    </span>
                  </div>
                );
              })}
            </div>

            {phase === "done" && (
              <button
                onClick={handleDone}
                className="px-8 py-3 rounded-lg text-xl font-bold bg-yellow-600 hover:bg-yellow-500 text-red-950 hover:scale-105 active:scale-100 shadow-lg transition-all"
              >
                确认收下
              </button>
            )}
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes cardReveal {
          0% { transform: scale(0.5) rotateY(90deg); opacity: 0; }
          60% { transform: scale(1.1) rotateY(0deg); opacity: 1; }
          100% { transform: scale(1) rotateY(0deg); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
