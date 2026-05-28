"use client";

import { useCallback, useEffect, useState } from "react";
import { parseJsonResponse } from "@/lib/api-client";
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
      const data = await parseJsonResponse<{ submissions: Submission[] }>(res);
      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error ?? "Failed to load submissions"
        );
      }
      setSubmissions(data.submissions ?? []);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load submissions."
      );
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

      const data = await parseJsonResponse<{
        submission?: Submission;
        error?: string;
      }>(res);

      if (!res.ok) {
        throw new Error(data.error ?? "Could not submit");
      }

      if (data.submission) {
        setSubmissions((prev) => [data.submission!, ...prev]);
      }
      setSuccess(true);
      setVehicle("");
      setFeeling("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-10 px-6 py-12">
      <header className="text-center">
        <p className="text-4xl" aria-hidden>
          🚗💨
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Diarrhea.
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
        <h2 className="mb-4 text-center text-lg font-semibold text-white">
          Community variations
        </h2>
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
