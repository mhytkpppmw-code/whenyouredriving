import { LyricBuilder } from "@/components/lyric-builder";

export default function Home() {
  return (
    <div className="poop-bg poop-doodles relative min-h-screen text-cream">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-signal-green/15 blur-3xl sm:-top-32 sm:h-[28rem] sm:w-[28rem]" />
        <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-caramel/15 blur-3xl sm:h-64 sm:w-64" />
        <div className="absolute left-[8%] top-[35%] text-4xl opacity-[0.07] sm:text-5xl">💩</div>
        <div className="absolute right-[12%] top-[22%] text-3xl opacity-[0.06] sm:text-4xl">💨</div>
        <div className="absolute bottom-[18%] left-[15%] text-2xl opacity-[0.05]">💩</div>
      </div>

      <main className="relative z-10">
        <LyricBuilder />
      </main>

      <footer className="safe-pb relative z-10 border-t-2 border-poop-700/50 px-4 py-6 text-center text-xs text-steam">
        From the makers of Cat Mash.
      </footer>
    </div>
  );
}
