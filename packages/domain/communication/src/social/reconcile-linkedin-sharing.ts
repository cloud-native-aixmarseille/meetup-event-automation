import type { CommunicationClock } from "../ports.js";
import type {
	LinkedInPostReference,
	LinkedInPostReferenceValue,
} from "./linkedin-post-reference.js";
import type {
	LinkedInSharingJournal,
	LinkedInSharingNotification,
} from "./linkedin-sharing-ports.js";

export class ReconcileLinkedInSharing {
	constructor(
		private readonly references: Pick<LinkedInPostReference, "read">,
		private readonly journal: LinkedInSharingJournal,
		private readonly notification: LinkedInSharingNotification,
		private readonly clock: CommunicationClock,
	) {}

	async execute(urls: readonly string[], beforeSend: () => Promise<void>) {
		const posts = new Map<string, LinkedInPostReferenceValue>();
		for (const url of urls) {
			const post = this.references.read(url);
			if (post) posts.set(post.id, post);
		}
		let notificationFailed = false;
		for (const post of posts.values()) {
			try {
				if (!(await this.share(post, beforeSend))) notificationFailed = true;
			} catch {
				notificationFailed = true;
			}
		}
		return { notificationFailed };
	}

	private async share(
		post: LinkedInPostReferenceValue,
		beforeSend: () => Promise<void>,
	): Promise<boolean> {
		const previous = await this.journal.load(post.id);
		if (previous?.status === "sent") return true;
		if (previous?.status === "pending" || (previous?.attempts ?? 0) >= 10)
			return false;
		const now = this.clock.now();
		if (previous?.retryAt && Date.parse(previous.retryAt) > now.getTime())
			return false;
		await beforeSend();
		const reserved = {
			...post,
			status: "pending" as const,
			attempts: (previous?.attempts ?? 0) + 1,
			reservedAt: now.toISOString(),
		};
		await this.journal.save(previous, reserved);
		try {
			await beforeSend();
		} catch {
			await this.journal.save(reserved, {
				...reserved,
				status: "retry",
				retryAt: now.toISOString(),
			});
			return false;
		}
		const { result, retryAfterSeconds } = await this.notification.send(
			post.url,
		);
		if (result.outcome === "uncertain") return false;
		const accepted = result.outcome === "accepted";
		await this.journal.save(reserved, {
			...reserved,
			status: accepted ? "sent" : "retry",
			...(accepted
				? {}
				: {
						retryAt: new Date(
							now.getTime() + Math.max(300, retryAfterSeconds ?? 300) * 1000,
						).toISOString(),
					}),
		});
		return accepted;
	}
}
