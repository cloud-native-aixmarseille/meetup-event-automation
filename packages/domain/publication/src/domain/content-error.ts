export class ContentError extends Error {
	constructor(
		readonly code:
			| "contract"
			| "missing"
			| "location"
			| "conflict"
			| "recovery"
			| "revision"
			| "image",
	) {
		super(
			`Asset content ${code}; review the template contract and managed bindings`,
		);
		this.name = "ContentError";
	}
}
