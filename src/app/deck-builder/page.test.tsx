import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import DeckBuilderPage from './page';
import { cards as allCards } from '../../game/cards';
import { MAX_DECK_SIZE, MAX_COPIES_PER_CARD, MAX_COPIES_LEGENDARY } from '../../game/types';
import { STARTER_CARDS } from '../../game/progression';
import { OwnedCard } from '../../game/progression';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const STORAGE_KEY = 'sanguo-card-decks';
const PLAYER_KEY = 'sanguo-card-player';

let mockStorage: Record<string, string> = {};

function setupStorage(ownedCards?: OwnedCard[]) {
  mockStorage = {};
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { mockStorage = {}; },
    length: 0,
    key: () => null,
  });
  vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2, 8) });

  if (ownedCards) {
    mockStorage[PLAYER_KEY] = JSON.stringify({
      gold: 100, xp: 0, level: 1, ownedCards,
    });
  }
}

function ownAllCards(count = 2, upgradeLevel = 0): OwnedCard[] {
  return allCards.map(c => ({ cardName: c.name, count, upgradeLevel }));
}

function getFirstOwnedCard() {
  return allCards.find(c => STARTER_CARDS.includes(c.name))!;
}

function getLegendaryCard() {
  return allCards.find(c => c.rarity === 'legendary')!;
}

function clickCardInBrowser(name: string) {
  const elements = screen.getAllByText(name);
  const el = elements[0].closest('[class*="cursor-pointer"], [class*="cursor-not-allowed"]') || elements[0];
  fireEvent.click(el);
}

beforeEach(() => {
  setupStorage();
});
afterEach(() => { cleanup(); });

describe('Deck Builder page acceptance criteria', () => {
  describe('AC1: src/app/deck-builder/page.tsx renders deck builder', () => {
    it('renders the deck builder heading', () => {
      render(<DeckBuilderPage />);
      expect(screen.getByText('卡组构建')).toBeInTheDocument();
    });

    it('renders the deck list view by default', () => {
      render(<DeckBuilderPage />);
      expect(screen.getByText('我的卡组')).toBeInTheDocument();
      expect(screen.getByText('+ 新建卡组')).toBeInTheDocument();
    });

    it('shows empty state when no decks exist', () => {
      render(<DeckBuilderPage />);
      expect(screen.getByText('暂无卡组，创建你的第一副卡组吧！')).toBeInTheDocument();
    });
  });

  describe('AC2: Can browse available cards and add/remove from deck', () => {
    it('shows card browser when creating a new deck', () => {
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      expect(screen.getByPlaceholderText('搜索卡牌...')).toBeInTheDocument();
    });

    it('displays cards from the card pool', () => {
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      const card = getFirstOwnedCard();
      expect(screen.getByText(card.name)).toBeInTheDocument();
    });

    it('adds a card to the deck when clicked', () => {
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      const card = getFirstOwnedCard();
      clickCardInBrowser(card.name);
      expect(screen.getByText('×1')).toBeInTheDocument();
      expect(screen.getByText(`1/${MAX_DECK_SIZE}`)).toBeInTheDocument();
    });

    it('removes a card from the deck when remove button clicked', () => {
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      const card = getFirstOwnedCard();
      clickCardInBrowser(card.name);
      expect(screen.getByText(`1/${MAX_DECK_SIZE}`)).toBeInTheDocument();
      fireEvent.click(screen.getByText('−'));
      expect(screen.getByText(`0/${MAX_DECK_SIZE}`)).toBeInTheDocument();
    });

    it('enforces max copies per card (2 for non-legendary)', () => {
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      const card = getFirstOwnedCard();
      for (let i = 0; i < MAX_COPIES_PER_CARD + 1; i++) {
        clickCardInBrowser(card.name);
      }
      expect(screen.getByText(`${MAX_COPIES_PER_CARD}/${MAX_DECK_SIZE}`)).toBeInTheDocument();
    });

    it('enforces max 1 copy for legendary cards', () => {
      const legendary = getLegendaryCard();
      setupStorage([{ cardName: legendary.name, count: 5, upgradeLevel: 0 }]);
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      clickCardInBrowser(legendary.name);
      clickCardInBrowser(legendary.name);
      expect(screen.getByText(`${MAX_COPIES_LEGENDARY}/${MAX_DECK_SIZE}`)).toBeInTheDocument();
    });

    it('filters cards by search text', () => {
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      const input = screen.getByPlaceholderText('搜索卡牌...');
      const card = getFirstOwnedCard();
      fireEvent.change(input, { target: { value: card.name } });
      expect(screen.getByText(card.name)).toBeInTheDocument();
    });

    it('filters cards by faction', () => {
      setupStorage(ownAllCards());
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      const factionSelect = screen.getByDisplayValue('全部阵营');
      fireEvent.change(factionSelect, { target: { value: 'shu' } });
      const shuCards = allCards.filter(c => c.faction === 'shu');
      expect(shuCards.length).toBeGreaterThan(0);
      for (const c of shuCards) {
        expect(screen.getByText(c.name)).toBeInTheDocument();
      }
    });

    it('filters cards by type', () => {
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      const typeSelect = screen.getByDisplayValue('全部类型');
      fireEvent.change(typeSelect, { target: { value: 'spell' } });
      const ownedSpells = allCards.filter(c => c.type === 'spell' && STARTER_CARDS.includes(c.name));
      for (const c of ownedSpells) {
        expect(screen.getByText(c.name)).toBeInTheDocument();
      }
    });
  });

  describe('AC3: Deck saved to localStorage with name', () => {
    it('saves deck to localStorage when save button clicked', () => {
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      fireEvent.change(screen.getByPlaceholderText('卡组名称...'), { target: { value: 'My Test Deck' } });
      clickCardInBrowser(getFirstOwnedCard().name);
      fireEvent.click(screen.getByText('保存卡组'));
      const stored = JSON.parse(mockStorage[STORAGE_KEY]);
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe('My Test Deck');
      expect(stored[0].cards).toHaveLength(1);
    });

    it('disables save when deck name is empty', () => {
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      clickCardInBrowser(getFirstOwnedCard().name);
      const saveBtn = screen.getByText('保存卡组');
      expect(saveBtn).toBeDisabled();
    });

    it('disables save when deck has no cards', () => {
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      fireEvent.change(screen.getByPlaceholderText('卡组名称...'), { target: { value: 'Empty Deck' } });
      const saveBtn = screen.getByText('保存卡组');
      expect(saveBtn).toBeDisabled();
    });

    it('updates existing deck when editing', () => {
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      fireEvent.change(screen.getByPlaceholderText('卡组名称...'), { target: { value: 'Deck A' } });
      clickCardInBrowser(getFirstOwnedCard().name);
      fireEvent.click(screen.getByText('保存卡组'));
      expect(screen.getByText('更新卡组')).toBeInTheDocument();
      fireEvent.change(screen.getByPlaceholderText('卡组名称...'), { target: { value: 'Deck A Renamed' } });
      fireEvent.click(screen.getByText('更新卡组'));
      const stored = JSON.parse(mockStorage[STORAGE_KEY]);
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe('Deck A Renamed');
    });
  });

  describe('AC4: Can manage multiple saved decks', () => {
    it('can create and list multiple decks', () => {
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      fireEvent.change(screen.getByPlaceholderText('卡组名称...'), { target: { value: 'Deck 1' } });
      clickCardInBrowser(allCards[0].name);
      fireEvent.click(screen.getByText('保存卡组'));
      fireEvent.click(screen.getByText('← 卡组列表'));
      expect(screen.getByText('Deck 1')).toBeInTheDocument();
      fireEvent.click(screen.getByText('+ 新建卡组'));
      fireEvent.change(screen.getByPlaceholderText('卡组名称...'), { target: { value: 'Deck 2' } });
      clickCardInBrowser(allCards[1].name);
      fireEvent.click(screen.getByText('保存卡组'));
      fireEvent.click(screen.getByText('← 卡组列表'));
      expect(screen.getByText('Deck 1')).toBeInTheDocument();
      expect(screen.getByText('Deck 2')).toBeInTheDocument();
    });

    it('can delete a deck', () => {
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      fireEvent.change(screen.getByPlaceholderText('卡组名称...'), { target: { value: 'To 删除' } });
      clickCardInBrowser(allCards[0].name);
      fireEvent.click(screen.getByText('保存卡组'));
      fireEvent.click(screen.getByText('← 卡组列表'));
      expect(screen.getByText('To 删除')).toBeInTheDocument();
      fireEvent.click(screen.getByText('删除'));
      expect(screen.queryByText('To 删除')).not.toBeInTheDocument();
      const stored = JSON.parse(mockStorage[STORAGE_KEY]);
      expect(stored).toHaveLength(0);
    });

    it('can edit an existing deck from the list', () => {
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      fireEvent.change(screen.getByPlaceholderText('卡组名称...'), { target: { value: '编辑able' } });
      clickCardInBrowser(allCards[0].name);
      fireEvent.click(screen.getByText('保存卡组'));
      fireEvent.click(screen.getByText('← 卡组列表'));
      fireEvent.click(screen.getByText('编辑'));
      expect(screen.getByDisplayValue('编辑able')).toBeInTheDocument();
      expect(screen.getByText('更新卡组')).toBeInTheDocument();
    });
  });

  describe('AC5: Back navigation to main menu', () => {
    it('renders a back link to main menu', () => {
      render(<DeckBuilderPage />);
      const backLink = screen.getByText('← 返回主菜单');
      expect(backLink).toBeInTheDocument();
      expect(backLink.closest('a')).toHaveAttribute('href', '/');
    });
  });

  describe('Edge cases', () => {
    it('clears current deck when 清空 button is clicked', () => {
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      clickCardInBrowser(allCards[0].name);
      expect(screen.getByText(`1/${MAX_DECK_SIZE}`)).toBeInTheDocument();
      fireEvent.click(screen.getByText('清空'));
      expect(screen.getByText(`0/${MAX_DECK_SIZE}`)).toBeInTheDocument();
    });

    it('loads saved decks from localStorage on mount', () => {
      const savedDeck = { id: 'pre-saved', name: 'Pre-saved Deck', cards: [allCards[0]] };
      mockStorage[STORAGE_KEY] = JSON.stringify([savedDeck]);
      render(<DeckBuilderPage />);
      expect(screen.getByText('Pre-saved Deck')).toBeInTheDocument();
    });

    it('handles corrupted localStorage gracefully', () => {
      mockStorage[STORAGE_KEY] = 'not-json{{{';
      render(<DeckBuilderPage />);
      expect(screen.getByText('暂无卡组，创建你的第一副卡组吧！')).toBeInTheDocument();
    });
  });

  describe('AC: Card component with PNG art and faction colors', () => {
    it('renders CardComponent with img tags pointing to /card-art/[name].png', () => {
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      const card = getFirstOwnedCard();
      const imgs = document.querySelectorAll('img');
      const cardImg = Array.from(imgs).find(img => img.getAttribute('src')?.includes(encodeURIComponent(card.name)));
      expect(cardImg).toBeTruthy();
      expect(cardImg!.getAttribute('src')).toBe(`/card-art/${encodeURIComponent(card.name)}.png`);
    });

    it('each owned card in the browser has a PNG art image', () => {
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      const imgs = document.querySelectorAll('img');
      const cardArtImgs = Array.from(imgs).filter(img => img.getAttribute('src')?.startsWith('/card-art/'));
      expect(cardArtImgs.length).toBeGreaterThanOrEqual(STARTER_CARDS.length);
    });

    it('cards display faction-specific background colors', () => {
      setupStorage(ownAllCards());
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      const shuCard = allCards.find(c => c.faction === 'shu')!;
      const weiCard = allCards.find(c => c.faction === 'wei')!;
      const wuCard = allCards.find(c => c.faction === 'wu')!;

      const findCardEl = (name: string) => {
        const el = screen.getAllByText(name)[0];
        return el.closest('[class*="rounded-xl"]');
      };

      const shuEl = findCardEl(shuCard.name);
      const weiEl = findCardEl(weiCard.name);
      const wuEl = findCardEl(wuCard.name);

      expect(shuEl?.className).toMatch(/bg-green/);
      expect(weiEl?.className).toMatch(/bg-blue/);
      expect(wuEl?.className).toMatch(/bg-red/);
    });
  });

  describe('Collection integration: deck builder only shows owned cards', () => {
    it('only shows owned cards in the card browser', () => {
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      const nonOwned = allCards.find(c => !STARTER_CARDS.includes(c.name))!;
      expect(screen.queryByText(nonOwned.name)).not.toBeInTheDocument();
      const owned = getFirstOwnedCard();
      expect(screen.getByText(owned.name)).toBeInTheDocument();
    });

    it('shows all cards when player owns everything', () => {
      setupStorage(ownAllCards());
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      for (const card of allCards) {
        expect(screen.getByText(card.name)).toBeInTheDocument();
      }
    });
  });

  describe('Collection integration: upgraded stats reflected in deck preview', () => {
    it('shows upgraded attack/health for cards with upgrades', () => {
      const card = allCards.find(c => c.type === 'minion' && STARTER_CARDS.includes(c.name))!;
      setupStorage([{ cardName: card.name, count: 2, upgradeLevel: 2 }]);
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      clickCardInBrowser(card.name);
      const expectedAttack = card.attack + 1;
      const expectedHealth = card.health + 1;
      expect(screen.getByText(`${expectedAttack}/${expectedHealth}`)).toBeInTheDocument();
    });

    it('shows upgrade level badge in card browser', () => {
      const card = getFirstOwnedCard();
      setupStorage([{ cardName: card.name, count: 2, upgradeLevel: 3 }]);
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      expect(screen.getByText('Lv3')).toBeInTheDocument();
    });

    it('shows upgrade level indicator in deck panel', () => {
      const card = getFirstOwnedCard();
      setupStorage([{ cardName: card.name, count: 2, upgradeLevel: 2 }]);
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      clickCardInBrowser(card.name);
      expect(screen.getByText('+2')).toBeInTheDocument();
    });
  });

  describe('Collection integration: cannot add more copies than owned', () => {
    it('limits copies to owned count even if below max copies', () => {
      const card = getFirstOwnedCard();
      setupStorage([{ cardName: card.name, count: 1, upgradeLevel: 0 }]);
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      clickCardInBrowser(card.name);
      clickCardInBrowser(card.name);
      expect(screen.getByText(`1/${MAX_DECK_SIZE}`)).toBeInTheDocument();
    });

    it('displays owned count on each card', () => {
      const card = getFirstOwnedCard();
      setupStorage([{ cardName: card.name, count: 3, upgradeLevel: 0 }]);
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      expect(screen.getByText('拥有: 3')).toBeInTheDocument();
    });
  });

  describe('Collection integration: existing decks with unowned cards show warning', () => {
    it('shows warning for decks containing unowned cards', () => {
      const unownedCard = allCards.find(c => !STARTER_CARDS.includes(c.name))!;
      const savedDeck = { id: 'old-deck', name: 'Old Deck', cards: [unownedCard] };
      mockStorage[STORAGE_KEY] = JSON.stringify([savedDeck]);
      render(<DeckBuilderPage />);
      expect(screen.getByText(/含未拥有卡牌/)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(unownedCard.name))).toBeInTheDocument();
    });

    it('does not show warning for decks with all owned cards', () => {
      const ownedCard = getFirstOwnedCard();
      const savedDeck = { id: 'good-deck', name: 'Good Deck', cards: [ownedCard] };
      mockStorage[STORAGE_KEY] = JSON.stringify([savedDeck]);
      render(<DeckBuilderPage />);
      expect(screen.queryByText(/含未拥有卡牌/)).not.toBeInTheDocument();
    });
  });
});
