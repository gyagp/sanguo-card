'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import VolumeControl from '../../components/VolumeControl';

const STORAGE_KEY_ANIMATION_SPEED = 'sanguo-card-animation-speed';
const STORAGE_KEY_AUTO_END_TURN = 'sanguo-card-auto-end-turn';
const STORAGE_KEY_SHOW_DAMAGE_NUMBERS = 'sanguo-card-show-damage-numbers';

type AnimationSpeed = 'fast' | 'normal' | 'slow';

export default function SettingsPage() {
  const [animationSpeed, setAnimationSpeed] = useState<AnimationSpeed>('normal');
  const [autoEndTurn, setAutoEndTurn] = useState(false);
  const [showDamageNumbers, setShowDamageNumbers] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedSpeed = localStorage.getItem(STORAGE_KEY_ANIMATION_SPEED) as AnimationSpeed | null;
    const savedAutoEnd = localStorage.getItem(STORAGE_KEY_AUTO_END_TURN);
    const savedDamageNumbers = localStorage.getItem(STORAGE_KEY_SHOW_DAMAGE_NUMBERS);

    if (savedSpeed) setAnimationSpeed(savedSpeed);
    if (savedAutoEnd !== null) setAutoEndTurn(savedAutoEnd === 'true');
    if (savedDamageNumbers !== null) setShowDamageNumbers(savedDamageNumbers === 'true');
    setMounted(true);
  }, []);

  const updateSetting = <T,>(key: string, value: T, setter: (v: T) => void) => {
    setter(value);
    localStorage.setItem(key, String(value));
  };

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-red-950 via-red-900 to-yellow-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-900/20 via-transparent to-transparent" />

      <main className="relative z-10 flex flex-col items-center gap-8 px-8 w-full max-w-md">
        <h1 className="text-4xl font-bold tracking-wider text-yellow-400 drop-shadow-[0_2px_8px_rgba(234,179,8,0.4)]">
          设置
        </h1>

        <div className="flex flex-col gap-4 w-full">
          <section className="rounded-lg border border-yellow-600/40 bg-red-950/60 p-5 shadow-lg">
            <h2 className="text-lg font-semibold text-yellow-300 mb-3">音频</h2>
            <div className="flex items-center justify-center">
              <VolumeControl />
            </div>
          </section>

          <section className="rounded-lg border border-yellow-600/40 bg-red-950/60 p-5 shadow-lg">
            <h2 className="text-lg font-semibold text-yellow-300 mb-4">游戏</h2>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <label className="text-yellow-100 text-sm">动画速度</label>
                <select
                  value={animationSpeed}
                  onChange={(e) =>
                    updateSetting(STORAGE_KEY_ANIMATION_SPEED, e.target.value as AnimationSpeed, setAnimationSpeed)
                  }
                  className="bg-red-900/80 border border-yellow-600/40 text-yellow-100 text-sm rounded px-2 py-1 outline-none focus:border-yellow-500"
                >
                  <option value="fast">快速</option>
                  <option value="normal">正常</option>
                  <option value="slow">慢速</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-yellow-100 text-sm">自动结束回合</label>
                <button
                  onClick={() => updateSetting(STORAGE_KEY_AUTO_END_TURN, !autoEndTurn, setAutoEndTurn)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    autoEndTurn ? 'bg-yellow-500' : 'bg-red-900/80 border border-yellow-600/40'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      autoEndTurn ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-yellow-100 text-sm">显示伤害数字</label>
                <button
                  onClick={() => updateSetting(STORAGE_KEY_SHOW_DAMAGE_NUMBERS, !showDamageNumbers, setShowDamageNumbers)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    showDamageNumbers ? 'bg-yellow-500' : 'bg-red-900/80 border border-yellow-600/40'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      showDamageNumbers ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>
        </div>

        <Link
          href="/"
          className="group flex items-center justify-center gap-2 rounded-lg border border-yellow-600/40 bg-red-950/60 px-8 py-3 text-lg font-semibold text-yellow-100 shadow-lg transition-all hover:border-yellow-500/70 hover:bg-red-900/80 hover:shadow-yellow-900/30 hover:scale-105 active:scale-100 w-full"
        >
          <span className="text-xl transition-transform group-hover:scale-110">←</span>
          返回主菜单
        </Link>
      </main>
    </div>
  );
}
