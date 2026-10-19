import { TemplateError } from "./template-error.js";
import type { TemplateExpressionParser } from "./template-expression-parser.js";
import type { TemplateOccurrence } from "./template-model.js";

/** Return UTF-16 offsets so provider adapters can retain exact owned ranges. */
export class TemplateParser {
	constructor(
		private readonly expressions: Pick<TemplateExpressionParser, "parse">,
	) {}

	contains(text: string): boolean {
		return /\{\{|\}\}|\[[A-Za-z0-9_]*[_:]/u.test(text);
	}

	parse(text: string): readonly TemplateOccurrence[] {
		const result: TemplateOccurrence[] = [];
		const delimiters = /\{\{|\}\}|\[[A-Za-z0-9_]*[_:]/gu;
		for (
			let match = delimiters.exec(text);
			match;
			match = delimiters.exec(text)
		) {
			const start = match.index;
			if (match[0] === "}}") throw new TemplateError("syntax");
			const brackets = match[0].startsWith("[");
			const open = brackets ? 1 : 2;
			const close = brackets ? "]" : "}}";
			const end = text.indexOf(close, start + open);
			if (end < 0) throw new TemplateError("syntax");
			const expression = this.expressions.parse(
				text.slice(start + open, end),
				brackets ? "brackets" : "braces",
			);
			const path = expression.entity
				? `${expression.entity}.${expression.property}`
				: expression.property;
			result.push({
				...expression,
				reference:
					path +
					(expression.argument === undefined ? "" : `:${expression.argument}`),
				start,
				end: end + close.length,
			});
			delimiters.lastIndex = end + close.length;
		}
		return result;
	}
}
