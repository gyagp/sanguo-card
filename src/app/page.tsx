import Link from "next/link";

const menuItems = [
  { label: "开始对战", href: "/game", icon: "⚔" },
  { label: "组建卡组", href: "/deck-builder", icon: "📜" },
  { label: "商店", href: "/shop", icon: "🏪" },
  { label: "卡牌图鉴", href: "/cards", icon: "📖" },
  { label: "设置", href: "/settings", icon: "⚙" },
] as const;

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-red-950 via-red-900 to-yellow-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-900/20 via-transparent to-transparent" />

      <main className="relative z-10 flex flex-col items-center gap-6 sm:gap-8 md:gap-12 px-4 sm:px-6 md:px-8 w-full max-w-sm sm:max-w-md">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-wider text-yellow-400 drop-shadow-[0_2px_8px_rgba(234,179,8,0.4)] md:text-6xl">
            三国卡牌
          </h1>
          <p className="text-lg tracking-widest text-yellow-200/60">
            三国卡牌对战
          </p>
        </div>

        <nav className="flex flex-col gap-4 w-full">
          {menuItems.map(({ label, href, icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center justify-center gap-3 rounded-lg border border-yellow-600/40 bg-red-950/60 px-8 py-4 text-xl font-semibold text-yellow-100 shadow-lg transition-all hover:border-yellow-500/70 hover:bg-red-900/80 hover:shadow-yellow-900/30 hover:scale-105 active:scale-100"
            >
              <span className="text-2xl transition-transform group-hover:scale-110">
                {icon}
              </span>
              {label}
            </Link>
          ))}
        </nav>

        <div className="w-full rounded-lg border border-yellow-600/30 bg-red-950/50 px-5 py-4 text-yellow-100/90 text-sm leading-relaxed">
          <h2 className="text-center text-lg font-bold text-yellow-400 mb-3">玩法说明</h2>
          <ul className="space-y-2">
            <li><span className="text-yellow-400 font-bold">目标：</span>将对方英雄的生命值降至0即可获胜。</li>
            <li><span className="text-yellow-400 font-bold">法力水晶：</span>每回合获得1颗法力水晶（上限10颗），用于打出卡牌。</li>
            <li><span className="text-yellow-400 font-bold">出牌：</span>点击手牌中的卡牌将其打出到战场（需要足够的法力值）。</li>
            <li><span className="text-yellow-400 font-bold">攻击：</span>点击己方随从，再点击敌方随从或英雄进行攻击。随从在打出的回合不能攻击。</li>
            <li><span className="text-yellow-400 font-bold">英雄技能：</span>每回合可使用一次英雄技能（消耗2点法力）。</li>
            <li><span className="text-yellow-400 font-bold">回合结束：</span>点击"结束回合"按钮将回合交给对手。</li>
          </ul>
          <div className="mt-3 pt-3 border-t border-yellow-600/20 text-xs text-yellow-200/50 space-y-1">
            <p><span className="text-yellow-400">随从卡：</span>召唤随从到战场，拥有攻击力和生命值。</p>
            <p><span className="text-yellow-400">法术卡：</span>立即产生效果（如造成伤害、恢复生命等）。</p>
            <p><span className="text-yellow-400">武器卡：</span>装备武器后英雄可以直接攻击。</p>
          </div>
        </div>
      </main>
    </div>
  );
}
