import {
	type MeetupCoverRecord,
	MeetupGroupUrl,
} from "@meetup-automation/publication";

export type MeetupPublicationRecord = Readonly<{
	url?: string;
	cover?: MeetupCoverRecord;
}>;

export class PublicationCommentCodec {
	static readonly marker = "<!-- meetup-publication:v1\n";

	decode(body: string): MeetupPublicationRecord {
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
		if (!this.object(value))
			throw new Error("Publication journal is corrupted");
		const cover =
			value.cover === undefined ? {} : { cover: this.cover(value.cover) };
		if (value.state === "pending" && value.url === undefined) return cover;
		if (
			(value.state === "saved" || value.state === "published") &&
			typeof value.url === "string"
		)
			return { url: value.url, ...cover };
		throw new Error("Publication journal is corrupted");
	}

	encode(record: MeetupPublicationRecord): string {
		const state =
			record.url === undefined
				? { state: "pending" }
				: { state: "saved", url: record.url };
		const json = JSON.stringify({
			...state,
			...(record.cover ? { cover: this.cover(record.cover) } : {}),
		})
			.replaceAll("<", "\\u003c")
			.replaceAll(">", "\\u003e");
		return `${PublicationCommentCodec.marker}${json}\n-->`;
	}

	private object(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}

	private cover(value: unknown): MeetupCoverRecord {
		if (
			!this.object(value) ||
			typeof value.groupUrl !== "string" ||
			MeetupGroupUrl.parse(value.groupUrl)?.value !== value.groupUrl ||
			typeof value.fingerprint !== "string" ||
			!/^[a-f0-9]{64}$/.test(value.fingerprint) ||
			(value.photoId !== undefined &&
				(typeof value.photoId !== "string" ||
					!/^[1-9]\d*$/.test(value.photoId)))
		)
			throw new Error("Invalid Meetup cover journal");
		return {
			groupUrl: value.groupUrl,
			fingerprint: value.fingerprint,
			...(typeof value.photoId === "string" ? { photoId: value.photoId } : {}),
		};
	}
}
