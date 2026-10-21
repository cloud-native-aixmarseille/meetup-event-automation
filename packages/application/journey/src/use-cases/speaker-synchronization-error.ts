import type { PublicDiagnostic } from "../result/result-envelope.js";

export type SpeakerSynchronizationStage =
	| "read-catalog"
	| "load-source"
	| "merge-speakers"
	| "validate-catalog"
	| "check-form"
	| "save-catalog"
	| "update-form";

export class SpeakerSynchronizationError extends Error {
	constructor(
		readonly stage: SpeakerSynchronizationStage,
		cause?: unknown,
		readonly diagnostics: readonly PublicDiagnostic[] = [],
	) {
		super(`Speaker synchronization failed during ${stage}.`, { cause });
		this.name = "SpeakerSynchronizationError";
	}
}
