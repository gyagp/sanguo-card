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
    expect(screen.getByText('设置')).toBeInTheDocument();
    expect(screen.getByText('音频')).toBeInTheDocument();
    expect(screen.getByText('游戏')).toBeInTheDocument();
  });

  it('integrates VolumeControl component', () => {
    render(<SettingsPage />);
    expect(screen.getAllByLabelText('音量').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByLabelText(/静音/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders animation speed dropdown with default normal', () => {
    render(<SettingsPage />);
    const selects = screen.getAllByDisplayValue('正常');
    expect(selects.length).toBeGreaterThanOrEqual(1);
  });

  it('persists animation speed to localStorage', () => {
    render(<SettingsPage />);
    const select = screen.getAllByDisplayValue('正常')[0];
    fireEvent.change(select, { target: { value: 'fast' } });
    expect(storage['sanguo-card-animation-speed']).toBe('fast');
  });

  it('persists auto end turn toggle to localStorage', () => {
    render(<SettingsPage />);
    const label = screen.getAllByText('自动结束回合')[0];
    const toggle = label.closest('div')!.querySelector('button')!;
    fireEvent.click(toggle);
    expect(storage['sanguo-card-auto-end-turn']).toBe('true');
  });

  it('persists show damage numbers toggle to localStorage', () => {
    render(<SettingsPage />);
    const label = screen.getAllByText('显示伤害数字')[0];
    const toggle = label.closest('div')!.querySelector('button')!;
    fireEvent.click(toggle);
    expect(storage['sanguo-card-show-damage-numbers']).toBe('false');
  });

  it('loads saved settings from localStorage', () => {
    storage['sanguo-card-animation-speed'] = 'slow';
    storage['sanguo-card-auto-end-turn'] = 'true';
    storage['sanguo-card-show-damage-numbers'] = 'false';

    render(<SettingsPage />);
    expect(screen.getAllByDisplayValue('慢速').length).toBeGreaterThanOrEqual(1);
  });

  it('has back navigation link to main menu', () => {
    render(<SettingsPage />);
    const links = screen.getAllByText('返回主菜单');
    const link = links[0].closest('a');
    expect(link).toHaveAttribute('href', '/');
  });
});
