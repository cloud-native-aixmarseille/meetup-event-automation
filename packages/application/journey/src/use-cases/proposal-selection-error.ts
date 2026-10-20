export class ProposalSelectionError extends Error {
	constructor(
		readonly code: "invalid-selection" | "not-found" | "not-accepted",
	) {
		super(`Proposal selection ${code}.`);
		this.name = "ProposalSelectionError";
	}
}
