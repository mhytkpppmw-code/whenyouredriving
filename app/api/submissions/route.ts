import { NextResponse } from "next/server";
import { sanitizeInput, sanitizeName } from "@/lib/lyric";
import { addSubmission, listSubmissionsPublic } from "@/lib/submissions";
import { resolveVoterId } from "@/lib/voter";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const voterId = resolveVoterId(request);
    const { submissions, votedManufacturerIds } = await listSubmissionsPublic(voterId);
    return NextResponse.json({ submissions, votedManufacturerIds });
  } catch (error) {
    console.error("GET /api/submissions:", error);
    return NextResponse.json(
      { error: "Failed to load submissions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const name = sanitizeName(
      typeof (body as { name?: string }).name === "string"
        ? (body as { name: string }).name
        : ""
    );
    const vehicle = sanitizeInput(
      typeof (body as { vehicle?: string }).vehicle === "string"
        ? (body as { vehicle: string }).vehicle
        : ""
    );
    const feeling = sanitizeInput(
      typeof (body as { feeling?: string }).feeling === "string"
        ? (body as { feeling: string }).feeling
        : ""
    );

    if (!name) {
      return NextResponse.json({ error: "Your name is required." }, { status: 400 });
    }
    if (!vehicle) {
      return NextResponse.json(
        { error: "Car manufacturer is required." },
        { status: 400 }
      );
    }
    if (!feeling) {
      return NextResponse.json(
        { error: "Rhyme text is required." },
        { status: 400 }
      );
    }

    const voterId = resolveVoterId(request);
    const submission = await addSubmission(name, vehicle, feeling, voterId);
    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    console.error("POST /api/submissions:", error);
    const message = error instanceof Error ? error.message : "Failed to save submission";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
