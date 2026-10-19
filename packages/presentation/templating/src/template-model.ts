export type TemplateExpression = Readonly<{
	entity: string;
	property: string;
	argument?: string;
}>;

export type TemplateOccurrence = TemplateExpression &
	Readonly<{
		reference: string;
		start: number;
		end: number;
	}>;

export type TemplateValue =
	| Readonly<{ kind: "text"; value: string }>
	| Readonly<{ kind: "date"; value: string; format: string }>;

export type TemplateResolver = (
	expression: TemplateExpression,
) => TemplateValue;
