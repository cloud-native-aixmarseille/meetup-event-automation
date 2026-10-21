import type {
	EventOperationalChecklists,
	OperationalChecklistItem,
} from "./model.js";

export class EventChecklists {
	static equal(
		left: EventOperationalChecklists,
		right: EventOperationalChecklists,
	): boolean {
		return (
			EventChecklists.itemsEqual(
				left.slidesAndContent,
				right.slidesAndContent,
			) &&
			EventChecklists.itemsEqual(left.communication, right.communication) &&
			EventChecklists.itemsEqual(left.postEvent, right.postEvent)
		);
	}

	private static itemsEqual(
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
