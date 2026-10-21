import type {
	OpenFeedbackSpeaker,
	OpenFeedbackTalk,
} from "./openfeedback-agenda-snapshot.js";

/** Compare the managed fields of OpenFeedback records, ignoring remote metadata. */
export class OpenFeedbackRecordEquality {
	static equal(
		left: OpenFeedbackSpeaker | OpenFeedbackTalk,
		right: OpenFeedbackSpeaker | OpenFeedbackTalk,
	): boolean {
		if (left.id !== right.id) return false;
		if ("name" in left) return "name" in right && left.name === right.name;
		return (
			"title" in right &&
			left.title === right.title &&
			OpenFeedbackRecordEquality.sameSpeakers(left, right)
		);
	}

	static sameSpeakers(
		left: Pick<OpenFeedbackTalk, "speakers">,
		right: Pick<OpenFeedbackTalk, "speakers">,
	): boolean {
		const first = [...left.speakers].sort();
		const second = [...right.speakers].sort();
		return (
			first.length === second.length &&
			first.every((speaker, index) => speaker === second[index])
		);
	}
}
