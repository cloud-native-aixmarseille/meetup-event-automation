import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";

type Inputs = Record<
	string,
	{
		default?: unknown;
		description?: string;
		required?: boolean;
		type?: string;
	}
>;

export interface Step {
	env?: Record<string, unknown>;
	id?: string;
	if?: string;
	name?: string;
	run?: string;
	uses?: string;
	with?: Record<string, unknown>;
}

export interface Job {
	concurrency?: {
		"cancel-in-progress"?: boolean;
		group?: string;
	};
	if?: string;
	needs?: string | string[];
	permissions?: Record<string, unknown>;
	secrets?: Record<string, unknown>;
	steps?: Step[];
	uses?: string;
	with?: Record<string, unknown>;
}

export interface Workflow {
	jobs?: Record<string, Job>;
	name?: string;
	on?: {
		workflow_call?: {
			inputs?: Inputs;
			outputs?: Record<string, unknown>;
			secrets?: Inputs;
		};
	};
	permissions?: Record<string, unknown>;
}

export interface ActionManifest {
	inputs?: Inputs;
	outputs?: Record<string, unknown>;
	runs?: {
		main?: string;
		steps?: Step[];
		using?: string;
	};
}

export const root = process.cwd();
export const automationActionPrefix = "./../self-workflow/actions/";
export const localWorkflowActionsRef =
	"hoverkraft-tech/ci-github-common/actions/local-workflow-actions@3a27d31e9ccefbe9609cc9165017ed100ff34a22";
export const workflowExpression = (expression: string) =>
	`\${{ ${expression} }}`;
export const managedAuthor = workflowExpression(
	"format('{0}[bot]', steps.app-token.outputs.app-slug)",
);

export const sortedKeys = (value: Record<string, unknown> | undefined) =>
	Object.keys(value ?? {}).sort();

export const readYaml = async <T>(path: string): Promise<T> =>
	parse(await readFile(join(root, path), "utf8")) as T;

export const readWorkflow = (name: string) =>
	readYaml<Workflow>(`.github/workflows/${name}.yml`);

export const findStep = (job: Job, uses: string) =>
	job.steps?.find((step) => step.uses === uses);
