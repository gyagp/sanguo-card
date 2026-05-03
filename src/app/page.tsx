import Link from "next/link";

const menuItems = [
  { label: "Play", href: "/game", icon: "⚔" },
  { label: "Deck Builder", href: "/deck-builder", icon: "📜" },
  { label: "Settings", href: "/settings", icon: "⚙" },
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
            Sanguo Card
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
      </main>
    </div>
  );
}
