"use client";

import { useEffect, useRef } from "react";

type Props = {
  expanded: boolean;
  onClose: () => void;
  onToggle: () => void;
  voteCount: number;
  voters: string[];
};

export function VoteCountDisplay({ expanded, onClose, onToggle, voteCount, voters }: Props) {
  const rootRef = useRef<HTMLDetailsElement>(null);
  const label = `${voteCount} ${voteCount === 1 ? "vote" : "votes"}`;

  useEffect(() => {
    if (!expanded) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [expanded, onClose]);

  if (voteCount === 0) {
    return <span className="text-sm text-steam">{label}</span>;
  }

  return (
    <details ref={rootRef} className="group relative z-40 inline-block text-sm" open={expanded}>
      <summary
        onClick={(event) => {
          event.preventDefault();
          onToggle();
        }}
        aria-label="Show voter names"
        className="list-none rounded-sm text-steam underline underline-offset-4 transition hover:cursor-pointer hover:text-caramel focus:outline-none focus-visible:ring-2 focus-visible:ring-caramel/40 [&::-webkit-details-marker]:hidden"
      >
        {label}
      </summary>
      <div className="absolute bottom-full left-0 z-50 mb-2 w-[min(16rem,calc(100vw-2rem))] rounded-xl border-2 border-poop-600 bg-[#1a1209] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.75)]">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-steam">
          Voters
        </p>
        <ul className="flex flex-col gap-1">
          {voters.map((voter, index) => (
            <li key={`${voter}-${index}`} className="wrap-break-word text-sm text-cream/90">
              {voter}
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
