export const ALREADY_VOTED_MESSAGE =
  "You already voted for this manufacturer today. Try again tomorrow.";

export class VoteError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "VoteError";
  }
}
