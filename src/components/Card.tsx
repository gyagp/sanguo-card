import { Card as CardData } from "../game/types";

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

const typeIcon: Record<CardData["type"], string> = {
  minion: "⚔️",
  spell: "✨",
  weapon: "🗡️",
};

interface CardProps {
  card: CardData;
  onClick?: () => void;
  className?: string;
}

export default function Card({ card, onClick, className = "" }: CardProps) {
  const isMinion = card.type === "minion";
  const isWeapon = card.type === "weapon";

  return (
    <div
      onClick={onClick}
      className={`
        relative w-44 h-64 rounded-xl border-3 cursor-pointer select-none
        transition-all duration-200 ease-out
        hover:scale-110 hover:z-10 hover:shadow-lg
        ${rarityStyles[card.rarity]}
        ${rarityGlow[card.rarity]}
        ${factionBg[card.faction]}
        ${className}
      `}
    >
      {/* Mana crystal */}
      <div className="absolute -top-2 -left-2 w-10 h-10 rounded-full bg-blue-600 border-2 border-blue-300 flex items-center justify-center text-white font-bold text-lg shadow-md z-10">
        {card.cost}
      </div>

      {/* Card type badge */}
      <div className="absolute top-1 right-2 text-lg" title={card.type}>
        {typeIcon[card.type]}
      </div>

      {/* Card art area */}
      <div className={`
        mx-3 mt-8 h-24 rounded-lg flex items-center justify-center text-4xl
        ${card.type === "spell" ? "bg-indigo-700/60" : card.type === "weapon" ? "bg-amber-800/60" : "bg-emerald-800/60"}
      `}>
        {typeIcon[card.type]}
      </div>

      {/* Name */}
      <div className="mx-2 mt-2 text-center">
        <p className="text-white font-bold text-sm truncate">{card.name}</p>
      </div>

      {/* Description */}
      <div className="mx-3 mt-1 h-14 overflow-hidden">
        <p className="text-gray-200 text-xs text-center leading-tight">{card.description}</p>
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
