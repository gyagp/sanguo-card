"use client";

import { useState } from "react";

interface CardDisplay {
  id: number;
  name: string;
  cost: number;
  attack: number;
  health: number;
}

interface HeroDisplay {
  name: string;
  hp: number;
  mana: number;
  maxMana: number;
}

const MOCK_HAND: CardDisplay[] = [
  { id: 1, name: "赵云", cost: 3, attack: 4, health: 3 },
  { id: 2, name: "张飞", cost: 5, attack: 6, health: 5 },
  { id: 3, name: "诸葛亮", cost: 7, attack: 5, health: 7 },
];

const MOCK_BOARD: CardDisplay[] = [
  { id: 10, name: "关羽", cost: 4, attack: 5, health: 4 },
];

function CardSlot({ card }: { card: CardDisplay }) {
  return (
    <div className="w-20 h-28 sm:w-24 sm:h-32 bg-amber-900 border-2 border-amber-600 rounded-lg flex flex-col items-center justify-between p-1 text-white text-xs sm:text-sm shadow-md hover:border-yellow-400 transition-colors cursor-pointer">
      <span className="bg-blue-700 rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px]">
        {card.cost}
      </span>
      <span className="font-bold text-center leading-tight">{card.name}</span>
      <div className="flex w-full justify-between px-1">
        <span className="bg-yellow-600 rounded px-1 font-bold">{card.attack}</span>
        <span className="bg-red-700 rounded px-1 font-bold">{card.health}</span>
      </div>
    </div>
  );
}

function HeroPortrait({ hero, side }: { hero: HeroDisplay; side: "player" | "opponent" }) {
  const manaGems = Array.from({ length: hero.maxMana }, (_, i) => (
    <span
      key={i}
      className={`w-3 h-3 rounded-full ${i < hero.mana ? "bg-blue-500" : "bg-gray-600"}`}
    />
  ));

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-700 border-2 border-amber-500 flex items-center justify-center text-lg font-bold text-white">
        {hero.name[0]}
      </div>
      <div className="flex flex-col gap-1 text-white text-sm">
        <span className="font-bold">{hero.name}</span>
        <div className="flex items-center gap-1">
          <span className="text-red-400 font-bold">❤ {hero.hp}</span>
          <span className="text-blue-400 font-bold ml-2">💧 {hero.mana}/{hero.maxMana}</span>
        </div>
        <div className="flex gap-0.5">{manaGems}</div>
      </div>
    </div>
  );
}

function BoardZone({ cards, label }: { cards: CardDisplay[]; label: string }) {
  return (
    <div className="flex-1 flex items-center justify-center gap-2 min-h-[7rem] sm:min-h-[9rem]">
      {cards.length === 0 ? (
        <span className="text-gray-500 text-sm italic">{label}</span>
      ) : (
        cards.map((c) => <CardSlot key={c.id} card={c} />)
      )}
    </div>
  );
}

function HandZone({ cards }: { cards: CardDisplay[] }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2 min-h-[8rem]">
      {cards.map((c) => (
        <CardSlot key={c.id} card={c} />
      ))}
    </div>
  );
}

export default function GamePage() {
  const [playerHero] = useState<HeroDisplay>({
    name: "刘备",
    hp: 30,
    mana: 4,
    maxMana: 4,
  });
  const [opponentHero] = useState<HeroDisplay>({
    name: "曹操",
    hp: 30,
    mana: 3,
    maxMana: 3,
  });

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 select-none">
      {/* Opponent hero */}
      <HeroPortrait hero={opponentHero} side="opponent" />

      {/* Opponent hand (face down) */}
      <div className="flex items-center justify-center gap-2 py-1 min-h-[5rem]">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-14 h-20 sm:w-16 sm:h-24 bg-red-900 border-2 border-red-700 rounded-lg shadow-md"
          />
        ))}
      </div>

      {/* Opponent board */}
      <BoardZone cards={MOCK_BOARD} label="对方战场" />

      {/* Divider + End Turn */}
      <div className="flex items-center justify-center py-1">
        <div className="h-px flex-1 bg-amber-700/50" />
        <button className="mx-4 px-6 py-2 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-lg shadow-lg transition-colors">
          结束回合
        </button>
        <div className="h-px flex-1 bg-amber-700/50" />
      </div>

      {/* Player board */}
      <BoardZone cards={MOCK_BOARD} label="我方战场" />

      {/* Player hand */}
      <HandZone cards={MOCK_HAND} />

      {/* Player hero */}
      <HeroPortrait hero={playerHero} side="player" />
    </div>
  );
}
