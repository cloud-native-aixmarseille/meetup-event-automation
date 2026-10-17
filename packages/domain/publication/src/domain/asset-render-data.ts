export type PublicAssetVenue = Readonly<{
	address: string;
	postalCode: string;
	city: string;
}>;

export type AssetTalkIdentity = Readonly<{
	provider: string;
	event: string;
	id: string;
}>;

export type AssetRenderAssignments = Readonly<{
	speakers: Readonly<Record<string, string>>;
	talks: Readonly<Record<string, AssetTalkIdentity>>;
	venues: Readonly<Record<string, PublicAssetVenue>>;
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
