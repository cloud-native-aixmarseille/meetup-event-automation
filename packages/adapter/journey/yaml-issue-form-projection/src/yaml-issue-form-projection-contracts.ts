import type {
	IssueFormProjection,
	IssueFormProjectionResult as JourneyIssueFormProjectionResult,
} from "@meetup-automation/journey";

export const HOST_FIELD_ID = "hoster";

export const AVAILABLE_SPEAKERS_MARKER = "<!-- Available speakers -->";

export interface YamlIssueFormProjectionOptions {
	readonly workspaceRoot: string;
	locale?: string;
}

export type SynchronizeIssueFormInput = Parameters<
	IssueFormProjection["synchronize"]
>[0];

export interface IssueFormProjectionDiagnostic {
	readonly code: "issue-form.out-of-date" | "issue-form.updated";
	readonly severity: "info" | "warning";
	readonly message: string;
}

export type IssueFormProjectionResult = JourneyIssueFormProjectionResult;

export type UnknownRecord = Record<string, unknown>;

export interface ResolvedIssueFormPath {
	readonly absolutePath: string;
	readonly relativePath: string;
}
