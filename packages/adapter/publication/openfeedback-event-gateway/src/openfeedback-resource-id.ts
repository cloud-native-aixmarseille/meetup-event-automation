export class OpenFeedbackResourceId {
	isValid(value: unknown): value is string {
		return (
			typeof value === "string" &&
			Array.from(value).length <= 1500 &&
			/^(?!\.\.?$)(?!__.*__$)[^/]+$/u.test(value)
		);
	}
}
