export class ProposalSourceError extends Error {
	constructor(
		readonly code:
			| "unavailable"
			| "rate-limited"
			| "invalid"
			| "mapping-required"
			| "conflict",
		readonly retryAfterSeconds?: number,
	) {
		super(`Proposal source ${code}.`);
		this.name = "ProposalSourceError";
	}
}
