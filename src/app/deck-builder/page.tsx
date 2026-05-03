'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { cards as allCards } from '../../game/cards';
import { Card, Rarity, CardType, Faction, MAX_DECK_SIZE, MAX_COPIES_PER_CARD, MAX_COPIES_LEGENDARY } from '../../game/types';

const STORAGE_KEY = 'sanguo-card-decks';

interface SavedDeck {
  id: string;
  name: string;
  cards: Card[];
}

function loadDecks(): SavedDeck[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDecks(decks: SavedDeck[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
}

const rarityColors: Record<Rarity, string> = {
  common: 'border-gray-400',
  rare: 'border-blue-400',
  epic: 'border-purple-400',
  legendary: 'border-orange-400',
};

const factionColors: Record<Faction, string> = {
  shu: 'bg-green-900/80',
  wei: 'bg-blue-900/80',
  wu: 'bg-red-800/80',
  qun: 'bg-yellow-900/80',
  neutral: 'bg-gray-800/80',
};

const typeIcons: Record<CardType, string> = {
  minion: '⚔️',
  spell: '✨',
  weapon: '🗡️',
};

type FilterFaction = Faction | 'all';
type FilterType = CardType | 'all';
type FilterRarity = Rarity | 'all';

export default function DeckBuilderPage() {
  const [mounted, setMounted] = useState(false);
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);
  const [currentDeck, setCurrentDeck] = useState<Card[]>([]);
  const [deckName, setDeckName] = useState('');
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [filterFaction, setFilterFaction] = useState<FilterFaction>('all');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterRarity, setFilterRarity] = useState<FilterRarity>('all');
  const [searchText, setSearchText] = useState('');
  const [view, setView] = useState<'list' | 'editor'>('list');

  useEffect(() => {
    setSavedDecks(loadDecks());
    setMounted(true);
  }, []);

  const persistDecks = useCallback((decks: SavedDeck[]) => {
    setSavedDecks(decks);
    saveDecks(decks);
  }, []);

  const filteredCards = allCards.filter(card => {
    if (filterFaction !== 'all' && card.faction !== filterFaction) return false;
    if (filterType !== 'all' && card.type !== filterType) return false;
    if (filterRarity !== 'all' && card.rarity !== filterRarity) return false;
    if (searchText && !card.name.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  const countInDeck = (card: Card) => currentDeck.filter(c => c.name === card.name).length;

  const canAdd = (card: Card) => {
    if (currentDeck.length >= MAX_DECK_SIZE) return false;
    const count = countInDeck(card);
    const max = card.rarity === 'legendary' ? MAX_COPIES_LEGENDARY : MAX_COPIES_PER_CARD;
    return count < max;
  };

  const addCard = (card: Card) => {
    if (!canAdd(card)) return;
    setCurrentDeck(prev => [...prev, card].sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name)));
  };

  const removeCard = (card: Card) => {
    setCurrentDeck(prev => {
      const idx = prev.findIndex(c => c.name === card.name);
      if (idx === -1) return prev;
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
  };

  const saveDeck = () => {
    const trimmed = deckName.trim();
    if (!trimmed || currentDeck.length === 0) return;
    const deck: SavedDeck = {
      id: editingDeckId || crypto.randomUUID(),
      name: trimmed,
      cards: currentDeck,
    };
    const updated = editingDeckId
      ? savedDecks.map(d => d.id === editingDeckId ? deck : d)
      : [...savedDecks, deck];
    persistDecks(updated);
    setEditingDeckId(deck.id);
  };

  const deleteDeck = (id: string) => {
    persistDecks(savedDecks.filter(d => d.id !== id));
    if (editingDeckId === id) {
      newDeck();
    }
  };

  const editDeck = (deck: SavedDeck) => {
    setCurrentDeck([...deck.cards]);
    setDeckName(deck.name);
    setEditingDeckId(deck.id);
    setView('editor');
  };

  const newDeck = () => {
    setCurrentDeck([]);
    setDeckName('');
    setEditingDeckId(null);
    setView('editor');
  };

  const deckSummary = () => {
    const minions = currentDeck.filter(c => c.type === 'minion').length;
    const spells = currentDeck.filter(c => c.type === 'spell').length;
    const weapons = currentDeck.filter(c => c.type === 'weapon').length;
    const avgCost = currentDeck.length > 0
      ? (currentDeck.reduce((s, c) => s + c.cost, 0) / currentDeck.length).toFixed(1)
      : '0.0';
    return { minions, spells, weapons, avgCost };
  };

  if (!mounted) return null;

  const summary = deckSummary();

  const deckEntries: { card: Card; count: number }[] = [];
  const seen = new Set<string>();
  for (const card of currentDeck) {
    if (!seen.has(card.name)) {
      seen.add(card.name);
      deckEntries.push({ card, count: countInDeck(card) });
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-red-950 via-red-900 to-yellow-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-900/20 via-transparent to-transparent" />

      <header className="relative z-10 flex items-center justify-between border-b border-yellow-600/40 px-6 py-4">
        <Link href="/" className="text-yellow-400 hover:text-yellow-300 transition-colors">
          ← Back to Menu
        </Link>
        <h1 className="text-2xl font-bold text-yellow-400">Deck Builder</h1>
        <div className="w-24" />
      </header>

      <main className="relative z-10 flex flex-1 overflow-hidden">
        {view === 'list' ? (
          <div className="flex flex-1 flex-col items-center justify-start p-8 gap-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-yellow-400">Your Decks</h2>
              <button
                onClick={newDeck}
                className="rounded-lg border border-yellow-600/40 bg-yellow-700/30 px-4 py-2 text-yellow-100 hover:bg-yellow-700/50 transition-colors"
              >
                + New Deck
              </button>
            </div>

            {savedDecks.length === 0 ? (
              <p className="text-yellow-100/60">No decks yet. Create your first deck!</p>
            ) : (
              <div className="grid w-full max-w-2xl gap-3">
                {savedDecks.map(deck => (
                  <div key={deck.id} className="flex items-center justify-between rounded-lg border border-yellow-600/40 bg-red-950/60 px-5 py-4 shadow-lg">
                    <div>
                      <span className="text-lg font-semibold text-yellow-100">{deck.name}</span>
                      <span className="ml-3 text-sm text-yellow-100/60">{deck.cards.length}/{MAX_DECK_SIZE} cards</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => editDeck(deck)} className="rounded border border-yellow-600/40 bg-yellow-700/20 px-3 py-1 text-sm text-yellow-100 hover:bg-yellow-700/40 transition-colors">
                        Edit
                      </button>
                      <button onClick={() => deleteDeck(deck.id)} className="rounded border border-red-500/40 bg-red-900/40 px-3 py-1 text-sm text-red-300 hover:bg-red-800/60 transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Card browser */}
            <div className="flex flex-1 flex-col overflow-hidden border-r border-yellow-600/40 p-4">
              <div className="mb-3 flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Search cards..."
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  className="rounded border border-yellow-600/40 bg-red-950/60 px-3 py-1.5 text-sm text-yellow-100 placeholder-yellow-100/40 outline-none focus:border-yellow-400"
                />
                <select value={filterFaction} onChange={e => setFilterFaction(e.target.value as FilterFaction)} className="rounded border border-yellow-600/40 bg-red-950/60 px-2 py-1.5 text-sm text-yellow-100">
                  <option value="all">All Factions</option>
                  <option value="shu">Shu</option>
                  <option value="wei">Wei</option>
                  <option value="wu">Wu</option>
                  <option value="qun">Qun</option>
                  <option value="neutral">Neutral</option>
                </select>
                <select value={filterType} onChange={e => setFilterType(e.target.value as FilterType)} className="rounded border border-yellow-600/40 bg-red-950/60 px-2 py-1.5 text-sm text-yellow-100">
                  <option value="all">All Types</option>
                  <option value="minion">Minion</option>
                  <option value="spell">Spell</option>
                  <option value="weapon">Weapon</option>
                </select>
                <select value={filterRarity} onChange={e => setFilterRarity(e.target.value as FilterRarity)} className="rounded border border-yellow-600/40 bg-red-950/60 px-2 py-1.5 text-sm text-yellow-100">
                  <option value="all">All Rarities</option>
                  <option value="common">Common</option>
                  <option value="rare">Rare</option>
                  <option value="epic">Epic</option>
                  <option value="legendary">Legendary</option>
                </select>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredCards.map(card => {
                    const count = countInDeck(card);
                    const maxCopies = card.rarity === 'legendary' ? MAX_COPIES_LEGENDARY : MAX_COPIES_PER_CARD;
                    const atMax = count >= maxCopies;
                    const deckFull = currentDeck.length >= MAX_DECK_SIZE;

                    return (
                      <button
                        key={card.name}
                        onClick={() => addCard(card)}
                        disabled={atMax || deckFull}
                        className={`relative rounded-lg border-2 ${rarityColors[card.rarity]} ${factionColors[card.faction]} p-3 text-left transition-all ${
                          atMax || deckFull ? 'opacity-40 cursor-not-allowed' : 'hover:scale-[1.02] hover:brightness-110 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-300">{card.cost}</span>
                          <span className="text-xs text-yellow-100/60">{typeIcons[card.type]} {card.type}</span>
                        </div>
                        <div className="mt-1 text-sm font-semibold text-yellow-100">{card.name}</div>
                        {card.type === 'minion' && (
                          <div className="mt-1 text-xs text-yellow-100/80">{card.attack}⚔ / {card.health}❤</div>
                        )}
                        <div className="mt-1 text-xs text-yellow-100/60 line-clamp-2">{card.description}</div>
                        {count > 0 && (
                          <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400 text-xs font-bold text-red-950">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Current deck panel */}
            <div className="flex w-80 flex-col overflow-hidden p-4">
              <div className="mb-3 flex items-center gap-2">
                <button
                  onClick={() => setView('list')}
                  className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors"
                >
                  ← Decks
                </button>
              </div>

              <input
                type="text"
                placeholder="Deck name..."
                value={deckName}
                onChange={e => setDeckName(e.target.value)}
                className="mb-3 rounded border border-yellow-600/40 bg-red-950/60 px-3 py-2 text-yellow-100 placeholder-yellow-100/40 outline-none focus:border-yellow-400"
              />

              <div className="mb-3 flex items-center justify-between text-sm text-yellow-100/80">
                <span>{currentDeck.length}/{MAX_DECK_SIZE}</span>
                <span>Avg: {summary.avgCost} mana</span>
              </div>
              <div className="mb-3 flex gap-3 text-xs text-yellow-100/60">
                <span>⚔️ {summary.minions}</span>
                <span>✨ {summary.spells}</span>
                <span>🗡️ {summary.weapons}</span>
              </div>

              <div className="flex-1 overflow-y-auto">
                {deckEntries.length === 0 ? (
                  <p className="text-center text-sm text-yellow-100/40">Click cards to add them</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {deckEntries.map(({ card, count }) => (
                      <div
                        key={card.name}
                        className="flex items-center justify-between rounded border border-yellow-600/20 bg-red-950/40 px-3 py-1.5 text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-blue-300">{card.cost}</span>
                          <span className="truncate text-yellow-100">{card.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-yellow-100/60">×{count}</span>
                          <button
                            onClick={() => removeCard(card)}
                            className="ml-1 text-red-400 hover:text-red-300 transition-colors"
                          >
                            −
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={saveDeck}
                  disabled={!deckName.trim() || currentDeck.length === 0}
                  className="flex-1 rounded-lg border border-yellow-600/40 bg-yellow-700/30 py-2 text-yellow-100 hover:bg-yellow-700/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {editingDeckId ? 'Update Deck' : 'Save Deck'}
                </button>
                <button
                  onClick={() => { setCurrentDeck([]); setDeckName(''); setEditingDeckId(null); }}
                  className="rounded-lg border border-red-500/40 bg-red-900/40 px-4 py-2 text-red-300 hover:bg-red-800/60 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
