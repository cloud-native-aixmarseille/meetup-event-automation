import type {
	EventDocumentCodec,
	EventRepository,
} from "@meetup-automation/event";
import { GoogleDocsContentRepositoryComposition } from "@meetup-automation/google-docs-content-repository";
import { GoogleDriveAssetRepositoryComposition } from "@meetup-automation/google-drive-asset-repository";
import { GoogleSlidesContentRepositoryComposition } from "@meetup-automation/google-slides-content-repository";
import { HttpsAssetImageRepositoryComposition } from "@meetup-automation/https-asset-image-repository";
import {
	type AutomationConfig,
	JourneyComposition,
	ManageMeetupEvent,
	ReconcileMeetupDocuments,
} from "@meetup-automation/journey";
import {
	type AssetRepository,
	type ContentRecovery,
	PublicationDomainComposition,
	ReconcileAssetContent,
	ReconcileEventAssets,
} from "@meetup-automation/publication";
import type { ReferentialRepository } from "@meetup-automation/referential";
import { TemplatingComposition } from "@meetup-automation/templating";
import { AssetFileNameComposition } from "./asset-file-name-composition.js";
import { AssetTemplateDefaults } from "./assets/asset-template-defaults.js";
import { AssetTemplateRendererImpl } from "./assets/asset-template-renderer.js";
import {
	EventComposition,
	type EventCompositionInput,
	SERVICES,
} from "./composition.js";
import { ContentGateComposition } from "./content-gate-composition.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import { EventSnapshotHash } from "./event-snapshot-hash.js";
import { PublicationPolicyComposition } from "./publication-policy-composition.js";

export const ASSET_REPOSITORY = Symbol("AssetRepository");

type PublicationInput = EventCompositionInput & {
	readonly locale: string;
	readonly issueNumber: number;
	readonly commentAuthorLogin: string;
	readonly credentials: string;
	readonly parentFolderId: string;
	readonly templateFolderId: string;
	readonly recovery: Readonly<Record<string, ContentRecovery>>;
};

export class DocumentComposition {
	static createDocumentContainer(input: PublicationInput) {
		const container = EventComposition.createEventContainer(input);
		container.bind<AssetRepository>(ASSET_REPOSITORY).toDynamicValue(() =>
			new GoogleDriveAssetRepositoryComposition()
				.googleDriveAssetRepositoryFactory()
				.createGoogleDriveAssetRepository(input.credentials, {
					parentFolderId: input.parentFolderId,
					templateFolderId: input.templateFolderId,
				}),
		);
		DocumentComposition.bindContent(container, input.credentials, input.locale);
		container
			.bind(ReconcileEventAssets)
			.toDynamicValue((context) =>
				new PublicationDomainComposition().reconcileEventAssets(
					new AssetFileNameComposition().create(input.locale),
					context.get<AssetRepository>(ASSET_REPOSITORY),
					context.get(ReconcileAssetContent),
				),
			);
		DocumentComposition.bindManageAssets(container, input);
		return container;
	}

	private static bindManageAssets(
		container: ReturnType<typeof EventComposition.createEventContainer>,
		input: PublicationInput,
	): void {
		container.bind(ReconcileMeetupDocuments).toDynamicValue((context) =>
			new JourneyComposition().reconcileMeetupDocuments({
				contentGate: new ContentGateComposition().create(
					input,
					input.issueNumber,
					input.commentAuthorLogin,
				),
				revision: new EventSnapshotHash(),
				renderProjection: new JourneyComposition().assetRenderProjection(
					new GithubActionsComposition().assetRenderPresenterImpl(
						new GithubActionsComposition().assetMessages(input.locale),
					),
					context.get<ReferentialRepository>(SERVICES.referentialRepository),
					new JourneyComposition().findNextAssetEvent(
						new PublicationPolicyComposition().meetupEventUrlPolicy(
							input.meetupEventUrlPrefix,
						),
						new PublicationPolicyComposition().communityEventUrlPolicy(
							input.communityEventUrlPrefixes,
						),
						context.get<EventRepository>(SERVICES.eventRepository),
						context.get<EventDocumentCodec>(SERVICES.eventDocumentCodec),
						context.get<AutomationConfig>(SERVICES.config).event["issue-label"],
					),
				),
				recovery: input.recovery,
				eventRepository: context.get<EventRepository>(SERVICES.eventRepository),
				documentCodec: context.get<EventDocumentCodec>(
					SERVICES.eventDocumentCodec,
				),
				manageEvent: context.get(ManageMeetupEvent),
				reconcileAssets: context.get(ReconcileEventAssets),
			}),
		);
	}
	private static bindContent(
		container: ReturnType<typeof EventComposition.createEventContainer>,
		credentials: string,
		locale: string,
	) {
		container.bind(ReconcileAssetContent).toDynamicValue(() => {
			const authentication = new GoogleDriveAssetRepositoryComposition()
				.googleDriveAuthentication()
				.create(credentials);
			const images =
				new HttpsAssetImageRepositoryComposition().httpsAssetImageRepository();
			return new PublicationDomainComposition().reconcileAssetContent(
				new AssetTemplateRendererImpl(
					new TemplatingComposition().renderer(locale),
				),
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
				new AssetTemplateDefaults(
					new GithubActionsComposition().assetMessages(locale),
				).create(),
			);
		});
	}
}
