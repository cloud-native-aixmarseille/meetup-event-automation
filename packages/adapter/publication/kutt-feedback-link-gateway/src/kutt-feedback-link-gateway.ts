import type {
	FeedbackLinkGateway,
	FeedbackPolicy,
} from "@meetup-automation/publication";

import type { KuttLink, KuttLinkResponse } from "./kutt-link-response.js";

export interface KuttFeedbackLinkGatewayCollaborators {
	readonly feedbackPolicy: Pick<FeedbackPolicy, "pollUrl">;
	readonly kuttLinkResponse: Pick<KuttLinkResponse, "link" | "page">;
}

export class KuttFeedbackLinkGateway implements FeedbackLinkGateway {
	private readonly baseUrl: string;

	constructor(
		private readonly collaborators: KuttFeedbackLinkGatewayCollaborators,
		private readonly apiKey: string,
		private readonly linkId: string,
		baseUrl: string,
		private readonly fetcher: typeof fetch,
	) {
		if (!apiKey.trim() || !/^[a-zA-Z0-9_-]+$/.test(linkId))
			throw new Error("Kutt API key and existing link ID are required");
		this.baseUrl = this.normalizeBaseUrl(baseUrl);
	}

	private normalizeBaseUrl(value: string): string {
		let url: URL;
		const message =
			"Kutt base URL must be an absolute HTTPS URL without credentials, query, or fragment";
		try {
			url = new URL(value);
		} catch {
			throw new Error(message);
		}
		if (
			url.protocol !== "https:" ||
			url.username ||
			url.password ||
			url.search ||
			url.hash
		)
			throw new Error(message);
		return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
	}

	async updateTarget(value: string): Promise<boolean> {
		const target = this.collaborators.feedbackPolicy.pollUrl(value);
		const link = await this.findLink();
		if (link.target === target) return false;
		const response = this.collaborators.kuttLinkResponse.link(
			await this.request(`/links/${encodeURIComponent(this.linkId)}`, {
				method: "PATCH",
				body: JSON.stringify({ target, address: link.address }),
			}),
		);
		if (
			response.id !== link.id ||
			response.address !== link.address ||
			response.target !== target ||
			response.link !== link.link
		)
			throw new Error("Kutt returned an unexpected updated link");
		return true;
	}

	private async findLink(): Promise<KuttLink> {
		// Kutt v2 has no GET /links/{id}. Walk the owner's paginated list.
		for (let skip = 0; skip < 100_000; skip += 100) {
			const page = this.collaborators.kuttLinkResponse.page(
				await this.request(`/links?limit=100&skip=${skip}`, {}),
			);
			const link = page.data.find((item) => item.id === this.linkId);
			if (link) return link;
			if (skip + page.data.length >= page.total) break;
			if (page.data.length !== 100)
				throw new Error("Incomplete Kutt link listing");
		}
		throw new Error("The configured Kutt link was not found");
	}

	private async request(path: string, init: RequestInit): Promise<unknown> {
		let response: Response;
		try {
			response = await this.fetcher(`${this.baseUrl}/api/v2${path}`, {
				...init,
				redirect: "error",
				signal: AbortSignal.timeout(30_000),
				headers: {
					"X-API-KEY": this.apiKey,
					"Content-Type": "application/json",
				},
			});
		} catch {
			throw new Error("Kutt request failed");
		}
		if (!response.ok)
			throw new Error(`Kutt request failed (HTTP ${response.status})`);
		try {
			return await response.json();
		} catch {
			throw new Error("Invalid Kutt JSON response");
		}
	}
}
