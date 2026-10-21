import type { ChildProcess, SpawnOptions } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Readable } from "node:stream";

export type ChallengeResult = "solved" | "blocked" | "unavailable";

/** Linux process boundary: credentials on stdin; only a fixed status on fd 3. */
export class HcaptchaProcess {
	constructor(
		private readonly directory: string,
		private readonly launch: (
			command: string,
			args: string[],
			options: SpawnOptions,
		) => ChildProcess,
	) {}

	async run(
		endpoint: string,
		apiKey: string,
		model: string,
	): Promise<ChallengeResult> {
		const scratch = await mkdtemp(join(tmpdir(), "meetup-hcaptcha-"));
		try {
			return await this.execute(scratch, { endpoint, apiKey, model });
		} catch {
			return "unavailable";
		} finally {
			await rm(scratch, { recursive: true, force: true });
		}
	}

	private execute(
		scratch: string,
		request: { endpoint: string; apiKey: string; model: string },
	): Promise<ChallengeResult> {
		return new Promise((resolve) => {
			const child = this.launch(
				join(this.directory, ".venv/bin/python"),
				[join(this.directory, "solve.py")],
				{
					cwd: scratch,
					detached: true,
					stdio: ["pipe", "ignore", "ignore", "pipe"],
					env: {
						PATH: process.env.PATH,
						LANG: "C.UTF-8",
						TMPDIR: scratch,
						MPLCONFIGDIR: join(scratch, "matplotlib"),
						DEBUG: "",
						PWDEBUG: "",
					},
				},
			);
			let output = "";
			let timedOut = false;
			const timer = setTimeout(() => {
				timedOut = true;
				this.stop(child);
			}, 120_000);
			const status = child.stdio[3] as Readable;
			status.on("data", (chunk: Buffer) => {
				output += chunk.toString("utf8", 0, 33);
				if (output.length > 32) {
					output = "invalid";
					this.stop(child);
				}
			});
			child.on("error", () => this.stop(child));
			child.on("close", (code) => {
				clearTimeout(timer);
				this.stop(child);
				resolve(this.result(code, output, timedOut));
			});
			child.stdin?.on("error", () => this.stop(child));
			child.stdin?.end(JSON.stringify(request));
		});
	}

	private result(
		code: number | null,
		output: string,
		timedOut: boolean,
	): ChallengeResult {
		if (timedOut) return "blocked";
		if (code === 0 && output === "solved\n") return "solved";
		if (code === 0 && output === "blocked\n") return "blocked";
		return "unavailable";
	}

	private stop(child: ChildProcess): void {
		if (!child.pid) return;
		try {
			// Also stop the Python Playwright driver before deleting scratch data.
			process.kill(-child.pid, "SIGKILL");
		} catch {
			// The process group has already exited.
		}
	}
}
export type HcaptchaProcessArguments = ConstructorParameters<
	typeof HcaptchaProcess
>;
