import {
	type AssetTemplateRenderer,
	type AssetTemplateValue,
	ContentError,
} from "@meetup-automation/publication";
import {
	TemplateError,
	type TemplateRenderer,
} from "@meetup-automation/templating";

/** Translate template validation into publication's organizer-correction errors. */
export class AssetTemplateRendererImpl implements AssetTemplateRenderer {
	constructor(
		private readonly templates: Pick<TemplateRenderer, "render" | "value">,
	) {}
	render(...args: Parameters<AssetTemplateRenderer["render"]>): string {
		return this.templates.render(...args);
	}
	value(value: AssetTemplateValue): string {
		try {
			return this.templates.value(value);
		} catch (error) {
			if (error instanceof TemplateError) throw new ContentError("contract");
			throw error;
		}
	}
}
