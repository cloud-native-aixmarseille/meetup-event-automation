export interface MessageParameters {
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
	"approval.slack": { kind: string; date: string; count: number; url: string };
}
