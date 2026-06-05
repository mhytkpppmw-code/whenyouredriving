import { NextResponse } from "next/server";
import { sanitizeInput } from "@/lib/lyric";
import { scoreRhymeMatch } from "@/lib/rhyme";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
      { error: "Vehicle and rhyme text are required." },
      { status: 400 }
    );
  }

  return NextResponse.json({ rhymeMatch: scoreRhymeMatch(vehicle, feeling) });
}
