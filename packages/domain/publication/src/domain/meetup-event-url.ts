import { MeetupGroupUrl } from "./meetup-group-url.js";

/** Public event identity, shared by drafts and published events. */
export class MeetupEventUrl {
	private constructor(
		readonly group: MeetupGroupUrl,
		private readonly identifier: string,
	) {}

	static parse(
		value: unknown,
		group?: MeetupGroupUrl,
	): MeetupEventUrl | undefined {
		if (typeof value !== "string") return undefined;
		const match = /^(.*\/)events\/([1-9]\d*)\/?$/.exec(value);
		if (!match || match[0] !== value) return undefined;
		const parsedGroup = MeetupGroupUrl.parse(match[1]);
		if (!parsedGroup || (group && parsedGroup.value !== group.value))
			return undefined;
		return new MeetupEventUrl(parsedGroup, match[2]);
	}

	get value(): string {
		return `${this.group.eventUrlPrefix}${this.identifier}/`;
	}

	get id(): string {
		return this.identifier;
	}
}
