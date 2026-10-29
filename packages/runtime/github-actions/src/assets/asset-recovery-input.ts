import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
	ContentContractPolicy,
	ContentRecovery,
} from "@meetup-automation/publication";
import type { RuntimeInput } from "../runtime-input.js";

export class AssetRecoveryInput {
	constructor(
		private readonly collaborators: {
			runtimeInput: Pick<RuntimeInput, "isObject">;
			contentContractPolicy: Pick<
				ContentContractPolicy,
				"keys" | "name" | "text"
			>;
		},
	) {}
	async load(
		root: string,
		eventId: string,
	): Promise<Readonly<Record<string, ContentRecovery>>> {
		let text: string;
		try {
			text = await readFile(
				join(root, ".github/meetup-asset-recovery.json"),
				"utf8",
			);
		} catch (error) {
			if (
				this.collaborators.runtimeInput.isObject(error) &&
				error.code === "ENOENT"
			)
				return {};
			throw error;
		}
		if (Buffer.byteLength(text) > 1_000_000)
			throw new Error("Asset recovery input is too large");
		return this.parse(JSON.parse(text), eventId);
	}
	parse(
		root: unknown,
		eventId: string,
	): Readonly<Record<string, ContentRecovery>> {
		if (
			!this.collaborators.runtimeInput.isObject(root) ||
			root.version !== 1 ||
			!this.collaborators.runtimeInput.isObject(root.events) ||
			!this.collaborators.contentContractPolicy.keys(root, [
				"version",
				"events",
			])
		)
			throw new Error("Invalid asset recovery input");
		return this.recovery(root.events[eventId]);
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
