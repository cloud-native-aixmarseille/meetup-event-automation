import type { DateTemplateFormatter } from "./date-template-formatter.js";
import type { TemplateResolver, TemplateValue } from "./template-model.js";
import type { TemplateParser } from "./template-parser.js";

/** Render once; substituted values are always data, never more templates. */
export class TemplateRenderer {
	constructor(
		private readonly parser: Pick<TemplateParser, "parse">,
		private readonly dates: Pick<DateTemplateFormatter, "format">,
	) {}

	render(template: string, resolve: TemplateResolver): string {
		let output = "";
		let offset = 0;
		for (const expression of this.parser.parse(template)) {
			output +=
				template.slice(offset, expression.start) +
				this.value(resolve(expression));
			offset = expression.end;
		}
		return output + template.slice(offset);
	}

	value(value: TemplateValue): string {
		return value.kind === "text"
			? value.value
			: this.dates.format(value.value, value.format);
	}
}
