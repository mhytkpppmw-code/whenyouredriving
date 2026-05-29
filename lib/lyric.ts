import type { ManufacturerGroup, SubmissionPublic } from "@/lib/types";

export const MAX_INPUT_LENGTH = 80;
export const MAX_NAME_LENGTH = 60;

/**
 * Drop control characters (incl. NUL). NUL bytes break Postgres text columns,
 * and stripping control chars removes a class of malformed/injection payloads.
 */
function stripControlChars(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001F\u007F]/g, " ");
}

export function sanitizeInput(value: string): string {
  return stripControlChars(value).trim().replace(/\s+/g, " ").slice(0, MAX_INPUT_LENGTH);
}

export function sanitizeName(value: string): string {
  return stripControlChars(value).trim().replace(/\s+/g, " ").slice(0, MAX_NAME_LENGTH);
}

export function formatLyric(manufacturerName: string, feeling: string): string {
  return `When you're driving in your ${manufacturerName} and ${feeling}, diarrhea, 💨💨, diarrhea.`;
}

export function groupSubmissionsByManufacturer(
  submissions: SubmissionPublic[],
  votedManufacturerIds: Set<string>
): ManufacturerGroup[] {
  const map = new Map<string, ManufacturerGroup>();

  for (const submission of submissions) {
    const existing = map.get(submission.manufacturerId);
    if (existing) {
      existing.submissions.push(submission);
    } else {
      map.set(submission.manufacturerId, {
        manufacturerId: submission.manufacturerId,
        manufacturerName: submission.manufacturerName,
        submissions: [submission],
        hasVotedToday: votedManufacturerIds.has(submission.manufacturerId),
      });
    }
  }

  for (const group of map.values()) {
    group.submissions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  return Array.from(map.values()).sort((a, b) => {
    const latest = (items: SubmissionPublic[]) =>
      Math.max(...items.map((s) => new Date(s.createdAt).getTime()));
    return latest(b.submissions) - latest(a.submissions);
  });
}
