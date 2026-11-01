import type { LinkedInShareRecord } from "./linkedin-sharing-ports.js";

export class LinkedInSharingState {
	validate(
		previous: LinkedInShareRecord | undefined,
		next: LinkedInShareRecord,
	): void {
		const newReservation =
			next.status === "pending" &&
			next.attempts === (previous?.attempts ?? 0) + 1;
		if (!previous) {
			if (!newReservation)
				throw new Error("LinkedIn sharing must reserve before sending");
			return;
		}
		if (
			previous.id !== next.id ||
			previous.url !== next.url ||
			previous.status === "sent"
		)
			throw new Error("LinkedIn sharing history cannot be replaced");
		if (previous.status === "retry" && newReservation) return;
		if (
			previous.status === "pending" &&
			next.status !== "pending" &&
			next.attempts === previous.attempts &&
			next.reservedAt === previous.reservedAt
		)
			return;
		throw new Error("Invalid LinkedIn sharing transition");
	}
}
