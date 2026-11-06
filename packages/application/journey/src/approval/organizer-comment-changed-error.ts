/** A verified comment snapshot changed; stop effects and read again later. */
export class OrganizerCommentChangedError extends Error {
	constructor() {
		super("Organizer comment changed during verification");
		this.name = "OrganizerCommentChangedError";
	}
}
