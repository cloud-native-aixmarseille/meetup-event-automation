export type PublicAssetVenue = Readonly<{
	address: string;
	postalCode: string;
	city: string;
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
