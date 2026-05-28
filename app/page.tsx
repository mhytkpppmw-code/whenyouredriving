import { LyricBuilder } from "@/components/lyric-builder";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-road-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-signal-green/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-signal-amber/10 blur-3xl" />
      </div>

      <main className="relative z-10">
        <LyricBuilder />
      </main>

      <footer className="relative z-10 border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        Austin and Lukas are c00l.
      </footer>
    </div>
  );
}
