import { DEFAULT_PUBLICATION_URL_CONFIGURATION } from "@meetup-automation/publication";

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
		"readiness-window-days": number;
		"mailings-repository": string;
		"slack-enabled": boolean;
		"approval-label": string;
		"dispatch-enabled": boolean;
		"policy-version": number;
	}>;
	readonly publication: Readonly<{
		"meetup-event-url-prefix": string;
		"cncf-event-url-prefix": string;
	}>;
}

export class AutomationConfigFactory {
	/**
	 * Automation behavior is owned and versioned by this repository. Consumer
	 * repositories do not provide a runtime configuration file anymore.
	 */
	static createAutomationConfig(): AutomationConfig {
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
				"readiness-window-days": 7,
				"mailings-repository": "cloud-native-aixmarseille/mailings",
				"slack-enabled": true,
				"approval-label": "communication:approved",
				"dispatch-enabled": true,
				"policy-version": 1,
			},
			publication: {
				"meetup-event-url-prefix":
					DEFAULT_PUBLICATION_URL_CONFIGURATION.meetupEventUrlPrefix,
				"cncf-event-url-prefix":
					DEFAULT_PUBLICATION_URL_CONFIGURATION.communityEventUrlPrefixes[0],
			},
		};
	}
}
