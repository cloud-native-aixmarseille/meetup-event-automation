export interface MessageParameters {
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
