import { TemplateError } from "./template-error.js";

/** Native container boundaries delimit the body of an each directive. */
export class TemplateCollectionParser {
	parse(text: string): string | undefined {
		if (!text.includes("{{#")) return undefined;
		const match = /^\{\{#each ([a-z][a-z0-9_]*)\}\}$/.exec(text.trim());
		if (!match) throw new TemplateError("syntax");
		return match[1];
	}
}
