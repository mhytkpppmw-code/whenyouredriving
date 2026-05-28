# AGENTS.md

## Project Overview

This app allows users to submit funny rhyme entries for a given car manufacturer using the format:

> When you're driving in your —— and ——, diarrhea 💨 💨 diarrhea.

The app displays all submitted entries and allows users to vote for their favorite submission.

## Current Implementation

| Spec | In the codebase |
|------|-----------------|
| Car manufacturer | `Manufacturer` entity; form field `vehicle` → `getOrCreateManufacturer()` |
| Rhyme text | `formatLyric()` stored as `Submission.text` |
| Group by manufacturer | `groupSubmissionsByManufacturer()` in `lib/lyric.ts` |
| Voting | `POST /api/votes` → `lib/voting.ts` (`castVote`) |
| Vote limit | One vote per `voterId` + `manufacturerId` + `voteDate` (UTC day) |
| Voter identity | `X-Voter-Id` header (localStorage UUID) or IP+UA hash fallback |
| Storage | `data/app.json` (local), `/tmp/whenyouredriving-app.json` on Vercel |

**Key files:** `components/lyric-builder.tsx`, `app/api/submissions/route.ts`, `app/api/votes/route.ts`, `lib/db.ts`, `lib/voting.ts`, `lib/submissions.ts`, `lib/types.ts`, `lib/client-voter.ts`

**Stack:** Next.js 15 (App Router), React 19, Tailwind CSS, TypeScript.

**OneDrive:** Files may save as UTF-16 and break the build (missing styles, `\0` in source). Run `.\scripts\fix-utf8.ps1`, delete `.next`, then `npm run dev`.

---

## Core Features

### Entry Submission

Users can submit a rhyme entry tied to a specific car manufacturer.

Each submission should include:

* Car manufacturer
* Rhyme text
* Submitted date/time
* Vote count

The app should preserve the general rhyme structure while allowing users to provide the manufacturer and matching phrase.

### Entry Display

The app displays all submitted entries so users can browse available rhymes.

Entries should be grouped or filterable by manufacturer when possible.

Each entry should show:

* Manufacturer
* Full rhyme
* Current vote count
* Vote action/button

### Voting

Users can vote for a submission.

Voting should increment the vote count for the selected entry.

### Vote Restriction

Users may only vote once per manufacturer per day.

This means:

* A user can vote for one Ford submission today.
* The same user cannot vote for another Ford submission again today.
* The same user may still vote for a Toyota submission today.
* The user may vote for Ford again tomorrow.

Vote restriction should be enforced using the manufacturer and current date.

## Business Rules

1. Users can submit entries for supported car manufacturers.
2. Users can view all submitted entries.
3. Users can vote for entries.
4. Users cannot submit more than one vote for the same manufacturer in a single day.
5. Vote tracking should be based on a stable user identifier where available.
6. If no logged-in user exists, voting should be restricted using the best available anonymous identifier, such as browser/session/device fingerprint or IP-based fallback.

## Data Model Guidance

Recommended entities:

### Manufacturer

Stores the car manufacturer.

Fields:

* `id`
* `name`
* `createdAt`

### Submission

Stores user-created rhyme entries.

Fields:

* `id`
* `manufacturerId`
* `text`
* `voteCount`
* `createdAt`
* `createdByUserId` or anonymous identifier

### Vote

Stores vote history to enforce voting limits.

Fields:

* `id`
* `submissionId`
* `manufacturerId`
* `userId` or anonymous identifier
* `voteDate`
* `createdAt`

A unique constraint should prevent duplicate votes for the same user, manufacturer, and date.

Recommended unique key:

```sql
user_identifier + manufacturer_id + vote_date
```

**Migration from today:** `Submission` uses `vehicle`, `feeling`, and `createdAt` (no `voteCount`). Add `voteCount` (default `0`), then `Vote` records and a vote API with server-side eligibility. Map or normalize `vehicle` to `Manufacturer` when ready.

## Validation Requirements

* Manufacturer is required.
* Submission text is required.
* Submission text should not be empty or whitespace.
* Users cannot vote more than once per manufacturer per day.
* The app should return a clear message when a user has already voted for that manufacturer today.

Example message:

> You already voted for this manufacturer today. Try again tomorrow.

## Agent/Developer Notes

When modifying this app:

* Preserve the core rhyme format.
* Do not allow vote counts to be updated directly from the client without validation.
* Always validate vote eligibility server-side.
* Do not rely only on frontend checks for vote restrictions.
* Keep voting logic centralized so the rule is enforced consistently.
* Prefer database-level constraints for duplicate vote protection.
* Handle race conditions where a user clicks vote multiple times quickly.
* Keep the user experience playful, simple, and fast.
* Use existing design tokens: `road-*`, `signal-green`, `signal-amber` in `tailwind.config.ts`.

## Suggested User Flow

1. User selects or views a car manufacturer.
2. User submits a rhyme entry.
3. Entry appears in the public list.
4. Other users can vote on the entry.
5. If a user has already voted for that manufacturer today, the vote is rejected.
6. User can vote for the same manufacturer again on the next calendar day.

## Goal

The goal of the app is to create a simple, funny, community-driven voting experience around car manufacturer diarrhea rhymes while keeping voting fair by limiting users to one vote per manufacturer per day.
