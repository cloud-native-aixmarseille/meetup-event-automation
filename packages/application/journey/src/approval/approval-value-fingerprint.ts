import type { ContentFingerprint } from "@meetup-automation/publication";

/** Canonical review values have stable identity independent of a draft's editorial owner. */
export class ApprovalValueFingerprint {
	constructor(private readonly hash: Pick<ContentFingerprint, "of">) {}
	digest(value: unknown): string {
		return this.hash.of(JSON.stringify(this.canonical(value)));
	}
	private canonical(value: unknown): unknown {
		if (value === undefined) return null;
		if (Array.isArray(value)) return value.map((item) => this.canonical(item));
		if (value && typeof value === "object")
			return Object.fromEntries(
				Object.entries(value)
					.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
					.map(([key, item]) => [key, this.canonical(item)]),
			);
		return value;
	}
}
