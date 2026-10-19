import { TemplateError } from "./template-error.js";
import type { TemplateExpression } from "./template-model.js";

/** Normalize authored references; callers decide what their operands mean. */
export class TemplateExpressionParser {
	parse(body: string, syntax: "braces" | "brackets"): TemplateExpression {
		const match =
			syntax === "brackets"
				? /^([A-Z][A-Z0-9]*)_([A-Z][A-Z0-9_]*)(?::([^{}[\]]+))?$/u.exec(body)
				: /^([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*)(?::([^{}[\]]+))?$/u.exec(
						body,
					);
		if (!match) throw new TemplateError("syntax");
		const reference =
			syntax === "brackets"
				? `${match[1]}.${match[2]}`.toLowerCase()
				: match[1];
		const argument = match[syntax === "brackets" ? 3 : 2];
		if (argument !== undefined && !argument.trim())
			throw new TemplateError("syntax");
		const separator = reference.indexOf(".");
		return {
			entity: separator < 0 ? "" : reference.slice(0, separator),
			property: separator < 0 ? reference : reference.slice(separator + 1),
			...(argument !== undefined ? { argument } : {}),
		};
	}
}
