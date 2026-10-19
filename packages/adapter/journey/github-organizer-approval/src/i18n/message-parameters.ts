export interface MessageParameters {
	"approval.content.planned": { time: string };
	"approval.content.slot": { index: number; status: string };
	"approval.content.title": {
		target: string;
		language: string;
		origin: string;
	};
	"approval.content.request": {
		approve: string;
		rejectMark: string;
		iterateMark: string;
	};
	"approval.content.text-choice": { mark: string };
	"approval.content.image-choice": { mark: string; index: number };
	"approval.content.final": {
		status: string;
		actor: string;
		decidedAt: string;
		image: string;
	};
	"approval.meetup.details": {
		title: string;
		date: string;
		startTime: string;
		endTime: string;
		timeZone: string;
		venue: string;
		city: string;
		url: string;
	};
	"approval.meetup.request": { approveMark: string; rejectMark: string };
	"approval.meetup.final": { status: string; actor: string; decidedAt: string };
	"follow-up.title": { date: string };
	"follow-up.instructions": Record<string, never>;
	"follow-up.task": { task: string };
	"follow-up.stopped": Record<string, never>;
	"follow-up.waiting": Record<string, never>;
	"follow-up.emails-complete": Record<string, never>;
	"approval.details.summary": Record<string, never>;
	"approval.details.email": { kind: string };
	"approval.details.purpose": { kind: string };
	"approval.details.link": { kind: string };
	"approval.details.feedback": { title: string };
	"approval.details.omitted-emails": { count: number };
	"approval.details.omitted-links": { count: number };
	"approval.final": {
		kind: string;
		date: string;
		count: number;
		status: string;
		actor: string;
		decidedAt: string;
	};
	"approval.request": {
		kind: string;
		date: string;
		count: number;
		approveMark: string;
		rejectMark: string;
	};
}
