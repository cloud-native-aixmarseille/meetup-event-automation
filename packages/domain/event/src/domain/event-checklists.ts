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
		const leftItems = this.ordered(left);
		const rightItems = this.ordered(right);
		return (
			left.length === right.length &&
			leftItems.every(
				(item, index) =>
					item.name === rightItems[index].name &&
					item.completed === rightItems[index].completed,
			)
		);
	}

	/** Section rendering can reorder tasks; names, state and multiplicity must survive. */
	private ordered(
		items: readonly OperationalChecklistItem[],
	): OperationalChecklistItem[] {
		return [...items].sort((left, right) =>
			left.name === right.name
				? Number(left.completed) - Number(right.completed)
				: left.name < right.name
					? -1
					: 1,
		);
	}
}
