import { useState } from "react";
import { Card as CardData } from "../game/types";
import { getCardArt } from "../game/card-art";

const rarityStyles: Record<CardData["rarity"], string> = {
  common: "border-gray-400 shadow-gray-400/40",
  rare: "border-blue-500 shadow-blue-500/40",
  epic: "border-purple-500 shadow-purple-500/40",
  legendary: "border-orange-500 shadow-orange-500/40",
};

const rarityGlow: Record<CardData["rarity"], string> = {
  common: "hover:shadow-gray-400/60",
  rare: "hover:shadow-blue-500/60",
  epic: "hover:shadow-purple-500/60",
  legendary: "hover:shadow-orange-500/60",
};

const factionBg: Record<CardData["faction"], string> = {
  wei: "bg-blue-900/80",
  shu: "bg-green-900/80",
  wu: "bg-red-900/80",
  qun: "bg-yellow-900/80",
  neutral: "bg-gray-800/80",
};

const factionArtBg: Record<CardData["faction"], string> = {
  wei: "bg-blue-800/50",
  shu: "bg-green-800/50",
  wu: "bg-red-800/50",
  qun: "bg-amber-800/50",
  neutral: "bg-gray-700/50",
};

const rarityBanner: Record<CardData["rarity"], string> = {
  common: "",
  rare: "ring-1 ring-blue-400/30",
  epic: "ring-1 ring-purple-400/30",
  legendary: "ring-2 ring-orange-400/50 shadow-[0_0_12px_rgba(251,191,36,0.3)]",
};

interface CardProps {
  card: CardData;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
  draggable?: boolean;
  handIndex?: number;
  insufficientMana?: boolean;
}

export default function Card({ card, onClick, className = "", draggable: isDraggable, handIndex, insufficientMana }: CardProps) {
  const [pngFailed, setPngFailed] = useState(false);
  const isMinion = card.type === "minion";
  const isWeapon = card.type === "weapon";
  const art = getCardArt(card.name);
  const pngSrc = `/card-art/${encodeURIComponent(card.name)}.png`;

  const handleDragStart = (e: React.DragEvent) => {
    if (insufficientMana) {
      e.preventDefault();
      return;
    }
    if (handIndex !== undefined) {
      e.dataTransfer.setData("text/plain", String(handIndex));
      e.dataTransfer.effectAllowed = "move";
    }
  };

  return (
    <div
      onClick={onClick}
      draggable={isDraggable && !insufficientMana}
      onDragStart={handleDragStart}
      className={`
        relative w-44 h-64 rounded-xl border-3 select-none overflow-hidden
        transition-all duration-200 ease-out
        hover:scale-110 hover:z-10 hover:shadow-lg
        ${insufficientMana ? "opacity-50 cursor-not-allowed grayscale-[40%]" : "cursor-pointer"}
        ${rarityStyles[card.rarity]}
        ${rarityGlow[card.rarity]}
        ${rarityBanner[card.rarity]}
        ${factionBg[card.faction]}
        ${className}
      `}
      style={card.rarity === "legendary" ? { animation: "legendaryCardGlow 2.5s ease-in-out infinite" } : undefined}
    >
      {/* Legendary multi-layer glow */}
      {card.rarity === "legendary" && (
        <>
          {/* Animated border glow */}
          <div
            className="absolute -inset-[2px] rounded-xl pointer-events-none z-0"
            style={{
              background: "linear-gradient(135deg, rgba(255,215,0,0.6), rgba(255,165,0,0.3), rgba(255,215,0,0.6))",
              animation: "legendaryBorderGlow 2s ease-in-out infinite",
            }}
          />
          {/* Shimmer sweep */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl z-[1]">
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.15) 45%, rgba(255,255,255,0.25) 50%, rgba(255,215,0,0.15) 55%, transparent 100%)",
                animation: "legendaryCardShimmer 3s ease-in-out infinite",
              }}
            />
          </div>
          {/* Floating gold particles */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="absolute bottom-2 rounded-full pointer-events-none z-[2]"
              style={{
                width: `${3 + (i % 3)}px`,
                height: `${3 + (i % 3)}px`,
                left: `${12 + i * 14}%`,
                background: "radial-gradient(circle, rgba(255,215,0,0.9), rgba(255,165,0,0.4))",
                ["--float-x" as string]: `${(i % 2 === 0 ? 1 : -1) * (5 + i * 2)}px`,
                animation: `legendaryFloat ${2 + (i % 3) * 0.5}s ease-in-out ${i * 0.4}s infinite`,
              }}
            />
          ))}
        </>
      )}

      {/* Mana crystal */}
      <div className="absolute -top-2 -left-2 w-10 h-10 rounded-full bg-blue-600 border-2 border-blue-300 flex items-center justify-center text-white font-bold text-lg shadow-md z-10">
        {card.cost}
      </div>

      {/* Card art area */}
      <div className={`
        mx-2.5 mt-7 h-28 rounded-lg flex items-center justify-center overflow-hidden
        ${factionArtBg[card.faction]}
      `}>
        {!pngFailed ? (
          <img
            src={pngSrc}
            alt={card.name}
            className="w-full h-full object-cover"
            onError={() => setPngFailed(true)}
            draggable={false}
          />
        ) : art ? (
          <div
            className="w-full h-full flex items-center justify-center p-1"
            dangerouslySetInnerHTML={{ __html: art }}
          />
        ) : (
          <div className="text-5xl opacity-60">
            {card.type === "spell" ? "✨" : card.type === "weapon" ? "🗡️" : "⚔️"}
          </div>
        )}
      </div>

      {/* Name banner */}
      <div className="mx-1 mt-1.5 text-center bg-black/30 rounded py-0.5 px-1">
        <p className="text-white font-bold text-sm truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{card.name}</p>
      </div>

      {/* Description */}
      <div className="mx-2.5 mt-1 h-12 overflow-hidden">
        <p className="text-gray-200 text-[11px] text-center leading-tight">{card.description}</p>
      </div>

      {/* Attack & Health */}
      {(isMinion || isWeapon) && (
        <>
          <div className="absolute -bottom-2 -left-2 w-10 h-10 rounded-full bg-yellow-600 border-2 border-yellow-300 flex items-center justify-center text-white font-bold text-lg shadow-md">
            {card.attack}
          </div>
          <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-full border-2 flex items-center justify-center text-white font-bold text-lg shadow-md ${
            isWeapon ? "bg-gray-600 border-gray-300" : "bg-red-600 border-red-300"
          }`}>
            {card.health}
          </div>
        </>
      )}
    </div>
  );
}
