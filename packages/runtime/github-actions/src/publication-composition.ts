import type {
	EventClock,
	EventDocumentCodec,
	EventRepository,
} from "@meetup-automation/event";
import { GoogleDocsContentRepositoryComposition } from "@meetup-automation/google-docs-content-repository";
import {
	GoogleDriveAssetRepositoryComposition,
	GoogleDrivePdfComposition,
} from "@meetup-automation/google-drive-asset-repository";
import { GoogleSlidesContentRepositoryComposition } from "@meetup-automation/google-slides-content-repository";
import { HttpsAssetImageRepositoryComposition } from "@meetup-automation/https-asset-image-repository";
import {
	type AutomationConfig,
	JourneyComposition,
	ManageMeetupAssets,
	ManageMeetupEvent,
} from "@meetup-automation/journey";
import {
	type AssetRepository,
	PublicationDomainComposition,
	ReconcileAssetContent,
	ReconcileEventAssets,
	ReconcileSlidePdf,
} from "@meetup-automation/publication";
import type { ReferentialRepository } from "@meetup-automation/referential";
import type { AssetContentConfigurationData } from "./assets/asset-content-configuration.js";
import {
	EventComposition,
	type EventCompositionInput,
	SERVICES,
} from "./composition.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import { PublicationPolicyComposition } from "./publication-policy-composition.js";

export const ASSET_REPOSITORY = Symbol("AssetRepository");

type PublicationInput = EventCompositionInput & {
	readonly credentials: string;
	readonly parentFolderId: string;
	readonly publicFolderId: string;
	readonly templateFolderId: string;
	readonly contentConfiguration?: AssetContentConfigurationData;
};

export class PublicationComposition {
	static createPublicationContainer(input: PublicationInput) {
		if (
			[input.parentFolderId, input.templateFolderId].includes(
				input.publicFolderId,
			)
		)
			throw new Error(
				"The shared public folder must differ from the parent and template folders",
			);
		const container = EventComposition.createEventContainer(input);
		container.bind<AssetRepository>(ASSET_REPOSITORY).toDynamicValue(() =>
			new GoogleDriveAssetRepositoryComposition()
				.googleDriveAssetRepositoryFactory()
				.createGoogleDriveAssetRepository(input.credentials, {
					parentFolderId: input.parentFolderId,
					templateFolderId: input.templateFolderId,
					contentContracts: input.contentConfiguration?.contracts,
				}),
		);
		PublicationComposition.bindContent(container, input.credentials);
		PublicationComposition.bindPdf(
			container,
			input.credentials,
			input.publicFolderId,
		);
		container
			.bind(ReconcileEventAssets)
			.toDynamicValue((context) =>
				new PublicationDomainComposition().reconcileEventAssets(
					context.get<AssetRepository>(ASSET_REPOSITORY),
					context.get(ReconcileAssetContent),
				),
			);
		PublicationComposition.bindManageAssets(container, input);
		return container;
	}

	private static bindManageAssets(
		container: ReturnType<typeof EventComposition.createEventContainer>,
		input: PublicationInput,
	): void {
		container.bind(ManageMeetupAssets).toDynamicValue((context) =>
			new JourneyComposition().manageMeetupAssets({
				clock: context.get<EventClock>(SERVICES.eventClock),
				reconcilePdf: context.get(ReconcileSlidePdf),
				renderProjection: new JourneyComposition().assetRenderProjection(
					new GithubActionsComposition().assetRenderPresenterImpl(
						new GithubActionsComposition().assetMessages(input.locale),
					),
					context.get<ReferentialRepository>(SERVICES.referentialRepository),
					input.contentConfiguration ?? {
						speakers: {},
						talks: {},
						venues: {},
					},
					new GithubActionsComposition()
						.assetContentConfiguration()
						.usesNextEvent(input.contentConfiguration?.contracts ?? {})
						? new JourneyComposition().findNextAssetEvent(
								new PublicationPolicyComposition().meetupEventUrlPolicy(
									input.meetupEventUrlPrefix,
								),
								new PublicationPolicyComposition().communityEventUrlPolicy(
									input.communityEventUrlPrefixes,
								),
								context.get<EventRepository>(SERVICES.eventRepository),
								context.get<EventDocumentCodec>(SERVICES.eventDocumentCodec),
								context.get<AutomationConfig>(SERVICES.config).event[
									"issue-label"
								],
								input.contentConfiguration?.venues,
							)
						: undefined,
				),
				recovery: input.contentConfiguration?.recovery,
				eventRepository: context.get<EventRepository>(SERVICES.eventRepository),
				documentCodec: context.get<EventDocumentCodec>(
					SERVICES.eventDocumentCodec,
				),
				manageEvent: context.get(ManageMeetupEvent),
				reconcileAssets: context.get(ReconcileEventAssets),
			}),
		);
	}
	private static bindPdf(
		container: ReturnType<typeof EventComposition.createEventContainer>,
		credentials: string,
		publicFolderId: string,
	): void {
		container.bind(ReconcileSlidePdf).toDynamicValue(() => {
			const adapter = new GoogleDrivePdfComposition(
				new GoogleDriveAssetRepositoryComposition()
					.googleDriveAssetRepositoryFactory()
					.client(credentials),
				publicFolderId,
			);
			return new PublicationDomainComposition().reconcileSlidePdf(
				adapter.source(),
				adapter.repository(),
				adapter.states(),
			);
		});
	}

	private static bindContent(
		container: ReturnType<typeof EventComposition.createEventContainer>,
		credentials: string,
	) {
		container.bind(ReconcileAssetContent).toDynamicValue(() => {
			const authentication = new GoogleDriveAssetRepositoryComposition()
				.googleDriveAuthentication()
				.create(credentials);
			const images =
				new HttpsAssetImageRepositoryComposition().httpsAssetImageRepository();
			return new PublicationDomainComposition().reconcileAssetContent(
				new GoogleDriveAssetRepositoryComposition().googleDriveManifestRepository(
					new GoogleDriveAssetRepositoryComposition()
						.googleDriveAssetRepositoryFactory()
						.client(credentials),
				),
				{
					"application/vnd.google-apps.presentation":
						new GoogleSlidesContentRepositoryComposition()
							.googleSlidesContentRepositoryFactory()
							.create(authentication, images),
					"application/vnd.google-apps.document":
						new GoogleDocsContentRepositoryComposition()
							.googleDocsContentRepositoryFactory()
							.create(authentication, images),
				},
				images,
			);
		});
	}
}
