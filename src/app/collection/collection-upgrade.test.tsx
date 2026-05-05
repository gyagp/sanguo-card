import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockStorage: Record<string, string> = {};

vi.stubGlobal('localStorage', {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, val: string) => { mockStorage[key] = val; },
  removeItem: (key: string) => { delete mockStorage[key]; },
});

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import CollectionPage from './page';
import { savePlayer, initializeNewPlayer } from '../../game/player-store';
import { cards } from '../../game/cards';
import { STARTER_CARDS, UPGRADE_COSTS, DUPLICATE_COST_PER_LEVEL } from '../../game/progression';

function setupPlayer(overrides: { gold?: number; cardName?: string; count?: number; upgradeLevel?: number } = {}) {
  const p = initializeNewPlayer();
  p.gold = overrides.gold ?? 500;
  const cardName = overrides.cardName ?? STARTER_CARDS[0];
  const oc = p.ownedCards.find(c => c.cardName === cardName);
  if (oc) {
    oc.count = overrides.count ?? 5;
    oc.upgradeLevel = overrides.upgradeLevel ?? 0;
  }
  savePlayer(p);
  return p;
}

function getFirstOwnedCardName(): string {
  return STARTER_CARDS[0];
}

function findMinionStarter(): string {
  const minion = STARTER_CARDS.find(name => {
    const c = cards.find(cd => cd.name === name);
    return c && c.type === 'minion';
  });
  return minion!;
}

beforeEach(() => {
  for (const k of Object.keys(mockStorage)) delete mockStorage[k];
});

describe('Selecting owned card shows upgrade panel', () => {
  it('clicking an owned card opens the upgrade modal', () => {
    setupPlayer();
    render(<CollectionPage />);

    const cardName = getFirstOwnedCardName();
    const cardElements = screen.getAllByText(cardName);
    const gridCard = cardElements[0].closest('[class*="cursor-pointer"]');
    fireEvent.click(gridCard!);

    expect(screen.getByText('升级')).toBeInTheDocument();
    expect(screen.getByText('关闭')).toBeInTheDocument();
  });

  it('unowned cards are not clickable (no modal opens)', () => {
    setupPlayer();
    render(<CollectionPage />);

    const unownedCard = cards.find(c => !STARTER_CARDS.includes(c.name))!;
    const lockIcons = screen.getAllByText('🔒');
    expect(lockIcons.length).toBeGreaterThan(0);

    const upgradeButtons = screen.queryAllByText('升级');
    expect(upgradeButtons).toHaveLength(0);
  });
});

describe('Displays current and next-level stats', () => {
  it('shows current stats and next-level preview for a minion', () => {
    const minionName = findMinionStarter();
    const baseCard = cards.find(c => c.name === minionName)!;
    setupPlayer({ cardName: minionName, upgradeLevel: 0 });
    render(<CollectionPage />);

    const cardElements = screen.getAllByText(minionName);
    const gridCard = cardElements[0].closest('[class*="cursor-pointer"]');
    fireEvent.click(gridCard!);

    expect(screen.getByText('当前属性')).toBeInTheDocument();
    expect(screen.getByText('升级后属性')).toBeInTheDocument();

    expect(screen.getByText(`⚔ ${baseCard.attack} / ❤ ${baseCard.health}`)).toBeInTheDocument();
  });

  it('shows "已达最高等级" at max level instead of upgrade button', () => {
    const minionName = findMinionStarter();
    setupPlayer({ cardName: minionName, upgradeLevel: 3, count: 10 });
    render(<CollectionPage />);

    const cardElements = screen.getAllByText(minionName);
    const gridCard = cardElements[0].closest('[class*="cursor-pointer"]');
    fireEvent.click(gridCard!);

    expect(screen.getByText('已达最高等级')).toBeInTheDocument();
    expect(screen.getByText('Lv.3 / 3')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '升级' })).not.toBeInTheDocument();
  });

  it('shows level display as Lv.X / 3', () => {
    const minionName = findMinionStarter();
    setupPlayer({ cardName: minionName, upgradeLevel: 1, count: 5 });
    render(<CollectionPage />);

    const cardElements = screen.getAllByText(minionName);
    const gridCard = cardElements[0].closest('[class*="cursor-pointer"]');
    fireEvent.click(gridCard!);

    expect(screen.getByText('Lv.1 / 3')).toBeInTheDocument();
  });
});

describe('Shows gold and duplicate cost', () => {
  it('displays gold cost and duplicate cost for next level', () => {
    const minionName = findMinionStarter();
    setupPlayer({ cardName: minionName, upgradeLevel: 0, gold: 500, count: 5 });
    render(<CollectionPage />);

    const cardElements = screen.getAllByText(minionName);
    const gridCard = cardElements[0].closest('[class*="cursor-pointer"]');
    fireEvent.click(gridCard!);

    const goldCost = UPGRADE_COSTS[1];
    const dupCost = DUPLICATE_COST_PER_LEVEL[1];
    expect(screen.getByText(new RegExp(`${goldCost} 金币`))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${dupCost} 张`))).toBeInTheDocument();
  });
});

describe('Upgrade button disabled if insufficient resources', () => {
  it('button disabled when gold is insufficient', () => {
    const minionName = findMinionStarter();
    setupPlayer({ cardName: minionName, upgradeLevel: 0, gold: 0, count: 5 });
    render(<CollectionPage />);

    const cardElements = screen.getAllByText(minionName);
    const gridCard = cardElements[0].closest('[class*="cursor-pointer"]');
    fireEvent.click(gridCard!);

    const upgradeBtn = screen.getByRole('button', { name: '升级' });
    expect(upgradeBtn).toBeDisabled();
  });

  it('button disabled when duplicates are insufficient', () => {
    const minionName = findMinionStarter();
    setupPlayer({ cardName: minionName, upgradeLevel: 0, gold: 500, count: 1 });
    render(<CollectionPage />);

    const cardElements = screen.getAllByText(minionName);
    const gridCard = cardElements[0].closest('[class*="cursor-pointer"]');
    fireEvent.click(gridCard!);

    const upgradeBtn = screen.getByRole('button', { name: '升级' });
    expect(upgradeBtn).toBeDisabled();
  });

  it('button enabled when resources are sufficient', () => {
    const minionName = findMinionStarter();
    setupPlayer({ cardName: minionName, upgradeLevel: 0, gold: 500, count: 5 });
    render(<CollectionPage />);

    const cardElements = screen.getAllByText(minionName);
    const gridCard = cardElements[0].closest('[class*="cursor-pointer"]');
    fireEvent.click(gridCard!);

    const upgradeBtn = screen.getByRole('button', { name: '升级' });
    expect(upgradeBtn).not.toBeDisabled();
  });
});

describe('Successful upgrade updates display immediately', () => {
  it('upgrading a card updates the level shown in the modal', () => {
    const minionName = findMinionStarter();
    setupPlayer({ cardName: minionName, upgradeLevel: 0, gold: 500, count: 5 });
    render(<CollectionPage />);

    const cardElements = screen.getAllByText(minionName);
    const gridCard = cardElements[0].closest('[class*="cursor-pointer"]');
    fireEvent.click(gridCard!);

    expect(screen.getByText('Lv.0 / 3')).toBeInTheDocument();

    const upgradeBtn = screen.getByRole('button', { name: '升级' });
    fireEvent.click(upgradeBtn);

    expect(screen.getByText('Lv.1 / 3')).toBeInTheDocument();
  });

  it('gold balance updates after upgrade', () => {
    const minionName = findMinionStarter();
    setupPlayer({ cardName: minionName, upgradeLevel: 0, gold: 500, count: 5 });
    render(<CollectionPage />);

    expect(screen.getByText(/500/)).toBeInTheDocument();

    const cardElements = screen.getAllByText(minionName);
    const gridCard = cardElements[0].closest('[class*="cursor-pointer"]');
    fireEvent.click(gridCard!);

    const upgradeBtn = screen.getByRole('button', { name: '升级' });
    fireEvent.click(upgradeBtn);

    const expectedGold = 500 - UPGRADE_COSTS[1];
    const goldDisplay = screen.getByText(`💰 ${expectedGold}`);
    expect(goldDisplay).toBeInTheDocument();
  });
});
