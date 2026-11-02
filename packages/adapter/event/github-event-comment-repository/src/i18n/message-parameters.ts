export interface MessageParameters {
	"comment.guidance.meetup.uncertain": {
		eventUrl: string;
		workflowUrl: string;
	};
	"comment.guidance.meetup.uncertain-missing-link": { workflowUrl: string };
	"comment.social.target": { destination: string; purpose: string };
	"comment.agenda.item": { item: number; speaker: string };
	"comment.agenda.speaker-suffix": { speaker: number };
	"comment.agenda.speaker": { speaker: number };
}
