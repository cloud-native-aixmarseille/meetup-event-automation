import type { ApprovalPresenter } from "./approval-presenter.js";
import type { ApprovalDecision, StoredApproval } from "./approval-state.js";
import type { EmailParametersPreview } from "./email-parameters-preview.js";

export class EmailApprovalDecisionParser {
	constructor(private readonly parameters: EmailParametersPreview) {}

	parse(
		record: StoredApproval,
		body: string,
		presenters: readonly Pick<ApprovalPresenter, "issue">[],
	): ApprovalDecision {
		const original = record.emailDraft ?? record.details?.parameters;
		if (!original) return { status: "pending" };
		try {
			const edited = this.parameters.read(body, original);
			const restored = this.parameters.restore(
				body.replace(/- \[X\]/g, "- [x]"),
				original,
			);
			for (const status of ["pending", "approved", "rejected"] as const) {
				if (
					presenters.some(
						(presenter) => presenter.issue(record, { status }) === restored,
					)
				)
					return {
						status,
						...(status === "approved" ||
						(status === "pending" &&
							Object.entries(original).some(
								([key, value]) => edited[key] !== value,
							))
							? { emailParameters: edited }
							: {}),
					};
			}
		} catch {
			return { status: "pending", invalidEmailParameters: true };
		}
		return { status: "pending", invalidEmailParameters: true };
	}
}
