import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import DeckBuilderPage from './page';
import { cards as allCards } from '../../game/cards';
import { MAX_DECK_SIZE, MAX_COPIES_PER_CARD, MAX_COPIES_LEGENDARY } from '../../game/types';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const STORAGE_KEY = 'sanguo-card-decks';

let mockStorage: Record<string, string> = {};
beforeEach(() => {
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
});
afterEach(() => { cleanup(); });

function getFirstCard() {
  return allCards[0];
}

function getLegendaryCard() {
  return allCards.find(c => c.rarity === 'legendary')!;
}

function clickCardInBrowser(name: string) {
  const elements = screen.getAllByText(name);
  const browserCard = elements.find(el => el.closest('button'));
  fireEvent.click(browserCard!);
}

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
      const card = getFirstCard();
      expect(screen.getByText(card.name)).toBeInTheDocument();
    });

    it('adds a card to the deck when clicked', () => {
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      const card = getFirstCard();
      clickCardInBrowser(card.name);
      expect(screen.getByText('×1')).toBeInTheDocument();
      expect(screen.getByText(`1/${MAX_DECK_SIZE}`)).toBeInTheDocument();
    });

    it('removes a card from the deck when remove button clicked', () => {
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      const card = getFirstCard();
      clickCardInBrowser(card.name);
      expect(screen.getByText(`1/${MAX_DECK_SIZE}`)).toBeInTheDocument();
      fireEvent.click(screen.getByText('−'));
      expect(screen.getByText(`0/${MAX_DECK_SIZE}`)).toBeInTheDocument();
    });

    it('enforces max copies per card (2 for non-legendary)', () => {
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      const card = getFirstCard();
      for (let i = 0; i < MAX_COPIES_PER_CARD + 1; i++) {
        clickCardInBrowser(card.name);
      }
      expect(screen.getByText(`${MAX_COPIES_PER_CARD}/${MAX_DECK_SIZE}`)).toBeInTheDocument();
    });

    it('enforces max 1 copy for legendary cards', () => {
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      const legendary = getLegendaryCard();
      clickCardInBrowser(legendary.name);
      clickCardInBrowser(legendary.name);
      expect(screen.getByText(`${MAX_COPIES_LEGENDARY}/${MAX_DECK_SIZE}`)).toBeInTheDocument();
    });

    it('filters cards by search text', () => {
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      const input = screen.getByPlaceholderText('搜索卡牌...');
      fireEvent.change(input, { target: { value: allCards[0].name } });
      expect(screen.getByText(allCards[0].name)).toBeInTheDocument();
    });

    it('filters cards by faction', () => {
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
      const spellCards = allCards.filter(c => c.type === 'spell');
      for (const c of spellCards) {
        expect(screen.getByText(c.name)).toBeInTheDocument();
      }
    });
  });

  describe('AC3: Deck saved to localStorage with name', () => {
    it('saves deck to localStorage when save button clicked', () => {
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      fireEvent.change(screen.getByPlaceholderText('卡组名称...'), { target: { value: 'My Test Deck' } });
      clickCardInBrowser(getFirstCard().name);
      fireEvent.click(screen.getByText('保存卡组'));
      const stored = JSON.parse(mockStorage[STORAGE_KEY]);
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe('My Test Deck');
      expect(stored[0].cards).toHaveLength(1);
    });

    it('disables save when deck name is empty', () => {
      render(<DeckBuilderPage />);
      fireEvent.click(screen.getByText('+ 新建卡组'));
      clickCardInBrowser(getFirstCard().name);
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
      clickCardInBrowser(getFirstCard().name);
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
});
