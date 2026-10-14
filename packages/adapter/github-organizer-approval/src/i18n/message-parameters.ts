export interface MessageParameters {
	"approval.request": {
		kind: string;
		date: string;
		count: number;
		approveMark: string;
		rejectMark: string;
	};
	"approval.slack": { kind: string; date: string; count: number; url: string };
}
