import type {
	MeetupEvent,
	ReconcileEventDependencies,
} from "@meetup-automation/event";
import type { ManualPublicationTask } from "@meetup-automation/publication";
import type { ReferentialRepository } from "@meetup-automation/referential";
import type { AutomationConfig } from "../config/automation-config.js";
import type { PublicDiagnostic } from "../result/result-envelope.js";

export interface ManageMeetupEventDependencies {
	readonly config: AutomationConfig;
	readonly referentialRepository: ReferentialRepository;
	readonly eventDependencies: ReconcileEventDependencies;
}

export type ManageMeetupEventResult =
	| {
			skipped: true;
			diagnostics: readonly PublicDiagnostic[];
	  }
	| {
			skipped: false;
			event: MeetupEvent;
			state: string;
			isReady: boolean;
			manualPublicationTasks: readonly ManualPublicationTask[];
			persisted: boolean;
			commentUpdated: boolean;
			diagnostics: readonly PublicDiagnostic[];
	  };
