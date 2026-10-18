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

	static async at<T>(
		stage: SpeakerSynchronizationStage,
		operation: () => T | Promise<T>,
	): Promise<T> {
		try {
			return await operation();
		} catch (error) {
			if (error instanceof SpeakerSynchronizationError) throw error;
			throw new SpeakerSynchronizationError(stage, error);
		}
	}
}
