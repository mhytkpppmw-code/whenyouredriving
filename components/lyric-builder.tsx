"use client";

import { useCallback, useEffect, useState } from "react";
import { voterHeaders } from "@/lib/client-voter";
import { formatLyric, groupSubmissionsByManufacturer } from "@/lib/lyric";
import type { SubmissionPublic } from "@/lib/types";

export function LyricBuilder() {
  const [name, setName] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [feeling, setFeeling] = useState("");
  const [submissions, setSubmissions] = useState<SubmissionPublic[]>([]);
  const [votedManufacturerIds, setVotedManufacturerIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadSubmissions = useCallback(async () => {
    try {
      const res = await fetch("/api/submissions", { headers: voterHeaders() });
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as {
        submissions: SubmissionPublic[];
        votedManufacturerIds: string[];
      };
      setSubmissions(data.submissions);
      setVotedManufacturerIds(new Set(data.votedManufacturerIds));
      setError(null);
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
        headers: { "Content-Type": "application/json", ...voterHeaders() },
        body: JSON.stringify({
          name: name.trim(),
          vehicle: vehicle.trim(),
          feeling: feeling.trim(),
        }),
      });

      const data = (await res.json()) as {
        submission?: SubmissionPublic;
        error?: string;
      };

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

  async function handleVote(submission: SubmissionPublic) {
    if (votedManufacturerIds.has(submission.manufacturerId)) return;

    setVotingId(submission.id);
    setError(null);

    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...voterHeaders() },
        body: JSON.stringify({ submissionId: submission.id }),
      });

      const data = (await res.json()) as {
        submission?: SubmissionPublic;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Could not vote");
      }

      if (data.submission) {
        setSubmissions((prev) =>
          prev.map((s) => (s.id === data.submission!.id ? data.submission! : s))
        );
        setVotedManufacturerIds((prev) => new Set(prev).add(submission.manufacturerId));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not vote");
    } finally {
      setVotingId(null);
    }
  }

  const groups = groupSubmissionsByManufacturer(submissions, votedManufacturerIds);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-10 px-6 py-12">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          When You&apos;re Driving
        </h1>
        <p className="mt-2 text-slate-400">Fill in the blanks. Submit your variation.</p>
      </header>

      <section className="rounded-2xl bg-road-900/90 p-6 ring-1 ring-slate-800 sm:p-8">
        <p className="text-center text-lg leading-relaxed text-white sm:text-xl">
          When you&apos;re driving in your{" "}
          <span className="font-semibold text-signal-amber">{vehicle.trim() || "___"}</span>{" "}
          and you{" "}
          <span className="font-semibold text-signal-amber">{feeling.trim() || "___"}</span>,
          diarrhea, <span aria-label="fart">💨💨</span>, diarrhea.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-300">
            Your name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane"
            maxLength={60}
            required
            autoComplete="name"
            className="w-full rounded-xl border border-slate-700 bg-road-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-signal-amber focus:outline-none focus:ring-2 focus:ring-signal-amber/30"
          />
        </div>

        <div>
          <label htmlFor="vehicle" className="mb-2 block text-sm font-medium text-slate-300">
            Car manufacturer
          </label>
          <input
            id="vehicle"
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value)}
            placeholder="Chevy"
            maxLength={80}
            required
            className="w-full rounded-xl border border-slate-700 bg-road-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-signal-amber focus:outline-none focus:ring-2 focus:ring-signal-amber/30"
          />
        </div>

        <div>
          <label htmlFor="feeling" className="mb-2 block text-sm font-medium text-slate-300">
            What happens (rhyme line)
          </label>
          <input
            id="feeling"
            value={feeling}
            onChange={(e) => setFeeling(e.target.value)}
            placeholder="feel something heavy"
            maxLength={80}
            required
            className="w-full rounded-xl border border-slate-700 bg-road-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-signal-amber focus:outline-none focus:ring-2 focus:ring-signal-amber/30"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-signal-amber py-3 text-sm font-bold text-road-950 transition hover:bg-amber-400 disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit variation"}
        </button>

        {success && (
          <p className="text-center text-sm text-signal-green">Added to the wall!</p>
        )}
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
          <div className="space-y-8">
            {groups.map((group) => (
              <div key={group.manufacturerId}>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                </p>
                <h3 className="mb-1 text-lg font-semibold text-signal-amber">
                  {group.manufacturerName}
                </h3>
                {group.hasVotedToday && (
                  <p className="mb-3 text-xs text-slate-500">
                    You voted for this manufacturer today. Try again tomorrow.
                  </p>
                )}
                <ul className="space-y-2">
                  {group.submissions.map((s) => {
                    const votedForManufacturer = votedManufacturerIds.has(s.manufacturerId);
                    const isVoting = votingId === s.id;

                    return (
                      <li
                        key={s.id}
                        className="flex items-start gap-3 rounded-xl bg-road-900/80 px-4 py-3 ring-1 ring-slate-800"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-signal-amber">{s.submitterName}</p>
                          <p className="mt-1 text-sm leading-relaxed text-slate-200">{s.text}</p>
                          <p className="mt-2 text-xs text-slate-500">
                            {s.voteCount} {s.voteCount === 1 ? "vote" : "votes"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleVote(s)}
                          disabled={votedForManufacturer || isVoting}
                          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-signal-amber/40 disabled:cursor-not-allowed disabled:opacity-50 bg-road-800 text-signal-amber hover:bg-road-800/80 disabled:hover:bg-road-800"
                          aria-label={
                            votedForManufacturer
                              ? `Already voted for ${group.manufacturerName} today`
                              : `Vote for this ${group.manufacturerName} rhyme`
                          }
                        >
                          {isVoting ? "..." : votedForManufacturer ? "Voted" : "Vote"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {error && <p className="text-center text-sm text-red-400">{error}</p>}
    </div>
  );
}
