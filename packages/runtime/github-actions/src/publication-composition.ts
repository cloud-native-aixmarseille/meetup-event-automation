import type {
	EventDocumentCodec,
	EventRepository,
} from "@meetup-automation/event";
import { GoogleDriveAssetRepository } from "@meetup-automation/google-drive-asset-repository";
import {
	ManageMeetupAssets,
	ManageMeetupEvent,
} from "@meetup-automation/journey";
import {
	type AssetRepository,
	ReconcileEventAssets,
} from "@meetup-automation/publication";
import {
	EventComposition,
	type EventCompositionInput,
	SERVICES,
} from "./composition.js";

export const ASSET_REPOSITORY = Symbol("AssetRepository");

export class PublicationComposition {
	static createPublicationContainer(
		input: EventCompositionInput & {
			readonly credentials: string;
			readonly parentFolderId: string;
			readonly templateFolderId: string;
		},
	) {
		const container = EventComposition.createEventContainer(input);
		container.bind<AssetRepository>(ASSET_REPOSITORY).toDynamicValue(() =>
			GoogleDriveAssetRepository.createGoogleDriveAssetRepository(
				input.credentials,
				{
					parentFolderId: input.parentFolderId,
					templateFolderId: input.templateFolderId,
				},
			),
		);
		container
			.bind(ReconcileEventAssets)
			.toDynamicValue(
				(context) =>
					new ReconcileEventAssets(
						context.get<AssetRepository>(ASSET_REPOSITORY),
					),
			);
		container.bind(ManageMeetupAssets).toDynamicValue(
			(context) =>
				new ManageMeetupAssets({
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
		return container;
	}
}
