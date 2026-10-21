import type { PublicationRecord } from "@meetup-automation/publication";

export class PublicationCommentCodec {
	static readonly marker = "<!-- meetup-publication:v1\n";

	static decode(body: string): PublicationRecord {
		if (
			!body.startsWith(PublicationCommentCodec.marker) ||
			!body.endsWith("\n-->")
		)
			throw new Error("Publication journal is corrupted");
		let value: unknown;
		try {
			value = JSON.parse(body.slice(PublicationCommentCodec.marker.length, -4));
		} catch {
			throw new Error("Publication journal is corrupted");
		}
		if (!PublicationCommentCodec.object(value))
			throw new Error("Publication journal is corrupted");
		if (value.state === "pending" && value.url === undefined) return {};
		if (
			(value.state === "saved" || value.state === "published") &&
			typeof value.url === "string"
		)
			return { url: value.url };
		throw new Error("Publication journal is corrupted");
	}

	static encode(record: PublicationRecord): string {
		const state =
			record.url === undefined
				? { state: "pending" }
				: { state: "saved", url: record.url };
		const json = JSON.stringify(state)
			.replaceAll("<", "\\u003c")
			.replaceAll(">", "\\u003e");
		return `${PublicationCommentCodec.marker}${json}\n-->`;
	}

	private static object(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}
}
