type Step = {
	uses?: string;
	if?: string;
	run?: string;
	with?: Record<string, unknown>;
	env?: Record<string, unknown>;
};
type Job = { if?: string; strategy?: unknown; steps?: Step[] };

/** Conservative evidence for public interfaces; logging and test reads are not consumers. */
export function inputProblem(
	values: readonly unknown[],
	flag: boolean,
): string | undefined {
	if (values.length === 0) return "has no operational caller";
	const normalized = values.map(literal);
	if (
		normalized.every((value) =>
			["", "null", "false", "[]", "{}"].includes(value),
		)
	)
		return "is always empty, null, or false; remove the input and unused behavior";
	if (
		(flag ||
			normalized.some((value) => value === "true" || value === "false")) &&
		new Set(normalized).size === 1 &&
		!normalized[0]?.includes("${{")
	)
		return "is a constant flag; make its behavior unconditional and remove the input";
	return undefined;
}

function literal(value: unknown): string {
	const text = value == null ? "null" : String(value).trim();
	const expression = text.match(
		/^\$\{\{\s*(true|false|null|'(?:[^']|'')*')\s*\}\}$/,
	);
	const literal = expression?.[1] ?? text;
	return literal.startsWith("'") && literal.endsWith("'")
		? literal.slice(1, -1).replaceAll("''", "'")
		: literal;
}

export function strings(value: unknown): string[] {
	if (typeof value === "string") return [value];
	if (!value || typeof value !== "object") return [];
	return Object.values(value).flatMap(strings);
}

export function operationalValues(job: Job): string[] {
	const hasWork = job.steps?.some(operationalStep);
	const values = hasWork ? strings([job.if, job.strategy]) : [];
	for (const step of job.steps ?? []) {
		const ownedAction = /^\.\/(?:\.\.\/self-workflow\/)?actions\//.test(
			step.uses ?? "",
		);
		if (ownedAction) values.push(...strings(step.with));
		// Unknown third-party actions and arbitrary scripts need a reviewed rule here.
		// Do not treat their names, logging options, or unused env bindings as evidence.
		if (operationalStep(step)) values.push(...strings(step.if));
		for (const [name, value] of Object.entries(step.env ?? {}))
			if (shellConsumes(step.run ?? "", name)) values.push(...strings(value));
	}
	return values;
}

function operationalStep(step: Step): boolean {
	return (
		/^\.\/(?:\.\.\/self-workflow\/)?actions\//.test(step.uses ?? "") ||
		Boolean(step.uses?.startsWith("peter-evans/create-pull-request@")) ||
		operationalCommand(step.run ?? "")
	);
}

export function shellConsumes(script: string, name: string): boolean {
	if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return false;
	const variable = new RegExp(`\\$(?:${name}\\b|\\{${name}\\})`);
	const lines = script
		.split("\n")
		.filter((line) => !line.trimStart().startsWith("#"));
	const commands = lines.filter(operationalCommand);
	const argument = new RegExp(
		`(?:--title|--body|--body-file|-m|--message)\\s+"\\$(?:${name}\\b|\\{${name}\\})"`,
	);
	if (commands.some((line) => argument.test(line))) return true;
	// PR bodies are written to a temporary file, then passed to gh --body-file.
	return lines.some((line) => {
		if (!/^\s*printf\s/.test(line) || !variable.test(line)) return false;
		const file = line.match(/>\s*"\$([A-Za-z_][A-Za-z0-9_]*)"\s*$/)?.[1];
		return Boolean(
			file &&
				commands.some((command) => command.includes(`--body-file "$${file}"`)),
		);
	});
}

function operationalCommand(line: string): boolean {
	return /^\s*(?:gh\s+(?:pr|issue)\s+(?:create|edit)|git\s+(?:commit|push))\s/m.test(
		line,
	);
}
