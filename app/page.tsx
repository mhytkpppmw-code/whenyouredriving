export default function Home() {
  return (
    <div className="min-h-screen bg-road-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-signal-green/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-signal-amber/5 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-6 py-8">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal-green/20 ring-1 ring-signal-green/40"
            aria-hidden
          >
            <svg
              className="h-5 w-5 text-signal-green"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7h8m-8 4h5m-7 6l2-4h6l2 4M6 19h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-wide text-slate-200">
            When You&apos;re Driving
          </span>
        </div>
        <span className="rounded-full bg-road-800 px-3 py-1 text-xs font-medium text-slate-400 ring-1 ring-slate-700">
          Coming soon
        </span>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-24 pt-8 md:pt-16">
        <section className="max-w-2xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-road-800/80 px-4 py-1.5 text-xs font-medium text-signal-green ring-1 ring-slate-700">
            <span className="h-1.5 w-1.5 rounded-full bg-signal-green animate-pulse" />
            Built for safer roads
          </p>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
            Eyes on the road.
            <span className="block text-signal-green">Not on your phone.</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-400 md:text-xl">
            When You&apos;re Driving is a simple way to let people know you&apos;re
            behind the wheel — so you can focus on driving and get home safe.
          </p>
        </section>

        <section className="mt-12 grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "Drive mode",
              body: "One tap when you start driving. Clear status for everyone who matters.",
            },
            {
              title: "Auto replies",
              body: "Let texts wait. Friends see you're driving — no guilt, no distraction.",
            },
            {
              title: "Arrive safe",
              body: "Built around one goal: fewer distractions, more attention on the road.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-2xl bg-road-900/80 p-6 ring-1 ring-slate-800"
            >
              <h2 className="text-base font-semibold text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {item.body}
              </p>
            </article>
          ))}
        </section>

        <section
          id="notify"
          className="mt-16 rounded-2xl bg-gradient-to-br from-road-800 to-road-900 p-8 ring-1 ring-slate-700 md:p-10"
        >
          <h2 className="text-2xl font-semibold text-white">Get notified at launch</h2>
          <p className="mt-2 max-w-lg text-slate-400">
            We&apos;re building the first version now. Leave your email and we&apos;ll
            let you know when the app is ready.
          </p>
          <div className="mt-6">
            <a
              href="mailto:hello@example.com?subject=When%20You%27re%20Driving%20%E2%80%94%20Launch%20notify"
              className="inline-flex rounded-xl bg-signal-green px-6 py-3 text-sm font-semibold text-road-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-signal-green focus:ring-offset-2 focus:ring-offset-road-900"
            >
              Email us to get notified
            </a>
            <p className="mt-3 text-xs text-slate-500">
              Update the email address in <code className="text-slate-400">app/page.tsx</code> to your real inbox.
            </p>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-800">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} When You&apos;re Driving</p>
          <p>Drive focused. Arrive safe.</p>
        </div>
      </footer>
    </div>
  );
}
