import { NextResponse } from "next/server";
import { isAdminCodeConfigured, verifyAdminCode } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!isAdminCodeConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Deletion is not enabled." },
      { status: 503 }
    );
  }

  const code =
    typeof (body as { code?: string }).code === "string"
      ? (body as { code: string }).code
      : "";

  const ok = verifyAdminCode(code);
  return NextResponse.json(
    ok ? { ok: true } : { ok: false, error: "Incorrect code." },
    { status: ok ? 200 : 403 }
  );
}
