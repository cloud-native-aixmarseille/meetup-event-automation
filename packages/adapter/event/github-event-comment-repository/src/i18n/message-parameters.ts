export interface MessageParameters {
	"comment.assets.content-file": { documentUrl: string };
	"comment.assets.content-slide": { documentUrl: string };
	"comment.assets.content-repair": { workflowUrl: string };
	"comment.unknown": { workflowUrl: string };
	"comment.guidance.meetup.prerequisites": { workflowUrl: string };
	"comment.guidance.meetup.slides-pdf-pending": { workflowUrl: string };
	"comment.assets.image-context": {
		kind: string;
		slot: string;
		documentUrl: string;
	};
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
