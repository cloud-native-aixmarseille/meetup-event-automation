import type {
	EmailReviewParameterPolicy,
	EmailReviewParameters,
} from "@meetup-automation/journey";

const START = "<!-- meetup-email:parameters -->";
const END = "<!-- /meetup-email:parameters -->";

/** Only values in the marked public parameter list are editable. */
export class EmailParametersPreview {
	constructor(private readonly policy: EmailReviewParameterPolicy) {}

	render(parameters: EmailReviewParameters): string {
		return [
			START,
			...Object.entries(parameters).map(
				([key, value]) => `- \`${key}\` : \`${value}\``,
			),
			END,
		].join("\n");
	}

	read(body: string, original: EmailReviewParameters): EmailReviewParameters {
		const section = this.section(body);
		const values: Record<string, string> = {};
		for (const line of section.split("\n").slice(1, -1)) {
			const match = /^- `([A-Za-z]+)` : `([^`\r\n]*)`$/.exec(line);
			if (
				!match?.[1] ||
				match[2] === undefined ||
				Object.hasOwn(values, match[1])
			)
				throw new Error("Invalid email parameter list");
			values[match[1]] = match[2];
		}
		this.policy.validateEdit(original, values);
		return values;
	}

	restore(body: string, parameters: EmailReviewParameters): string {
		return body.replace(this.section(body), this.render(parameters));
	}

	private section(body: string): string {
		if (body.split(START).length !== 2 || body.split(END).length !== 2)
			throw new Error("Missing or duplicate email parameter list");
		const start = body.indexOf(START);
		const end = body.indexOf(END);
		if (end < start) throw new Error("Invalid email parameter list");
		return body.slice(start, end + END.length);
	}
}
