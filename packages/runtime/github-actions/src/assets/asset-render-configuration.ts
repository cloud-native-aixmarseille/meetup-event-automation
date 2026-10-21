import {
	type AssetRenderAssignments,
	type AssetTalkIdentity,
	ContentContractPolicy,
	type ImageSource,
	type PublicAssetVenue,
} from "@meetup-automation/publication";
import { RuntimeInput } from "../runtime-input.js";

export class AssetRenderConfiguration {
	static parse(
		event: { speakers?: unknown; talks?: unknown },
		venues: unknown,
		hostLogos?: unknown,
	): AssetRenderAssignments {
		return {
			speakers: AssetRenderConfiguration.speakers(event.speakers),
			talks: AssetRenderConfiguration.talks(event.talks),
			venues: AssetRenderConfiguration.venues(venues),
			hostLogos: AssetRenderConfiguration.logos(hostLogos),
		};
	}

	private static speakers(input: unknown): Readonly<Record<string, string>> {
		const result: Record<string, string> = {};
		for (const [slot, id] of Object.entries(
			AssetRenderConfiguration.record(input === undefined ? {} : input),
		)) {
			if (
				!AssetRenderConfiguration.slot(slot) ||
				typeof id !== "string" ||
				!/^speaker-[a-z0-9-]+$/.test(id)
			)
				throw new Error("Invalid asset speaker assignment");
			result[slot] = id;
		}
		return result;
	}

	private static talks(
		input: unknown,
	): Readonly<Record<string, AssetTalkIdentity>> {
		const result: Record<string, AssetTalkIdentity> = {};
		for (const [slot, value] of Object.entries(
			AssetRenderConfiguration.record(input === undefined ? {} : input),
		)) {
			const identity = AssetRenderConfiguration.record(value);
			if (
				!AssetRenderConfiguration.slot(slot) ||
				!ContentContractPolicy.keys(identity, ["provider", "event", "id"]) ||
				!AssetRenderConfiguration.identity(identity.provider) ||
				!AssetRenderConfiguration.identity(identity.event) ||
				!AssetRenderConfiguration.identity(identity.id)
			)
				throw new Error("Invalid asset talk assignment");
			result[slot] = {
				provider: identity.provider,
				event: identity.event,
				id: identity.id,
			};
		}
		return result;
	}

	private static venues(
		input: unknown,
	): Readonly<Record<string, PublicAssetVenue>> {
		const result: Record<string, PublicAssetVenue> = {};
		for (const [id, value] of Object.entries(
			AssetRenderConfiguration.record(input === undefined ? {} : input),
		)) {
			const venue = AssetRenderConfiguration.record(value);
			if (
				!/^host-[a-z0-9-]+$/.test(id) ||
				!ContentContractPolicy.keys(venue, ["address", "postalCode", "city"]) ||
				!ContentContractPolicy.text(venue.address) ||
				!ContentContractPolicy.text(venue.postalCode) ||
				!ContentContractPolicy.text(venue.city)
			)
				throw new Error("Invalid public asset venue");
			result[id] = {
				address: venue.address,
				postalCode: venue.postalCode,
				city: venue.city,
			};
		}
		return result;
	}

	private static logos(input: unknown): Readonly<Record<string, ImageSource>> {
		const result: Record<string, ImageSource> = {};
		for (const [hostId, value] of Object.entries(
			AssetRenderConfiguration.record(input === undefined ? {} : input),
		)) {
			const logo = AssetRenderConfiguration.record(value);
			if (
				!/^host-[a-z0-9-]+$/.test(hostId) ||
				!ContentContractPolicy.keys(logo, ["url", "description"]) ||
				!ContentContractPolicy.text(logo.url) ||
				!ContentContractPolicy.text(logo.description)
			)
				throw new Error("Invalid public host logo");
			result[hostId] = { url: logo.url, description: logo.description };
		}
		return result;
	}

	private static slot(value: string): boolean {
		return (
			ContentContractPolicy.name(value) &&
			!["__proto__", "prototype", "constructor"].includes(value)
		);
	}

	private static identity(value: unknown): value is string {
		return typeof value === "string" && /^[a-zA-Z0-9_-]{1,200}$/.test(value);
	}

	private static record(value: unknown): Record<string, unknown> {
		if (!RuntimeInput.isObject(value) || Object.keys(value).length > 200)
			throw new Error("Invalid asset render configuration");
		return value;
	}
}
