export interface MessageParameters {
	"request.community-publication": { date: string; url: string };
	"request.content": { date: string; target: string; url: string };
	"request.introduction": { date: string; count: number; url: string };
	"request.publication": { date: string; url: string };
}
