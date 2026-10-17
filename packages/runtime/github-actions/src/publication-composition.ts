import type {
	EventDocumentCodec,
	EventRepository,
} from "@meetup-automation/event";
import {
	GoogleDriveAssetRepository,
	GoogleDriveManifestRepository,
	GoogleDriveAuthentication,
} from "@meetup-automation/google-drive-asset-repository";
import { GoogleDocsContentRepository } from "@meetup-automation/google-docs-content-repository";
import { GoogleSlidesContentRepository } from "@meetup-automation/google-slides-content-repository";
import { HttpsAssetImageRepository } from "@meetup-automation/https-asset-image-repository";
import type { ReferentialRepository } from "@meetup-automation/referential";
import { AssetRenderPresenterImpl } from "./assets/asset-render-presenter.js";
import { AssetMessages } from "./assets/asset-messages.js";
import {
	AssetContentConfiguration,
	type AssetContentConfigurationData,
} from "./assets/asset-content-configuration.js";
import {
	ManageMeetupAssets,
	ManageMeetupEvent,
	AssetRenderProjection,
	FindNextAssetEvent,
} from "@meetup-automation/journey";
import {
	type AssetRepository,
	ReconcileEventAssets,
	ReconcileAssetContent,
} from "@meetup-automation/publication";
import {
	EventComposition,
	type EventCompositionInput,
	SERVICES,
} from "./composition.js";

export const ASSET_REPOSITORY = Symbol("AssetRepository");

type PublicationInput = EventCompositionInput & {
	readonly credentials: string;
	readonly parentFolderId: string;
	readonly templateFolderId: string;
	readonly contentConfiguration?: AssetContentConfigurationData;
};

export class PublicationComposition {
	static createPublicationContainer(input: PublicationInput) {
		const container = EventComposition.createEventContainer(input);
		const repository = container.get<ReferentialRepository>(
			SERVICES.referentialRepository,
		);
		let catalog: ReturnType<ReferentialRepository["load"]> | undefined;
		container
			.rebind<ReferentialRepository>(SERVICES.referentialRepository)
			.toConstantValue({
				load: () => {
					catalog ??= repository.load();
					return catalog;
				},
			});
		container.bind<AssetRepository>(ASSET_REPOSITORY).toDynamicValue(() =>
			GoogleDriveAssetRepository.createGoogleDriveAssetRepository(
				input.credentials,
				{
					parentFolderId: input.parentFolderId,
					templateFolderId: input.templateFolderId,
					contentContracts: input.contentConfiguration?.contracts,
				},
			),
		);
		PublicationComposition.bindContent(container, input.credentials);
		container
			.bind(ReconcileEventAssets)
			.toDynamicValue(
				(context) =>
					new ReconcileEventAssets(
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
		container.bind(ManageMeetupAssets).toDynamicValue(
			(context) =>
				new ManageMeetupAssets({
					renderProjection: new AssetRenderProjection(
						new AssetRenderPresenterImpl(new AssetMessages(input.locale)),
						context.get<ReferentialRepository>(SERVICES.referentialRepository),
						input.contentConfiguration ?? {
							speakers: {},
							talks: {},
							venues: {},
						},
						AssetContentConfiguration.usesNextEvent(
							input.contentConfiguration?.contracts ?? {},
						)
							? new FindNextAssetEvent(
									context.get<EventRepository>(SERVICES.eventRepository),
									context.get<EventDocumentCodec>(SERVICES.eventDocumentCodec),
									input.contentConfiguration?.venues,
								)
							: undefined,
					),
					recovery: input.contentConfiguration?.recovery,
					eventRepository: context.get<EventRepository>(
						SERVICES.eventRepository,
					),
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
	) {
		container.bind(ReconcileAssetContent).toDynamicValue(() => {
			const authentication = GoogleDriveAuthentication.create(credentials);
			const images = new HttpsAssetImageRepository();
			return new ReconcileAssetContent(
				new GoogleDriveManifestRepository(
					GoogleDriveAssetRepository.client(credentials),
				),
				{
					"application/vnd.google-apps.presentation":
						GoogleSlidesContentRepository.create(authentication, images),
					"application/vnd.google-apps.document":
						GoogleDocsContentRepository.create(authentication, images),
				},
				images,
			);
		});
	}
}
