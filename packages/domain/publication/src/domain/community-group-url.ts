/** Canonical configured community/group URL; accepted legacy prefixes are not writable targets. */
export class CommunityGroupUrl {
	private constructor(
		readonly eventUrlPrefix: string,
		readonly origin: string,
		readonly community: string,
		readonly group: string,
	) {}

	static parse(value: unknown): CommunityGroupUrl | undefined {
		if (typeof value !== "string") return undefined;
		let url: URL;
		try {
			url = new URL(value);
		} catch {
			return undefined;
		}
		const match = /^\/([a-z0-9-]+)\/group\/([a-z0-9-]+)\/event\/$/.exec(
			url.pathname,
		);
		if (
			!match ||
			url.protocol !== "https:" ||
			url.username ||
			url.password ||
			value !== `${url.origin}${url.pathname}`
		)
			return undefined;
		return new CommunityGroupUrl(value, url.origin, match[1], match[2]);
	}
}
