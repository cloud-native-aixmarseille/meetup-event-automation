import type {
	SocialDeliveryJournal,
	SocialDestination,
	SocialImageGateway,
	SocialPostTiming,
	SocialPublicationGateway,
} from "@meetup-automation/communication";
import type { EventDiagnostic, EventIdentity } from "@meetup-automation/event";
import type {
	ContentFingerprint,
	ContentImageLoader,
} from "@meetup-automation/publication";
import type { OrganizerApproval } from "../ports/organizer-approval.js";
import type { PromotionalContentFingerprint } from "../proposals/promotional-content-fingerprint.js";
import type { PromotionalContentPolicy } from "../proposals/promotional-content-policy.js";
import type { ContentProposalStore } from "../proposals/promotional-content-ports.js";
import type { ContentWorkspace } from "../review/content-workspace.js";

export type SocialPublicationStatus =
	| "published"
	| "pending"
	| "scheduled"
	| "blocked"
	| "complete"
	| "uncertain"
	| "expired"
	| "manual";
export interface SocialPublicationResult {
	readonly target: string;
	readonly occurrence: string;
	readonly status: SocialPublicationStatus;
	readonly diagnostics: readonly EventDiagnostic[];
}
export interface SocialPublicationDependencies {
	readonly store: ContentProposalStore;
	readonly workspace: Pick<ContentWorkspace, "read">;
	readonly policy: Pick<PromotionalContentPolicy, "eligible" | "current">;
	readonly fingerprints: Pick<PromotionalContentFingerprint, "digest">;
	readonly timing: Pick<
		SocialPostTiming,
		"publicationEligible" | "expired" | "expiresAt"
	>;
	readonly approvals: OrganizerApproval;
	readonly journal: SocialDeliveryJournal;
	readonly configuration: () => Promise<readonly SocialDestination[]>;
	readonly canApprove: (actor: string) => Promise<boolean>;
	readonly gateways: ReadonlyMap<
		string,
		Readonly<{ posts: SocialPublicationGateway; images?: SocialImageGateway }>
	>;
	readonly imageLoader: ContentImageLoader;
	readonly imageFingerprint: Pick<ContentFingerprint, "of">;
	readonly now: () => string;
	readonly createId: () => string;
	readonly completion: {
		record(
			identity: EventIdentity,
			results: readonly SocialPublicationResult[],
		): Promise<void>;
	};
}
