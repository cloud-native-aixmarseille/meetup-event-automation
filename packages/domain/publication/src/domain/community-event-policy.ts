import type {
	CommunityEvent,
	CommunityRegistration,
	CommunityVenue,
} from "../application/community-event-ports.js";
import type { ScheduledEventPolicy } from "./scheduled-event-policy.js";

export class CommunityEventPolicy {
	constructor(
		private readonly schedule: Pick<ScheduledEventPolicy, "validSchedule">,
	) {}

	valid(event: CommunityEvent, now: string): boolean {
		return (
			this.text(event.title, 120) &&
			this.text(event.description, 8_000) &&
			this.venue(event.venue) &&
			this.registration(event.registration) &&
			/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(event.categoryId) &&
			this.schedule.validSchedule(event, now)
		);
	}

	venue(venue: CommunityVenue): boolean {
		return (
			this.text(venue.name, 120) &&
			this.text(venue.address, 100) &&
			this.text(venue.city, 100) &&
			this.text(venue.country, 100) &&
			this.text(venue.zipCode, 20) &&
			this.text(venue.state, 100) &&
			/^[A-Z]{2}$/.test(venue.countryCode)
		);
	}

	registration(value: CommunityRegistration): boolean {
		return (
			Number.isSafeInteger(value.capacity) &&
			value.capacity > 0 &&
			value.capacity <= 100_000 &&
			typeof value.waitlist === "boolean" &&
			typeof value.approvalRequired === "boolean" &&
			typeof value.reminder === "boolean" &&
			!(value.waitlist && value.approvalRequired)
		);
	}

	text(value: string, maximum: number): boolean {
		return (
			value.trim().length > 0 &&
			Buffer.byteLength(value, "utf8") <= maximum &&
			![...value].some(
				(character) =>
					character.charCodeAt(0) < 32 && !"\n\r\t".includes(character),
			)
		);
	}
}
