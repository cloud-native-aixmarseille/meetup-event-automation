import type {
	AssetRenderAssignments,
	AssetTalkIdentity,
	ContentContractPolicy,
	ImageSource,
	PublicAssetVenue,
} from "@meetup-automation/publication";
import type { RuntimeInput } from "../runtime-input.js";

export interface AssetRenderConfigurationCollaborators {
	readonly contentContractPolicy: Pick<
		ContentContractPolicy,
		"keys" | "text" | "name"
	>;
	readonly runtimeInput: Pick<RuntimeInput, "isObject">;
}

export class AssetRenderConfiguration {
	constructor(
		private readonly collaborators: AssetRenderConfigurationCollaborators,
	) {}

	parse(
		event: { speakers?: unknown; talks?: unknown },
		venues: unknown,
		hostLogos?: unknown,
	): AssetRenderAssignments {
		return {
			speakers: this.speakers(event.speakers),
			talks: this.talks(event.talks),
			venues: this.venues(venues),
			hostLogos: this.logos(hostLogos),
		};
	}

	private speakers(input: unknown): Readonly<Record<string, string>> {
		const result: Record<string, string> = {};
		for (const [slot, id] of Object.entries(
			this.record(input === undefined ? {} : input),
		)) {
			if (
				!this.slot(slot) ||
				typeof id !== "string" ||
				!/^speaker-[a-z0-9-]+$/.test(id)
			)
				throw new Error("Invalid asset speaker assignment");
			result[slot] = id;
		}
		return result;
	}

	private talks(input: unknown): Readonly<Record<string, AssetTalkIdentity>> {
		const result: Record<string, AssetTalkIdentity> = {};
		for (const [slot, value] of Object.entries(
			this.record(input === undefined ? {} : input),
		)) {
			const identity = this.record(value);
			if (
				!this.slot(slot) ||
				!this.collaborators.contentContractPolicy.keys(identity, [
					"provider",
					"event",
					"id",
				]) ||
				!this.identity(identity.provider) ||
				!this.identity(identity.event) ||
				!this.identity(identity.id)
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

	private venues(input: unknown): Readonly<Record<string, PublicAssetVenue>> {
		const result: Record<string, PublicAssetVenue> = {};
		for (const [id, value] of Object.entries(
			this.record(input === undefined ? {} : input),
		)) {
			const venue = this.record(value);
			if (
				!/^host-[a-z0-9-]+$/.test(id) ||
				!this.collaborators.contentContractPolicy.keys(venue, [
					"address",
					"postalCode",
					"city",
				]) ||
				!this.collaborators.contentContractPolicy.text(venue.address) ||
				!this.collaborators.contentContractPolicy.text(venue.postalCode) ||
				!this.collaborators.contentContractPolicy.text(venue.city)
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

	private logos(input: unknown): Readonly<Record<string, ImageSource>> {
		const result: Record<string, ImageSource> = {};
		for (const [hostId, value] of Object.entries(
			this.record(input === undefined ? {} : input),
		)) {
			const logo = this.record(value);
			if (
				!/^host-[a-z0-9-]+$/.test(hostId) ||
				!this.collaborators.contentContractPolicy.keys(logo, [
					"url",
					"description",
				]) ||
				!this.collaborators.contentContractPolicy.text(logo.url) ||
				!this.collaborators.contentContractPolicy.text(logo.description)
			)
				throw new Error("Invalid public host logo");
			result[hostId] = { url: logo.url, description: logo.description };
		}
		return result;
	}

	private slot(value: string): boolean {
		return (
			this.collaborators.contentContractPolicy.name(value) &&
			!["__proto__", "prototype", "constructor"].includes(value)
		);
	}

	private identity(value: unknown): value is string {
		return typeof value === "string" && /^[a-zA-Z0-9_-]{1,200}$/.test(value);
	}

	private record(value: unknown): Record<string, unknown> {
		if (
			!this.collaborators.runtimeInput.isObject(value) ||
			Object.keys(value).length > 200
		)
			throw new Error("Invalid asset render configuration");
		return value;
	}
}
