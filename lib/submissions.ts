import { randomUUID } from "crypto";
import { sanitizeInput, type Submission } from "@/lib/lyric";

export type { Submission };

const SEED_SUBMISSIONS: Submission[] = [
  {
    id: "seed-1",
    vehicle: "Chevy",
    feeling: "feel something heavy",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "seed-2",
    vehicle: "Honda",
    feeling: "feel a rumble in your tummy",
    createdAt: "2026-01-02T00:00:00.000Z",
  },
];

let store: Submission[] = [...SEED_SUBMISSIONS];

export async function readSubmissions(): Promise<Submission[]> {
  return [...store];
}

export async function addSubmission(
  vehicle: string,
  feeling: string
): Promise<Submission> {
  const entry: Submission = {
    id: randomUUID(),
    vehicle: sanitizeInput(vehicle),
    feeling: sanitizeInput(feeling),
    createdAt: new Date().toISOString(),
  };

  store = [entry, ...store];
  return entry;
}
