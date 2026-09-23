export interface FeedbackLinkGateway {
	/** Update only the target of the configured existing short link. */
	updateTarget(url: string): Promise<boolean>;
}
