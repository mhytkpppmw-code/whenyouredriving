"use client";

import { useEffect, useState } from "react";
import { voterHeaders } from "@/lib/client-voter";
import { groupSubmissionsByManufacturer } from "@/lib/lyric";
import type { SubmissionPublic } from "@/lib/types";

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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
  const [votePromptId, setVotePromptId] = useState<string | null>(null);
  const [voterName, setVoterName] = useState("");
  const [voteError, setVoteError] = useState<string | null>(null);
  const [expandedVotersId, setExpandedVotersId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("wyd-voter-name");
      if (saved) setVoterName(saved);
    } catch {
      // ignore unavailable storage
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadSubmissions() {
      try {
        const res = await fetch("/api/submissions", { headers: voterHeaders() });
        if (!res.ok) throw new Error("Failed to load");
        const data = (await res.json()) as {
          submissions: SubmissionPublic[];
          votedManufacturerIds: string[];
        };
        if (ignore) return;
        setSubmissions(data.submissions);
        setVotedManufacturerIds(new Set(data.votedManufacturerIds));
        setError(null);
      } catch {
        if (!ignore) {
          setError("Could not load submissions.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadSubmissions();

    return () => {
      ignore = true;
    };
  }, []);

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

  function openVotePrompt(submission: SubmissionPublic) {
    if (votedManufacturerIds.has(submission.manufacturerId)) return;
    setVoteError(null);
    setVotePromptId(submission.id);
  }

  function closeVotePrompt() {
    setVotePromptId(null);
    setVoteError(null);
  }

  async function confirmVote(e: React.FormEvent) {
    e.preventDefault();
    if (!votePromptId) return;

    const trimmedName = voterName.trim();
    if (!trimmedName) {
      setVoteError("Please enter your name to vote.");
      return;
    }

    const submissionId = votePromptId;
    setVotingId(submissionId);
    setVoteError(null);

    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...voterHeaders() },
        body: JSON.stringify({ submissionId, name: trimmedName }),
      });

      const data = (await res.json()) as {
        submission?: SubmissionPublic;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Could not vote");
      }

      try {
        localStorage.setItem("wyd-voter-name", trimmedName);
      } catch {
        // ignore unavailable storage
      }

      if (data.submission) {
        setSubmissions((prev) =>
          prev.map((s) => (s.id === data.submission!.id ? data.submission! : s))
        );
        setVotedManufacturerIds((prev) =>
          new Set(prev).add(data.submission!.manufacturerId)
        );
      }
      setVotePromptId(null);
    } catch (err) {
      setVoteError(err instanceof Error ? err.message : "Could not vote");
    } finally {
      setVotingId(null);
    }
  }

  const groups = groupSubmissionsByManufacturer(submissions, votedManufacturerIds);

  return (
    <div className="safe-pb mx-auto w-full max-w-2xl space-y-8 px-4 py-8 sm:space-y-10 sm:px-6 sm:py-12">
      <header className="text-center">
        <div className="mb-3 text-4xl drop-shadow-xs" aria-hidden>
          🚗💨
        </div>
        <h1 className="text-balance text-2xl font-bold tracking-tight text-cream sm:text-4xl">
          Diarrhea.
        </h1>
        <p className="mt-2 text-sm text-steam sm:text-base">
          Submit your rhyme. Vote for your favorite.
        </p>
      </header>

      <section className="poop-card p-4 sm:p-8">
        <p className="text-balance text-center text-base leading-relaxed text-cream sm:text-xl">
          When you&apos;re driving in your{" "}
          <span className="wrap-break-word font-semibold text-caramel">
            {vehicle.trim() || "___"}
          </span>{" "}
          and{" "}
          <span className="wrap-break-word font-semibold text-caramel">
            {feeling.trim() || "___"}
          </span>
          , diarrhea, <span aria-label="fart">💨💨</span>, diarrhea.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium text-cream/90">
            Your name:
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane"
            maxLength={60}
            required
            autoComplete="name"
            enterKeyHint="next"
            className="field-input"
          />
        </div>

        <div>
          <label htmlFor="vehicle" className="mb-2 block text-sm font-medium text-cream/90">
            Your ride:
          </label>
          <input
            id="vehicle"
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value)}
            placeholder="Chevy"
            maxLength={80}
            required
            enterKeyHint="next"
            className="field-input"
          />
        </div>

        <div>
          <label htmlFor="feeling" className="mb-2 block text-sm font-medium text-cream/90">
            What happens:
          </label>
          <input
            id="feeling"
            value={feeling}
            onChange={(e) => setFeeling(e.target.value)}
            placeholder="you feel something heavy"
            maxLength={80}
            required
            enterKeyHint="done"
            className="field-input"
          />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Submitting..." : "Submit rhyme"}
        </button>

        {success && (
          <p className="text-center text-sm font-medium text-signal-green">Added to the wall!</p>
        )}
      </form>

      <section>
        <h2 className="mb-4 text-center text-lg font-semibold text-cream">
          Submitted rhymes
        </h2>
        {loading ? (
          <p className="text-center text-sm text-steam">Loading...</p>
        ) : submissions.length === 0 ? (
          <p className="text-center text-sm text-steam">Be the first to submit!</p>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {groups.map((group) => (
              <div key={group.manufacturerId}>
                <h3 className="mb-1 flex items-center gap-2 text-lg font-semibold text-caramel">
                  <span className="text-base opacity-80" aria-hidden>
                    💩
                  </span>
                  {group.manufacturerName}
                </h3>
                {group.hasVotedToday && (
                  <p className="mb-3 text-xs leading-relaxed text-steam">
                    You voted for this ride today. Try again tomorrow.
                  </p>
                )}
                <ul className="space-y-3">
                  {group.submissions.map((s) => {
                    const votedForManufacturer = votedManufacturerIds.has(s.manufacturerId);
                    const isVoting = votingId === s.id;

                    return (
                      <li
                        key={s.id}
                        className="poop-card-inset flex flex-col gap-3 p-4 sm:flex-row sm:items-start"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <p className="text-sm font-medium text-caramel">{s.submitterName}</p>
                            <time
                              dateTime={s.createdAt}
                              className="text-xs text-steam"
                              title={new Date(s.createdAt).toLocaleString()}
                            >
                              {formatTimestamp(s.createdAt)}
                            </time>
                          </div>
                          <p className="mt-1 wrap-break-word text-sm leading-relaxed text-cream/90">
                            {s.text}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedVotersId((prev) => (prev === s.id ? null : s.id))
                            }
                            disabled={s.voteCount === 0}
                            aria-expanded={expandedVotersId === s.id}
                            className="mt-2 text-xs text-steam underline-offset-2 transition hover:text-caramel disabled:cursor-default disabled:no-underline disabled:hover:text-steam enabled:underline"
                          >
                            {s.voteCount} {s.voteCount === 1 ? "vote" : "votes"}
                          </button>
                          {expandedVotersId === s.id && s.voters.length > 0 && (
                            <ul className="mt-2 space-y-1 border-l-2 border-poop-700/50 pl-3">
                              {s.voters.map((voter, i) => (
                                <li key={`${s.id}-voter-${i}`} className="text-xs text-cream/80">
                                  {voter}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => openVotePrompt(s)}
                          disabled={votedForManufacturer || isVoting}
                          className="btn-vote w-full sm:w-auto"
                          aria-label={
                            votedForManufacturer
                              ? `Already voted for ${group.manufacturerName} ride today`
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

      {error && (
        <p
          className="rounded-lg bg-red-950/50 px-3 py-2 text-center text-sm leading-relaxed text-red-400 ring-1 ring-red-900/50"
          role="alert"
        >
          {error}
        </p>
      )}

      {votePromptId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Enter your name to vote"
          onClick={closeVotePrompt}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={confirmVote}
            className="poop-card w-full max-w-sm space-y-4 p-5 sm:p-6"
          >
            <div>
              <h3 className="text-base font-semibold text-cream">Vote</h3>
              <p className="mt-1 text-sm text-steam">Enter your name to cast your vote.</p>
            </div>
            <input
              autoFocus
              value={voterName}
              onChange={(e) => setVoterName(e.target.value)}
              placeholder="Your name"
              maxLength={60}
              required
              autoComplete="name"
              enterKeyHint="done"
              className="field-input"
            />
            {voteError && (
              <p className="text-sm leading-relaxed text-red-400" role="alert">
                {voteError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeVotePrompt}
                className="btn-vote flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={votingId === votePromptId}
                className="btn-primary flex-1"
              >
                {votingId === votePromptId ? "Voting..." : "Vote"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
