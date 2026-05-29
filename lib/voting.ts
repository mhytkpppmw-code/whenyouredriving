import { randomUUID } from "crypto";
import { readData, runExclusive, writeData } from "@/lib/db";
import { findManufacturerById } from "@/lib/manufacturers";
import { sanitizeName } from "@/lib/lyric";
import { pgCastVote, usePostgres } from "@/lib/pg";
import type { Submission, SubmissionPublic, Vote } from "@/lib/types";
import { getVoteDateString } from "@/lib/voter";
import { ALREADY_VOTED_MESSAGE, VoteError } from "@/lib/vote-errors";

export { ALREADY_VOTED_MESSAGE, VoteError };

export function getVoterNames(votes: Vote[], submissionId: string): string[] {
  return votes
    .filter((v) => v.submissionId === submissionId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((v) => v.voterName?.trim() || "Anonymous");
}

export function toSubmissionPublic(
  submission: Submission,
  manufacturerName: string,
  voters: string[] = []
): SubmissionPublic {
  return {
    id: submission.id,
    manufacturerId: submission.manufacturerId,
    manufacturerName,
    submitterName: submission.submitterName?.trim() || "Anonymous",
    text: submission.text,
    voteCount: submission.voteCount,
    voters,
    createdAt: submission.createdAt,
  };
}

export function getVotedManufacturerIdsToday(
  votes: Vote[],
  voterId: string,
  voteDate = getVoteDateString()
): Set<string> {
  return new Set(
    votes
      .filter((v) => v.voterId === voterId && v.voteDate === voteDate)
      .map((v) => v.manufacturerId)
  );
}

export async function castVote(
  submissionId: string,
  voterId: string,
  voterName: string
): Promise<{ submission: SubmissionPublic; vote?: Vote }> {
  if (usePostgres()) {
    return pgCastVote(submissionId, voterId, voterName);
  }

  const voteDate = getVoteDateString();
  const nameClean = sanitizeName(voterName);
  if (!nameClean) {
    throw new VoteError("Your name is required to vote.", 400);
  }

  return runExclusive(async () => {
    const data = await readData();
    const submission = data.submissions.find((s) => s.id === submissionId);
    if (!submission) {
      throw new VoteError("Submission not found.", 404);
    }

    const manufacturer = findManufacturerById(data.manufacturers, submission.manufacturerId);
    if (!manufacturer) {
      throw new VoteError("Manufacturer not found.", 404);
    }

    const duplicate = data.votes.some(
      (v) =>
        v.voterId === voterId &&
        v.manufacturerId === submission.manufacturerId &&
        v.voteDate === voteDate
    );

    if (duplicate) {
      throw new VoteError(ALREADY_VOTED_MESSAGE, 409);
    }

    const vote: Vote = {
      id: randomUUID(),
      submissionId: submission.id,
      manufacturerId: submission.manufacturerId,
      voterId,
      voterName: nameClean,
      voteDate,
      createdAt: new Date().toISOString(),
    };

    submission.voteCount += 1;
    data.votes.push(vote);
    await writeData(data);

    return {
      submission: toSubmissionPublic(
        submission,
        manufacturer.name,
        getVoterNames(data.votes, submission.id)
      ),
      vote,
    };
  });
}
