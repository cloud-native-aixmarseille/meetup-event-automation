import type { MeetupEvent } from "@meetup-automation/event";
import type {
	AssetRenderPresenter,
	PublicAssetModel,
} from "@meetup-automation/publication";
import {
	type ReferentialRepository,
	ValidateReferentialCatalog,
} from "@meetup-automation/referential";
import type { PublicDiagnostic } from "../result/result-envelope.js";

export class AssetRenderProjection {
	constructor(
		private readonly presenter: AssetRenderPresenter,
		private readonly repository: ReferentialRepository,
		private readonly speakers: Readonly<Record<string, string>> = {},
	) {}

	async create(
		event: MeetupEvent,
		diagnostics: readonly PublicDiagnostic[],
	): Promise<PublicAssetModel> {
		const catalog = await new ValidateReferentialCatalog(
			this.repository,
		).execute();
		const agendaValid = !diagnostics.some(
			(item) =>
				item.severity === "error" && /agenda|referential/.test(item.code),
		);
		const agendaIds = agendaValid
			? new Set(
					event.agenda.flatMap((talk) =>
						talk.speakers.map((speaker) => speaker.id),
					),
				)
			: new Set<string>();
		const pictures: Record<
			string,
			{ speakerId: string; url: string; description: string }
		> = {};
		if (catalog.isValid) {
			for (const [slot, id] of Object.entries(this.speakers)) {
				const speaker = catalog.catalog.speakers.find((item) => item.id === id);
				if (
					agendaIds.has(id) &&
					speaker?.pictureUrl &&
					AssetRenderProjection.publicUrl(speaker.pictureUrl)
				)
					pictures[slot] = {
						speakerId: id,
						url: speaker.pictureUrl,
						description: speaker.displayName,
					};
			}
		}
		return this.presenter.format({
			title: diagnostics.some(
				(item) => item.severity === "error" && /title/.test(item.code),
			)
				? undefined
				: event.eventTitle,
			date: event.date,
			timeZone: event.timeZone,
			hostName: event.host?.displayName,
			feedbackUrl:
				!diagnostics.some(
					(item) => item.severity === "error" && /feedback/.test(item.code),
				) && AssetRenderProjection.publicUrl(event.publicationLinks.feedback)
					? event.publicationLinks.feedback
					: undefined,
			agenda: agendaValid
				? event.agenda.map((talk) => ({
						title: talk.description,
						speakers: talk.speakers.map((speaker) => speaker.displayName),
					}))
				: [],
			pictures,
		});
	}

	private static publicUrl(value?: string): boolean {
		if (!value) return false;
		try {
			const url = new URL(value);
			return (
				url.protocol === "https:" &&
				!url.username &&
				!url.password &&
				![...url.searchParams.keys()].some((key) =>
					/token|signature|credential|secret|key|auth/i.test(key),
				)
			);
		} catch {
			return false;
		}
	}
}
