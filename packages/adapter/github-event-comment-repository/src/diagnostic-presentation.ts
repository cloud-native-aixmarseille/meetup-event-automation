import type { EventDiagnostic } from "@meetup-automation/event";

import { FIELD_ORDER, GUIDANCE } from "./diagnostic-guidance.js";

export type DiagnosticPresentation = Readonly<{
	field: string;
	message: string;
	order: number;
}>;

export class DiagnosticPresenter {
	private static readonly FIELD_ALIASES = new Map([
		...FIELD_ORDER.map((field): [string, string] => [field, field]),
		["eventTitle", "Event Title"],
		["event_title", "Event Title"],
		["date", "Event Date"],
		["event_date", "Event Date"],
		["host", "Hoster"],
		["hoster", "Hoster"],
		["hostReference", "Hoster"],
		["description", "Event Description"],
		["event_description", "Event Description"],
		["agenda", "Agenda"],
		["publicationLinks.meetup", "Meetup Link"],
		["meetup_link", "Meetup Link"],
		["publicationLinks.community", "CNCF Link"],
		["cncf_link", "CNCF Link"],
		["publicationLinks.assets", "Drive Link"],
		["drive_link", "Drive Link"],
		["confirmations.host", "Host confirmation"],
		["confirmations.speakers", "Speaker confirmation"],
		["occurrenceStatus", "Event Status"],
		["event_status", "Event Status"],
	]);

	static presentDiagnostic(item: EventDiagnostic): DiagnosticPresentation {
		const guidance =
			GUIDANCE.get(item.code) ??
			DiagnosticPresenter.referenceGuidance(item.code);
		const fallback = guidance?.[0] ?? "Meetup issue";
		const [field, section] = DiagnosticPresenter.publicField(
			item.field,
			fallback,
		);
		const message =
			guidance?.[1] ??
			"An additional validation check needs attention. Review the workflow diagnostics with a maintainer.";
		const order = FIELD_ORDER.indexOf(section);
		return { field, message, order: order < 0 ? FIELD_ORDER.length : order };
	}

	static referenceGuidance(
		code: string,
	): readonly [string, string] | undefined {
		const reference = code.match(
			/^referential\.reference\.(host|speaker)\.(invalid|unknown|ambiguous|display-name-mismatch)$/,
		);
		if (reference) {
			const [, kind, problem] = reference;
			const field = kind === "host" ? "Hoster" : "Agenda";
			const catalog = kind === "host" ? "host list" : "speaker list";
			const example =
				kind === "host"
					? "Host name [host-0001]"
					: "Speaker name [speaker-0001]";
			switch (problem) {
				case "unknown":
					return [
						field,
						`This ${kind} was not found in the ${catalog}. Copy its exact name, including accents, or use a name with its stable ID: \`${example}\`.`,
					];
				case "ambiguous":
					return [
						field,
						`Several ${kind}s share this name. Include the correct stable ID: \`${example}\`.`,
					];
				case "display-name-mismatch":
					return [
						field,
						`Use the ${kind} name associated with this stable ID in the ${catalog}.`,
					];
				default:
					return [
						field,
						`Choose a ${kind} from the ${catalog} using its name or \`${example}\`.`,
					];
			}
		}
		if (/^referential\.(host|contact|speaker)\./.test(code)) {
			return [
				"Referentials",
				"Ask a maintainer to correct the hosting or speaker catalog using the referential validation workflow diagnostics.",
			];
		}
		return undefined;
	}

	/** Only known issue headings and numeric agenda positions can reach Markdown. */
	static publicField(
		field: string | undefined,
		fallback: string,
	): readonly [string, string] {
		const known = DiagnosticPresenter.FIELD_ALIASES.get(field ?? "");
		if (known) return [known, known];
		const agenda = field?.match(
			/^agenda\.(\d{1,6})(?:\.(speakers|description)(?:\.(\d{1,6}))?)?$/,
		);
		if (agenda) {
			const entry = Number(agenda[1]) + 1;
			const speaker =
				agenda[3] === undefined ? "" : `, speaker ${Number(agenda[3]) + 1}`;
			return [`Agenda (item ${entry}${speaker})`, "Agenda"];
		}
		const speaker = field?.match(/^speakerReferences\[(\d{1,6})\]$/);
		if (speaker)
			return [`Agenda (speaker ${Number(speaker[1]) + 1})`, "Agenda"];
		return [fallback, fallback];
	}
}
