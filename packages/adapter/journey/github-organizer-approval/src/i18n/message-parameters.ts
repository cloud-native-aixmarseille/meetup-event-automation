export interface MessageParameters {
	"approval.content.image-label": { index: number };
	"approval.social.after-approval": Record<string, never>;
	"approval.social.details": {
		target: string;
		destination: string;
		identity: string;
		plannedAt: string;
		expiresAt: string;
	};
	"approval.social.request": { approveMark: string; rejectMark: string };
	"approval.social.evidence": { outcome: string; reference: string };
	"approval.social.recovery": {
		approveMark: string;
		rejectMark: string;
		outcome: string;
	};
	"approval.social.final": { status: string; actor: string; decidedAt: string };
	"approval.content.planned": { time: string };
	"approval.content.slot": { index: number; status: string };
	"approval.content.title": {
		target: string;
	};
	"approval.content.request": {
		target: string;
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
		image: number;
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
	"approval.community.details": {
		title: string;
		date: string;
		startTime: string;
		endTime: string;
		timeZone: string;
		venue: string;
		city: string;
		url: string;
	};
	"approval.community.request": { approveMark: string; rejectMark: string };
	"approval.community.final": {
		status: string;
		actor: string;
		decidedAt: string;
	};
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
