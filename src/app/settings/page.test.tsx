import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const mockAudioManager = {
  setVolume: vi.fn(),
  toggleMute: vi.fn().mockReturnValue(true),
  isMuted: vi.fn().mockReturnValue(false),
  getInstance: vi.fn(),
};
mockAudioManager.getInstance.mockReturnValue(mockAudioManager);

vi.mock('../game/audio-manager', () => ({
  AudioManager: {
    getInstance: () => mockAudioManager,
  },
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import SettingsPage from './page';

describe('SettingsPage', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => storage[key] ?? null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => { storage[key] = value; });
  });

  it('renders settings UI with headings', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Audio')).toBeInTheDocument();
    expect(screen.getByText('Game')).toBeInTheDocument();
  });

  it('integrates VolumeControl component', () => {
    render(<SettingsPage />);
    expect(screen.getAllByLabelText('Volume').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByLabelText(/mute/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders animation speed dropdown with default normal', () => {
    render(<SettingsPage />);
    const selects = screen.getAllByDisplayValue('Normal');
    expect(selects.length).toBeGreaterThanOrEqual(1);
  });

  it('persists animation speed to localStorage', () => {
    render(<SettingsPage />);
    const select = screen.getAllByDisplayValue('Normal')[0];
    fireEvent.change(select, { target: { value: 'fast' } });
    expect(storage['sanguo-card-animation-speed']).toBe('fast');
  });

  it('persists auto end turn toggle to localStorage', () => {
    render(<SettingsPage />);
    const label = screen.getAllByText('Auto End Turn')[0];
    const toggle = label.closest('div')!.querySelector('button')!;
    fireEvent.click(toggle);
    expect(storage['sanguo-card-auto-end-turn']).toBe('true');
  });

  it('persists show damage numbers toggle to localStorage', () => {
    render(<SettingsPage />);
    const label = screen.getAllByText('Show Damage Numbers')[0];
    const toggle = label.closest('div')!.querySelector('button')!;
    fireEvent.click(toggle);
    expect(storage['sanguo-card-show-damage-numbers']).toBe('false');
  });

  it('loads saved settings from localStorage', () => {
    storage['sanguo-card-animation-speed'] = 'slow';
    storage['sanguo-card-auto-end-turn'] = 'true';
    storage['sanguo-card-show-damage-numbers'] = 'false';

    render(<SettingsPage />);
    expect(screen.getAllByDisplayValue('Slow').length).toBeGreaterThanOrEqual(1);
  });

  it('has back navigation link to main menu', () => {
    render(<SettingsPage />);
    const links = screen.getAllByText('Back to Menu');
    const link = links[0].closest('a');
    expect(link).toHaveAttribute('href', '/');
  });
});
