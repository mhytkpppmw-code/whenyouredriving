import { NextResponse } from "next/server";
import { sanitizeInput } from "@/lib/lyric";
import { addSubmission, readSubmissions } from "@/lib/submissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const submissions = await readSubmissions();
    return NextResponse.json({ submissions });
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

    if (!vehicle || !feeling) {
      return NextResponse.json(
        { error: "Both blanks are required." },
        { status: 400 }
      );
    }

    const submission = await addSubmission(vehicle, feeling);
    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    console.error("POST /api/submissions:", error);
    return NextResponse.json(
      { error: "Failed to save submission" },
      { status: 500 }
    );
  }
}