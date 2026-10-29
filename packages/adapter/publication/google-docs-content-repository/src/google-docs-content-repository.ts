import type { DocumentTemplateDefinition } from "./document-template-definition.js";
import type { docs_v1 } from "@googleapis/docs";
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
	DocumentContentLocations,
	DocumentContentLocationsArguments,
} from "./document-content-locations.js";
import type { DocumentContentRequests } from "./document-content-requests.js";
import type { DocumentTabs } from "./document-tabs.js";
import type { DocumentTemplateBindings } from "./document-template-bindings.js";

export interface GoogleDocsContentRepositoryCollaborators {
	readonly definition: Pick<DocumentTemplateDefinition, "read">;
	readonly documentTabs: Pick<DocumentTabs, "all">;
	readonly documentTemplateBindings: Pick<DocumentTemplateBindings, "discover">;
	readonly documentContentRequests: Pick<DocumentContentRequests, "build">;
	readonly createDocumentContentLocations: (
		...args: DocumentContentLocationsArguments
	) => DocumentContentLocations;
}

export class GoogleDocsContentRepository implements AssetContentRepository {
	private current?: docs_v1.Schema$Document;
	constructor(
		private readonly collaborators: GoogleDocsContentRepositoryCollaborators,
		private readonly client: Pick<docs_v1.Docs, "documents">,
		private readonly images: AssetImageRepository,
	) {}

	async discover(
		fileId: string,
		kind: string,
		defaults: TemplateContentDefaults,
	): Promise<ContentContract | undefined> {
		const { data } = await this.client.documents.get(
			{
				documentId: fileId,
				includeTabsContent: true,
				suggestionsViewMode: "SUGGESTIONS_INLINE",
			},
			{ retry: false, timeout: 30_000 },
		);
		if (!data.revisionId || data.documentId !== fileId)
			throw new ContentError("location");
		return this.collaborators.definition.read(
			this.collaborators.documentTabs.all(data),
			kind,
			defaults,
		);
	}

	async read(
		fileId: string,
		contract: ContentContract,
		registered?: readonly ContentBinding[],
		initialRevision?: string,
	): Promise<ContentSnapshot> {
		const { data } = await this.client.documents.get(
			{
				documentId: fileId,
				includeTabsContent: true,
				suggestionsViewMode: "SUGGESTIONS_INLINE",
			},
			{ retry: false, timeout: 30_000 },
		);
		if (!data.revisionId || data.documentId !== fileId)
			throw new ContentError("location");
		const tabs = this.collaborators.documentTabs.all(data);
		const bindings =
			registered ??
			this.collaborators.documentTemplateBindings.discover(tabs, contract);
		const reader = this.collaborators.createDocumentContentLocations(
			this.images,
		);
		const locations = [];
		for (const binding of bindings)
			locations.push(
				await reader.read(
					tabs,
					binding,
					!registered || data.revisionId === initialRevision,
				),
			);
		this.current = data;
		return { revision: data.revisionId, locations };
	}

	async apply(
		fileId: string,
		snapshot: ContentSnapshot,
		changes: readonly ContentChange[],
	): Promise<string> {
		if (
			!this.current ||
			this.current.documentId !== fileId ||
			this.current.revisionId !== snapshot.revision
		)
			throw new ContentError("revision");
		const requests = this.collaborators.documentContentRequests.build(
			this.collaborators.documentTabs.all(this.current),
			changes,
		);
		try {
			const { data } = await this.client.documents.batchUpdate(
				{
					documentId: fileId,
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
export type GoogleDocsContentRepositoryArguments =
	ConstructorParameters<typeof GoogleDocsContentRepository> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
