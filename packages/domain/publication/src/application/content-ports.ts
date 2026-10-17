import type {
	ContentBinding,
	ContentChange,
	ContentContract,
	ContentManifest,
	ContentSnapshot,
	ImageSource,
	PublicAssetModel,
} from "../domain/asset-content.js";
import type {
	PublicAssetVenue,
	PublicAssetTalk,
	PublicNextAssetEvent,
} from "../domain/asset-render-data.js";

export interface AssetContentRepository {
	read(
		fileId: string,
		contract: ContentContract,
		bindings?: readonly ContentBinding[],
		initialRevision?: string,
	): Promise<ContentSnapshot>;
	apply(
		fileId: string,
		snapshot: ContentSnapshot,
		changes: readonly ContentChange[],
	): Promise<string>;
}
export interface AssetManifestRepository {
	load(folderId: string, fileId: string): Promise<unknown | undefined>;
	save(folderId: string, manifest: ContentManifest): Promise<void>;
}
export interface AssetImageRepository {
	validate(
		source: ImageSource,
	): Promise<{ fingerprint: string; source: ImageSource }>;
	observe(url: string): Promise<string>;
}
export interface AssetRenderPresenter {
	format(input: {
		title?: string;
		date?: string;
		timeZone: string;
		hostName?: string;
		hostLogo?: PublicAssetModel["hostLogo"];
		venue?: PublicAssetVenue;
		talks?: Readonly<Record<string, PublicAssetTalk>>;
		speakers?: Readonly<Record<string, string>>;
		nextEvent?: PublicNextAssetEvent;
		feedbackUrl?: string;
		agenda: readonly { title: string; speakers: readonly string[] }[];
		pictures: PublicAssetModel["pictures"];
	}): PublicAssetModel;
}
