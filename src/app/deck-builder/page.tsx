'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { cards as allCards } from '../../game/cards';
import { Card, Rarity, CardType, Faction, MAX_DECK_SIZE, MAX_COPIES_PER_CARD, MAX_COPIES_LEGENDARY } from '../../game/types';
import { OwnedCard } from '../../game/progression';
import { loadPlayer, getUpgradedStats } from '../../game/player-store';
import CardComponent from '../../components/Card';

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
  const [ownedCards, setOwnedCards] = useState<OwnedCard[]>([]);

  useEffect(() => {
    setSavedDecks(loadDecks());
    const player = loadPlayer();
    setOwnedCards(player.ownedCards);
    setMounted(true);
  }, []);

  const getOwned = (cardName: string): OwnedCard | undefined =>
    ownedCards.find(o => o.cardName === cardName);

  const applyUpgradedStats = (card: Card): Card => {
    const owned = getOwned(card.name);
    if (!owned || owned.upgradeLevel === 0) return card;
    const { attack, health } = getUpgradedStats(card, owned.upgradeLevel);
    return { ...card, attack, health };
  };

  const persistDecks = useCallback((decks: SavedDeck[]) => {
    setSavedDecks(decks);
    saveDecks(decks);
  }, []);

  const filteredCards = allCards.filter(card => {
    if (!getOwned(card.name)) return false;
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
    const owned = getOwned(card.name);
    const ownedCount = owned ? owned.count : 0;
    const max = card.rarity === 'legendary' ? MAX_COPIES_LEGENDARY : MAX_COPIES_PER_CARD;
    return count < max && count < ownedCount;
  };

  const addCard = (card: Card) => {
    if (!canAdd(card)) return;
    const upgraded = applyUpgradedStats(card);
    setCurrentDeck(prev => [...prev, upgraded].sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name)));
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

  const getUnownedInDeck = (deck: SavedDeck): string[] => {
    const unowned: string[] = [];
    const seen = new Set<string>();
    for (const card of deck.cards) {
      if (seen.has(card.name)) continue;
      seen.add(card.name);
      if (!getOwned(card.name)) {
        unowned.push(card.name);
      }
    }
    return unowned;
  };

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

      <header className="relative z-10 flex items-center justify-between border-b border-yellow-600/40 px-3 md:px-6 py-3 md:py-4">
        <Link href="/" className="text-yellow-400 hover:text-yellow-300 transition-colors">
          ← 返回主菜单
        </Link>
        <h1 className="text-lg md:text-2xl font-bold text-yellow-400">卡组构建</h1>
        <div className="w-16 md:w-24" />
      </header>

      <main className="relative z-10 flex flex-1 overflow-hidden">
        {view === 'list' ? (
          <div className="flex flex-1 flex-col items-center justify-start p-4 sm:p-6 md:p-8 gap-4 sm:gap-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-yellow-400">我的卡组</h2>
              <button
                onClick={newDeck}
                className="rounded-lg border border-yellow-600/40 bg-yellow-700/30 px-4 py-2 text-yellow-100 hover:bg-yellow-700/50 transition-colors"
              >
                + 新建卡组
              </button>
            </div>

            {savedDecks.length === 0 ? (
              <p className="text-yellow-100/60">暂无卡组，创建你的第一副卡组吧！</p>
            ) : (
              <div className="grid w-full max-w-2xl gap-3">
                {savedDecks.map(deck => {
                  const unowned = getUnownedInDeck(deck);
                  return (
                  <div key={deck.id} className="flex flex-col gap-2 rounded-lg border border-yellow-600/40 bg-red-950/60 px-4 sm:px-5 py-3 sm:py-4 shadow-lg">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                    <div>
                      <span className="text-lg font-semibold text-yellow-100">{deck.name}</span>
                      <span className="ml-3 text-sm text-yellow-100/60">{deck.cards.length}/{MAX_DECK_SIZE} 张卡牌</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => editDeck(deck)} className="rounded border border-yellow-600/40 bg-yellow-700/20 px-3 py-1 text-sm text-yellow-100 hover:bg-yellow-700/40 transition-colors">
                        编辑
                      </button>
                      <button onClick={() => deleteDeck(deck.id)} className="rounded border border-red-500/40 bg-red-900/40 px-3 py-1 text-sm text-red-300 hover:bg-red-800/60 transition-colors">
                        删除
                      </button>
                    </div>
                    </div>
                    {unowned.length > 0 && (
                      <div className="text-sm text-orange-400 border border-orange-500/30 bg-orange-900/20 rounded px-3 py-1.5">
                        ⚠ 含未拥有卡牌: {unowned.join('、')}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
            {/* Card browser */}
            <div className="flex flex-1 flex-col overflow-hidden border-b border-yellow-600/40 p-4 md:border-b-0 md:border-r">
              <div className="mb-3 flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="搜索卡牌..."
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  className="rounded border border-yellow-600/40 bg-red-950/60 px-3 py-1.5 text-sm text-yellow-100 placeholder-yellow-100/40 outline-none focus:border-yellow-400"
                />
                <select value={filterFaction} onChange={e => setFilterFaction(e.target.value as FilterFaction)} className="rounded border border-yellow-600/40 bg-red-950/60 px-2 py-1.5 text-sm text-yellow-100">
                  <option value="all">全部阵营</option>
                  <option value="shu">蜀</option>
                  <option value="wei">魏</option>
                  <option value="wu">吴</option>
                  <option value="qun">群</option>
                  <option value="neutral">中立</option>
                </select>
                <select value={filterType} onChange={e => setFilterType(e.target.value as FilterType)} className="rounded border border-yellow-600/40 bg-red-950/60 px-2 py-1.5 text-sm text-yellow-100">
                  <option value="all">全部类型</option>
                  <option value="minion">随从</option>
                  <option value="spell">法术</option>
                  <option value="weapon">武器</option>
                </select>
                <select value={filterRarity} onChange={e => setFilterRarity(e.target.value as FilterRarity)} className="rounded border border-yellow-600/40 bg-red-950/60 px-2 py-1.5 text-sm text-yellow-100">
                  <option value="all">全部稀有度</option>
                  <option value="common">普通</option>
                  <option value="rare">稀有</option>
                  <option value="epic">史诗</option>
                  <option value="legendary">传说</option>
                </select>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 justify-items-center">
                  {filteredCards.map(card => {
                    const count = countInDeck(card);
                    const owned = getOwned(card.name);
                    const ownedCount = owned ? owned.count : 0;
                    const maxCopies = card.rarity === 'legendary' ? MAX_COPIES_LEGENDARY : MAX_COPIES_PER_CARD;
                    const effectiveMax = Math.min(maxCopies, ownedCount);
                    const atMax = count >= effectiveMax;
                    const deckFull = currentDeck.length >= MAX_DECK_SIZE;
                    const upgraded = applyUpgradedStats(card);

                    return (
                      <div key={card.name} className="relative">
                        <CardComponent
                          card={upgraded}
                          onClick={() => { if (!atMax && !deckFull) addCard(card); }}
                          className={atMax || deckFull ? 'opacity-40 cursor-not-allowed !hover:scale-100' : ''}
                        />
                        <div className="absolute right-1 top-1 z-20 flex gap-1">
                          {owned && owned.upgradeLevel > 0 && (
                            <span className="flex h-6 items-center justify-center rounded-full bg-green-500 px-1.5 text-xs font-bold text-white shadow">
                              Lv{owned.upgradeLevel}
                            </span>
                          )}
                          {count > 0 && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-xs font-bold text-red-950 shadow">
                              {count}
                            </span>
                          )}
                        </div>
                        <div className="absolute left-1 bottom-1 z-20 text-xs text-yellow-100/80 bg-black/50 rounded px-1">
                          拥有: {ownedCount}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Current deck panel */}
            <div className="flex w-full flex-col overflow-hidden p-3 sm:p-4 md:w-80">
              <div className="mb-3 flex items-center gap-2">
                <button
                  onClick={() => setView('list')}
                  className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors"
                >
                  ← 卡组列表
                </button>
              </div>

              <input
                type="text"
                placeholder="卡组名称..."
                value={deckName}
                onChange={e => setDeckName(e.target.value)}
                className="mb-3 rounded border border-yellow-600/40 bg-red-950/60 px-3 py-2 text-yellow-100 placeholder-yellow-100/40 outline-none focus:border-yellow-400"
              />

              <div className="mb-3 flex items-center justify-between text-sm text-yellow-100/80">
                <span>{currentDeck.length}/{MAX_DECK_SIZE}</span>
                <span>平均: {summary.avgCost} 法力</span>
              </div>
              <div className="mb-3 flex gap-3 text-xs text-yellow-100/60">
                <span>⚔️ {summary.minions}</span>
                <span>✨ {summary.spells}</span>
                <span>🗡️ {summary.weapons}</span>
              </div>

              <div className="flex-1 overflow-y-auto">
                {deckEntries.length === 0 ? (
                  <p className="text-center text-sm text-yellow-100/40">点击卡牌添加到卡组</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {deckEntries.map(({ card, count }) => {
                      const owned = getOwned(card.name);
                      const upgradeLevel = owned?.upgradeLevel ?? 0;
                      return (
                      <div
                        key={card.name}
                        className="flex items-center justify-between rounded border border-yellow-600/20 bg-red-950/40 px-3 py-1.5 text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-blue-300">{card.cost}</span>
                          <span className="truncate text-yellow-100">{card.name}</span>
                          {upgradeLevel > 0 && (
                            <span className="text-xs text-green-400">+{upgradeLevel}</span>
                          )}
                          {card.type === 'minion' && (
                            <span className="text-xs text-yellow-100/50">{card.attack}/{card.health}</span>
                          )}
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
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={saveDeck}
                  disabled={!deckName.trim() || currentDeck.length === 0}
                  className="flex-1 rounded-lg border border-yellow-600/40 bg-yellow-700/30 py-2 text-yellow-100 hover:bg-yellow-700/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {editingDeckId ? '更新卡组' : '保存卡组'}
                </button>
                <button
                  onClick={() => { setCurrentDeck([]); setDeckName(''); setEditingDeckId(null); }}
                  className="rounded-lg border border-red-500/40 bg-red-900/40 px-4 py-2 text-red-300 hover:bg-red-800/60 transition-colors"
                >
                  清空
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
