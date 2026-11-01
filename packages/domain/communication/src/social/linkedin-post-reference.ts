export interface LinkedInPostReferenceValue {
	readonly id: string;
	readonly url: string;
}

export class LinkedInPostReference {
	read(value: string): LinkedInPostReferenceValue | undefined {
		if (value.length > 2000 || /[\s<>|]/.test(value)) return undefined;
		try {
			const url = new URL(value);
			if (
				url.protocol !== "https:" ||
				!["www.linkedin.com", "linkedin.com"].includes(url.hostname) ||
				url.username ||
				url.password ||
				url.port
			)
				return undefined;
			const path = decodeURIComponent(url.pathname);
			const urn =
				/^\/feed\/update\/(urn:li:(?:ugcPost|share|activity):[1-9]\d{0,29})\/?$/.exec(
					path,
				)?.[1];
			const activity =
				/^\/posts\/[^/]+-activity-([1-9]\d{0,29})-[^/]+\/?$/.exec(path)?.[1];
			const id = urn ?? (activity ? `urn:li:activity:${activity}` : undefined);
			return id
				? { id, url: `https://www.linkedin.com/feed/update/${id}/` }
				: undefined;
		} catch {
			return undefined;
		}
	}
}
