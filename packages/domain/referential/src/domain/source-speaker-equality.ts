import type { SourceSpeaker } from "../application/ports/proposal-source.js";

/** Compare source profiles without conflating missing and explicitly cleared fields. */
export class SourceSpeakerEquality {
	equal(left: SourceSpeaker, right: SourceSpeaker): boolean {
		return (
			left.id === right.id &&
			left.displayName === right.displayName &&
			left.email === right.email &&
			left.company === right.company &&
			left.pictureUrl === right.pictureUrl
		);
	}
}
