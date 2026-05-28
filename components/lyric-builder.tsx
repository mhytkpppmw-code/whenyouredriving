"use client";

import { useCallback, useEffect, useState } from "react";
import { formatLyric, type Submission } from "@/lib/lyric";

export function LyricBuilder() {
  const [vehicle, setVehicle] = useState("");
  const [feeling, setFeeling] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadSubmissions = useCallback(async () => {
    try {
      const res = await fetch("/api/submissions");
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as { submissions: Submission[] };
      setSubmissions(data.submissions);
    } catch {
      setError("Could not load submissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle: vehicle.trim(),
          feeling: feeling.trim(),
        }),
      });

      const data = (await res.json()) as {
        submission?: Submission;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Could not submit");
      }

      if (data.submission) {
        setSubmissions((prev) => [data.submission!, ...prev]);
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-10 px-6 py-12">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          When You&apos;re Driving
        </h1>
        <p className="mt-2 text-slate-400">Fill in the blanks. Submit your variation.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="vehicle" className="mb-2 block text-sm font-medium text-slate-300">
            First blank - your ride
          </label>
          <input
            id="vehicle"
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value)}
            placeholder="Chevy"
            maxLength={80}
            required
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>

        <div>
          <label htmlFor="feeling" className="mb-2 block text-sm font-medium text-slate-300">
            Second blank - what happens
          </label>
          <input
            id="feeling"
            value={feeling}
            onChange={(e) => setFeeling(e.target.value)}
            placeholder="feel something heavy"
            maxLength={80}
            required
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit variation"}
        </button>

        {success && (
          <p className="text-center text-sm text-emerald-400">Added to the wall!</p>
        )}
        {error && <p className="text-center text-sm text-red-400">{error}</p>}
      </form>

      <section>
        {loading ? (
          <p className="text-center text-sm text-slate-500">Loading...</p>
        ) : submissions.length === 0 ? (
          <p className="text-center text-sm text-slate-500">Be the first to submit!</p>
        ) : (
          <ul className="space-y-3">
            {submissions.map((s) => (
              <li
                key={s.id}
                className="rounded-xl bg-zinc-900/80 px-4 py-3 text-sm leading-relaxed text-slate-200 ring-1 ring-zinc-800"
              >
                {formatLyric(s.vehicle, s.feeling)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}