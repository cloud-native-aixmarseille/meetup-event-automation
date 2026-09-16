export class EventPaginationError extends Error {
	constructor(cursor: string) {
		super(`Event repository repeated pagination cursor "${cursor}"`);
		this.name = "EventPaginationError";
	}
}
