import type {
	ContentBinding,
	ContentChange,
	ContentContract,
	ContentManifest,
	ContentSnapshot,
	ImageSource,
	PublicAssetModel,
	TemplateContentDefaults,
} from "../domain/asset-content.js";
import type {
	PublicAssetTalk,
	PublicAssetVenue,
	PublicNextAssetEvent,
} from "../domain/asset-render-data.js";

export interface AssetContentRepository {
	discover(
		fileId: string,
		kind: string,
		defaults: TemplateContentDefaults,
	): Promise<ContentContract | undefined>;
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
export type AssetModelProvider = (
	contract: ContentContract,
) => Promise<PublicAssetModel | undefined>;
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
		startTime: string;
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
