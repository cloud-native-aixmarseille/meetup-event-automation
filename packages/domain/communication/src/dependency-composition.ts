import { AttentionEpisodes } from "./attention/attention-episodes.js";
import { AttentionPolicy } from "./attention/attention-policy.js";
import { AttentionStateEquality } from "./attention/attention-state-equality.js";
import { AttentionStateRules } from "./attention/attention-state-rules.js";
import { AttentionTaskSelection } from "./attention/attention-task-selection.js";
import { EvaluateAttention } from "./attention/evaluate-attention.js";
import {
	ReconcileAttention,
	type ReconcileAttentionArguments,
} from "./attention/reconcile-attention.js";
import { CommunicationCalendar } from "./communication-calendar.js";
import {
	CommunicationDispatcher,
	type CommunicationDispatcherArguments,
} from "./communication-dispatcher.js";
import { CommunicationPlanner } from "./communication-planner.js";
import { CommunicationResults } from "./communication-results.js";
import { CommunicationIdempotency } from "./idempotency.js";
import { MailBatchFingerprint } from "./mail-batch-fingerprint.js";
import { PlanCommunications } from "./plan-communications.js";
import { PostEventPolicy } from "./post-event-policy.js";
import {
	ReconcileCommunications,
	type ReconcileCommunicationsArguments,
} from "./reconcile-communications.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class CommunicationDomainComposition {
	attentionEpisodes(): AttentionEpisodes {
		return new AttentionEpisodes({ attentionPolicy: this.attentionPolicy() });
	}
	attentionPolicy(): AttentionPolicy {
		return new AttentionPolicy({
			communicationCalendar: this.communicationCalendar(),
		});
	}
	attentionStateEquality(): AttentionStateEquality {
		return new AttentionStateEquality();
	}
	attentionStateRules(): AttentionStateRules {
		return new AttentionStateRules();
	}
	attentionTaskSelection(): AttentionTaskSelection {
		return new AttentionTaskSelection();
	}
	communicationCalendar(): CommunicationCalendar {
		return new CommunicationCalendar();
	}
	communicationDispatcher(
		...args: CommunicationDispatcherArguments
	): CommunicationDispatcher {
		return new CommunicationDispatcher(
			{ communicationResults: this.communicationResults() },
			...args,
		);
	}
	communicationIdempotency(): CommunicationIdempotency {
		return new CommunicationIdempotency();
	}
	communicationPlanner(): CommunicationPlanner {
		return new CommunicationPlanner({
			communicationIdempotency: this.communicationIdempotency(),
		});
	}
	communicationResults(): CommunicationResults {
		return new CommunicationResults();
	}
	evaluateAttention(): EvaluateAttention {
		return new EvaluateAttention({
			attentionPolicy: this.attentionPolicy(),
			postEventPolicy: this.postEventPolicy(),
		});
	}
	mailBatchFingerprint(): MailBatchFingerprint {
		return new MailBatchFingerprint();
	}
	planCommunications(): PlanCommunications {
		return new PlanCommunications({
			communicationPlanner: this.communicationPlanner(),
			communicationCalendar: this.communicationCalendar(),
			postEventPolicy: this.postEventPolicy(),
		});
	}
	postEventPolicy(): PostEventPolicy {
		return new PostEventPolicy({
			communicationCalendar: this.communicationCalendar(),
		});
	}
	reconcileAttention(...args: ReconcileAttentionArguments): ReconcileAttention {
		return new ReconcileAttention(
			{
				attentionPolicy: this.attentionPolicy(),
				attentionEpisodes: this.attentionEpisodes(),
			},
			...args,
		);
	}
	reconcileCommunications(
		...args: ReconcileCommunicationsArguments
	): ReconcileCommunications {
		return new ReconcileCommunications(
			{
				communicationResults: this.communicationResults(),
				communicationCalendar: this.communicationCalendar(),
				createCommunicationDispatcher: (...args) =>
					this.communicationDispatcher(...args),
			},
			...args,
		);
	}
}
