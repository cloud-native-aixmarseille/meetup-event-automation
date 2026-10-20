import type { FeedbackAgenda } from "./feedback-agenda.js";

export interface FeedbackTalkResult {
	readonly title: string;
	readonly url: string;
	readonly speakerIds: readonly string[];
}

export interface FeedbackTalkResultsGateway {
	/**
	 * Read existing talk identities without creating or updating feedback records.
	 * Missing or ambiguous records raise FeedbackResolutionError.
	 */
	resolve(input: {
		readonly key: string;
		readonly url: string;
		readonly agenda: FeedbackAgenda;
	}): Promise<readonly FeedbackTalkResult[]>;
}
