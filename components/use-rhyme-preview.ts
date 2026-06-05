"use client";

import { useEffect, useState } from "react";
import type { RhymeMatch } from "@/lib/types";

export function useRhymePreview(vehicle: string, feeling: string) {
  const [match, setMatch] = useState<RhymeMatch | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const vehicleClean = vehicle.trim();
    const feelingClean = feeling.trim();
    let ignore = false;
    const controller = new AbortController();

    if (!vehicleClean || !feelingClean) {
      queueMicrotask(() => {
        if (!ignore) {
          setMatch(null);
          setPending(false);
        }
      });

      return () => {
        ignore = true;
        controller.abort();
      };
    }

    queueMicrotask(() => {
      if (!ignore) setMatch(null);
    });

    const timeout = window.setTimeout(async () => {
      setPending(true);

      try {
        const res = await fetch("/api/rhyme-match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vehicle: vehicleClean, feeling: feelingClean }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Could not score rhyme");

        const data = (await res.json()) as { rhymeMatch: RhymeMatch };
        if (!ignore) setMatch(data.rhymeMatch);
      } catch (err) {
        if (!ignore && !(err instanceof DOMException && err.name === "AbortError")) {
          setMatch(null);
        }
      } finally {
        if (!ignore) setPending(false);
      }
    }, 300);

    return () => {
      ignore = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [vehicle, feeling]);

  return { match, pending };
}
