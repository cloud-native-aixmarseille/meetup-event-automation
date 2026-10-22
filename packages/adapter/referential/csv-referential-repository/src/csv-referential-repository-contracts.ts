export interface CsvReferentialRepositoryOptions {
	workspaceRoot: string;
	hostsPath: string;
	speakersPath: string;
}

export type CsvRow = Record<string, string>;
