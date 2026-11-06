import { ContentError } from "./content-error.js";

/** Public location facts without document text or provider responses. */
export class ContentConflictError extends ContentError {
	constructor(
		readonly reason: "missing" | "changed",
		readonly pageId: string | undefined,
	) {
		super("conflict");
		this.name = "ContentConflictError";
	}
}
