/** Expected gaps or ambiguous identities in organizer-maintained feedback data. */
export class FeedbackResolutionError extends Error {
	constructor(readonly kind: "unavailable" | "conflict") {
		super(
			kind === "conflict"
				? "The feedback agenda contains ambiguous talk or speaker identities"
				: "Feedback talk results are unavailable",
		);
		this.name = "FeedbackResolutionError";
	}
}
