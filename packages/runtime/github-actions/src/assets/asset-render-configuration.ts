import {
	ContentContractPolicy,
	type AssetRenderAssignments,
	type AssetTalkIdentity,
	type PublicAssetVenue,
} from "@meetup-automation/publication";

export class AssetRenderConfiguration {
	static parse(
		event: { speakers?: unknown; talks?: unknown },
		venues: unknown,
	): AssetRenderAssignments {
		const speakers = AssetRenderConfiguration.record(event.speakers ?? {});
		const talks = AssetRenderConfiguration.record(event.talks ?? {});
		const publicVenues = AssetRenderConfiguration.record(venues ?? {});
		for (const [slot, id] of Object.entries(speakers)) {
			if (
				!AssetRenderConfiguration.slot(slot) ||
				typeof id !== "string" ||
				!/^speaker-[a-z0-9-]+$/.test(id)
			)
				throw new Error("Invalid asset speaker assignment");
		}
		for (const [slot, value] of Object.entries(talks)) {
			const identity = AssetRenderConfiguration.record(value);
			if (
				!AssetRenderConfiguration.slot(slot) ||
				!ContentContractPolicy.keys(identity, ["provider", "event", "id"]) ||
				![identity.provider, identity.event, identity.id].every(
					(item) =>
						typeof item === "string" && /^[a-zA-Z0-9_-]{1,200}$/.test(item),
				)
			)
				throw new Error("Invalid asset talk assignment");
		}
		for (const [id, value] of Object.entries(publicVenues)) {
			const venue = AssetRenderConfiguration.record(value);
			if (
				!/^host-[a-z0-9-]+$/.test(id) ||
				!ContentContractPolicy.keys(venue, ["address", "postalCode", "city"]) ||
				![venue.address, venue.postalCode, venue.city].every(
					ContentContractPolicy.text,
				)
			)
				throw new Error("Invalid public asset venue");
		}
		return {
			speakers: speakers as Record<string, string>,
			talks: talks as Record<string, AssetTalkIdentity>,
			venues: publicVenues as Record<string, PublicAssetVenue>,
		};
	}

	private static slot(value: string): boolean {
		return (
			ContentContractPolicy.name(value) &&
			!["__proto__", "prototype", "constructor"].includes(value)
		);
	}

	private static record(value: unknown): Record<string, unknown> {
		if (
			!value ||
			typeof value !== "object" ||
			Array.isArray(value) ||
			Object.keys(value).length > 200
		)
			throw new Error("Invalid asset render configuration");
		return value as Record<string, unknown>;
	}
}
