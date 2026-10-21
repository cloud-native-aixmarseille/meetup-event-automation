import { MEETUP_ORIGIN } from "./meetup-url-contracts.js";

export class MeetupGroupUrl {
	private constructor(readonly value: string) {}

	static parse(value: unknown): MeetupGroupUrl | undefined {
		const prefix = `${MEETUP_ORIGIN}/`;
		if (
			typeof value !== "string" ||
			!value.startsWith(prefix) ||
			!value.endsWith("/")
		)
			return undefined;
		const slug = value.slice(prefix.length, -1);
		return slug.length > 0 && !/[^a-z0-9-]/.test(slug)
			? new MeetupGroupUrl(value)
			: undefined;
	}

	static fromEventUrlPrefix(value: string): MeetupGroupUrl | undefined {
		return value.endsWith("events/")
			? MeetupGroupUrl.parse(value.slice(0, -"events/".length))
			: undefined;
	}

	get eventUrlPrefix(): string {
		return `${this.value}events/`;
	}
}
