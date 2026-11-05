import { createHash } from "node:crypto";
import type { AutomationStateScope } from "@meetup-automation/journey";

export const AUTOMATION_STATE_MARKER = "<!-- meetup-automation-state:v1 ";
export interface StoredAutomationState {
	readonly version: 1;
	readonly records: Record<AutomationStateScope, readonly string[]>;
	readonly imports: readonly { readonly id: number; readonly digest: string }[];
}

/** Own the aggregate envelope and recognize existing adapter-owned records. */
export class AutomationStateCodec {
	scope(body: string): AutomationStateScope | undefined {
		if (body.startsWith("<!-- meetup-content-proposal:v1 ")) return "content";
		if (body.startsWith("<!-- meetup-social-delivery:v1 ")) return "social";
		if (body.startsWith("<!-- meetup-publication:v1\n")) return "meetup";
		if (body.startsWith("<!-- community-publication:v1\n")) return "community";
		return undefined;
	}
	managed(body: string): boolean {
		return (
			body.startsWith(AUTOMATION_STATE_MARKER) || this.scope(body) !== undefined
		);
	}
	empty(): StoredAutomationState {
		return {
			version: 1,
			records: { content: [], social: [], meetup: [], community: [] },
			imports: [],
		};
	}
	digest(body: string): string {
		return createHash("sha256").update(body).digest("hex");
	}
	read(body: string): StoredAutomationState {
		const end = body.indexOf(" -->\n", AUTOMATION_STATE_MARKER.length);
		if (!body.startsWith(AUTOMATION_STATE_MARKER) || end < 0)
			throw new Error("Invalid automation state envelope");
		return this.validate(
			JSON.parse(body.slice(AUTOMATION_STATE_MARKER.length, end)),
		);
	}
	write(state: StoredAutomationState): string {
		const json = JSON.stringify(this.validate(state))
			.replaceAll("<", "\\u003c")
			.replaceAll(">", "\\u003e")
			.replaceAll("&", "\\u0026");
		return `${AUTOMATION_STATE_MARKER}${json} -->`;
	}
	private validate(value: unknown): StoredAutomationState {
		if (
			!this.object(value) ||
			value.version !== 1 ||
			!this.object(value.records) ||
			!Array.isArray(value.imports)
		)
			throw new Error("Invalid automation state envelope");
		this.fields(value, ["version", "records", "imports"]);
		this.fields(value.records, ["content", "social", "meetup", "community"]);
		const records = this.empty().records;
		for (const scope of Object.keys(records) as AutomationStateScope[]) {
			const entries = value.records[scope];
			if (
				!Array.isArray(entries) ||
				entries.some(
					(body) => typeof body !== "string" || this.scope(body) !== scope,
				)
			)
				throw new Error("Invalid automation state records");
			records[scope] = entries;
		}
		const imports = value.imports.map((entry: unknown) => {
			if (
				!this.object(entry) ||
				typeof entry.id !== "number" ||
				!Number.isSafeInteger(entry.id) ||
				entry.id <= 0 ||
				typeof entry.digest !== "string" ||
				!/^[a-f0-9]{64}$/.test(entry.digest)
			)
				throw new Error("Invalid automation state import");
			this.fields(entry, ["id", "digest"]);
			return { id: entry.id, digest: entry.digest };
		});
		if (new Set(imports.map((entry) => entry.id)).size !== imports.length)
			throw new Error("Duplicate automation state import");
		return { version: 1, records, imports };
	}
	private object(value: unknown): value is Record<string, unknown> {
		return typeof value === "object" && value !== null && !Array.isArray(value);
	}
	private fields(
		value: Record<string, unknown>,
		fields: readonly string[],
	): void {
		if (Object.keys(value).some((key) => !fields.includes(key)))
			throw new Error("Unsupported automation state field");
	}
}
