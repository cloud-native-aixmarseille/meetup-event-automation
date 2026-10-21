import type {
	EventDocument,
	EventDocumentCodec,
	EventDocumentDecodeResult,
	EventRepositoryPatch,
	MeetupEvent,
} from "@meetup-automation/event";
import type { GitHubIssueFormEventDocumentCodecOptions } from "./github-issue-form-event-document-codec-contracts.js";
import type {
	IssueFormReader,
	IssueFormReaderArguments,
} from "./issue-form-reader.js";
import type {
	IssueFormWriter,
	IssueFormWriterArguments,
} from "./issue-form-writer.js";

export interface GitHubIssueFormEventDocumentCodecCollaborators {
	readonly createIssueFormReader: (
		...args: IssueFormReaderArguments
	) => IssueFormReader;
	readonly createIssueFormWriter: (
		...args: IssueFormWriterArguments
	) => IssueFormWriter;
}

export class GitHubIssueFormEventDocumentCodec implements EventDocumentCodec {
	private readonly reader: IssueFormReader;
	private readonly writer: IssueFormWriter;
	constructor(
		private readonly collaborators: GitHubIssueFormEventDocumentCodecCollaborators,
		options: GitHubIssueFormEventDocumentCodecOptions = {},
	) {
		this.reader = this.collaborators.createIssueFormReader(options);
		this.writer = this.collaborators.createIssueFormWriter(options);
	}
	decode(document: EventDocument): EventDocumentDecodeResult {
		return this.reader.decode(document);
	}
	createPatch(
		document: EventDocument,
		event: MeetupEvent,
	): EventRepositoryPatch {
		return this.writer.createPatch(document, event);
	}
}
export type GitHubIssueFormEventDocumentCodecArguments =
	ConstructorParameters<typeof GitHubIssueFormEventDocumentCodec> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
