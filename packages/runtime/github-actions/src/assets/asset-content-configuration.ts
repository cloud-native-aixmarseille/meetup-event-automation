import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	ContentContractPolicy,
	type ContentRecovery,
	type AssetRenderAssignments,
} from "@meetup-automation/publication";
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
			const fields = (contract as { fields?: unknown } | null)?.fields;
			return (
				Array.isArray(fields) &&
				fields.some(
					(field) =>
						typeof field?.token === "string" &&
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
			if ((error as NodeJS.ErrnoException).code === "ENOENT")
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

	static parse(input: unknown, eventId: string): AssetContentConfigurationData {
		const root = input as {
			version: number;
			contracts: Record<string, unknown>;
			venues?: unknown;
			hostLogos?: unknown;
			events?: Record<
				string,
				{
					speakers?: Record<string, string>;
					talks?: unknown;
					recovery?: Record<string, ContentRecovery>;
				}
			>;
		};
		if (
			root?.version !== 1 ||
			!AssetContentConfiguration.record(root.contracts) ||
			!ContentContractPolicy.keys(root, [
				"version",
				"contracts",
				"events",
				"venues",
				"hostLogos",
			]) ||
			(root.events !== undefined &&
				!AssetContentConfiguration.record(root.events))
		)
			throw new Error("Invalid asset content configuration");
		const event = root.events?.[eventId] ?? {};
		if (
			!AssetContentConfiguration.record(event) ||
			!ContentContractPolicy.keys(event, ["speakers", "talks", "recovery"])
		)
			throw new Error("Invalid asset event configuration");
		const assignments = AssetRenderConfiguration.parse(
			event,
			root.venues,
			root.hostLogos,
		);
		const recovery = event.recovery ?? {};
		if (!AssetContentConfiguration.record(recovery))
			throw new Error("Invalid asset speaker assignments");
		for (const [id, operation] of Object.entries(recovery)) {
			if (
				!ContentContractPolicy.name(id) ||
				!operation ||
				!["enroll", "restore", "remove"].includes(operation.operation) ||
				!ContentContractPolicy.text(operation.revision) ||
				(operation.operation !== "enroll" &&
					!ContentContractPolicy.name(operation.bindingId)) ||
				!ContentContractPolicy.keys(operation, [
					"operation",
					"revision",
					"bindingId",
				])
			)
				throw new Error("Invalid asset recovery operation");
		}
		return { contracts: root.contracts, ...assignments, recovery };
	}

	private static record(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}
}
