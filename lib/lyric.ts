export type Submission = {
  id: string;
  vehicle: string;
  feeling: string;
  createdAt: string;
};

export function formatLyric(vehicle: string, feeling: string): string {
  return `When you're driving in your ${vehicle} and you ${feeling}, diarrhea, 💨💨, diarrhea.`;
}

export const MAX_INPUT_LENGTH = 80;

export function sanitizeInput(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_INPUT_LENGTH);
}