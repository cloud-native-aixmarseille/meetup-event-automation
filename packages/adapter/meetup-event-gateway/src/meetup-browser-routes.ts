import {
	MEETUP_ORIGIN,
	MeetupEventUrl,
	type MeetupGroupUrl,
} from "@meetup-automation/publication";

/** Provider navigation paths; public event identity belongs to publication. */
export class MeetupBrowserRoutes {
	static readonly login = `${MEETUP_ORIGIN}/login/`;
	static readonly account = `${MEETUP_ORIGIN}/account/management/`;

	schedule(group: MeetupGroupUrl): string {
		return `${group.value}schedule/`;
	}

	edit(event: MeetupEventUrl): string {
		return `${event.value}edit/`;
	}

	isMeetupLocation(url: URL): boolean {
		return url.origin === MEETUP_ORIGIN && !url.username && !url.password;
	}

	isPath(url: URL, path: string): boolean {
		return (
			this.isMeetupLocation(url) &&
			(url.pathname === path || url.pathname.startsWith(`${path}/`))
		);
	}

	matchesEditor(location: string, expected: string): boolean {
		return location.replace(/\/$/, "") === expected.replace(/\/$/, "");
	}

	eventLocation(
		location: URL,
		group: MeetupGroupUrl,
	): MeetupEventUrl | undefined {
		// Browser redirects may carry query/fragment data. Never persist it as
		// identity or accept it on organizer-supplied links and approval records.
		if (!this.isMeetupLocation(location)) return undefined;
		return MeetupEventUrl.parse(
			`${location.origin}${location.pathname}`,
			group,
		);
	}
}
