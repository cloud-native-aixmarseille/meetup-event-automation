import type {
	EventPublicationIdentity,
	EventPublicationIdentityPolicy,
} from "../application/event-publication-ports.js";
import { MeetupEventUrl } from "./meetup-event-url.js";
import type { MeetupGroupUrl } from "./meetup-group-url.js";

export class MeetupEventIdentityPolicy
	implements EventPublicationIdentityPolicy
{
	constructor(private readonly group: MeetupGroupUrl) {}

	fromUrl(value: unknown): EventPublicationIdentity | undefined {
		const url = MeetupEventUrl.parse(value, this.group);
		return url
			? { id: url.id, reviewUrl: url.value, publicUrl: url.value }
			: undefined;
	}

	publicUrl(value: unknown): value is string {
		return MeetupEventUrl.parse(value, this.group) !== undefined;
	}

	valid(identity: EventPublicationIdentity): boolean {
		const expected = this.fromUrl(identity.reviewUrl);
		return (
			expected !== undefined &&
			identity.id === expected.id &&
			identity.reviewUrl === expected.reviewUrl &&
			identity.publicUrl === expected.publicUrl
		);
	}
}
