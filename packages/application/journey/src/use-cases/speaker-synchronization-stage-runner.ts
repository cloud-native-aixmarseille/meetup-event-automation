import {
	SpeakerSynchronizationError,
	type SpeakerSynchronizationStage,
} from "./speaker-synchronization-error.js";

export class SpeakerSynchronizationStageRunner {
	async at<T>(
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
