import type {
	ApprovalEmailDetail,
	ApprovalEmailLink,
	OrganizerApprovalDetails,
} from "@meetup-automation/journey";
import type { ApprovalMessages } from "./i18n/approval-messages.js";

export class ApprovalDetailsPresenter {
	constructor(private readonly messages: ApprovalMessages) {}

	render(details: OrganizerApprovalDetails): string {
		const lines = [
			"<details>",
			`<summary>${ApprovalDetailsPresenter.escape(this.messages.t("approval.details.summary", {}))}</summary>`,
			"",
			...details.emails.map((email) => this.email(email)),
		];
		if (details.omittedEmails > 0)
			lines.push(
				`<p>${ApprovalDetailsPresenter.escape(this.messages.t("approval.details.omitted-emails", { count: details.omittedEmails }))}</p>`,
			);
		return [...lines, "", "</details>"].join("\n");
	}

	private email(email: ApprovalEmailDetail): string {
		const heading = this.messages.t("approval.details.email", {
			kind: email.kind.replaceAll("-", "_"),
		});
		const name = email.recipientName
			? `: ${ApprovalDetailsPresenter.escape(email.recipientName)}`
			: "";
		const lines = [
			`<p><strong>${ApprovalDetailsPresenter.escape(heading)}${name}</strong></p>`,
			`<p>${ApprovalDetailsPresenter.escape(this.messages.t("approval.details.purpose", { kind: email.kind.replaceAll("-", "_") }))}</p>`,
		];
		if (email.links.length)
			lines.push(
				"<ul>",
				...email.links.map((link) => `<li>${this.link(link)}</li>`),
				"</ul>",
			);
		if (email.omittedLinks > 0)
			lines.push(
				`<p>${ApprovalDetailsPresenter.escape(this.messages.t("approval.details.omitted-links", { count: email.omittedLinks }))}</p>`,
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
		return `<a href="${ApprovalDetailsPresenter.escape(link.url)}">${ApprovalDetailsPresenter.escape(label)}</a>`;
	}

	private static escape(value: string): string {
		return value
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replaceAll('"', "&quot;")
			.replaceAll("'", "&#39;")
			.replaceAll("@", "&#64;");
	}
}
