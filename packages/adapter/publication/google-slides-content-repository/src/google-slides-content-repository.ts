import type { SlideCollectionLocations } from "./slide-collection-locations.js";
import type { SlideCollectionRequests } from "./slide-collection-requests.js";
import type { SlideTemplateDefinition } from "./slide-template-definition.js";
import type { slides_v1 } from "@googleapis/slides";
import {
	type AssetContentRepository,
	type AssetImageRepository,
	type ContentBinding,
	type ContentChange,
	type ContentContract,
	type TemplateContentDefaults,
	ContentError,
	type ContentSnapshot,
} from "@meetup-automation/publication";
import type {
	SlideContentLocations,
	SlideContentLocationsArguments,
} from "./slide-content-locations.js";
import type { SlideContentRequests } from "./slide-content-requests.js";
import type { SlideTemplateBindings } from "./slide-template-bindings.js";

export interface GoogleSlidesContentRepositoryCollaborators {
	readonly collectionRequests: Pick<SlideCollectionRequests, "build">;
	readonly createCollectionLocations: (
		images: AssetImageRepository,
	) => SlideCollectionLocations;
	readonly definition: Pick<SlideTemplateDefinition, "read">;
	readonly slideTemplateBindings: Pick<SlideTemplateBindings, "discover">;
	readonly slideContentRequests: Pick<SlideContentRequests, "build">;
	readonly createSlideContentLocations: (
		...args: SlideContentLocationsArguments
	) => SlideContentLocations;
}

export class GoogleSlidesContentRepository implements AssetContentRepository {
	private current?: slides_v1.Schema$Presentation;
	constructor(
		private readonly collaborators: GoogleSlidesContentRepositoryCollaborators,
		private readonly client: Pick<slides_v1.Slides, "presentations">,
		private readonly images: AssetImageRepository,
	) {}

	async discover(
		fileId: string,
		kind: string,
		defaults: TemplateContentDefaults,
	): Promise<ContentContract | undefined> {
		const { data } = await this.client.presentations.get(
			{ presentationId: fileId },
			{ retry: false, timeout: 30_000 },
		);
		if (!data.revisionId || data.presentationId !== fileId)
			throw new ContentError("location");
		return this.collaborators.definition.read(data, kind, defaults);
	}

	async read(
		fileId: string,
		contract: ContentContract,
		registered?: readonly ContentBinding[],
	): Promise<ContentSnapshot> {
		const { data } = await this.client.presentations.get(
			{ presentationId: fileId },
			{ retry: false, timeout: 30_000 },
		);
		if (!data.revisionId || data.presentationId !== fileId)
			throw new ContentError("location");
		const bindings =
			registered ??
			this.collaborators.slideTemplateBindings.discover(data, contract);
		const locations = await this.collaborators
			.createSlideContentLocations(this.images)
			.read(
				data,
				bindings.filter((binding) => binding.type !== "collection"),
			);
		for (const binding of bindings.filter(
			(binding) => binding.type === "collection",
		)) {
			const field = contract.fields.find(
				(field) => field.type === "collection" && field.slot === binding.key,
			);
			if (field?.type !== "collection") throw new ContentError("contract");
			locations.push(
				await this.collaborators
					.createCollectionLocations(this.images)
					.read(data, field, binding),
			);
		}
		this.current = data;
		return { revision: data.revisionId, locations };
	}

	async apply(
		fileId: string,
		snapshot: ContentSnapshot,
		changes: readonly ContentChange[],
	): Promise<string> {
		const current = this.current;
		if (
			!current ||
			current.presentationId !== fileId ||
			current.revisionId !== snapshot.revision
		)
			throw new ContentError("revision");
		const requests = changes.flatMap((change) =>
			change.value.type === "collection"
				? this.collaborators.collectionRequests.build(current, change)
				: this.collaborators.slideContentRequests.build(current, change),
		);
		try {
			const { data } = await this.client.presentations.batchUpdate(
				{
					presentationId: fileId,
					requestBody: {
						requests,
						writeControl: { requiredRevisionId: snapshot.revision },
					},
				},
				{ retry: false, timeout: 30_000 },
			);
			return data.writeControl?.requiredRevisionId ?? "";
		} catch (error) {
			if (error instanceof Error && /revision/i.test(error.message))
				throw new ContentError("revision");
			throw error;
		}
	}
}
export type GoogleSlidesContentRepositoryArguments =
	ConstructorParameters<typeof GoogleSlidesContentRepository> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
