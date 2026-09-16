import type { EventIdentity } from "../../domain/model.js";

export class EventNotFoundError extends Error {
	constructor(identity: EventIdentity) {
		super(
			`Meetup event ${identity.repository}#${identity.issueNumber} was not found`,
		);
		this.name = "EventNotFoundError";
	}
}
