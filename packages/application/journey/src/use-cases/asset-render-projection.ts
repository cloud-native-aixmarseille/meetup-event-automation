import type { MeetupEvent } from "@meetup-automation/event";
import {
	type AssetRenderAssignments,
	type AssetRenderPresenter,
	type PublicAssetModel,
	PublicAssetUrl,
} from "@meetup-automation/publication";
import {
	type ReferentialRepository,
	ValidateReferentialCatalog,
} from "@meetup-automation/referential";
import type { PublicDiagnostic } from "../result/result-envelope.js";
import { AssetParticipantProjection } from "./asset-participant-projection.js";
import type { FindNextAssetEvent } from "./find-next-asset-event.js";

export class AssetRenderProjection {
	constructor(
		private readonly presenter: AssetRenderPresenter,
		private readonly repository: ReferentialRepository,
		private readonly assignments: AssetRenderAssignments = {
			speakers: {},
			talks: {},
			venues: {},
		},
		private readonly nextEvent?: Pick<FindNextAssetEvent, "find">,
	) {}

	async create(
		event: MeetupEvent,
		diagnostics: readonly PublicDiagnostic[],
	): Promise<PublicAssetModel> {
		const catalog = await new ValidateReferentialCatalog(
			this.repository,
		).execute();
		const agendaValid =
			catalog.isValid &&
			event.proposalStatus !== "stale" &&
			!diagnostics.some(
				(item) =>
					item.severity === "error" &&
					/agenda|referential|proposals/.test(`${item.code} ${item.field}`),
			);
		const participants = agendaValid
			? AssetParticipantProjection.create(
					event,
					catalog.catalog,
					this.assignments,
				)
			: { speakers: {}, talks: {}, pictures: {} };
		return this.presenter.format({
			title: diagnostics.some(
				(item) => item.severity === "error" && /title/.test(item.code),
			)
				? undefined
				: event.eventTitle,
			date: event.date,
			timeZone: event.timeZone,
			hostName: event.host?.displayName,
			hostLogo:
				catalog.isValid &&
				catalog.catalog.hosts.some((host) => host.id === event.host?.id)
					? this.hostLogo(event.host?.id)
					: undefined,
			venue: event.host?.id
				? this.assignments.venues[event.host.id]
				: undefined,
			feedbackUrl:
				!diagnostics.some(
					(item) => item.severity === "error" && /feedback/.test(item.code),
				) && PublicAssetUrl.valid(event.publicationLinks.feedback)
					? event.publicationLinks.feedback
					: undefined,
			agenda: agendaValid
				? event.agenda.map((talk) => ({
						title: talk.proposal?.title ?? talk.description,
						speakers: talk.speakers.map((speaker) => speaker.displayName),
					}))
				: [],
			...participants,
			nextEvent: catalog.isValid
				? await this.nextEvent?.find(event, catalog.catalog)
				: undefined,
		});
	}

	private hostLogo(hostId?: string): PublicAssetModel["hostLogo"] {
		if (!hostId) return undefined;
		const logo = this.assignments.hostLogos?.[hostId];
		return logo && PublicAssetUrl.valid(logo.url)
			? { ...logo, hostId }
			: undefined;
	}
}
