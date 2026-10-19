export class TemplateError extends Error {
	constructor(readonly code: "syntax" | "date" | "format") {
		super(`Invalid template ${code}`);
		this.name = "TemplateError";
	}
}
