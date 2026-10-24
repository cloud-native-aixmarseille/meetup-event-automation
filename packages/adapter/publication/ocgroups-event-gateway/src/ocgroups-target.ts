import type { CommunityGroupUrl } from "@meetup-automation/publication";

export interface OcgroupsTarget {
	readonly group: CommunityGroupUrl;
	readonly communityId: string;
	readonly groupId: string;
}
