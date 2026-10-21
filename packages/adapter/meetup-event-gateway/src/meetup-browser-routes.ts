import {
	MeetupEventUrl,
	type MeetupGroupUrl,
} from "@meetup-automation/publication";

/** Provider navigation paths; public event identity belongs to publication. */
export class MeetupBrowserRoutes {
	login(origin: string): string {
		return `${origin}/login/`;
	}

	account(origin: string): string {
		return `${origin}/account/management/`;
	}

	schedule(group: MeetupGroupUrl): string {
		return `${group.value}schedule/`;
	}

	edit(event: MeetupEventUrl): string {
		return `${event.value}edit/`;
	}

	isMeetupLocation(url: URL, origin: string): boolean {
		return url.origin === origin && !url.username && !url.password;
	}

	isPath(url: URL, path: string, origin: string): boolean {
		return (
			this.isMeetupLocation(url, origin) &&
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
		if (!this.isMeetupLocation(location, group.origin)) return undefined;
		return MeetupEventUrl.parse(
			`${location.origin}${location.pathname}`,
			group,
		);
	}
}
