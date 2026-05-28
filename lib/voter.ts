import { createHash } from "crypto";

const VOTER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getVoteDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Stable voter id from client header, with IP + UA fallback. */
export function resolveVoterId(request: Request): string {
  const header = request.headers.get("x-voter-id")?.trim();
  if (header && VOTER_ID_PATTERN.test(header)) {
    return header;
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  const ua = request.headers.get("user-agent") || "unknown";

  return createHash("sha256").update(`${ip}|${ua}`).digest("hex").slice(0, 32);
}
