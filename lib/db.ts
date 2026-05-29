import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { AppData } from "@/lib/types";

const EMPTY_DATA: AppData = {
  manufacturers: [],
  submissions: [],
  votes: [],
};

function isServerless(): boolean {
  return Boolean(process.env.VERCEL);
}

/**
 * Local data lives OUTSIDE the project/OneDrive folder. OneDrive locks,
 * reverts, and re-encodes synced files, which previously caused submitted
 * rhymes to disappear. Using a non-synced OS location keeps writes stable.
 */
function getLocalDataDir(): string {
  const base =
    process.env.WHENYOUREDRIVING_DATA_DIR ||
    process.env.LOCALAPPDATA ||
    os.tmpdir();
  return path.join(base, "whenyouredriving");
}

function getDataPath(): string {
  if (isServerless()) {
    return path.join("/tmp", "whenyouredriving-app.json");
  }
  return path.join(getLocalDataDir(), "app.json");
}

function getLegacyPath(): string {
  return path.join(process.cwd(), "data", "submissions.json");
}

let memoryStore: AppData | null = null;
let writeChain: Promise<void> = Promise.resolve();

export function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const result = writeChain.then(fn);
  writeChain = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

async function migrateLegacyIfNeeded(): Promise<AppData | null> {
  try {
    const raw = await fs.readFile(getLegacyPath(), "utf8");
    const legacy = JSON.parse(raw) as Array<{
      id: string;
      vehicle: string;
      feeling: string;
      createdAt: string;
      voteCount?: number;
    }>;
    if (!Array.isArray(legacy) || legacy.length === 0) return null;

    const { randomUUID } = await import("crypto");
    const manufacturers = new Map<string, { id: string; name: string; createdAt: string }>();
    const submissions: AppData["submissions"] = [];

    for (const row of legacy) {
      const name = row.vehicle?.trim();
      const feeling = row.feeling?.trim();
      if (!name || !feeling) continue;

      const key = name.toLowerCase();
      let manufacturer = manufacturers.get(key);
      if (!manufacturer) {
        manufacturer = {
          id: randomUUID(),
          name,
          createdAt: row.createdAt ?? new Date().toISOString(),
        };
        manufacturers.set(key, manufacturer);
      }

      submissions.push({
        id: row.id ?? randomUUID(),
        manufacturerId: manufacturer.id,
        text: `When you're driving in your ${name} and you ${feeling}, diarrhea, 💨💨, diarrhea.`,
        submitterName: "Anonymous",
        voteCount: row.voteCount ?? 0,
        createdAt: row.createdAt ?? new Date().toISOString(),
      });
    }

    return {
      manufacturers: Array.from(manufacturers.values()),
      submissions,
      votes: [],
    };
  } catch {
    return null;
  }
}

async function ensureStoreFile(): Promise<void> {
  const dataPath = getDataPath();
  try {
    await fs.access(dataPath);
    return;
  } catch {
    // missing
  }

  const migrated = await migrateLegacyIfNeeded();
  const initial = migrated ?? EMPTY_DATA;
  await fs.mkdir(path.dirname(dataPath), { recursive: true });
  await fs.writeFile(dataPath, JSON.stringify(initial, null, 2), "utf8");
}

export async function readData(): Promise<AppData> {
  const dataPath = getDataPath();

  await ensureStoreFile();

  try {
    const raw = await fs.readFile(dataPath, "utf8");
    const parsed = JSON.parse(raw) as AppData;
    if (
      parsed &&
      Array.isArray(parsed.manufacturers) &&
      Array.isArray(parsed.submissions) &&
      Array.isArray(parsed.votes)
    ) {
      memoryStore = parsed;
      return parsed;
    }
    throw new Error("Data file has an unexpected shape");
  } catch (error) {
    console.error("readData failed:", error);
    // The store file exists but could not be read/parsed (e.g. a transient
    // lock or a momentary sync race). Never fall back to empty data here:
    // doing so would let the next write clobber existing rhymes/votes.
    if (memoryStore) {
      return memoryStore;
    }
    throw error;
  }
}

export async function writeData(data: AppData): Promise<void> {
  const dataPath = getDataPath();
  memoryStore = data;

  try {
    await fs.mkdir(path.dirname(dataPath), { recursive: true });
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("writeData failed:", error);
    throw error;
  }
}
