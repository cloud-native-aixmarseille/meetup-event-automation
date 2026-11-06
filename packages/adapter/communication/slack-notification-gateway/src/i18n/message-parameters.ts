export interface MessageParameters {
	"request.meetup-slides": { date: string; url: string };
	"request.social-publication": { date: string; target: string; url: string };
	"request.community-publication": { date: string; url: string };
	"request.content": { date: string; target: string; url: string };
	"request.introduction": {
		date: string;
		count: number;
		url: string;
		kind: string;
	};
	"request.publication": { date: string; url: string };
}
