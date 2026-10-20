import { docs, type docs_v1 } from "@googleapis/docs";
import {
	type AssetContentRepository,
	type AssetImageRepository,
	type ContentBinding,
	type ContentChange,
	type ContentContract,
	ContentError,
	type ContentSnapshot,
} from "@meetup-automation/publication";
import { DocumentContentLocations } from "./document-content-locations.js";
import { DocumentContentRequests } from "./document-content-requests.js";
import { DocumentTabs } from "./document-tabs.js";
import { DocumentTemplateBindings } from "./document-template-bindings.js";

export class GoogleDocsContentRepository implements AssetContentRepository {
	private current?: docs_v1.Schema$Document;
	constructor(
		private readonly client: Pick<docs_v1.Docs, "documents">,
		private readonly images: AssetImageRepository,
	) {}

	static create(
		authentication: docs_v1.Options["auth"],
		images: AssetImageRepository,
	): GoogleDocsContentRepository {
		return new GoogleDocsContentRepository(
			docs({ version: "v1", auth: authentication }),
			images,
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
		const tabs = DocumentTabs.all(data);
		const bindings =
			registered ?? DocumentTemplateBindings.discover(tabs, contract);
		const reader = new DocumentContentLocations(this.images);
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
		const requests = DocumentContentRequests.build(
			DocumentTabs.all(this.current),
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
			if (/revision/i.test(String((error as Error)?.message)))
				throw new ContentError("revision");
			throw error;
		}
	}
}
