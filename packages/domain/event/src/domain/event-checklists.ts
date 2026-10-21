import type {
	EventOperationalChecklists,
	OperationalChecklistItem,
} from "./model.js";

export class EventChecklists {
	equal(
		left: EventOperationalChecklists,
		right: EventOperationalChecklists,
	): boolean {
		return (
			this.itemsEqual(left.slidesAndContent, right.slidesAndContent) &&
			this.itemsEqual(left.communication, right.communication) &&
			this.itemsEqual(left.postEvent, right.postEvent)
		);
	}

	private itemsEqual(
		left: readonly OperationalChecklistItem[],
		right: readonly OperationalChecklistItem[],
	): boolean {
		return (
			left.length === right.length &&
			left.every(
				(item, index) =>
					item.name === right[index].name &&
					item.completed === right[index].completed,
			)
		);
	}
}
