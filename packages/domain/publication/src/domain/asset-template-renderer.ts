/** Publication's port; the implementation owns syntax and localized formatting. */
export interface AssetTemplateRenderer {
	render(
		template: string,
		resolve: (
			expression: Readonly<{
				entity: string;
				property: string;
				argument?: string;
			}>,
		) => AssetTemplateValue,
	): string;
	value(value: AssetTemplateValue): string;
}

export type AssetTemplateValue =
	| Readonly<{ kind: "text"; value: string }>
	| Readonly<{ kind: "date"; value: string; format: string }>;
