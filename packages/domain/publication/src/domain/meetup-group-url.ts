export class MeetupGroupUrl {
	private constructor(readonly value: string) {}

	static parse(value: unknown): MeetupGroupUrl | undefined {
		if (typeof value !== "string") return undefined;
		let url: URL;
		try {
			url = new URL(value);
		} catch {
			return undefined;
		}
		if (
			url.protocol !== "https:" ||
			!url.hostname ||
			url.username ||
			url.password ||
			value !== `${url.origin}${url.pathname}` ||
			!/^\/[a-z0-9-]+\/$/.test(url.pathname)
		)
			return undefined;
		return new MeetupGroupUrl(value);
	}

	static fromEventUrlPrefix(value: string): MeetupGroupUrl | undefined {
		return value.endsWith("events/")
			? MeetupGroupUrl.parse(value.slice(0, -"events/".length))
			: undefined;
	}

	get eventUrlPrefix(): string {
		return `${this.value}events/`;
	}

	get origin(): string {
		return new URL(this.value).origin;
	}
}
