import {
	type CommunityEventIdentityPolicy,
	type EventPublicationIdentity,
	type PublicationRecord,
	ScheduledEventError,
} from "@meetup-automation/publication";

export class CommunityPublicationCommentCodec {
	static readonly marker = "<!-- community-publication:v1\n";
	constructor(
		private readonly identities: Pick<CommunityEventIdentityPolicy, "valid">,
		private readonly target: string,
	) {}

	decode(body: string): PublicationRecord {
		try {
			if (
				!body.startsWith(CommunityPublicationCommentCodec.marker) ||
				!body.endsWith("\n-->")
			)
				throw new Error();
			const value: unknown = JSON.parse(
				body.slice(CommunityPublicationCommentCodec.marker.length, -4),
			);
			if (!this.object(value) || value.target !== this.target)
				throw new Error();
			if (value.state === "pending" && value.identity === undefined) return {};
			if (value.state !== "saved" || !this.identity(value.identity))
				throw new Error();
			return { identity: value.identity };
		} catch {
			throw new ScheduledEventError("conflict");
		}
	}

	encode(record: PublicationRecord): string {
		if (record.identity && !this.identities.valid(record.identity))
			throw new ScheduledEventError("link");
		const json = JSON.stringify({
			target: this.target,
			state: record.identity ? "saved" : "pending",
			identity: record.identity,
		})
			.replaceAll("<", "\\u003c")
			.replaceAll(">", "\\u003e");
		return `${CommunityPublicationCommentCodec.marker}${json}\n-->`;
	}

	private identity(value: unknown): value is EventPublicationIdentity {
		return (
			this.object(value) &&
			typeof value.id === "string" &&
			typeof value.reviewUrl === "string" &&
			(value.publicUrl === undefined || typeof value.publicUrl === "string") &&
			this.identities.valid({
				id: value.id,
				reviewUrl: value.reviewUrl,
				publicUrl: value.publicUrl,
			})
		);
	}

	private object(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}
}
