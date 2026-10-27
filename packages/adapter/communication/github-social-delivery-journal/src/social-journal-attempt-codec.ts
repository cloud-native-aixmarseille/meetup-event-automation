import type {
	SocialDeliveryAttempt,
	SocialDeliveryRecovery,
	SocialPostReceipt,
	SocialPreparedMedia,
} from "@meetup-automation/communication";
import type { SocialJournalValueSchema } from "./social-journal-value-schema.js";

export class SocialJournalAttemptCodec {
	constructor(private readonly values: SocialJournalValueSchema) {}

	read(value: unknown): SocialDeliveryAttempt {
		const item = this.values.object(value, [
			"id",
			"revision",
			"reservedAt",
			"status",
			"media",
			"receipt",
			"code",
			"retryAt",
			"recovery",
		]);
		const status = item.status;
		if (
			status !== "reserved" &&
			status !== "prepared" &&
			status !== "accepted" &&
			status !== "rejected" &&
			status !== "deferred" &&
			status !== "uncertain" &&
			status !== "stale"
		)
			throw new Error("Invalid social delivery attempt status");
		const attempt: SocialDeliveryAttempt = {
			id: this.values.text(item.id, 200),
			revision: this.values.text(item.revision, 200),
			reservedAt: this.values.instant(item.reservedAt),
			status,
			...(item.media === undefined ? {} : { media: this.media(item.media) }),
			...(item.receipt === undefined
				? {}
				: { receipt: this.receipt(item.receipt) }),
			...(item.code === undefined
				? {}
				: { code: this.values.pattern(item.code, 100, /^[a-z][a-z0-9-]*$/) }),
			...(item.retryAt === undefined
				? {}
				: { retryAt: this.values.instant(item.retryAt) }),
			...(item.recovery === undefined
				? {}
				: { recovery: this.recovery(item.recovery) }),
		};
		this.validate(attempt);
		return attempt;
	}

	private media(value: unknown): SocialPreparedMedia {
		const item = this.values.object(value, [
			"assetUrn",
			"fingerprint",
			"description",
		]);
		return {
			assetUrn: this.values.pattern(
				item.assetUrn,
				200,
				/^urn:li:image:[A-Za-z0-9_-]+$/,
			),
			fingerprint: this.values.pattern(item.fingerprint, 64, /^[a-f0-9]{64}$/),
			description: this.values.text(item.description, 4086),
		};
	}

	private receipt(value: unknown): SocialPostReceipt {
		const item = this.values.object(value, [
			"provider",
			"workspaceId",
			"channelId",
			"ts",
			"organizationUrn",
			"postUrn",
			"url",
		]);
		if (item.provider === "slack") {
			this.values.object(value, [
				"provider",
				"workspaceId",
				"channelId",
				"ts",
				"url",
			]);
			return {
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
				ts: this.values.pattern(item.ts, 40, /^\d+\.\d+$/),
				...(item.url === undefined
					? {}
					: { url: this.values.url(item.url, "slack") }),
			};
		}
		this.values.object(value, [
			"provider",
			"organizationUrn",
			"postUrn",
			"url",
		]);
		if (item.provider !== "linkedin")
			throw new Error("Invalid social receipt provider");
		return {
			provider: "linkedin",
			organizationUrn: this.values.pattern(
				item.organizationUrn,
				100,
				/^urn:li:organization:[1-9]\d*$/,
			),
			postUrn: this.values.pattern(
				item.postUrn,
				200,
				/^urn:li:(?:share|ugcPost|activity):[1-9]\d*$/,
			),
			...(item.url === undefined
				? {}
				: { url: this.values.url(item.url, "linkedin") }),
		};
	}

	private recovery(value: unknown): SocialDeliveryRecovery {
		const item = this.values.object(value, [
			"actor",
			"decidedAt",
			"outcome",
			"reference",
		]);
		if (item.outcome !== "published" && item.outcome !== "not-published")
			throw new Error("Invalid social delivery recovery outcome");
		return {
			actor: this.values.pattern(
				item.actor,
				39,
				/^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i,
			),
			decidedAt: this.values.instant(item.decidedAt),
			outcome: item.outcome,
			reference: this.values.text(item.reference, 2000),
		};
	}

	private validate(attempt: SocialDeliveryAttempt): void {
		if (
			attempt.receipt?.provider === "linkedin" &&
			attempt.receipt.postUrn.startsWith("urn:li:activity:") &&
			attempt.recovery?.outcome !== "published"
		)
			throw new Error("LinkedIn activity identity requires verified recovery");
		if ((attempt.status === "accepted") !== Boolean(attempt.receipt))
			throw new Error("Social delivery acceptance requires its receipt");
		if (attempt.status === "prepared" && !attempt.media)
			throw new Error("Prepared social delivery requires media");
		if (attempt.retryAt && attempt.status !== "deferred")
			throw new Error("Only deferred social delivery has a retry time");
		if (attempt.recovery) {
			if (
				(attempt.recovery.outcome === "published") !==
				(attempt.status === "accepted")
			)
				throw new Error("Social delivery recovery contradicts its outcome");
			if (
				Date.parse(attempt.recovery.decidedAt) < Date.parse(attempt.reservedAt)
			)
				throw new Error("Social delivery recovery predates its reservation");
		}
	}
}
