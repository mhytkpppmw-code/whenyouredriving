# When You're Driving

Submit your variation of the rhyme and vote for your favorite:

**When you're driving in your _____ and _____, diarrhea, 💨💨, diarrhea.**

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000

### Database

The app reads `DATABASE_URL` (a [Neon](https://neon.tech) Postgres connection
string) from `.env.local`:

```
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

- When `DATABASE_URL` is set, submissions and votes are stored in Postgres.
- In local development without `DATABASE_URL`, the app falls back to a local
  JSON file (outside the project folder) so you can run it with no database.
- In production, a missing `DATABASE_URL` surfaces an error in the UI rather
  than silently using ephemeral storage.

`.env.local` is gitignored and must never be committed.

## Deploy

Connect this repo to [Vercel](https://vercel.com) and set the `DATABASE_URL`
environment variable to your Neon connection string.

## Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS
- TypeScript
- Neon Postgres (`@neondatabase/serverless`)
