export type PublicAssetVenue = Readonly<{
	address: string;
	postalCode: string;
	city: string;
}>;

import type { ImageSource } from "./asset-content.js";

export type AssetTalkIdentity = Readonly<{
	provider: string;
	event: string;
	id: string;
}>;

export type AssetRenderAssignments = Readonly<{
	speakers: Readonly<Record<string, string>>;
	talks: Readonly<Record<string, AssetTalkIdentity>>;
	venues: Readonly<Record<string, PublicAssetVenue>>;
	hostLogos?: Readonly<Record<string, ImageSource>>;
}>;

export type PublicAssetTalk = Readonly<{
	title: string;
	abstract?: string;
	speakers: readonly string[];
}>;

export type PublicNextAssetEvent = Readonly<{
	date: string;
	hostName: string;
	city?: string;
}>;
