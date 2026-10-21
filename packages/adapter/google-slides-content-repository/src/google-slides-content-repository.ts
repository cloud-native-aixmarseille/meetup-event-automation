import { slides, type slides_v1 } from "@googleapis/slides";
import {
	type AssetContentRepository,
	type AssetImageRepository,
	type ContentBinding,
	type ContentChange,
	type ContentContract,
	ContentError,
	type ContentSnapshot,
} from "@meetup-automation/publication";
import { SlideContentLocations } from "./slide-content-locations.js";
import { SlideContentRequests } from "./slide-content-requests.js";
import { SlideTemplateBindings } from "./slide-template-bindings.js";

export class GoogleSlidesContentRepository implements AssetContentRepository {
	private current?: slides_v1.Schema$Presentation;
	constructor(
		private readonly client: Pick<slides_v1.Slides, "presentations">,
		private readonly images: AssetImageRepository,
	) {}

	static create(
		authentication: ConstructorParameters<typeof slides_v1.Slides>[0]["auth"],
		images: AssetImageRepository,
	): GoogleSlidesContentRepository {
		return new GoogleSlidesContentRepository(
			slides({ version: "v1", auth: authentication }),
			images,
		);
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
			registered ?? SlideTemplateBindings.discover(data, contract);
		const locations = await new SlideContentLocations(this.images).read(
			data,
			bindings,
		);
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
			SlideContentRequests.build(current, change),
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
