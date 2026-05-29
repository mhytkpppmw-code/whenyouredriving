"use client";

import { useEffect, useRef, useState } from "react";
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
  const [voterName, setVoterName] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem("wyd-voter-name") ?? "";
    } catch {
      return "";
    }
  });
  const [voteError, setVoteError] = useState<string | null>(null);
  const [expandedVotersId, setExpandedVotersId] = useState<string | null>(null);

  const [toots, setToots] = useState<number[]>([]);
  const tootSeq = useRef(0);

  const [adminPromptOpen, setAdminPromptOpen] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminVerifying, setAdminVerifying] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  // Validated code held only in memory for the next single deletion.
  const adminCodeRef = useRef("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadSubmissions() {
      try {
        const res = await fetch("/api/submissions", { headers: voterHeaders() });
        const data = (await res.json().catch(() => ({}))) as {
          submissions?: SubmissionPublic[];
          votedManufacturerIds?: string[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "Could not load submissions.");
        }
        if (ignore) return;
        setSubmissions(data.submissions ?? []);
        setVotedManufacturerIds(new Set(data.votedManufacturerIds ?? []));
        setError(null);
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Could not load submissions.");
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

  useEffect(() => {
    function onAdminTrigger() {
      // Clicking "makers" again while in delete mode (and nothing deleted yet)
      // simply backs out, so the moderator doesn't have to refresh.
      if (deleteMode) {
        adminCodeRef.current = "";
        setDeleteMode(false);
        setConfirmDeleteId(null);
        setDeleteError(null);
        return;
      }
      setAdminError(null);
      setAdminCodeInput("");
      setAdminPromptOpen(true);
    }
    window.addEventListener("wyd:admin", onAdminTrigger);
    return () => window.removeEventListener("wyd:admin", onAdminTrigger);
  }, [deleteMode]);

  function toot() {
    const id = (tootSeq.current += 1);
    setToots((prev) => [...prev, id]);
  }

  function exitDeleteMode() {
    adminCodeRef.current = "";
    setDeleteMode(false);
    setConfirmDeleteId(null);
  }

  async function submitAdminCode(e: React.FormEvent) {
    e.preventDefault();
    const code = adminCodeInput;
    if (!code.trim()) {
      setAdminError("Enter the code.");
      return;
    }
    setAdminVerifying(true);
    setAdminError(null);
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Incorrect code.");
      }
      adminCodeRef.current = code;
      setDeleteMode(true);
      setDeleteError(null);
      setAdminPromptOpen(false);
      setAdminCodeInput("");
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Incorrect code.");
    } finally {
      setAdminVerifying(false);
    }
  }

  async function confirmDelete() {
    const id = confirmDeleteId;
    if (!id) return;
    setDeletingId(id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/submissions?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "X-Admin-Code": adminCodeRef.current },
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Could not delete.");
      }
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      // Single-use: a successful deletion ends delete mode, so the moderator
      // must re-enter the code to remove anything else.
      exitDeleteMode();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete.");
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  }

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
        <div className="relative mb-3 inline-block text-4xl drop-shadow-xs">
          <span aria-hidden>🚗</span>
          <button
            type="button"
            onClick={toot}
            aria-label="Toot!"
            className="cursor-pointer align-baseline transition active:scale-90"
          >
            💨
          </button>
          {toots.map((id) => (
            <span
              key={id}
              onAnimationEnd={() => setToots((prev) => prev.filter((t) => t !== id))}
              className="toot-pop pointer-events-none absolute -top-2 left-1/2 select-none whitespace-nowrap text-lg font-extrabold tracking-wide text-caramel"
            >
              TOOT TOOT!
            </span>
          ))}
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
        {deleteMode && (
          <div className="mb-4 flex flex-col gap-2 rounded-xl bg-signal-amber/15 px-3 py-2 text-center text-xs leading-relaxed text-signal-amber ring-1 ring-signal-amber/40 sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <span>
              Moderator mode: pick one rhyme to delete. The code is required
              again after each deletion.
            </span>
            <button
              type="button"
              onClick={exitDeleteMode}
              className="shrink-0 font-semibold underline underline-offset-2 transition hover:text-caramel"
            >
              Cancel
            </button>
          </div>
        )}
        {deleteError && (
          <p
            className="mb-4 rounded-lg bg-red-950/50 px-3 py-2 text-center text-sm leading-relaxed text-red-400 ring-1 ring-red-900/50"
            role="alert"
          >
            {deleteError}
          </p>
        )}
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
                        <div className="flex w-full gap-2 sm:w-auto sm:flex-col">
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
                          {deleteMode && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError(null);
                                setConfirmDeleteId(s.id);
                              }}
                              disabled={deletingId === s.id}
                              className="min-h-[44px] w-full shrink-0 rounded-xl border-2 border-red-900/60 bg-red-950/40 px-4 py-2.5 text-sm font-semibold text-red-300 shadow-mound-sm transition active:scale-[0.98] hover:border-red-700 hover:bg-red-900/50 focus:outline-hidden focus:ring-2 focus:ring-red-700/40 disabled:opacity-50 sm:w-auto"
                              aria-label={`Delete this ${group.manufacturerName} rhyme`}
                            >
                              Delete
                            </button>
                          )}
                        </div>
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

      {adminPromptOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Enter moderator code"
          onClick={() => setAdminPromptOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitAdminCode}
            className="poop-card w-full max-w-sm space-y-4 p-5 sm:p-6"
          >
            <div>
              <h3 className="text-base font-semibold text-cream">Moderator access</h3>
              <p className="mt-1 text-sm text-steam">
                Enter the code to delete a rhyme.
              </p>
            </div>
            <input
              autoFocus
              type="password"
              value={adminCodeInput}
              onChange={(e) => setAdminCodeInput(e.target.value)}
              placeholder="Code"
              autoComplete="off"
              enterKeyHint="done"
              className="field-input"
            />
            {adminError && (
              <p className="text-sm leading-relaxed text-red-400" role="alert">
                {adminError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAdminPromptOpen(false)}
                className="btn-vote flex-1"
              >
                Cancel
              </button>
              <button type="submit" disabled={adminVerifying} className="btn-primary flex-1">
                {adminVerifying ? "Checking..." : "Unlock"}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delete"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="poop-card w-full max-w-sm space-y-4 p-5 sm:p-6"
          >
            <div>
              <h3 className="text-base font-semibold text-cream">Delete this rhyme?</h3>
              <p className="mt-1 text-sm text-steam">This can&apos;t be undone.</p>
            </div>
            <p className="wrap-break-word rounded-lg bg-poop-950/60 px-3 py-2 text-sm leading-relaxed text-cream/90 ring-1 ring-poop-800/40">
              {submissions.find((s) => s.id === confirmDeleteId)?.text}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="btn-vote flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deletingId === confirmDeleteId}
                className="btn-primary flex-1"
              >
                {deletingId === confirmDeleteId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
