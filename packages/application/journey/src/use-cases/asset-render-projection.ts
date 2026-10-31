import type { MeetupEvent } from "@meetup-automation/event";
import type {
	AssetRenderPresenter,
	PublicAssetModel,
	PublicAssetUrl,
} from "@meetup-automation/publication";
import type {
	ReferentialRepository,
	ValidateReferentialCatalog,
	ValidateReferentialCatalogArguments,
} from "@meetup-automation/referential";
import type { PublicDiagnostic } from "../result/result-envelope.js";
import type { AssetParticipantProjection } from "./asset-participant-projection.js";
import type { FindNextAssetEvent } from "./find-next-asset-event.js";

export interface AssetRenderProjectionCollaborators {
	readonly assetParticipantProjection: Pick<
		AssetParticipantProjection,
		"create"
	>;
	readonly publicAssetUrl: Pick<PublicAssetUrl, "valid">;
	readonly createValidateReferentialCatalog: (
		...args: ValidateReferentialCatalogArguments
	) => ValidateReferentialCatalog;
}

export class AssetRenderProjection {
	constructor(
		private readonly collaborators: AssetRenderProjectionCollaborators,
		private readonly presenter: AssetRenderPresenter,
		private readonly repository: ReferentialRepository,
		private readonly startTime: string,
		private readonly nextEvent?: Pick<FindNextAssetEvent, "find">,
	) {}

	async create(
		event: MeetupEvent,
		diagnostics: readonly PublicDiagnostic[],
		usesNextEvent: boolean,
	): Promise<PublicAssetModel> {
		const catalog = await this.collaborators
			.createValidateReferentialCatalog(this.repository)
			.execute();
		const agendaValid =
			catalog.isValid &&
			event.proposalStatus !== "stale" &&
			!diagnostics.some(
				(item) =>
					item.severity === "error" &&
					/agenda|referential|proposals/.test(`${item.code} ${item.field}`),
			);
		const participants = agendaValid
			? this.collaborators.assetParticipantProjection.create(
					event,
					catalog.catalog,
				)
			: { speakers: {}, talks: {}, pictures: {} };
		const host = catalog.isValid
			? catalog.catalog.hosts.find((item) => item.id === event.host?.id)
			: undefined;
		return this.presenter.format({
			title: diagnostics.some(
				(item) => item.severity === "error" && /title/.test(item.code),
			)
				? undefined
				: event.eventTitle,
			date: event.date,
			startTime: this.startTime,
			timeZone: event.timeZone,
			hostName: event.host?.displayName,
			hostLogo:
				host?.logo && this.collaborators.publicAssetUrl.valid(host.logo.url)
					? { ...host.logo, hostId: host.id }
					: undefined,
			venue: host?.publicVenue,
			feedbackUrl:
				!diagnostics.some(
					(item) => item.severity === "error" && /feedback/.test(item.code),
				) &&
				this.collaborators.publicAssetUrl.valid(event.publicationLinks.feedback)
					? event.publicationLinks.feedback
					: undefined,
			agenda: agendaValid
				? event.agenda.map((talk) => ({
						title: talk.proposal?.title ?? talk.description,
						speakers: talk.speakers.map((speaker) => speaker.displayName),
					}))
				: [],
			...participants,
			nextEvent:
				usesNextEvent && catalog.isValid
					? await this.nextEvent?.find(event, catalog.catalog)
					: undefined,
		});
	}
}
export type AssetRenderProjectionArguments =
	ConstructorParameters<typeof AssetRenderProjection> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
