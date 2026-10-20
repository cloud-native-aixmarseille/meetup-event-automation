import type { FeedbackAgenda } from "./feedback-agenda.js";

export interface FeedbackLinkGateway {
	/** Update only the target of the configured existing short link. */
	updateTarget(url: string): Promise<boolean>;
}

export interface FeedbackEventGateway {
	/**
	 * Synchronize an existing event, or create/recover one by its stable source key.
	 * Ambiguous organizer data raises FeedbackResolutionError("conflict").
	 */
	ensureEvent(input: {
		readonly key: string;
		readonly name: string;
		readonly scheduleUrl: string;
		readonly url?: string;
		readonly agenda?: FeedbackAgenda;
	}): Promise<string>;
}
