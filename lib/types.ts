export type Manufacturer = {
  id: string;
  name: string;
  createdAt: string;
};

export type Submission = {
  id: string;
  manufacturerId: string;
  text: string;
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
  voteDate: string;
  createdAt: string;
};

export type AppData = {
  manufacturers: Manufacturer[];
  submissions: Submission[];
  votes: Vote[];
};

/** API shape for the client */
export type SubmissionPublic = {
  id: string;
  manufacturerId: string;
  manufacturerName: string;
  submitterName: string;
  text: string;
  voteCount: number;
  createdAt: string;
};

export type ManufacturerGroup = {
  manufacturerId: string;
  manufacturerName: string;
  submissions: SubmissionPublic[];
  hasVotedToday: boolean;
};
