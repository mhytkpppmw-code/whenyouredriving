import { NextResponse } from "next/server";
import { ALREADY_VOTED_MESSAGE, VoteError, castVote } from "@/lib/voting";
import { resolveVoterId } from "@/lib/voter";

export const runtime = "nodejs";

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

    const voterId = resolveVoterId(request);
    const result = await castVote(submissionId, voterId);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
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
