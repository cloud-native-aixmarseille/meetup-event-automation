import { DateTemplateFormatter } from "./date-template-formatter.js";
import { TemplateExpressionParser } from "./template-expression-parser.js";
import { TemplateParser } from "./template-parser.js";
import { TemplateRenderer } from "./template-renderer.js";

export class TemplatingComposition {
	parser(): TemplateParser {
		return new TemplateParser(new TemplateExpressionParser());
	}
	dates(locale: string): DateTemplateFormatter {
		return new DateTemplateFormatter(locale);
	}
	renderer(locale: string): TemplateRenderer {
		return new TemplateRenderer(this.parser(), this.dates(locale));
	}
}
