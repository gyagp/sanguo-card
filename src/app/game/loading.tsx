export default function GameLoading() {
  return (
    <div className="fixed inset-0 z-50 flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-red-950 via-red-900 to-yellow-900">
      <div className="flex flex-col items-center gap-8">
        <div className="relative flex items-center justify-center">
          <div className="absolute h-36 w-36 animate-spin rounded-full border-4 border-transparent border-t-yellow-400 [animation-duration:2s]" />
          <div className="absolute h-28 w-28 animate-spin rounded-full border-4 border-transparent border-b-yellow-600 [animation-direction:reverse] [animation-duration:1.5s]" />
          <div className="absolute h-20 w-20 animate-spin rounded-full border-4 border-transparent border-t-red-400 [animation-duration:3s]" />
          <span className="text-5xl drop-shadow-lg">🐉</span>
        </div>

        <div className="flex flex-col items-center gap-3">
          <h2 className="text-2xl font-bold tracking-widest text-yellow-400 drop-shadow-md">
            備戰中
          </h2>
          <p className="text-sm tracking-wide text-yellow-200/70">
            Preparing the battlefield...
          </p>
          <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-yellow-900/50">
            <div className="h-full w-full animate-pulse rounded-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 [animation-duration:1.5s]" />
          </div>
        </div>
      </div>
    </div>
  );
}
