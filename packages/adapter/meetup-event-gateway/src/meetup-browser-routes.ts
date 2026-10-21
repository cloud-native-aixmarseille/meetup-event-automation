import {
	MEETUP_ORIGIN,
	MeetupEventUrl,
	type MeetupGroupUrl,
} from "@meetup-automation/publication";

/** Provider navigation paths; public event identity belongs to publication. */
export class MeetupBrowserRoutes {
	static readonly login = `${MEETUP_ORIGIN}/login/`;
	static readonly account = `${MEETUP_ORIGIN}/account/management/`;

	static schedule(group: MeetupGroupUrl): string {
		return `${group.value}schedule/`;
	}

	static edit(event: MeetupEventUrl): string {
		return `${event.value}edit/`;
	}

	static isMeetupLocation(url: URL): boolean {
		return url.origin === MEETUP_ORIGIN && !url.username && !url.password;
	}

	static isPath(url: URL, path: string): boolean {
		return (
			MeetupBrowserRoutes.isMeetupLocation(url) &&
			(url.pathname === path || url.pathname.startsWith(`${path}/`))
		);
	}

	static matchesEditor(location: string, expected: string): boolean {
		return location.replace(/\/$/, "") === expected.replace(/\/$/, "");
	}

	static eventLocation(
		location: URL,
		group: MeetupGroupUrl,
	): MeetupEventUrl | undefined {
		// Browser redirects may carry query/fragment data. Never persist it as
		// identity or accept it on organizer-supplied links and approval records.
		if (!MeetupBrowserRoutes.isMeetupLocation(location)) return undefined;
		return MeetupEventUrl.parse(
			`${location.origin}${location.pathname}`,
			group,
		);
	}
}
