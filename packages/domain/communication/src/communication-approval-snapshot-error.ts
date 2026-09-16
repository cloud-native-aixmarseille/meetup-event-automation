export class CommunicationApprovalSnapshotError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CommunicationApprovalSnapshotError";
	}
}
