import type { PublicDiagnostic } from "../result/result-envelope.js";

export interface OrganizerReadinessContext {
	readonly repository: string;
	readonly issueNumber: number;
	readonly eventDate: string;
	/** Only diagnostic identifiers cross the presentation boundary. */
	readonly reasons: readonly Pick<PublicDiagnostic, "code" | "field">[];
}

export interface OrganizerReadinessNotification {
	render(context: OrganizerReadinessContext): string;
}
