"use client";

import { useGameState } from "../../hooks/useGameState";
import Card from "../../components/Card";
import { cards } from "../../game/cards";
import { createDeck, BoardMinion, PlayerState, Card as CardType, MAX_BOARD_SIZE } from "../../game/types";
import { useMemo, useState } from "react";

function buildDeck(): CardType[] {
  const pool = [...cards];
  const deck: CardType[] = [];
  while (deck.length < 30) {
    deck.push(pool[deck.length % pool.length]);
  }
  return deck;
}

function ManaBar({ mana, maxMana }: { mana: number; maxMana: number }) {
  if (maxMana === 0) return null;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: maxMana }, (_, i) => (
        <span
          key={i}
          className={`w-3 h-3 rounded-full ${i < mana ? "bg-blue-500" : "bg-gray-600"}`}
        />
      ))}
    </div>
  );
}

function HeroPortrait({ player }: { player: PlayerState }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-700 border-2 border-amber-500 flex items-center justify-center text-lg font-bold text-white">
        ⚔
      </div>
      <div className="flex flex-col gap-1 text-white text-sm">
        <div className="flex items-center gap-1">
          <span className="text-red-400 font-bold">❤ {player.hero.health}</span>
          <span className="text-blue-400 font-bold ml-2">💧 {player.hero.mana}/{player.maxMana}</span>
        </div>
        <ManaBar mana={player.hero.mana} maxMana={player.maxMana} />
      </div>
    </div>
  );
}

function BoardMinionCard({ minion }: { minion: BoardMinion }) {
  return (
    <div className="w-20 h-28 sm:w-24 sm:h-32 bg-amber-900 border-2 border-amber-600 rounded-lg flex flex-col items-center justify-between p-1 text-white text-xs sm:text-sm shadow-md hover:border-yellow-400 transition-colors cursor-pointer">
      <span className="bg-blue-700 rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px]">
        {minion.cost}
      </span>
      <span className="font-bold text-center leading-tight">{minion.name}</span>
      <div className="flex w-full justify-between px-1">
        <span className="bg-yellow-600 rounded px-1 font-bold">{minion.currentAttack}</span>
        <span className="bg-red-700 rounded px-1 font-bold">{minion.currentHealth}</span>
      </div>
    </div>
  );
}

function BoardZone({ minions, label, onDrop }: { minions: BoardMinion[]; label: string; onDrop?: (handIndex: number) => void }) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (!onDrop) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!onDrop) return;
    const handIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (!isNaN(handIndex)) onDrop(handIndex);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 flex items-center justify-center gap-2 min-h-[7rem] sm:min-h-[9rem] rounded-lg transition-colors ${
        dragOver ? "bg-green-800/40 border-2 border-dashed border-green-400" : "border-2 border-transparent"
      }`}
    >
      {minions.length === 0 ? (
        <span className="text-gray-500 text-sm italic">{label}</span>
      ) : (
        minions.map((m, i) => <BoardMinionCard key={i} minion={m} />)
      )}
    </div>
  );
}

export default function GamePage() {
  const [deck1, deck2] = useMemo(() => {
    return [createDeck(buildDeck()), createDeck(buildDeck())];
  }, []);

  const { gameState, winner, playCard, endTurn } = useGameState(deck1, deck2);

  const player = gameState.players[0];
  const opponent = gameState.players[1];

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 select-none">
      {/* Winner banner */}
      {winner !== null && (
        <div className="absolute inset-0 z-50 bg-black/70 flex items-center justify-center">
          <span className="text-4xl font-bold text-yellow-400">
            {winner === "draw" ? "平局!" : `玩家 ${winner + 1} 获胜!`}
          </span>
        </div>
      )}

      {/* Opponent hero */}
      <HeroPortrait player={opponent} />

      {/* Opponent hand (face down) */}
      <div className="flex items-center justify-center gap-2 py-1 min-h-[5rem]">
        {opponent.hand.map((_, i) => (
          <div
            key={i}
            className="w-14 h-20 sm:w-16 sm:h-24 bg-red-900 border-2 border-red-700 rounded-lg shadow-md"
          />
        ))}
      </div>

      {/* Opponent board */}
      <BoardZone minions={opponent.board} label="对方战场" />

      {/* Divider + End Turn */}
      <div className="flex items-center justify-center py-1">
        <div className="h-px flex-1 bg-amber-700/50" />
        <button
          onClick={() => endTurn()}
          className="mx-4 px-6 py-2 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-lg shadow-lg transition-colors"
        >
          结束回合
        </button>
        <div className="h-px flex-1 bg-amber-700/50" />
      </div>

      {/* Player board */}
      <BoardZone minions={player.board} label="我方战场" onDrop={(i) => playCard(i)} />

      {/* Player hand */}
      <div className="flex items-center justify-center gap-2 py-2 min-h-[8rem] overflow-x-auto">
        {player.hand.map((card, i) => (
          <div key={i} className="shrink-0 scale-50 origin-bottom -mx-5">
            <Card
              card={card}
              onClick={() => playCard(i)}
              draggable
              handIndex={i}
              insufficientMana={card.cost > player.hero.mana || player.board.length >= MAX_BOARD_SIZE}
            />
          </div>
        ))}
      </div>

      {/* Player hero */}
      <HeroPortrait player={player} />
    </div>
  );
}
