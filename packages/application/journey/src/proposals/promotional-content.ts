import type {
	SocialDestination,
	SocialPostMilestone,
} from "@meetup-automation/communication";
import type { ContentMedia } from "@meetup-automation/publication";
export type ContentTarget =
	| "title"
	| "description"
	| "cover"
	| `${string}:${SocialPostMilestone}`;
export type ContentLanguage = "en" | "fr";
export interface ContentFacts {
	readonly date: string;
	readonly startTime: string;
	readonly endTime: string;
	readonly timeZone: string;
	readonly month: string;
	readonly host: Readonly<{ name: string; city: string }>;
	readonly talks: readonly Readonly<{
		id: string;
		title: string;
		abstract: string;
		speakers: readonly Readonly<{ id: string; name: string }>[];
	}>[];
	readonly registrationUrl: string;
	readonly aperitif: boolean;
	readonly mentions: readonly string[];
	readonly announcement: ContentMedia | null;
}
export interface ContentPlan {
	readonly target: ContentTarget;
	readonly destination?: SocialDestination;
	readonly language: ContentLanguage;
	readonly facts: ContentFacts;
	readonly plannedAt: string | null;
	readonly sourceFingerprint: string;
}
export interface ContentDraft {
	readonly text: string;
	readonly media: readonly ContentMedia[];
}
export type ContentOrigin =
	| Readonly<{ kind: "ai"; provider: string; model: string }>
	| Readonly<{ kind: "organizer"; login: string; submissionId: string }>;
export interface ContentDecision {
	readonly status: "approved" | "rejected" | "iteration-requested";
	readonly actor: string;
	readonly decidedAt: string;
	readonly selectedImage?: string;
}
export interface ContentAttempt {
	readonly id: string;
	readonly phase: "reserved" | "complete" | "failed";
	readonly media?: ContentMedia;
}
export interface ContentRecoveryRequest {
	readonly id: string;
	readonly actor: string;
	readonly proposalId: string;
	readonly guidance: string;
}
export interface ContentProposal {
	readonly publicationIntent?: string;
	readonly recoveryRequest?: ContentRecoveryRequest;
	readonly version: 1;
	readonly promptVersion: "1";
	readonly id: string;
	readonly plan: ContentPlan;
	readonly origin: ContentOrigin;
	readonly guidance: string;
	readonly createdAt: string;
	readonly destinationBefore: string | null;
	readonly attempts: readonly ContentAttempt[];
	readonly draft: ContentDraft | null;
	readonly revision: string | null;
	readonly decision: ContentDecision | null;
	readonly accepted: ContentDraft | null;
}
export interface PromotionalContentSnapshot {
	readonly revision: string;
	readonly proposals: readonly ContentProposal[];
}
