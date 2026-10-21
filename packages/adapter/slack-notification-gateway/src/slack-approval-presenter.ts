import type { ApprovalNotificationRequest } from "@meetup-automation/journey";

type ApprovalKind = ApprovalNotificationRequest["kind"];
export type SlackApprovalRequests = {
	readonly [Kind in ApprovalKind]: Extract<
		ApprovalNotificationRequest,
		{ kind: Kind }
	>;
};
export type SlackApprovalRenderers = {
	readonly [Kind in ApprovalKind]: {
		render(request: SlackApprovalRequests[Kind]): string;
	};
};

/** Dispatches to the explicitly composed renderer for each supported kind. */
export class SlackApprovalPresenter {
	constructor(private readonly renderers: SlackApprovalRenderers) {}
	render<Kind extends ApprovalKind>(
		request: SlackApprovalRequests[Kind],
	): string {
		return this.renderers[request.kind].render(request);
	}
}
