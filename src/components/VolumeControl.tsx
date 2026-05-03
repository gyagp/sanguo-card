'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioManager } from '../app/game/audio-manager';

const STORAGE_KEY_VOLUME = 'sanguo-card-volume';
const STORAGE_KEY_MUTED = 'sanguo-card-muted';

export default function VolumeControl() {
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    const savedVolume = localStorage.getItem(STORAGE_KEY_VOLUME);
    const savedMuted = localStorage.getItem(STORAGE_KEY_MUTED);
    const v = savedVolume !== null ? Number(savedVolume) : 100;
    const m = savedMuted === 'true';

    setVolume(v);
    setMuted(m);

    const audio = AudioManager.getInstance();
    audio.setVolume(v / 100);
    if (m) {
      if (!audio.isMuted()) audio.toggleMute();
    }
    initialized.current = true;
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    localStorage.setItem(STORAGE_KEY_VOLUME, String(v));

    const audio = AudioManager.getInstance();
    audio.setVolume(v / 100);

    if (muted && v > 0) {
      audio.toggleMute();
      setMuted(false);
      localStorage.setItem(STORAGE_KEY_MUTED, 'false');
    }
  }, [muted]);

  const handleToggleMute = useCallback(() => {
    const audio = AudioManager.getInstance();
    const nowMuted = audio.toggleMute();
    setMuted(nowMuted);
    localStorage.setItem(STORAGE_KEY_MUTED, String(nowMuted));
  }, []);

  return (
    <div className="flex items-center gap-2 bg-black/50 rounded-lg px-3 py-1.5">
      <button
        onClick={handleToggleMute}
        className="text-white hover:text-yellow-300 transition-colors w-6 text-center"
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted || volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊'}
      </button>
      <input
        type="range"
        min={0}
        max={100}
        value={volume}
        onChange={handleVolumeChange}
        className="w-20 h-1.5 accent-yellow-400 cursor-pointer"
        aria-label="Volume"
      />
      <span className="text-white text-xs w-8 text-right">{muted ? 0 : volume}%</span>
    </div>
  );
}
