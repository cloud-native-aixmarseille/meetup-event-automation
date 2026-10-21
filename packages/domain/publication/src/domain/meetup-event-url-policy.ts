import { MeetupEventUrl } from "./meetup-event-url.js";
import { MeetupGroupUrl } from "./meetup-group-url.js";
import type { PublicationEvaluation, PublicationReferences } from "./model.js";
import type { PublicationLinkEvaluation } from "./publication-link-evaluation.js";
import type { PublicationUrlPolicy } from "./url-policy-contracts.js";

export interface MeetupEventUrlPolicyCollaborators {
	readonly publicationLinkEvaluation: Pick<
		PublicationLinkEvaluation,
		"evaluateLink"
	>;
}

export class MeetupEventUrlPolicy implements PublicationUrlPolicy {
	readonly id = "meetup-event-url";

	constructor(
		private readonly collaborators: MeetupEventUrlPolicyCollaborators,
		private readonly prefix: string,
	) {}

	evaluate(references: PublicationReferences): PublicationEvaluation {
		const group = MeetupGroupUrl.fromEventUrlPrefix(this.prefix);
		return this.collaborators.publicationLinkEvaluation.evaluateLink({
			references,
			path: "meetup",
			isValid: (value) => !!group && !!MeetupEventUrl.parse(value, group),
			code: "publication.meetup-url.invalid",
			message: `Meetup URL must start with ${this.prefix} and end with a numeric event identifier`,
		});
	}
}
export type MeetupEventUrlPolicyArguments =
	ConstructorParameters<typeof MeetupEventUrlPolicy> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
