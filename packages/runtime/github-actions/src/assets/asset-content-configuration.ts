import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
	AssetRenderAssignments,
	ContentContractPolicy,
	ContentRecovery,
} from "@meetup-automation/publication";
import type { RuntimeInput } from "../runtime-input.js";
import type { AssetRenderConfiguration } from "./asset-render-configuration.js";

export type AssetContentConfigurationData = AssetRenderAssignments &
	Readonly<{
		contracts: Readonly<Record<string, unknown>>;
		speakers: Readonly<Record<string, string>>;
		recovery: Readonly<Record<string, ContentRecovery>>;
	}>;

export interface AssetContentConfigurationCollaborators {
	readonly runtimeInput: Pick<RuntimeInput, "isObject">;
	readonly contentContractPolicy: Pick<
		ContentContractPolicy,
		"keys" | "name" | "text"
	>;
	readonly assetRenderConfiguration: Pick<AssetRenderConfiguration, "parse">;
}

export class AssetContentConfiguration {
	constructor(
		private readonly collaborators: AssetContentConfigurationCollaborators,
	) {}

	usesNextEvent(contracts: Readonly<Record<string, unknown>>): boolean {
		return Object.values(contracts).some((contract) => {
			const fields = this.collaborators.runtimeInput.isObject(contract)
				? contract.fields
				: undefined;
			return (
				Array.isArray(fields) &&
				fields.some(
					(field: unknown) =>
						this.collaborators.runtimeInput.isObject(field) &&
						typeof field.token === "string" &&
						field.token.startsWith("next_event."),
				)
			);
		});
	}

	async load(
		root: string,
		eventId: string,
	): Promise<AssetContentConfigurationData> {
		let text: string;
		try {
			text = await readFile(
				join(root, ".github/meetup-asset-content.json"),
				"utf8",
			);
		} catch (error) {
			if (
				this.collaborators.runtimeInput.isObject(error) &&
				error.code === "ENOENT"
			)
				return {
					contracts: {},
					speakers: {},
					talks: {},
					venues: {},
					hostLogos: {},
					recovery: {},
				};
			throw error;
		}
		if (Buffer.byteLength(text) > 1_000_000)
			throw new Error("Asset content configuration is too large");
		return this.parse(JSON.parse(text), eventId);
	}

	parse(root: unknown, eventId: string): AssetContentConfigurationData {
		if (
			!this.collaborators.runtimeInput.isObject(root) ||
			root.version !== 1 ||
			!this.collaborators.runtimeInput.isObject(root.contracts) ||
			!this.collaborators.contentContractPolicy.keys(root, [
				"version",
				"contracts",
				"events",
				"venues",
				"hostLogos",
			]) ||
			(root.events !== undefined &&
				!this.collaborators.runtimeInput.isObject(root.events))
		)
			throw new Error("Invalid asset content configuration");
		const selected = this.collaborators.runtimeInput.isObject(root.events)
			? root.events[eventId]
			: undefined;
		const event = selected === undefined ? {} : selected;
		if (
			!this.collaborators.runtimeInput.isObject(event) ||
			!this.collaborators.contentContractPolicy.keys(event, [
				"speakers",
				"talks",
				"recovery",
			])
		)
			throw new Error("Invalid asset event configuration");
		const assignments = this.collaborators.assetRenderConfiguration.parse(
			event,
			root.venues,
			root.hostLogos,
		);
		const recovery = this.recovery(event.recovery);
		return { contracts: root.contracts, ...assignments, recovery };
	}

	private recovery(input: unknown): Readonly<Record<string, ContentRecovery>> {
		const value = input === undefined ? {} : input;
		if (!this.collaborators.runtimeInput.isObject(value))
			throw new Error("Invalid asset recovery operations");
		const result: Record<string, ContentRecovery> = {};
		for (const [id, operation] of Object.entries(value)) {
			if (
				!this.collaborators.contentContractPolicy.name(id) ||
				!this.collaborators.runtimeInput.isObject(operation) ||
				(operation.operation !== "enroll" &&
					operation.operation !== "restore" &&
					operation.operation !== "remove") ||
				!this.collaborators.contentContractPolicy.text(operation.revision) ||
				(operation.operation !== "enroll" &&
					!this.collaborators.contentContractPolicy.name(
						operation.bindingId,
					)) ||
				(operation.bindingId !== undefined &&
					!this.collaborators.contentContractPolicy.name(
						operation.bindingId,
					)) ||
				!this.collaborators.contentContractPolicy.keys(operation, [
					"operation",
					"revision",
					"bindingId",
				])
			)
				throw new Error("Invalid asset recovery operation");
			result[id] = {
				operation: operation.operation,
				revision: operation.revision,
				...(typeof operation.bindingId === "string"
					? { bindingId: operation.bindingId }
					: {}),
			};
		}
		return result;
	}
}
