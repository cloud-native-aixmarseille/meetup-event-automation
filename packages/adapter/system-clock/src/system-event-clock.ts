import type { EventClock } from "@meetup-automation/event";
import type { DateFactory } from "./system-clock-contracts.js";

export class SystemEventClock implements EventClock {
	constructor(private readonly dateFactory: DateFactory = () => new Date()) {}
	now(): string {
		return this.dateFactory().toISOString();
	}
}
