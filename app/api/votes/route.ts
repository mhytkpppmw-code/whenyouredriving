import { NextResponse } from "next/server";
import { StorageNotConfiguredError } from "@/lib/pg";
import { ALREADY_VOTED_MESSAGE, VoteError, castVote } from "@/lib/voting";
import { resolveVoterId } from "@/lib/voter";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const submissionId =
      typeof (body as { submissionId?: string }).submissionId === "string"
        ? (body as { submissionId: string }).submissionId.trim()
        : "";

    if (!submissionId) {
      return NextResponse.json(
        { error: "submissionId is required." },
        { status: 400 }
      );
    }

    if (!UUID_RE.test(submissionId)) {
      return NextResponse.json(
        { error: "Invalid submission id." },
        { status: 400 }
      );
    }

    const name =
      typeof (body as { name?: string }).name === "string"
        ? (body as { name: string }).name
        : "";

    if (!name.trim()) {
      return NextResponse.json(
        { error: "Your name is required to vote." },
        { status: 400 }
      );
    }

    const voterId = resolveVoterId(request);
    const result = await castVote(submissionId, voterId, name);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof VoteError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/votes:", error);
    return NextResponse.json(
      { error: ALREADY_VOTED_MESSAGE },
      { status: 500 }
    );
  }
}
