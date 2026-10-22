import { SystemCommunicationClock } from "./system-communication-clock.js";
import { SystemEventClock } from "./system-event-clock.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class SystemClockComposition {
	systemCommunicationClock(): SystemCommunicationClock {
		return new SystemCommunicationClock(() => new Date());
	}
	systemEventClock(): SystemEventClock {
		return new SystemEventClock(() => new Date());
	}
}
