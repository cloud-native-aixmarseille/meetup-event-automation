import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	ContentContractPolicy,
	type ContentRecovery,
} from "@meetup-automation/publication";

export type AssetContentConfigurationData = Readonly<{
	contracts: Readonly<Record<string, unknown>>;
	speakers: Readonly<Record<string, string>>;
	recovery: Readonly<Record<string, ContentRecovery>>;
}>;

export class AssetContentConfiguration {
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
				return { contracts: {}, speakers: {}, recovery: {} };
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
			events?: Record<
				string,
				{
					speakers?: Record<string, string>;
					recovery?: Record<string, ContentRecovery>;
				}
			>;
		};
		if (
			root?.version !== 1 ||
			!AssetContentConfiguration.record(root.contracts) ||
			!ContentContractPolicy.keys(root, ["version", "contracts", "events"]) ||
			(root.events !== undefined &&
				!AssetContentConfiguration.record(root.events))
		)
			throw new Error("Invalid asset content configuration");
		const event = root.events?.[eventId] ?? {};
		if (!ContentContractPolicy.keys(event, ["speakers", "recovery"]))
			throw new Error("Invalid asset event configuration");
		const speakers = event.speakers ?? {};
		const recovery = event.recovery ?? {};
		if (
			!AssetContentConfiguration.record(speakers) ||
			!AssetContentConfiguration.record(recovery) ||
			Object.entries(speakers).some(
				([key, id]) =>
					!ContentContractPolicy.name(key) || !/^speaker-[a-z0-9-]+$/.test(id),
			)
		)
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
		return { contracts: root.contracts, speakers, recovery };
	}

	private static record(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}
}
