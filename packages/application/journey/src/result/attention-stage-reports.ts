import type { AttentionStage } from "@meetup-automation/communication";
import type { PublicDiagnostic } from "./result-envelope.js";
export const ATTENTION_STAGE_OWNERS = [
	"event",
	"assets",
	"feedback",
	"communications",
] as const;
export interface AttentionStageReport {
	readonly outcome: AttentionStage["outcome"];
	readonly diagnostics: readonly PublicDiagnostic[];
	readonly reported: boolean;
}
export type AttentionStageReports = Readonly<
	Record<(typeof ATTENTION_STAGE_OWNERS)[number], AttentionStageReport>
>;
