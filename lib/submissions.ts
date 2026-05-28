import { promises as fs } from "fs";
import path from "path";
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

function isServerless(): boolean {
  return Boolean(process.env.VERCEL);
}

function getDataPath(): string {
  if (isServerless()) {
    return path.join("/tmp", "whenyouredriving-submissions.json");
  }
  return path.join(process.cwd(), "data", "submissions.json");
}

let memoryStore: Submission[] | null = null;

function getMemoryStore(): Submission[] {
  if (!memoryStore) {
    memoryStore = [...SEED_SUBMISSIONS];
  }
  return memoryStore;
}

async function ensureStoreFile(): Promise<void> {
  const dataPath = getDataPath();
  try {
    await fs.access(dataPath);
    return;
  } catch {
    // file missing — create from seeds
  }

  await fs.mkdir(path.dirname(dataPath), { recursive: true });
  await fs.writeFile(dataPath, JSON.stringify(SEED_SUBMISSIONS, null, 2), "utf8");
}

export async function readSubmissions(): Promise<Submission[]> {
  const dataPath = getDataPath();

  try {
    await ensureStoreFile();
    const raw = await fs.readFile(dataPath, "utf8");
    const parsed = JSON.parse(raw) as Submission[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_SUBMISSIONS;
  } catch (error) {
    console.error("readSubmissions failed:", error);
    return getMemoryStore();
  }
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

  const dataPath = getDataPath();

  try {
    const submissions = await readSubmissions();
    submissions.unshift(entry);
    await fs.mkdir(path.dirname(dataPath), { recursive: true });
    await fs.writeFile(dataPath, JSON.stringify(submissions, null, 2), "utf8");
    memoryStore = submissions;
    return entry;
  } catch (error) {
    console.error("addSubmission file write failed:", error);
    const store = getMemoryStore();
    store.unshift(entry);
    memoryStore = store;
    return entry;
  }
}