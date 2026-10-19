import type { AssetTemplateRenderer } from "./asset-template-renderer.js";

export class AssetFileName {
	constructor(
		private readonly templates: Pick<AssetTemplateRenderer, "render">,
	) {}

	render(templateName: string, date: string): string {
		return this.templates.render(templateName, (part) => {
			if (part.entity !== "event")
				throw new Error("Unsupported asset filename entity");
			if (part.property !== "date")
				throw new Error("Unsupported event filename property");
			if (!part.argument)
				throw new Error("Asset filename date format is required");
			return { kind: "date", value: date, format: part.argument };
		});
	}
}
