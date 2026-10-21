import {
	SystemCommunicationClock,
	type SystemCommunicationClockArguments,
} from "./system-communication-clock.js";
import {
	SystemEventClock,
	type SystemEventClockArguments,
} from "./system-event-clock.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class SystemClockComposition {
	systemCommunicationClock(
		...args: SystemCommunicationClockArguments
	): SystemCommunicationClock {
		return new SystemCommunicationClock(...args);
	}
	systemEventClock(...args: SystemEventClockArguments): SystemEventClock {
		return new SystemEventClock(...args);
	}
}
