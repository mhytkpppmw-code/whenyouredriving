// Push the local JSON data store into Postgres (one-time seeding of a fresh DB).
//
// Usage (PowerShell), with DATABASE_URL in .env.local:
//   node --env-file=.env.local scripts/migrate-to-postgres.mjs
//
// Safe to re-run: every insert uses ON CONFLICT DO NOTHING.
import { readFileSync } from "fs";
import os from "os";
import path from "path";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL is not set.\n" +
      "Run: node --env-file=.env.local scripts/migrate-to-postgres.mjs"
  );
  process.exit(1);
}

const sql = neon(url);

function getStorePath() {
  const base =
    process.env.WHENYOUREDRIVING_DATA_DIR || process.env.LOCALAPPDATA || os.tmpdir();
  return path.join(base, "whenyouredriving", "app.json");
}

async function ensureSchema() {
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
}

async function main() {
  const storePath = getStorePath();
  const data = JSON.parse(readFileSync(storePath, "utf8"));

  await ensureSchema();

  let mfr = 0;
  let subs = 0;
  let votes = 0;

  for (const m of data.manufacturers ?? []) {
    await sql`
      INSERT INTO manufacturers (id, name, name_key, created_at)
      VALUES (${m.id}, ${m.name}, ${String(m.name).toLowerCase()}, ${m.createdAt})
      ON CONFLICT DO NOTHING
    `;
    mfr++;
  }

  for (const s of data.submissions ?? []) {
    await sql`
      INSERT INTO submissions (id, manufacturer_id, text, submitter_name, vote_count, created_at, created_by_voter_id)
      VALUES (
        ${s.id}, ${s.manufacturerId}, ${s.text},
        ${s.submitterName ?? "Anonymous"}, ${s.voteCount ?? 0},
        ${s.createdAt}, ${s.createdByVoterId ?? null}
      )
      ON CONFLICT DO NOTHING
    `;
    subs++;
  }

  for (const v of data.votes ?? []) {
    await sql`
      INSERT INTO votes (id, submission_id, manufacturer_id, voter_id, voter_name, vote_date, created_at)
      VALUES (
        ${v.id}, ${v.submissionId}, ${v.manufacturerId},
        ${v.voterId}, ${v.voterName ?? null}, ${v.voteDate}, ${v.createdAt}
      )
      ON CONFLICT DO NOTHING
    `;
    votes++;
  }

  console.log(
    `Migrated from ${storePath}\n  manufacturers: ${mfr}\n  submissions: ${subs}\n  votes: ${votes}`
  );
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
