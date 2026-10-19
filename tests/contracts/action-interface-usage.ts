type Step = {
	uses?: string;
	if?: string;
	run?: string;
	with?: Record<string, unknown>;
	env?: Record<string, unknown>;
};
type Job = {
	if?: string;
	strategy?: unknown;
	steps?: Step[];
	uses?: string;
	with?: Record<string, unknown>;
	outputs?: Record<string, unknown>;
};
type Workflow = {
	jobs?: Record<string, Job>;
	on?: { workflow_call?: { outputs?: Record<string, unknown> } };
};

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

export function operationalValues(
	job: Job,
	workflows: ReadonlyMap<string, Workflow> = new Map(),
	visiting: ReadonlySet<string> = new Set(),
): string[] {
	const called = job.uses?.replace(/^\.\/\.github\/workflows\//, "");
	const nested =
		called && !visiting.has(called) ? workflows.get(called) : undefined;
	const nestedValues = nested
		? Object.values(nested.jobs ?? {}).flatMap((child) =>
				operationalValues(
					child,
					workflows,
					new Set([...visiting, called as string]),
				),
			)
		: [];
	const hasWork = job.steps?.some(operationalStep) || nestedValues.length > 0;
	const values = hasWork ? strings([job.if, job.strategy]) : [];
	for (const [name, value] of Object.entries(job.with ?? {}))
		if (nestedValues.some((item) => item.includes(`inputs.${name}`)))
			values.push(...strings(value));
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

export function workflowOutputConsumed(
	workflows: ReadonlyMap<string, Workflow>,
	path: string,
	output: string,
	visiting: ReadonlySet<string> = new Set(),
): boolean {
	const key = `${path}:${output}`;
	if (visiting.has(key)) return false;
	const visited = new Set([...visiting, key]);
	const reachable = operationalWorkflows(workflows);
	return [...workflows].some(
		([name, workflow]) =>
			reachable.has(name) &&
			Object.entries(workflow.jobs ?? {}).some(
				([id, job]) =>
					job.uses === `./.github/workflows/${path}` &&
					(Object.entries(workflow.jobs ?? {}).some(
						([otherId, other]) =>
							otherId !== id &&
							operationalValues(other, workflows).some((value) =>
								value.includes(`needs.${id}.outputs.${output}`),
							),
					) ||
						Object.entries(workflow.on?.workflow_call?.outputs ?? {}).some(
							([exported, definition]) =>
								strings(definition).some((value) =>
									value.includes(`jobs.${id}.outputs.${output}`),
								) && workflowOutputConsumed(workflows, name, exported, visited),
						)),
			),
	);
}

/** Internal helpers count only when reachable from an organizer-facing workflow. */
export function operationalWorkflows(
	workflows: ReadonlyMap<string, Workflow>,
): Set<string> {
	const reachable = new Set<string>();
	const pending = [...workflows.keys()].filter(
		(path) => !path.startsWith("__"),
	);
	for (const path of pending) {
		if (reachable.has(path)) continue;
		reachable.add(path);
		for (const job of Object.values(workflows.get(path)?.jobs ?? {})) {
			const called = job.uses?.match(/^\.\/\.github\/workflows\/(.+)$/)?.[1];
			if (called && workflows.has(called)) pending.push(called);
		}
	}
	return reachable;
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
