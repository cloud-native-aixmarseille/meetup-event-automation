import {
	type CommunityEventIdentityPolicy,
	type EventPublicationIdentity,
	ScheduledEventError,
} from "@meetup-automation/publication";

/** Decodes only the browser's save response; never issues requests to private endpoints. */
export class OcgroupsEditorLocation {
	constructor(
		private readonly origin: string,
		private readonly identities: Pick<CommunityEventIdentityPolicy, "valid">,
	) {}

	decode(header: string | null): EventPublicationIdentity {
		try {
			const value: unknown = JSON.parse(header ?? "");
			if (
				!value ||
				typeof value !== "object" ||
				!("path" in value) ||
				typeof value.path !== "string"
			)
				throw new Error();
			const id = value.path.match(
				/^\/dashboard\/group\/events\/([0-9a-f-]{36})\/update$/,
			)?.[1];
			const identity = {
				id: id ?? "",
				reviewUrl: `${this.origin}${value.path}`,
			};
			if (!this.identities.valid(identity)) throw new Error();
			return identity;
		} catch {
			throw new ScheduledEventError("uncertain");
		}
	}
}
