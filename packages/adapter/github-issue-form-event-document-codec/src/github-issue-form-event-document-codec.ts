import type {
	EventDocument,
	EventDocumentCodec,
	EventDocumentDecodeResult,
	EventRepositoryPatch,
	MeetupEvent,
} from "@meetup-automation/event";
import type { GitHubIssueFormEventDocumentCodecOptions } from "./github-issue-form-event-document-codec-contracts.js";
import { IssueFormReader } from "./issue-form-reader.js";
import { IssueFormWriter } from "./issue-form-writer.js";

export class GitHubIssueFormEventDocumentCodec implements EventDocumentCodec {
	private readonly reader: IssueFormReader;
	private readonly writer: IssueFormWriter;
	constructor(options: GitHubIssueFormEventDocumentCodecOptions = {}) {
		this.reader = new IssueFormReader(options);
		this.writer = new IssueFormWriter(options);
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
