import type { SocialDestination } from "./social-destination.js";
import type { SocialPostReceipt } from "./social-publication-ports.js";

export class SocialRecoveryReference {
	receipt(
		destination: SocialDestination,
		reference: string,
	): SocialPostReceipt {
		const url = this.url(reference);
		if (
			url.protocol !== "https:" ||
			url.username ||
			url.password ||
			url.port ||
			url.search ||
			url.hash
		)
			throw new Error("Invalid social recovery reference");
		if (destination.provider === "slack") {
			const match =
				/^\/archives\/([CG][A-Z0-9]+)\/p([1-9]\d{9,15})(\d{6})\/?$/.exec(
					url.pathname,
				);
			if (
				!/^[a-z\d][a-z\d-]*\.slack\.com$/.test(url.hostname) ||
				!match ||
				match[1] !== destination.channelId
			)
				throw new Error("Recovery reference does not match Slack destination");
			return {
				provider: "slack",
				workspaceId: destination.workspaceId,
				channelId: destination.channelId,
				ts: `${match[2]}.${match[3]}`,
				url: reference,
			};
		}
		const path = decodeURIComponent(url.pathname);
		const urn =
			/^\/feed\/update\/(urn:li:(?:ugcPost|share|activity):[1-9]\d{0,29})\/?$/.exec(
				path,
			)?.[1];
		const activity = /^\/posts\/[^/]+-activity-([1-9]\d{0,29})-[^/]+\/?$/.exec(
			path,
		)?.[1];
		if (url.hostname !== "www.linkedin.com" || (!urn && !activity))
			throw new Error("Invalid LinkedIn recovery reference");
		return {
			provider: "linkedin",
			organizationUrn: destination.organizationUrn,
			postUrn: urn ?? `urn:li:activity:${activity}`,
			url: reference,
		};
	}
	evidence(reference: string): void {
		const url = this.url(reference);
		if (
			url.protocol !== "https:" ||
			url.hostname !== "github.com" ||
			url.username ||
			url.password ||
			url.search ||
			url.port ||
			!/^\/[a-z\d-]+\/[a-z\d_.-]+\/issues\/[1-9]\d*$/i.test(url.pathname) ||
			!/^#issuecomment-[1-9]\d*$/.test(url.hash)
		)
			throw new Error(
				"Non-publication recovery requires an organizer evidence comment URL",
			);
	}

	private url(reference: string): URL {
		if (!reference || reference.length > 2000 || /[\s<>]/.test(reference))
			throw new Error("Invalid social recovery reference");
		return new URL(reference);
	}
}
