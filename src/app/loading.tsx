export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-red-950 via-red-900 to-yellow-900">
      <div className="flex flex-col items-center gap-8">
        <div className="relative flex items-center justify-center">
          <div className="absolute h-32 w-32 animate-spin rounded-full border-4 border-transparent border-t-yellow-400 [animation-duration:2s]" />
          <div className="absolute h-24 w-24 animate-spin rounded-full border-4 border-transparent border-b-yellow-600 [animation-direction:reverse] [animation-duration:1.5s]" />
          <span className="text-5xl drop-shadow-lg">⚔</span>
        </div>

        <div className="flex flex-col items-center gap-3">
          <h2 className="text-2xl font-bold tracking-widest text-yellow-400 drop-shadow-md">
            三國卡牌
          </h2>
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-yellow-400 [animation-delay:0ms]" />
            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-yellow-400 [animation-delay:150ms]" />
            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-yellow-400 [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}
