export interface KuttLink {
	readonly id: string;
	readonly address: string;
	readonly target: string;
	readonly link: string;
}

/** Validate the provider representation before a link can be updated. */
export class KuttLinkResponse {
	link(value: unknown): KuttLink {
		if (
			!this.object(value) ||
			typeof value.id !== "string" ||
			!value.id ||
			typeof value.address !== "string" ||
			!value.address ||
			typeof value.target !== "string" ||
			!value.target ||
			typeof value.link !== "string" ||
			!value.link
		)
			throw new Error("Invalid Kutt link response");
		return {
			id: value.id,
			address: value.address,
			target: value.target,
			link: value.link,
		};
	}

	page(value: unknown): { total: number; data: readonly KuttLink[] } {
		if (
			!this.object(value) ||
			!Array.isArray(value.data) ||
			typeof value.total !== "number" ||
			!Number.isSafeInteger(value.total) ||
			value.total < 0
		)
			throw new Error("Invalid Kutt link listing");
		return { total: value.total, data: value.data.map(this.link.bind(this)) };
	}

	private object(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}
}
