export interface SlackSocialDestination {
	readonly key: string;
	readonly provider: "slack";
	readonly label: string;
	readonly workspaceId: string;
	readonly channelId: string;
}
export interface LinkedInSocialDestination {
	readonly key: string;
	readonly provider: "linkedin";
	readonly label: string;
	readonly organizationUrn: string;
}
export type SocialDestination =
	| SlackSocialDestination
	| LinkedInSocialDestination;
