import type { EventIdentity } from "../../domain/model.js";

export class EventConcurrentModificationError extends Error {
	constructor(identity: EventIdentity) {
		super(
			`Meetup event ${identity.repository}#${identity.issueNumber} changed during reconciliation`,
		);
		this.name = "EventConcurrentModificationError";
	}
}
