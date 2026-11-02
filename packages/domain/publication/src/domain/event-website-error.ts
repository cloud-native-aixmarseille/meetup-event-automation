export class EventWebsiteError extends Error {
	constructor(readonly kind: "access" | "conflict" | "format" | "unavailable") {
		super(`Website event listing: ${kind}`);
		this.name = "EventWebsiteError";
	}
}
