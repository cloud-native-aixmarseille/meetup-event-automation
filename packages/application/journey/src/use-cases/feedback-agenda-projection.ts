import type { AgendaEntry, MeetupEvent } from "@meetup-automation/event";
import type { FeedbackAgenda } from "@meetup-automation/publication";
import type { PublicDiagnostic } from "../result/result-envelope.js";

export class FeedbackAgendaProjection {
	create(
		event: MeetupEvent,
		diagnostics: readonly PublicDiagnostic[],
	): FeedbackAgenda | undefined {
		if (!event.agenda.length || this.blocked(diagnostics)) return undefined;
		const talks: FeedbackAgenda["talks"][number][] = [];
		for (const entry of event.agenda) {
			const talk = this.talk(entry);
			if (!talk) return undefined;
			talks.push(talk);
		}
		return { talks };
	}

	private blocked(diagnostics: readonly PublicDiagnostic[]): boolean {
		return diagnostics.some(
			(item) =>
				item.severity === "error" &&
				((item.code.startsWith("referential.") &&
					!item.code.startsWith("referential.reference.host.")) ||
					item.code.startsWith("event.agenda.")),
		);
	}

	private talk(
		entry: AgendaEntry,
	): FeedbackAgenda["talks"][number] | undefined {
		if (!entry.description.trim() || !entry.speakers.length) return undefined;
		const speakers: { id: string; name: string }[] = [];
		for (const speaker of entry.speakers) {
			if (!speaker.id || !speaker.displayName.trim()) return undefined;
			speakers.push({ id: speaker.id, name: speaker.displayName.trim() });
		}
		return {
			title: entry.proposal?.title ?? entry.description.trim(),
			...(entry.proposal
				? {
						// A fixed tuple makes provider identity independent of JSON key order.
						sourceIdentity: JSON.stringify([
							entry.proposal.provider,
							entry.proposal.event,
							entry.proposal.id,
						]),
					}
				: {}),
			speakers,
		};
	}
}
