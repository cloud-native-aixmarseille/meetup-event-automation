import type {
	SocialDeliveryRecord,
	SocialDestination,
	SocialPostReceipt,
} from "@meetup-automation/communication";
import type { SocialJournalAttemptCodec } from "./social-journal-attempt-codec.js";
import type { SocialJournalValueSchema } from "./social-journal-value-schema.js";
import { SOCIAL_JOURNAL_MARKER } from "./trusted-social-journal-comments.js";

export class SocialJournalCodec {
	constructor(
		private readonly values: SocialJournalValueSchema,
		private readonly attempts: Pick<SocialJournalAttemptCodec, "read">,
	) {}

	read(body: string): SocialDeliveryRecord {
		if (!body.startsWith(SOCIAL_JOURNAL_MARKER) || !body.endsWith(" -->"))
			throw new Error("Invalid social delivery marker");
		const value: unknown = JSON.parse(
			body.slice(SOCIAL_JOURNAL_MARKER.length, -4),
		);
		return this.parse(value);
	}

	write(record: SocialDeliveryRecord): string {
		const value = this.parse(record);
		const json = JSON.stringify(value)
			.replaceAll("<", "\\u003c")
			.replaceAll(">", "\\u003e")
			.replaceAll("&", "\\u0026");
		const body = `${SOCIAL_JOURNAL_MARKER}${json} -->`;
		if (body.length > 60000)
			throw new Error("Social delivery journal comment limit exceeded");
		return body;
	}

	private parse(value: unknown): SocialDeliveryRecord {
		const item = this.values.object(value, [
			"manual",
			"intentId",
			"occurrence",
			"purpose",
			"destination",
			"attempts",
		]);
		if (
			item.purpose !== "announcement" &&
			item.purpose !== "d7" &&
			item.purpose !== "d0"
		)
			throw new Error("Invalid social delivery purpose");
		if (!Array.isArray(item.attempts) || item.attempts.length > 100)
			throw new Error("Invalid social delivery attempts");
		const record: SocialDeliveryRecord = {
			...(item.manual === undefined
				? {}
				: { manual: this.manual(item.manual) }),
			intentId: this.values.text(item.intentId, 200),
			occurrence: this.values.text(item.occurrence, 200),
			purpose: item.purpose,
			destination: this.destination(item.destination),
			attempts: item.attempts.map((attempt) => this.attempts.read(attempt)),
		};
		this.validate(record);
		return record;
	}

	private destination(value: unknown): SocialDestination {
		const item = this.values.object(value, [
			"key",
			"provider",
			"label",
			"workspaceId",
			"channelId",
			"organizationUrn",
		]);
		const key = this.values.pattern(item.key, 64, /^[a-z][a-z0-9-]{0,63}$/);
		const label = this.values.text(item.label, 100);
		if (item.provider === "slack") {
			this.values.object(value, [
				"key",
				"provider",
				"label",
				"workspaceId",
				"channelId",
			]);
			return {
				key,
				label,
				provider: "slack",
				workspaceId: this.values.pattern(
					item.workspaceId,
					100,
					/^T[A-Z0-9]{2,}$/,
				),
				channelId: this.values.pattern(
					item.channelId,
					100,
					/^[CG][A-Z0-9]{2,}$/,
				),
			};
		}
		this.values.object(value, ["key", "provider", "label", "organizationUrn"]);
		if (item.provider !== "linkedin")
			throw new Error("Invalid social destination provider");
		return {
			key,
			label,
			provider: "linkedin",
			organizationUrn: this.values.pattern(
				item.organizationUrn,
				100,
				/^urn:li:organization:[1-9]\d*$/,
			),
		};
	}

	private validate(record: SocialDeliveryRecord): void {
		if (record.manual && record.attempts.length)
			throw new Error(
				"Manual social completion cannot overwrite provider history",
			);
		if (
			new Set(record.attempts.map((attempt) => attempt.id)).size !==
			record.attempts.length
		)
			throw new Error("Duplicate social delivery attempt identity");
		for (const [index, attempt] of record.attempts.entries()) {
			const destination = record.destination;
			if (attempt.media && destination.provider !== "linkedin")
				throw new Error("Social delivery media belongs to LinkedIn");
			const receipt = attempt.receipt;
			if (receipt) this.validateDestination(destination, receipt);
			if (
				index < record.attempts.length - 1 &&
				attempt.status !== "rejected" &&
				attempt.status !== "deferred" &&
				attempt.status !== "stale" &&
				attempt.recovery?.outcome !== "not-published"
			)
				throw new Error("Social delivery attempts contain unsafe replay");
		}
	}

	private manual(value: unknown): NonNullable<SocialDeliveryRecord["manual"]> {
		const item = this.values.object(value, ["recordedAt", "reference"]);
		return {
			recordedAt: this.values.instant(item.recordedAt),
			reference: this.values.text(item.reference, 2000),
		};
	}

	private validateDestination(
		destination: SocialDestination,
		receipt: SocialPostReceipt,
	): void {
		const matches =
			receipt.provider === "slack" && destination.provider === "slack"
				? receipt.workspaceId === destination.workspaceId &&
					receipt.channelId === destination.channelId
				: receipt.provider === "linkedin" &&
					destination.provider === "linkedin" &&
					receipt.organizationUrn === destination.organizationUrn;
		if (!matches)
			throw new Error(
				"Social receipt destination does not match its reservation",
			);
	}
}
