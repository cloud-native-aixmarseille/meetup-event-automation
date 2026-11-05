import {
	type EventPublicationIdentity,
	type PublicationJournal,
	type PublicationRecord,
	ScheduledEventError,
} from "@meetup-automation/publication";
import type { CommunityPublicationCommentCodec } from "./community-publication-comment-codec.js";
import type { AutomationStateRepository } from "@meetup-automation/journey";

export class GithubCommunityPublicationJournal implements PublicationJournal {
	constructor(
		private readonly codec: Pick<
			CommunityPublicationCommentCodec,
			"encode" | "decode"
		>,
		private readonly state: Pick<AutomationStateRepository, "read" | "write">,
	) {}

	async load(): Promise<PublicationRecord | undefined> {
		const comment = await this.find();
		return comment ? this.codec.decode(comment) : undefined;
	}

	async reserve(): Promise<void> {
		if (await this.load()) throw new ScheduledEventError("uncertain");
		await this.state.write("community", [], [this.codec.encode({})]);
		if (!(await this.load())) throw new ScheduledEventError("uncertain");
	}

	async record(identity: EventPublicationIdentity): Promise<void> {
		const comment = await this.find();
		const previous = comment ? this.codec.decode(comment).identity : undefined;
		if (
			previous &&
			(previous.id !== identity.id || previous.reviewUrl !== identity.reviewUrl)
		)
			throw new ScheduledEventError("conflict");
		const body = this.codec.encode({
			identity:
				previous && identity.publicUrl === undefined ? previous : identity,
		});
		await this.state.write("community", comment ? [comment] : [], [body]);
		const saved = await this.load();
		if (
			saved?.identity?.id !== identity.id ||
			saved.identity.publicUrl !== (identity.publicUrl ?? previous?.publicUrl)
		)
			throw new ScheduledEventError("uncertain");
	}

	private async find(): Promise<string | undefined> {
		const records = await this.state.read("community");
		if (records.length > 1) throw new ScheduledEventError("conflict");
		return records[0];
	}
}
