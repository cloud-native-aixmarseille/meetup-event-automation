import type {
	ApprovalEmailDetail,
	ApprovalEmailLink,
	OrganizerApprovalDetails,
} from "@meetup-automation/journey";
import type { ApprovalMessages } from "./i18n/approval-messages.js";

export class ApprovalDetailsPresenter {
	constructor(
		private readonly parameters: import("./email-parameters-preview.js").EmailParametersPreview,
		private readonly messages: ApprovalMessages,
	) {}

	render(details: OrganizerApprovalDetails): string {
		const lines = [
			"<details>",
			`<summary>${this.escape(this.messages.t("approval.details.summary", {}))}</summary>`,
			"",
			...(details.parameters
				? [
						this.messages.t("approval.parameters.instructions", {}),
						"",
						this.parameters.render(details.parameters),
						"",
					]
				: []),
			...details.emails.map((email) =>
				this.email(
					details.parameters
						? {
								...email,
								links: email.links.filter((link) => link.kind === "feedback"),
							}
						: email,
					details.parameters,
				),
			),
		];
		if (details.omittedEmails > 0)
			lines.push(
				`<p>${this.escape(this.messages.t("approval.details.omitted-emails", { count: details.omittedEmails }))}</p>`,
			);
		return [...lines, "", "</details>"].join("\n");
	}

	private email(
		email: ApprovalEmailDetail,
		parameters: OrganizerApprovalDetails["parameters"],
	): string {
		const heading = this.messages.t("approval.details.email", {
			kind: email.kind.replaceAll("-", "_"),
		});
		const name = email.recipientName
			? `: ${this.escape(email.recipientName)}`
			: "";
		const lines = [`<p><strong>${this.escape(heading)}${name}</strong></p>`];
		if (email.message) {
			const message = email.message;
			const placeholders = { ...message.placeholders };
			for (const key of message.parameterKeys)
				if (parameters?.[key] !== undefined)
					placeholders[key] = parameters[key];
			const payload = {
				"idempotency-key": message.idempotencyKey,
				"template-name": message.templateName,
				"to-email": message.recipientEmail,
				placeholders,
			};
			return [
				...lines,
				`<pre>${this.escape(JSON.stringify(payload, null, 2))}</pre>`,
			].join("\n");
		}
		lines.push(
			`<p>${this.escape(this.messages.t("approval.details.purpose", { kind: email.kind.replaceAll("-", "_") }))}</p>`,
		);
		if (email.links.length)
			lines.push(
				"<ul>",
				...email.links.map((link) => `<li>${this.link(link)}</li>`),
				"</ul>",
			);
		if (email.omittedLinks > 0)
			lines.push(
				`<p>${this.escape(this.messages.t("approval.details.omitted-links", { count: email.omittedLinks }))}</p>`,
			);
		return lines.join("\n");
	}

	private link(link: ApprovalEmailLink): string {
		const label =
			link.kind === "feedback"
				? this.messages.t("approval.details.feedback", {
						title: link.title ?? "",
					})
				: this.messages.t("approval.details.link", { kind: link.kind });
		return `<a href="${this.escape(link.url)}">${this.escape(label)}</a>`;
	}

	private escape(value: string): string {
		return value
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replaceAll('"', "&quot;")
			.replaceAll("'", "&#39;")
			.replaceAll("@", "&#64;");
	}
}
export type ApprovalDetailsPresenterArguments = [messages: ApprovalMessages];
