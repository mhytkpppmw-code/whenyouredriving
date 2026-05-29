import { randomUUID } from "crypto";
import { readData, runExclusive, writeData } from "@/lib/db";
import { getOrCreateManufacturer, findManufacturerById } from "@/lib/manufacturers";
import { formatLyric, sanitizeInput, sanitizeName } from "@/lib/lyric";
import type { Submission, SubmissionPublic } from "@/lib/types";
import { getVotedManufacturerIdsToday, getVoterNames, toSubmissionPublic } from "@/lib/voting";
import { pgAddSubmission, pgListSubmissionsPublic, usePostgres } from "@/lib/pg";
import { getVoteDateString } from "@/lib/voter";

const SEED_ROWS = [
  {
    submitterName: "Alex",
    vehicle: "Chevy",
    feeling: "you feel something heavy",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

async function ensureSeeds(): Promise<void> {
  const data = await readData();
  if (data.submissions.length > 0) return;

  await runExclusive(async () => {
    const fresh = await readData();
    if (fresh.submissions.length > 0) return;

    for (const row of SEED_ROWS) {
      const key = row.vehicle.toLowerCase();
      let manufacturer = fresh.manufacturers.find((m) => m.name.toLowerCase() === key);
      if (!manufacturer) {
        manufacturer = {
          id: randomUUID(),
          name: row.vehicle,
          createdAt: row.createdAt,
        };
        fresh.manufacturers.push(manufacturer);
      }
      fresh.submissions.push({
        id: randomUUID(),
        manufacturerId: manufacturer.id,
        text: formatLyric(manufacturer.name, row.feeling),
        submitterName: row.submitterName,
        voteCount: 0,
        createdAt: row.createdAt,
      });
    }
    await writeData(fresh);
  });
}

export async function listSubmissionsPublic(voterId?: string): Promise<{
  submissions: SubmissionPublic[];
  votedManufacturerIds: string[];
}> {
  if (usePostgres()) {
    return pgListSubmissionsPublic(voterId);
  }

  await ensureSeeds();
  const data = await readData();
  const voteDate = getVoteDateString();
  const votedSet = voterId
    ? getVotedManufacturerIdsToday(data.votes, voterId, voteDate)
    : new Set<string>();

  const submissions = data.submissions
    .map((s) => {
      const manufacturer = findManufacturerById(data.manufacturers, s.manufacturerId);
      if (!manufacturer) return null;
      return toSubmissionPublic(s, manufacturer.name, getVoterNames(data.votes, s.id));
    })
    .filter((s): s is SubmissionPublic => s !== null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    submissions,
    votedManufacturerIds: Array.from(votedSet),
  };
}

export async function addSubmission(
  submitterName: string,
  manufacturerName: string,
  feeling: string,
  voterId?: string
): Promise<SubmissionPublic> {
  if (usePostgres()) {
    return pgAddSubmission(submitterName, manufacturerName, feeling, voterId);
  }

  const nameClean = sanitizeName(submitterName);
  if (!nameClean) {
    throw new Error("Your name is required.");
  }

  const feelingClean = sanitizeInput(feeling);
  if (!feelingClean) {
    throw new Error("Rhyme text is required.");
  }

  const manufacturer = await getOrCreateManufacturer(manufacturerName);
  const text = formatLyric(manufacturer.name, feelingClean);

  return runExclusive(async () => {
    const data = await readData();
    const entry: Submission = {
      id: randomUUID(),
      manufacturerId: manufacturer.id,
      text,
      submitterName: nameClean,
      voteCount: 0,
      createdAt: new Date().toISOString(),
      ...(voterId ? { createdByVoterId: voterId } : {}),
    };
    data.submissions.unshift(entry);
    await writeData(data);
    return toSubmissionPublic(entry, manufacturer.name);
  });
}
