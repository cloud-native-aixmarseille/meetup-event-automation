import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	type AssetRenderAssignments,
	ContentContractPolicy,
	type ContentRecovery,
} from "@meetup-automation/publication";
import { RuntimeInput } from "../runtime-input.js";
import { AssetRenderConfiguration } from "./asset-render-configuration.js";

export type AssetContentConfigurationData = AssetRenderAssignments &
	Readonly<{
		contracts: Readonly<Record<string, unknown>>;
		speakers: Readonly<Record<string, string>>;
		recovery: Readonly<Record<string, ContentRecovery>>;
	}>;

export class AssetContentConfiguration {
	static usesNextEvent(contracts: Readonly<Record<string, unknown>>): boolean {
		return Object.values(contracts).some((contract) => {
			const fields = RuntimeInput.isObject(contract)
				? contract.fields
				: undefined;
			return (
				Array.isArray(fields) &&
				fields.some(
					(field: unknown) =>
						RuntimeInput.isObject(field) &&
						typeof field.token === "string" &&
						field.token.startsWith("next_event."),
				)
			);
		});
	}

	static async load(
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
			if (RuntimeInput.isObject(error) && error.code === "ENOENT")
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
		return AssetContentConfiguration.parse(JSON.parse(text), eventId);
	}

	static parse(root: unknown, eventId: string): AssetContentConfigurationData {
		if (
			!RuntimeInput.isObject(root) ||
			root.version !== 1 ||
			!RuntimeInput.isObject(root.contracts) ||
			!ContentContractPolicy.keys(root, [
				"version",
				"contracts",
				"events",
				"venues",
				"hostLogos",
			]) ||
			(root.events !== undefined && !RuntimeInput.isObject(root.events))
		)
			throw new Error("Invalid asset content configuration");
		const selected = RuntimeInput.isObject(root.events)
			? root.events[eventId]
			: undefined;
		const event = selected === undefined ? {} : selected;
		if (
			!RuntimeInput.isObject(event) ||
			!ContentContractPolicy.keys(event, ["speakers", "talks", "recovery"])
		)
			throw new Error("Invalid asset event configuration");
		const assignments = AssetRenderConfiguration.parse(
			event,
			root.venues,
			root.hostLogos,
		);
		const recovery = AssetContentConfiguration.recovery(event.recovery);
		return { contracts: root.contracts, ...assignments, recovery };
	}

	private static recovery(
		input: unknown,
	): Readonly<Record<string, ContentRecovery>> {
		const value = input === undefined ? {} : input;
		if (!RuntimeInput.isObject(value))
			throw new Error("Invalid asset recovery operations");
		const result: Record<string, ContentRecovery> = {};
		for (const [id, operation] of Object.entries(value)) {
			if (
				!ContentContractPolicy.name(id) ||
				!RuntimeInput.isObject(operation) ||
				(operation.operation !== "enroll" &&
					operation.operation !== "restore" &&
					operation.operation !== "remove") ||
				!ContentContractPolicy.text(operation.revision) ||
				(operation.operation !== "enroll" &&
					!ContentContractPolicy.name(operation.bindingId)) ||
				(operation.bindingId !== undefined &&
					!ContentContractPolicy.name(operation.bindingId)) ||
				!ContentContractPolicy.keys(operation, [
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
