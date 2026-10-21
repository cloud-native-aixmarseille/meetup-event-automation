export interface AutomationConfig {
	readonly timezone: string;
	readonly event: Readonly<{
		"issue-label": string;
		"issue-form": string;
		"occurrence-status-field": string;
		"required-confirmation-labels": readonly [host: string, speakers: string];
	}>;
	readonly referentials: Readonly<{ hosts: string; speakers: string }>;
	readonly communication: Readonly<{
		"mailings-repository": string;
		"dispatch-enabled": boolean;
		"policy-version": number;
	}>;
}

export class AutomationConfigFactory {
	/** Fixed workflow conventions; caller-owned publication URLs are injected separately. */
	createAutomationConfig(repositoryOwner?: string): AutomationConfig {
		return {
			timezone: "Europe/Paris",
			event: {
				"issue-label": "meetup",
				"issue-form": ".github/ISSUE_TEMPLATE/meetup.yml",
				"occurrence-status-field": "event_status",
				"required-confirmation-labels": [
					"hoster:confirmed",
					"speakers:confirmed",
				],
			},
			referentials: {
				hosts: "referentials/hosting.csv",
				speakers: "referentials/speakers.csv",
			},
			communication: {
				"mailings-repository": repositoryOwner
					? `${repositoryOwner}/mailings`
					: "",
				"dispatch-enabled": Boolean(repositoryOwner),
				"policy-version": 1,
			},
		};
	}
}
