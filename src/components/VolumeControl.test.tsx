import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';

const mockAudioManager = {
  setVolume: vi.fn(),
  toggleMute: vi.fn().mockReturnValue(true),
  isMuted: vi.fn().mockReturnValue(false),
  getInstance: vi.fn(),
};
mockAudioManager.getInstance.mockReturnValue(mockAudioManager);

vi.mock('../app/game/audio-manager', () => ({
  AudioManager: {
    getInstance: () => mockAudioManager,
  },
}));

import VolumeControl from './VolumeControl';

describe('VolumeControl', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => storage[key] ?? null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => { storage[key] = val; });
    mockAudioManager.setVolume.mockClear();
    mockAudioManager.toggleMute.mockClear();
    mockAudioManager.isMuted.mockClear();
    mockAudioManager.toggleMute.mockReturnValue(true);
    mockAudioManager.isMuted.mockReturnValue(false);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('AC: VolumeControl React component exists', () => {
    it('renders without crashing', () => {
      render(<VolumeControl />);
      expect(screen.getByLabelText('Volume')).toBeDefined();
      expect(screen.getByLabelText(/mute/i)).toBeDefined();
    });

    it('is exported as default from VolumeControl.tsx', () => {
      const src = readFileSync(join(__dirname, 'VolumeControl.tsx'), 'utf-8');
      expect(src).toMatch(/export default function VolumeControl/);
    });
  });

  describe('AC: Slider adjusts master volume 0-100%', () => {
    it('renders a range input with min=0 and max=100', () => {
      render(<VolumeControl />);
      const slider = screen.getByLabelText('Volume') as HTMLInputElement;
      expect(slider.type).toBe('range');
      expect(slider.min).toBe('0');
      expect(slider.max).toBe('100');
    });

    it('defaults to 100', () => {
      render(<VolumeControl />);
      const slider = screen.getByLabelText('Volume') as HTMLInputElement;
      expect(slider.value).toBe('100');
    });

    it('calls AudioManager.setVolume with normalized value on change', () => {
      render(<VolumeControl />);
      const slider = screen.getByLabelText('Volume');
      fireEvent.change(slider, { target: { value: '50' } });
      expect(mockAudioManager.setVolume).toHaveBeenCalledWith(0.5);
    });

    it('setting volume to 0 shows muted icon', () => {
      render(<VolumeControl />);
      fireEvent.change(screen.getByLabelText('Volume'), { target: { value: '0' } });
      expect(screen.getByLabelText(/mute/i).textContent).toBe('🔇');
    });

    it('shows low volume icon when < 50', () => {
      render(<VolumeControl />);
      fireEvent.change(screen.getByLabelText('Volume'), { target: { value: '30' } });
      expect(screen.getByLabelText(/mute/i).textContent).toBe('🔉');
    });

    it('shows high volume icon when >= 50', () => {
      render(<VolumeControl />);
      const slider = screen.getByLabelText('Volume');
      expect(slider).toBeDefined();
      expect(screen.getByLabelText(/mute/i).textContent).toBe('🔊');
    });
  });

  describe('AC: Mute button toggles all audio', () => {
    it('renders a mute button with aria-label', () => {
      render(<VolumeControl />);
      expect(screen.getByLabelText(/mute/i).tagName).toBe('BUTTON');
    });

    it('calls AudioManager.toggleMute on click', () => {
      render(<VolumeControl />);
      fireEvent.click(screen.getByLabelText(/mute/i));
      expect(mockAudioManager.toggleMute).toHaveBeenCalled();
    });

    it('shows muted icon after muting', () => {
      mockAudioManager.toggleMute.mockReturnValue(true);
      render(<VolumeControl />);
      fireEvent.click(screen.getByLabelText(/mute/i));
      expect(screen.getByLabelText('Unmute').textContent).toBe('🔇');
    });

    it('displays 0% when muted', () => {
      mockAudioManager.toggleMute.mockReturnValue(true);
      render(<VolumeControl />);
      fireEvent.click(screen.getByLabelText(/mute/i));
      expect(screen.getByText('0%')).toBeDefined();
    });

    it('unmutes when slider is moved while muted', () => {
      mockAudioManager.toggleMute.mockReturnValueOnce(true).mockReturnValueOnce(false);
      render(<VolumeControl />);
      fireEvent.click(screen.getByLabelText(/mute/i));
      fireEvent.change(screen.getByLabelText('Volume'), { target: { value: '60' } });
      expect(mockAudioManager.toggleMute).toHaveBeenCalledTimes(2);
    });
  });

  describe('AC: Volume preference persists in localStorage', () => {
    it('saves volume to localStorage on slider change', () => {
      render(<VolumeControl />);
      fireEvent.change(screen.getByLabelText('Volume'), { target: { value: '42' } });
      expect(storage['sanguo-card-volume']).toBe('42');
    });

    it('saves muted state to localStorage on toggle', () => {
      mockAudioManager.toggleMute.mockReturnValue(true);
      render(<VolumeControl />);
      fireEvent.click(screen.getByLabelText(/mute/i));
      expect(storage['sanguo-card-muted']).toBe('true');
    });

    it('restores volume from localStorage on mount', () => {
      storage['sanguo-card-volume'] = '37';
      render(<VolumeControl />);
      const slider = screen.getByLabelText('Volume') as HTMLInputElement;
      expect(slider.value).toBe('37');
    });

    it('restores muted state from localStorage on mount', () => {
      storage['sanguo-card-muted'] = 'true';
      mockAudioManager.isMuted.mockReturnValue(false);
      render(<VolumeControl />);
      expect(mockAudioManager.toggleMute).toHaveBeenCalled();
    });
  });

  describe('AC: Component styled with Tailwind CSS', () => {
    it('uses Tailwind utility classes', () => {
      const src = readFileSync(join(__dirname, 'VolumeControl.tsx'), 'utf-8');
      expect(src).toMatch(/className="[^"]*flex/);
      expect(src).toMatch(/className="[^"]*items-center/);
      expect(src).toMatch(/bg-black/);
      expect(src).toMatch(/rounded-lg/);
      expect(src).toMatch(/text-white/);
      expect(src).toMatch(/accent-yellow/);
    });
  });
});
