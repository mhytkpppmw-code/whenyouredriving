import { randomUUID } from "crypto";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { formatLyric, sanitizeInput, sanitizeName } from "@/lib/lyric";
import { manufacturerKey, normalizeManufacturerName } from "@/lib/manufacturers";
import { getVoteDateString } from "@/lib/voter";
import { ALREADY_VOTED_MESSAGE, VoteError } from "@/lib/vote-errors";
import type { SubmissionPublic } from "@/lib/types";

/** Use Postgres whenever a connection string is configured. */
export function isPostgresEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** True when running in a production deployment (Vercel or a prod build). */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

export const DATABASE_NOT_CONFIGURED_MESSAGE =
  "The database isn't configured, so submissions and voting are unavailable. Please try again later.";

/**
 * Raised when the app runs in production without a configured database. We
 * refuse to silently fall back to the ephemeral local JSON file there, since
 * that data would be lost between deployments and cold starts.
 */
export class StorageNotConfiguredError extends Error {
  readonly status = 503;
  constructor(message: string = DATABASE_NOT_CONFIGURED_MESSAGE) {
    super(message);
    this.name = "StorageNotConfiguredError";
  }
}

/**
 * Guard the file-storage fallback. In production a missing DATABASE_URL is a
 * misconfiguration we surface to the user rather than silently degrading.
 */
export function assertStorageConfigured(): void {
  if (!isPostgresEnabled() && isProduction()) {
    throw new StorageNotConfiguredError();
  }
}

let sqlClient: NeonQueryFunction<false, false> | null = null;

function getSql(): NeonQueryFunction<false, false> {
  if (!sqlClient) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set");
    }
    sqlClient = neon(url);
  }
  return sqlClient;
}

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    const sql = getSql();
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS manufacturers (
          id UUID PRIMARY KEY,
          name TEXT NOT NULL,
          name_key TEXT NOT NULL UNIQUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS submissions (
          id UUID PRIMARY KEY,
          manufacturer_id UUID NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
          text TEXT NOT NULL,
          submitter_name TEXT NOT NULL DEFAULT 'Anonymous',
          vote_count INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          created_by_voter_id TEXT
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS votes (
          id UUID PRIMARY KEY,
          submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
          manufacturer_id UUID NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
          voter_id TEXT NOT NULL,
          voter_name TEXT,
          vote_date DATE NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          CONSTRAINT votes_unique_per_day UNIQUE (voter_id, manufacturer_id, vote_date)
        )
      `;
    })().catch((error) => {
      // allow a later retry if schema setup failed (e.g. transient connection)
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

type SubmissionRow = {
  id: string;
  manufacturer_id: string;
  manufacturer_name: string;
  submitter_name: string | null;
  text: string;
  vote_count: number | string;
  created_at: string | Date;
  voters?: (string | null)[];
};

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function rowToPublic(row: SubmissionRow): SubmissionPublic {
  return {
    id: row.id,
    manufacturerId: row.manufacturer_id,
    manufacturerName: row.manufacturer_name,
    submitterName: (row.submitter_name ?? "").trim() || "Anonymous",
    text: row.text,
    voteCount: Number(row.vote_count) || 0,
    voters: (row.voters ?? []).map((v) => (v ?? "").trim() || "Anonymous"),
    createdAt: toIso(row.created_at),
  };
}

export async function pgListSubmissionsPublic(voterId?: string): Promise<{
  submissions: SubmissionPublic[];
  votedManufacturerIds: string[];
}> {
  await ensureSchema();
  const sql = getSql();

  const rows = (await sql`
    SELECT
      s.id,
      s.manufacturer_id,
      m.name AS manufacturer_name,
      s.submitter_name,
      s.text,
      s.vote_count,
      s.created_at,
      COALESCE(
        (
          SELECT array_agg(COALESCE(v.voter_name, 'Anonymous') ORDER BY v.created_at)
          FROM votes v
          WHERE v.submission_id = s.id
        ),
        ARRAY[]::text[]
      ) AS voters
    FROM submissions s
    JOIN manufacturers m ON m.id = s.manufacturer_id
    ORDER BY s.created_at DESC
  `) as SubmissionRow[];

  const submissions = rows.map(rowToPublic);

  let votedManufacturerIds: string[] = [];
  if (voterId) {
    const voteDate = getVoteDateString();
    const voted = (await sql`
      SELECT DISTINCT manufacturer_id
      FROM votes
      WHERE voter_id = ${voterId} AND vote_date = ${voteDate}
    `) as { manufacturer_id: string }[];
    votedManufacturerIds = voted.map((r) => r.manufacturer_id);
  }

  return { submissions, votedManufacturerIds };
}

export async function pgAddSubmission(
  submitterName: string,
  manufacturerName: string,
  feeling: string,
  voterId?: string
): Promise<SubmissionPublic> {
  await ensureSchema();
  const sql = getSql();

  const nameClean = sanitizeName(submitterName);
  if (!nameClean) {
    throw new Error("Your name is required.");
  }
  const feelingClean = sanitizeInput(feeling);
  if (!feelingClean) {
    throw new Error("Rhyme text is required.");
  }
  const normalized = normalizeManufacturerName(manufacturerName);
  if (!normalized) {
    throw new Error("Manufacturer is required.");
  }
  const key = manufacturerKey(normalized);

  const mfrRows = (await sql`
    INSERT INTO manufacturers (id, name, name_key)
    VALUES (${randomUUID()}, ${normalized}, ${key})
    ON CONFLICT (name_key) DO UPDATE SET name = manufacturers.name
    RETURNING id, name
  `) as { id: string; name: string }[];
  const manufacturer = mfrRows[0];

  const text = formatLyric(manufacturer.name, feelingClean);

  const subRows = (await sql`
    INSERT INTO submissions (id, manufacturer_id, text, submitter_name, vote_count, created_by_voter_id)
    VALUES (${randomUUID()}, ${manufacturer.id}, ${text}, ${nameClean}, 0, ${voterId ?? null})
    RETURNING id, manufacturer_id, text, submitter_name, vote_count, created_at
  `) as SubmissionRow[];
  const row = subRows[0];

  return {
    id: row.id,
    manufacturerId: row.manufacturer_id,
    manufacturerName: manufacturer.name,
    submitterName: nameClean,
    text: row.text,
    voteCount: 0,
    voters: [],
    createdAt: toIso(row.created_at),
  };
}

export async function pgCastVote(
  submissionId: string,
  voterId: string,
  voterName: string
): Promise<{ submission: SubmissionPublic }> {
  await ensureSchema();
  const sql = getSql();

  const nameClean = sanitizeName(voterName);
  if (!nameClean) {
    throw new VoteError("Your name is required to vote.", 400);
  }
  const voteDate = getVoteDateString();

  const subRows = (await sql`
    SELECT s.id, s.manufacturer_id, m.name AS manufacturer_name
    FROM submissions s
    JOIN manufacturers m ON m.id = s.manufacturer_id
    WHERE s.id = ${submissionId}
  `) as { id: string; manufacturer_id: string; manufacturer_name: string }[];

  if (subRows.length === 0) {
    throw new VoteError("Submission not found.", 404);
  }
  const sub = subRows[0];

  const inserted = (await sql`
    INSERT INTO votes (id, submission_id, manufacturer_id, voter_id, voter_name, vote_date)
    VALUES (${randomUUID()}, ${submissionId}, ${sub.manufacturer_id}, ${voterId}, ${nameClean}, ${voteDate})
    ON CONFLICT ON CONSTRAINT votes_unique_per_day DO NOTHING
    RETURNING id
  `) as { id: string }[];

  if (inserted.length === 0) {
    throw new VoteError(ALREADY_VOTED_MESSAGE, 409);
  }

  const updated = (await sql`
    UPDATE submissions
    SET vote_count = vote_count + 1
    WHERE id = ${submissionId}
    RETURNING id, manufacturer_id, text, submitter_name, vote_count, created_at
  `) as SubmissionRow[];
  const row = updated[0];

  const voterRows = (await sql`
    SELECT COALESCE(voter_name, 'Anonymous') AS voter_name
    FROM votes
    WHERE submission_id = ${submissionId}
    ORDER BY created_at
  `) as { voter_name: string }[];

  return {
    submission: {
      id: row.id,
      manufacturerId: row.manufacturer_id,
      manufacturerName: sub.manufacturer_name,
      submitterName: (row.submitter_name ?? "").trim() || "Anonymous",
      text: row.text,
      voteCount: Number(row.vote_count) || 0,
      voters: voterRows.map((v) => (v.voter_name ?? "").trim() || "Anonymous"),
      createdAt: toIso(row.created_at),
    },
  };
}
