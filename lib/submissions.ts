import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  sanitizeInput,
  type Submission,
} from "@/lib/lyric";

const DATA_PATH = path.join(process.cwd(), "data", "submissions.json");

export type { Submission };

export async function readSubmissions(): Promise<Submission[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as Submission[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addSubmission(
  vehicle: string,
  feeling: string
): Promise<Submission> {
  const submissions = await readSubmissions();
  const entry: Submission = {
    id: randomUUID(),
    vehicle: sanitizeInput(vehicle),
    feeling: sanitizeInput(feeling),
    createdAt: new Date().toISOString(),
  };

  submissions.unshift(entry);
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(submissions, null, 2), "utf8");

  return entry;
}