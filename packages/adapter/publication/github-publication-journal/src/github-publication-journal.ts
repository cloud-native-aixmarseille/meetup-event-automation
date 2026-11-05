import {
	type EventPublicationIdentity,
	type MeetupCoverJournal,
	type MeetupCoverRecord,
	MeetupEventUrl,
	type PublicationJournal,
	type PublicationRecord,
} from "@meetup-automation/publication";
import type { PublicationCommentCodec } from "./publication-comment-codec.js";

import type { AutomationStateRepository } from "@meetup-automation/journey";

export interface GithubPublicationJournalCollaborators {
	readonly publicationCommentCodec: Pick<
		PublicationCommentCodec,
		"decode" | "encode"
	>;
}

export class GithubPublicationJournal
	implements PublicationJournal, MeetupCoverJournal
{
	constructor(
		private readonly collaborators: GithubPublicationJournalCollaborators,
		private readonly state: Pick<AutomationStateRepository, "read" | "write">,
	) {}

	async load(): Promise<PublicationRecord | undefined> {
		const comment = await this.find();
		if (!comment) return undefined;
		const record = this.collaborators.publicationCommentCodec.decode(comment);
		if (!record.url) return {};
		const url = MeetupEventUrl.parse(record.url);
		if (!url) throw new Error("Invalid Meetup journal identity");
		return {
			identity: { id: url.id, reviewUrl: url.value, publicUrl: url.value },
		};
	}

	async reserve(): Promise<void> {
		if (await this.load())
			throw new Error("Publication creation was already reserved");
		await this.state.write(
			"meetup",
			[],
			[this.collaborators.publicationCommentCodec.encode({})],
		);
		if (!(await this.load()))
			throw new Error("Publication reservation was not persisted");
	}

	async record(identity: EventPublicationIdentity): Promise<void> {
		const parsed = MeetupEventUrl.parse(identity.reviewUrl);
		if (
			!parsed ||
			parsed.id !== identity.id ||
			parsed.value !== identity.reviewUrl ||
			parsed.value !== identity.publicUrl
		)
			throw new Error("Invalid Meetup journal identity");
		const url = parsed.value;
		const existing = await this.load();
		if (existing?.identity?.reviewUrl && existing.identity.reviewUrl !== url)
			throw new Error("Publication journal identity conflict");
		const comment = await this.find();
		const previous = comment
			? this.collaborators.publicationCommentCodec.decode(comment)
			: {};
		const body = this.collaborators.publicationCommentCodec.encode({
			...previous,
			url,
		});
		await this.state.write("meetup", comment ? [comment] : [], [body]);
	}

	async readCover(): Promise<MeetupCoverRecord | undefined> {
		const comment = await this.find();
		return comment
			? this.collaborators.publicationCommentCodec.decode(comment).cover
			: undefined;
	}

	async reserveCover(
		record: Omit<MeetupCoverRecord, "photoId">,
	): Promise<void> {
		const previous = await this.readCover();
		if (
			previous &&
			(!previous.photoId ||
				previous.groupUrl !== record.groupUrl ||
				previous.fingerprint === record.fingerprint)
		)
			throw new Error(
				"Meetup cover upload already reserved or conflicts with its target",
			);
		await this.writeCover(record);
	}

	async recordCover(
		record: MeetupCoverRecord & { photoId: string },
	): Promise<void> {
		const previous = await this.readCover();
		if (
			!previous ||
			previous.groupUrl !== record.groupUrl ||
			previous.fingerprint !== record.fingerprint ||
			(previous.photoId !== undefined && previous.photoId !== record.photoId)
		)
			throw new Error("Meetup cover upload identity conflict");
		await this.writeCover(record);
	}

	private async writeCover(cover: MeetupCoverRecord): Promise<void> {
		const comment = await this.find();
		if (!comment)
			throw new Error("Reserve the event identity before uploading artwork");
		const previous = this.collaborators.publicationCommentCodec.decode(comment);
		await this.state.write(
			"meetup",
			[comment],
			[
				this.collaborators.publicationCommentCodec.encode({
					...previous,
					cover,
				}),
			],
		);
		const persisted = await this.readCover();
		if (
			!persisted ||
			persisted.groupUrl !== cover.groupUrl ||
			persisted.fingerprint !== cover.fingerprint ||
			persisted.photoId !== cover.photoId
		)
			throw new Error("Meetup cover journal was not persisted");
	}

	private async find(): Promise<string | undefined> {
		const records = await this.state.read("meetup");
		if (records.length > 1) throw new Error("Multiple publication journals");
		return records[0];
	}
}
export type GithubPublicationJournalArguments =
	ConstructorParameters<typeof GithubPublicationJournal> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
