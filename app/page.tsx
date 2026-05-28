import { LyricBuilder } from "@/components/lyric-builder";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-road-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-signal-green/10 blur-3xl sm:-top-32 sm:h-[28rem] sm:w-[28rem]" />
        <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-signal-amber/10 blur-3xl sm:h-64 sm:w-64" />
      </div>

      <main className="relative z-10">
        <LyricBuilder />
      </main>

      <footer className="safe-pb relative z-10 border-t border-slate-800/80 px-4 py-6 text-center text-xs text-slate-500">
        From the makers of Cat Mash.
      </footer>
    </div>
  );
}
