import { isDeepStrictEqual } from "node:util";
import {
	ContentError,
	type ContentTextKey,
	type TextField,
} from "@meetup-automation/publication";

export interface StoredCollectionKeys {
	rekey(source: string, keys: ReadonlyMap<string, string>): string;
}

/** Upgrades saved date references without changing anchors or write evidence. */
export class DriveManifestDateFormats {
	constructor(
		private readonly textKeys: Pick<ContentTextKey, "of">,
		private readonly collections: StoredCollectionKeys,
	) {}

	decode(value: unknown): unknown {
		if (
			!this.record(value) ||
			value.version !== 1 ||
			!this.record(value.contract)
		)
			return value;
		const keys = new Map<string, string>();
		const contract = {
			...value.contract,
			fields: this.fields(value.contract.fields, keys),
		};
		return {
			...value,
			contract,
			bindings: this.bindings(value.bindings, keys),
			...(this.record(value.pending)
				? {
						pending: {
							...value.pending,
							bindings: this.bindings(value.pending.bindings, keys),
						},
					}
				: {}),
		};
	}

	private fields(value: unknown, keys: Map<string, string>): unknown {
		if (!Array.isArray(value) || value.length > 100) return value;
		const fields = value.map((field: unknown) => {
			if (!this.record(field)) return field;
			if (field.type !== "collection") return this.text(field, keys);
			if (!Array.isArray(field.fields) || field.fields.length > 100)
				return field;
			const members = new Map<string, string>();
			const fields = field.fields.map((item: unknown) =>
				this.record(item) ? this.text(item, members) : item,
			);
			return {
				...field,
				fields,
				template:
					members.size && typeof field.template === "string"
						? this.collections.rekey(field.template, members)
						: field.template,
			};
		});
		return fields.filter(
			(field, index) =>
				!this.record(field) ||
				field.type !== "text" ||
				!fields
					.slice(0, index)
					.some((prior) => isDeepStrictEqual(prior, field)),
		);
	}

	private text(
		field: Record<string, unknown>,
		keys: Map<string, string>,
	): unknown {
		if (field.type !== "text" || typeof field.token !== "string") return field;
		const dates: Record<string, Pick<TextField, "token" | "format">> = {
			"event.date.month": { token: "event.date", format: "month" },
			"event.date.numeric": { token: "event.date", format: "DD/MM/YYYY" },
			"event.date.weekday": { token: "event.date", format: "weekday" },
			"next_event.date.numeric": {
				token: "next_event.date",
				format: "DD/MM/YYYY",
			},
		};
		const date = Object.hasOwn(dates, field.token)
			? dates[field.token]
			: undefined;
		if (!date) return field;
		if (field.format !== undefined || field.slot !== undefined)
			throw new ContentError("recovery");
		keys.set(field.token, this.textKeys.of(date));
		return { ...field, ...date };
	}

	private bindings(value: unknown, keys: ReadonlyMap<string, string>): unknown {
		if (!Array.isArray(value)) return value;
		return value.map((binding: unknown) => {
			if (
				!this.record(binding) ||
				binding.type !== "text" ||
				typeof binding.key !== "string"
			)
				return binding;
			return { ...binding, key: keys.get(binding.key) ?? binding.key };
		});
	}

	private record(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}
}
