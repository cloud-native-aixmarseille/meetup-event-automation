import type { SocialDestination } from "@meetup-automation/communication";
import type { ContentDraft, ContentFacts } from "@meetup-automation/journey";
import type {
	ContentMedia,
	PublicAssetUrl,
} from "@meetup-automation/publication";

/** Closed public-value schema shared by proposal persistence and manual submissions. */
export class ContentValueSchema {
	constructor(private readonly urls: Pick<PublicAssetUrl, "valid">) {}
	object(value: unknown, keys: readonly string[]): Record<string, unknown> {
		if (
			!value ||
			typeof value !== "object" ||
			Array.isArray(value) ||
			Object.keys(value).some((key) => !keys.includes(key))
		)
			throw new Error("Invalid content object");
		return value as Record<string, unknown>;
	}
	text(value: unknown, max: number): string {
		if (typeof value !== "string" || value.length > max)
			throw new Error("Invalid content text");
		return value;
	}
	list(value: unknown, max: number): readonly unknown[] {
		if (!Array.isArray(value) || value.length > max)
			throw new Error("Invalid content list");
		return value;
	}
	media(value: unknown): ContentMedia {
		const item = this.object(value, [
			"source",
			"id",
			"url",
			"fingerprint",
			"description",
			"mimeType",
			"width",
			"height",
			"sourceRevision",
		]);
		const id = this.text(item.id, 200),
			url = this.text(item.url, 2000);
		const description = this.text(item.description, 1000),
			sourceRevision = this.text(item.sourceRevision, 200);
		const fingerprint = this.text(item.fingerprint, 64);
		if (
			!id ||
			!description.trim() ||
			!sourceRevision ||
			!this.urls.valid(url) ||
			/[<>\r\n]/.test(url) ||
			!/^[a-f0-9]{64}$/.test(fingerprint)
		)
			throw new Error("Invalid content media identity");
		if (item.mimeType !== "image/png" && item.mimeType !== "image/jpeg")
			throw new Error("Invalid content media format");
		if (
			!Number.isSafeInteger(item.width) ||
			!Number.isSafeInteger(item.height) ||
			Number(item.width) <= 0 ||
			Number(item.height) <= 0 ||
			Number(item.width) * Number(item.height) > 25_000_000
		)
			throw new Error("Invalid content dimensions");
		const source =
			item.source === undefined
				? undefined
				: this.object(item.source, ["id", "revision"]);
		return {
			...(source
				? {
						source: {
							id: this.text(source.id, 200),
							revision: this.text(source.revision, 200),
						},
					}
				: {}),
			id,
			url,
			description,
			sourceRevision,
			fingerprint,
			mimeType: item.mimeType,
			width: Number(item.width),
			height: Number(item.height),
		};
	}
	destination(value: unknown): SocialDestination {
		const item = this.object(value, [
			"key",
			"provider",
			"label",
			"workspaceId",
			"channelId",
			"organizationUrn",
		]);
		const key = this.text(item.key, 64);
		const label = this.text(item.label, 100);
		if (
			!/^[a-z][a-z0-9-]{0,63}$/.test(key) ||
			!label.trim() ||
			/[<>\r\n]/.test(label)
		)
			throw new Error("Invalid content destination identity");
		if (item.provider === "slack") {
			this.object(value, [
				"key",
				"provider",
				"label",
				"workspaceId",
				"channelId",
			]);
			const workspaceId = this.text(item.workspaceId, 100);
			const channelId = this.text(item.channelId, 100);
			if (
				!/^T[A-Z0-9]{2,}$/.test(workspaceId) ||
				!/^[CG][A-Z0-9]{2,}$/.test(channelId)
			)
				throw new Error("Invalid content Slack destination");
			return { key, label, provider: "slack", workspaceId, channelId };
		}
		this.object(value, ["key", "provider", "label", "organizationUrn"]);
		const organizationUrn = this.text(item.organizationUrn, 100);
		if (
			item.provider !== "linkedin" ||
			!/^urn:li:organization:[1-9]\d*$/.test(organizationUrn)
		)
			throw new Error("Invalid content LinkedIn destination");
		return { key, label, provider: "linkedin", organizationUrn };
	}

	draft(value: unknown): ContentDraft {
		const item = this.object(value, ["text", "media"]);
		return {
			text: this.text(item.text, 12_000),
			media: this.list(item.media, 4).map((image) => this.media(image)),
		};
	}
	facts(value: unknown): ContentFacts {
		const item = this.object(value, [
			"date",
			"startTime",
			"endTime",
			"timeZone",
			"month",
			"eventDescription",
			"host",
			"talks",
			"registrationUrl",
			"aperitif",
			"mentions",
			"announcement",
		]);
		const host = this.object(item.host, ["name", "city"]);
		const registrationUrl = this.text(item.registrationUrl, 2000);
		if (registrationUrl && !this.urls.valid(registrationUrl))
			throw new Error("Invalid registration URL");
		if (typeof item.aperitif !== "boolean")
			throw new Error("Invalid content logistics");
		return {
			date: this.text(item.date, 10),
			startTime: this.text(item.startTime, 5),
			endTime: this.text(item.endTime, 5),
			timeZone: this.text(item.timeZone, 100),
			month: this.text(item.month, 40),
			...(item.eventDescription === undefined
				? {}
				: { eventDescription: this.text(item.eventDescription, 49_000) }),
			host: {
				name: this.text(host.name, 200),
				city: this.text(host.city, 200),
			},
			talks: this.list(item.talks, 10).map((talk) => this.talk(talk)),
			registrationUrl,
			aperitif: item.aperitif,
			mentions: this.list(item.mentions, 20).map((name) =>
				this.text(name, 100),
			),
			announcement:
				item.announcement === null ? null : this.media(item.announcement),
		};
	}
	private talk(value: unknown): ContentFacts["talks"][number] {
		const item = this.object(value, ["id", "title", "abstract", "speakers"]);
		return {
			id: this.text(item.id, 200),
			title: this.text(item.title, 500),
			abstract: this.text(item.abstract, 3000),
			speakers: this.list(item.speakers, 10).map((speaker) => {
				const person = this.object(speaker, ["id", "name"]);
				return {
					id: this.text(person.id, 200),
					name: this.text(person.name, 200),
				};
			}),
		};
	}
}
