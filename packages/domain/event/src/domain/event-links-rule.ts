import type { EventDiagnostic, EventDiagnostics } from "./diagnostic.js";
import type { MeetupEvent } from "./model.js";
import { EMPTY_EVENT_PATCH, type EventPatches } from "./patch.js";
import type { EventRule, EventRuleResult } from "./rule-contracts.js";

/** Generic URL safety belongs here; provider-specific URL policy is Publication. */
export interface EventLinksRuleCollaborators {
	readonly eventDiagnostics: Pick<EventDiagnostics, "diagnostic">;
	readonly eventPatches: Pick<
		EventPatches,
		"createEventPatch" | "replaceEventField"
	>;
}

export class EventLinksRule implements EventRule {
	constructor(private readonly collaborators: EventLinksRuleCollaborators) {}

	readonly id = "event-links";
	readonly dependencies: readonly string[] = [];

	evaluate(event: MeetupEvent): EventRuleResult {
		const diagnostics: EventDiagnostic[] = [];
		const normalized: {
			meetup?: string;
			community?: string;
			assets?: string;
			feedback?: string;
		} = { ...event.publicationLinks };
		let changed = false;

		for (const key of ["meetup", "community", "assets", "feedback"] as const) {
			const link = event.publicationLinks[key];
			if (link === undefined || link.trim() === "") {
				continue;
			}

			const value = link.trim().replace(/\/$/, "");
			if (!this.isHttpsUrl(value)) {
				diagnostics.push(
					this.collaborators.eventDiagnostics.diagnostic({
						code: `event.link.${key}.invalid`,
						severity: "error",
						category: "invalid",
						field: `publicationLinks.${key}`,
						message: `${key} link must be a valid HTTPS URL`,
					}),
				);
				continue;
			}
			if (value !== link) {
				normalized[key] = value;
				changed = true;
			}
		}

		if (!changed) {
			return { diagnostics, patch: EMPTY_EVENT_PATCH };
		}

		diagnostics.push(
			this.collaborators.eventDiagnostics.diagnostic({
				code: "event.links.normalized",
				severity: "info",
				category: "normalization",
				field: "publicationLinks",
				message: "Publication links can be normalized safely",
				fixAvailable: true,
			}),
		);

		return {
			diagnostics,
			patch: this.collaborators.eventPatches.createEventPatch([
				this.collaborators.eventPatches.replaceEventField(
					"publicationLinks",
					normalized,
					"Trim publication links and remove trailing slashes",
				),
			]),
		};
	}
	private isHttpsUrl(value: string): boolean {
		try {
			return new URL(value).protocol === "https:";
		} catch {
			return false;
		}
	}
}
