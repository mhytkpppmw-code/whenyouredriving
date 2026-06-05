export type Manufacturer = {
  id: string;
  name: string;
  createdAt: string;
};

export type Submission = {
  id: string;
  manufacturerId: string;
  text: string;
  rhymeMatch?: RhymeMatch;
  /** Required on new submissions; older records may omit. */
  submitterName?: string;
  voteCount: number;
  createdAt: string;
  createdByVoterId?: string;
};

export type Vote = {
  id: string;
  submissionId: string;
  manufacturerId: string;
  voterId: string;
  /** Display name entered by the voter. Older records may omit. */
  voterName?: string;
  voteDate: string;
  createdAt: string;
};

export type AppData = {
  manufacturers: Manufacturer[];
  submissions: Submission[];
  votes: Vote[];
};

export type RhymeMatch = {
  algorithmVersion: number;
  status: "scored" | "partial" | "unknown";
  percent: number | null;
  phraseRhymePercent: number | null;
  flowPercent: number | null;
  referencePhrase: string | null;
  submittedPhrase: string | null;
  referenceSyllables: number | null;
  phraseSyllables: number | null;
  unknownWords: string[];
};

/** API shape for the client */
export type SubmissionPublic = {
  id: string;
  manufacturerId: string;
  manufacturerName: string;
  submitterName: string;
  text: string;
  rhymeMatch?: RhymeMatch;
  voteCount: number;
  /** Names of people who voted for this submission. */
  voters: string[];
  createdAt: string;
};

export type ManufacturerGroup = {
  manufacturerId: string;
  manufacturerName: string;
  submissions: SubmissionPublic[];
  hasVotedToday: boolean;
};
