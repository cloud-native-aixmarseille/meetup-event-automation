export class ProposalSourceError extends Error {
	constructor(
		readonly code:
			| "unavailable"
			| "rate-limited"
			| "invalid"
			| "mapping-required"
			| "conflict",
		readonly retryAfterSeconds?: number,
		readonly context?: {
			readonly reason?:
				| "configuration"
				| "http"
				| "network"
				| "timeout"
				| "json"
				| "schema"
				| "response-size";
			readonly status?: number;
			readonly field?: string;
		},
	) {
		super(`Proposal source ${code}.`);
		this.name = "ProposalSourceError";
	}
}
