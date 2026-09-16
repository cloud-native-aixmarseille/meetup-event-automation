import type { CommunicationClock } from "@meetup-automation/communication";
import type { DateFactory } from "./system-clock-contracts.js";

export class SystemCommunicationClock implements CommunicationClock {
	constructor(private readonly dateFactory: DateFactory = () => new Date()) {}
	now(): Date {
		return this.dateFactory();
	}
}
