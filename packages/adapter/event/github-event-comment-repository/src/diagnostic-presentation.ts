import type { EventDiagnostic } from "@meetup-automation/event";
import { FIELD_ORDER, GUIDANCE } from "./diagnostic-guidance.js";
import type { EventCommentMessages } from "./i18n/event-comment-messages.js";

export type DiagnosticPresentation = Readonly<{
	field: string;
	message: string;
	order: number;
}>;

export type DiagnosticLinks = Readonly<{
	repository: string;
	meetup?: string;
}>;

export class DiagnosticPresenter {
	private readonly FIELD_ALIASES = new Map([
		...FIELD_ORDER.map((field): [string, string] => [field, field]),
		["Slides & Content", "Event materials"],
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
		["publicationLinks.feedback", "OpenFeedback Link"],
		["openfeedback_link", "OpenFeedback Link"],
		["confirmations.speakers", "Speaker confirmation"],
		["occurrenceStatus", "Event Status"],
		["event_status", "Event Status"],
	]);

	presentDiagnostic(
		item: EventDiagnostic,
		messages: EventCommentMessages,
		links: DiagnosticLinks,
	): DiagnosticPresentation {
		const workflowUrl = this.workflowUrl(links);
		if (item.code === "publication.assets.content.conflict")
			return this.contentConflict(item, messages, links);
		if (item.code.startsWith("publication.assets.content.image"))
			return this.imageDiagnostic(item, messages);
		if (item.code === "publication.meetup.uncertain")
			return {
				field: "Meetup Link",
				message: this.meetupRecovery(messages, links),
				order: FIELD_ORDER.indexOf("Meetup Link"),
			};
		const guidance = GUIDANCE.get(item.code);
		const referential = /^referential\.(host|contact|speaker)\./.test(
			item.code,
		);
		const fallback =
			guidance?.[0] ?? (referential ? "Referentials" : "Meetup issue");
		const [field, section] = this.publicField(item.field, fallback, messages);
		const message = guidance
			? messages.t(guidance[1], { workflowUrl })
			: referential
				? messages.t("comment.referential")
				: messages.t("comment.unknown", { workflowUrl });
		const order = FIELD_ORDER.indexOf(section);
		return { field, message, order: order < 0 ? FIELD_ORDER.length : order };
	}

	private contentConflict(
		item: EventDiagnostic,
		messages: EventCommentMessages,
		links: DiagnosticLinks,
	): DiagnosticPresentation {
		const location = item.field?.match(
			/^assets\.content\/([a-zA-Z0-9_-]{1,100})\/([a-z][a-z0-9-]{0,63})(?:\/(missing|changed)\/([a-zA-Z0-9_-]{1,100}))?$/,
		);
		const workflowUrl = this.workflowUrl(links);
		const slide =
			location?.[2] === "slides" && location[4] && location[4] !== "document";
		return {
			field: messages.t("comment.assets.content-heading"),
			message: [
				location
					? messages.t(
							slide
								? "comment.assets.content-slide"
								: "comment.assets.content-file",
							{
								documentUrl: slide
									? `https://docs.google.com/presentation/d/${location[1]}/edit#slide=id.${location[4]}`
									: `https://drive.google.com/file/d/${location[1]}/view`,
							},
						)
					: "",
				messages.t(
					location?.[3] === "missing"
						? "comment.assets.content-missing"
						: "comment.assets.content-conflict",
				),
				location?.[2] === "slides"
					? messages.t("comment.assets.slides-blocked")
					: "",
				messages.t("comment.assets.content-repair", { workflowUrl }),
			]
				.filter(Boolean)
				.join(" "),
			order: FIELD_ORDER.indexOf("Event materials"),
		};
	}

	private workflowUrl(links: DiagnosticLinks): string {
		return `https://github.com/${links.repository.split("/").map(encodeURIComponent).join("/")}/actions/workflows/event-reconcile-active.yml`;
	}

	private imageDiagnostic(
		item: EventDiagnostic,
		messages: EventCommentMessages,
	): DiagnosticPresentation {
		const location = item.field?.match(
			/^assets\.image\/([a-zA-Z0-9_-]{1,100})\/(cover|host-logo|speaker-picture|fallback|embedded)\/([a-zA-Z0-9_.:-]{1,100})$/,
		);
		const guidance = GUIDANCE.get(item.code);
		const context = location
			? messages.t("comment.assets.image-context", {
					kind: location[2].replaceAll("-", "_"),
					slot: location[3],
					documentUrl: `https://drive.google.com/file/d/${location[1]}/view`,
				})
			: "";
		const recovery =
			location?.[2] === "cover"
				? messages.t("comment.assets.cover-recovery")
				: "";
		return {
			field: "Event materials",
			message: [
				context,
				messages.t(guidance?.[1] ?? "comment.guidance.assets.image"),
				recovery,
			]
				.filter(Boolean)
				.join(" "),
			order: FIELD_ORDER.indexOf("Event materials"),
		};
	}

	private meetupRecovery(
		messages: EventCommentMessages,
		links: DiagnosticLinks,
	): string {
		const workflowUrl = this.workflowUrl(links);
		return links.meetup
			? messages.t("comment.guidance.meetup.uncertain", {
					eventUrl: links.meetup.replace(/[()<>\s]/g, (character) =>
						character === "("
							? "%28"
							: character === ")"
								? "%29"
								: encodeURIComponent(character),
					),
					workflowUrl,
				})
			: messages.t("comment.guidance.meetup.uncertain-missing-link", {
					workflowUrl,
				});
	}

	/** Only known issue headings and numeric agenda positions can reach Markdown. */
	publicField(
		field: string | undefined,
		fallback: string,
		messages: EventCommentMessages,
	): readonly [string, string] {
		const social = field?.match(
			/^social\.([a-z0-9][a-z0-9-]{0,63})\.(announcement|d7|d0)$/,
		);
		if (social)
			return [
				messages.t("comment.social.target", {
					destination: social[1],
					purpose: social[2],
				}),
				"Communication",
			];
		const known = this.FIELD_ALIASES.get(field ?? "");
		if (known) return [known, known];
		const agenda = field?.match(
			/^agenda\.(\d{1,6})(?:\.(speakers|description)(?:\.(\d{1,6}))?)?$/,
		);
		if (agenda) {
			const entry = Number(agenda[1]) + 1;
			const speaker =
				agenda[3] === undefined
					? ""
					: messages.t("comment.agenda.speaker-suffix", {
							speaker: Number(agenda[3]) + 1,
						});
			return [
				messages.t("comment.agenda.item", { item: entry, speaker }),
				"Agenda",
			];
		}
		const speaker = field?.match(/^speakerReferences\[(\d{1,6})\]$/);
		if (speaker)
			return [
				messages.t("comment.agenda.speaker", {
					speaker: Number(speaker[1]) + 1,
				}),
				"Agenda",
			];
		return [fallback, fallback];
	}
}
