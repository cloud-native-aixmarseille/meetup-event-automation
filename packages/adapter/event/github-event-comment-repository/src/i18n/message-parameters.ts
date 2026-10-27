export interface MessageParameters {
	"comment.social.target": { destination: string; purpose: string };
	"comment.agenda.item": { item: number; speaker: string };
	"comment.agenda.speaker-suffix": { speaker: number };
	"comment.agenda.speaker": { speaker: number };
}
