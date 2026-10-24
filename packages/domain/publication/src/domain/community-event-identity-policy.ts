import type { EventPublicationIdentity } from "../application/event-publication-ports.js";
import type { CommunityGroupUrl } from "./community-group-url.js";

export class CommunityEventIdentityPolicy {
	constructor(private readonly group: CommunityGroupUrl) {}

	validId(value: unknown): value is string {
		return (
			typeof value === "string" &&
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
				value,
			)
		);
	}

	publicUrl(value: unknown): value is string {
		return (
			typeof value === "string" &&
			value.startsWith(this.group.eventUrlPrefix) &&
			/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
				value.slice(this.group.eventUrlPrefix.length),
			)
		);
	}

	reviewUrl(value: unknown): value is string {
		if (typeof value !== "string") return false;
		try {
			const url = new URL(value);
			return (
				url.origin === this.group.origin &&
				!url.username &&
				!url.password &&
				value === `${url.origin}${url.pathname}` &&
				/^\/dashboard\/group\/events\/[0-9a-f-]{36}\/update$/.test(url.pathname)
			);
		} catch {
			return false;
		}
	}

	valid(value: EventPublicationIdentity): boolean {
		return (
			this.validId(value.id) &&
			this.reviewUrl(value.reviewUrl) &&
			(value.publicUrl === undefined || this.publicUrl(value.publicUrl)) &&
			value.reviewUrl ===
				`${this.group.origin}/dashboard/group/events/${value.id}/update`
		);
	}
}
