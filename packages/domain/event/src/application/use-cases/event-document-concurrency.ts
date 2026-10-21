import type { EventIdentity } from "../../domain/model.js";
import type {
	EventDocument,
	EventRepository,
} from "../ports/event-repository.js";
import { EventConcurrentModificationError } from "./event-concurrent-modification-error.js";
import { EventNotFoundError } from "./event-not-found-error.js";

export class EventDocumentConcurrency {
	async ensureEventDocumentIsCurrent(
		repository: EventRepository,
		identity: EventIdentity,
		expected: EventDocument,
	): Promise<void> {
		const current = await repository.find(identity);
		if (!current) {
			throw new EventNotFoundError(identity);
		}
		if (!this.eventDocumentsEqual(current, expected)) {
			throw new EventConcurrentModificationError(identity);
		}
	}
	eventDocumentsEqual(left: EventDocument, right: EventDocument): boolean {
		const leftLabels = [...left.labels].sort(this.compareText.bind(this));
		const rightLabels = [...right.labels].sort(this.compareText.bind(this));
		return (
			this.sameIdentity(left.identity, right.identity) &&
			left.issueState === right.issueState &&
			left.issueTitle === right.issueTitle &&
			left.body === right.body &&
			leftLabels.length === rightLabels.length &&
			leftLabels.every((label, index) => label === rightLabels[index])
		);
	}
	private compareText(left: string, right: string): number {
		return left < right ? -1 : left > right ? 1 : 0;
	}
	sameIdentity(left: EventIdentity, right: EventIdentity): boolean {
		return (
			left.issueNumber === right.issueNumber &&
			left.repository.toLowerCase() === right.repository.toLowerCase()
		);
	}
}
