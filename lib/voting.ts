import { randomUUID } from "crypto";
import { readData, runExclusive, writeData } from "@/lib/db";
import { findManufacturerById } from "@/lib/manufacturers";
import type { Submission, SubmissionPublic, Vote } from "@/lib/types";
import { getVoteDateString } from "@/lib/voter";

export const ALREADY_VOTED_MESSAGE =
  "You already voted for this manufacturer today. Try again tomorrow.";

export function toSubmissionPublic(
  submission: Submission,
  manufacturerName: string
): SubmissionPublic {
  return {
    id: submission.id,
    manufacturerId: submission.manufacturerId,
    manufacturerName,
    submitterName: submission.submitterName?.trim() || "Anonymous",
    text: submission.text,
    voteCount: submission.voteCount,
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
  voterId: string
): Promise<{ submission: SubmissionPublic; vote: Vote }> {
  const voteDate = getVoteDateString();

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
      voteDate,
      createdAt: new Date().toISOString(),
    };

    submission.voteCount += 1;
    data.votes.push(vote);
    await writeData(data);

    return {
      submission: toSubmissionPublic(submission, manufacturer.name),
      vote,
    };
  });
}

export class VoteError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "VoteError";
  }
}
