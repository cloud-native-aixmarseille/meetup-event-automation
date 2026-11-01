import type { EventPublicationResult } from "./event-publication-contracts.js";
export class EventPublicationResults {
	constructor(
		private readonly field: "meetup" | "community",
		private readonly label: string,
	) {}
	result(status: "skipped" | "blocked", code: string): EventPublicationResult {
		return {
			status,
			diagnostics: [
				{
					code: `publication.${this.field}.${code}`,
					severity:
						(code.startsWith("authentication-") &&
							![
								"authentication-one-time-code",
								"authentication-credentials-rejected",
							].includes(code)) ||
						[
							"editor",
							"verification",
							"source",
							"unavailable",
							"approval-unavailable",
							"approval-notification-failed",
						].includes(code)
							? "error"
							: status === "blocked"
								? "warning"
								: "info",
					field: `publicationLinks.${this.field}`,
					message: `${this.label} publication: ${code}`,
				},
			],
		};
	}
}
