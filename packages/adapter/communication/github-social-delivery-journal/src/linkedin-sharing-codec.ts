import type {
	LinkedInPostReference,
	LinkedInShareRecord,
} from "@meetup-automation/communication";
import type { SocialJournalValueSchema } from "./social-journal-value-schema.js";

export const LINKEDIN_SHARING_MARKER = "<!-- meetup-linkedin-sharing:v1 ";

export class LinkedInSharingCodec {
	constructor(
		private readonly values: SocialJournalValueSchema,
		private readonly references: Pick<LinkedInPostReference, "read">,
	) {}
	read(body: string): LinkedInShareRecord {
		if (!body.startsWith(LINKEDIN_SHARING_MARKER) || !body.endsWith(" -->"))
			throw new Error("Invalid LinkedIn sharing marker");
		const value: unknown = JSON.parse(
			body.slice(LINKEDIN_SHARING_MARKER.length, -4),
		);
		const item = this.values.object(value, [
			"id",
			"url",
			"status",
			"attempts",
			"reservedAt",
			"retryAt",
		]);
		const url = this.values.text(item.url, 2000);
		const post = this.references.read(url);
		if (!post || post.id !== item.id || post.url !== url)
			throw new Error("Invalid LinkedIn sharing identity");
		if (
			item.status !== "pending" &&
			item.status !== "sent" &&
			item.status !== "retry"
		)
			throw new Error("Invalid LinkedIn sharing status");
		if (
			typeof item.attempts !== "number" ||
			!Number.isInteger(item.attempts) ||
			item.attempts < 1 ||
			item.attempts > 10
		)
			throw new Error("Invalid LinkedIn sharing attempt count");
		if ((item.status === "retry") !== (item.retryAt !== undefined))
			throw new Error("Invalid LinkedIn sharing retry time");
		return {
			...post,
			status: item.status,
			attempts: item.attempts,
			reservedAt: this.values.instant(item.reservedAt),
			...(item.retryAt === undefined
				? {}
				: { retryAt: this.values.instant(item.retryAt) }),
		};
	}
	write(record: LinkedInShareRecord): string {
		const body = `${LINKEDIN_SHARING_MARKER}${JSON.stringify(record)} -->`;
		this.read(body);
		return body;
	}
}
