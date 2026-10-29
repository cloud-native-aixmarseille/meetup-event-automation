import type { ContentTemplateFields } from "../domain/content-template-fields.js";
import type {
	ContentContract,
	ContentRecovery,
	TemplateContentDefaults,
} from "../domain/asset-content.js";
import { ContentError } from "../domain/content-error.js";
import type { ContentManifestPolicy } from "../domain/content-manifest-policy.js";
import type {
	AssetContentRepository,
	AssetManifestRepository,
} from "./content-ports.js";
import type { AssetFile, AssetTemplate } from "./ports.js";

/** Reads new template definitions or retains the saved definition of an owned copy. */
export class DiscoverAssetContent {
	constructor(
		private readonly collaborators: {
			policy: Pick<ContentManifestPolicy, "parse">;
			fields: Pick<ContentTemplateFields, "validateSelectors">;
		},
		private readonly manifests: AssetManifestRepository,
		private readonly renderers: Readonly<
			Record<string, AssetContentRepository>
		>,
		private readonly defaults: TemplateContentDefaults,
	) {}

	async read(
		folderId: string,
		template: AssetTemplate,
		file?: AssetFile,
		recovery?: ContentRecovery,
	): Promise<ContentContract | undefined> {
		if (file?.contentManaged) {
			const stored = await this.manifests.load(folderId, file.id);
			if (stored === undefined && recovery?.operation !== "enroll")
				throw new ContentError("recovery");
			if (stored !== undefined) {
				const contract = this.collaborators.policy.parse(
					stored,
					file.id,
					template.id,
					file.mimeType ?? template.mimeType ?? "",
				).contract;
				this.collaborators.fields.validateSelectors(contract);
				return contract;
			}
		}
		const renderer = this.renderers[template.mimeType ?? ""];
		return renderer?.discover(
			file?.id ?? template.id,
			template.kind,
			this.defaults,
		);
	}
}
export type DiscoverAssetContentArguments =
	ConstructorParameters<typeof DiscoverAssetContent> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
