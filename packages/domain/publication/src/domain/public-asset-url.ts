/** Eligibility for URLs projected into public assets; retrieval validates network destinations separately. */
export class PublicAssetUrl {
	valid(value?: string): value is string {
		if (!value) return false;
		try {
			const url = new URL(value);
			return (
				url.protocol === "https:" &&
				!url.username &&
				!url.password &&
				![...url.searchParams.keys()].some((key) =>
					/token|signature|credential|secret|key|auth/i.test(key),
				)
			);
		} catch {
			return false;
		}
	}
}
