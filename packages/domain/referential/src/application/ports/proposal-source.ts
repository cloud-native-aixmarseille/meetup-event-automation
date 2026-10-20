export interface SourceSpeaker {
	readonly id: string;
	readonly displayName: string;
	readonly email: string;
	readonly company?: string | null;
	readonly pictureUrl?: string | null;
}
export interface SourceProposal {
	readonly id: string;
	readonly number?: number;
	readonly title: string;
	readonly abstract: string;
	readonly accepted: boolean;
	readonly languages: readonly string[];
	readonly formats: readonly string[];
	readonly speakerIds: readonly string[];
}
export interface ProposalSnapshot {
	readonly provider: string;
	readonly event: string;
	readonly speakers: readonly SourceSpeaker[];
	readonly proposals: readonly SourceProposal[];
}
export interface ProposalSource {
	load(): Promise<ProposalSnapshot>;
}
export type SpeakerCsvRow = Readonly<Record<string, string>>;
export interface SpeakerSyncState {
	readonly version: 1;
	readonly reservedIds: readonly string[];
}
