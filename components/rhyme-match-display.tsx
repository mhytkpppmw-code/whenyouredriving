"use client";

import { useEffect, useRef, useState } from "react";
import type { RhymeMatch } from "@/lib/types";

type Props = {
  match?: RhymeMatch | null;
  manufacturerName?: string;
  pending?: boolean;
};

type Tone = {
  label: string;
  emoji: string;
  className: string;
};

export function RhymeMatchDisplay({ match, pending = false }: Props) {
  if (pending && !match) {
    return (
      <p className="inline-flex max-w-full items-center rounded-xl border border-poop-700/70 bg-poop-900/70 px-3 py-1.5 text-xs text-steam">
        Checking rhyme...
      </p>
    );
  }
  if (!match) return null;

  if (match.status === "unknown" || match.percent === null) {
    const tone = getMatchTone(null);
    return (
      <RhymeDetailsPopover
        label="No rhyme score"
        tone={tone}
        details={[
          ["Rating", `${tone.emoji} ${tone.label}`],
          ["Status", "No dictionary match"],
          ["Dictionary miss", formatWords(match.unknownWords) || "Unknown word"],
        ]}
      />
    );
  }

  const isPartial = match.status === "partial";
  const tone = getMatchTone(match.percent);
  const details: Detail[] = [
    ["Rating", `${tone.emoji} ${tone.label}`],
    [
      "Phrase rhyme",
      match.phraseRhymePercent === null ? "Unavailable" : `${match.phraseRhymePercent}%`,
    ],
    ["Flow", match.flowPercent === null ? "Unavailable" : `${match.flowPercent}%`],
  ];
  if (isPartial && match.unknownWords.length > 0) {
    details.push(["Dictionary miss", formatWords(match.unknownWords)]);
  }

  return (
    <RhymeDetailsPopover
      label={`${match.percent}% ${isPartial ? "partial match" : "rhyme match"}`}
      tone={tone}
      details={details}
    />
  );
}

function RhymeDetailsPopover({
  label,
  tone,
  details,
}: {
  label: string;
  tone: Tone;
  details: Detail[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <details ref={rootRef} open={open} className="group relative z-40 inline-block text-xs">
      <summary
        onClick={(event) => {
          event.preventDefault();
          setOpen((current) => !current);
        }}
        aria-label="Show rhyme match details"
        className={`list-none rounded-sm font-medium underline underline-offset-4 transition hover:cursor-pointer hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-caramel/40 [&::-webkit-details-marker]:hidden ${tone.className}`}
      >
        {label}
      </summary>
      <div className="absolute bottom-full left-0 z-50 mb-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border-2 border-poop-600 bg-[#1a1209] p-3 text-steam shadow-[0_18px_40px_rgba(0,0,0,0.75)]">
        <p className="mb-2 border-b border-poop-700/50 pb-2 text-sm font-semibold text-cream">
          Rhyme details
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
          {details.map(([name, value]) => (
            <div key={name} className="contents">
              <dt className="text-steam">{name}</dt>
              <dd
                className={`wrap-break-word text-right ${
                  name === "Rating" ? `font-semibold ${tone.className}` : "text-cream/90"
                }`}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}

type Detail = [string, string];

function formatWords(words: string[]): string {
  return words.slice(0, 3).join(", ");
}

function getMatchTone(percent: number | null): Tone {
  if (percent === null) {
    return {
      label: "Unscored",
      emoji: "🤷‍♂️",
      className: "text-steam",
    };
  }
  if (percent >= 85) {
    return {
      label: "Strong",
      emoji: "🔥",
      className: "text-signal-green",
    };
  }
  if (percent >= 65) {
    return {
      label: "Solid",
      emoji: "👍",
      className: "text-signal-amber",
    };
  }
  return {
    label: "Loose",
    emoji: "💩",
    className: "text-steam",
  };
}
