import type { ChildProcess, SpawnOptions } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

/** Owns one stock Chrome process, its loopback endpoint and disposable profile. */
export class MeetupChromeProcess {
	private directory = "";
	private child?: ChildProcess;
	private exited: Promise<void> = Promise.resolve();

	constructor(
		private readonly launch: (
			command: string,
			args: string[],
			options: SpawnOptions,
		) => ChildProcess,
		private readonly executable: string,
	) {}

	async start(timezoneId: string): Promise<string> {
		if (this.directory) throw new Error("Browser session already started.");
		this.directory = await mkdtemp(join(tmpdir(), "meetup-chrome-"));
		try {
			const port = await this.availablePort();
			this.child = this.launch(
				"xvfb-run",
				[
					"--auto-servernum",
					this.executable,
					`--user-data-dir=${this.directory}`,
					`--remote-debugging-port=${port}`,
					"--remote-debugging-address=127.0.0.1",
					"--no-first-run",
					"--no-default-browser-check",
					"--incognito",
					"about:blank",
				],
				{
					detached: true,
					stdio: "ignore",
					env: {
						PATH: process.env.PATH,
						TMPDIR: this.directory,
						DISPLAY: process.env.DISPLAY,
						XAUTHORITY: process.env.XAUTHORITY,
						LANG: "en_US.UTF-8",
						TZ: timezoneId,
					},
				},
			);
			this.exited = new Promise((resolve) => {
				this.child?.once("exit", () => resolve());
				this.child?.once("error", () => resolve());
			});
			return await this.endpoint(port);
		} catch {
			await this.close();
			throw new Error("Browser unavailable.");
		}
	}

	async close(): Promise<void> {
		const child = this.child;
		this.child = undefined;
		if (child?.pid) {
			this.signal(child.pid, "SIGTERM");
			// The Xvfb wrapper can exit before Chrome finishes writing its profile.
			for (
				let attempt = 0;
				attempt < 25 && this.signal(child.pid, 0);
				attempt++
			)
				await delay(100);
			this.signal(child.pid, "SIGKILL");
		}
		await this.exited;
		if (this.directory)
			await rm(this.directory, {
				recursive: true,
				force: true,
				maxRetries: 5,
				retryDelay: 100,
			});
	}

	private signal(pid: number, signal: NodeJS.Signals | 0): boolean {
		try {
			process.kill(-pid, signal);
			return true;
		} catch {
			return false;
		}
	}

	private async endpoint(port: number): Promise<string> {
		const deadline = AbortSignal.timeout(30_000);
		while (!deadline.aborted) {
			if (this.child?.exitCode !== null || this.child?.signalCode !== null)
				throw new Error("Browser stopped.");
			try {
				const response = await fetch(`http://127.0.0.1:${port}/json/version`, {
					signal: AbortSignal.any([deadline, AbortSignal.timeout(1_000)]),
					redirect: "error",
				});
				return this.validateEndpoint(await response.json(), port);
			} catch {
				await delay(200);
			}
		}
		throw new Error("Browser endpoint unavailable.");
	}

	private validateEndpoint(value: unknown, port: number): string {
		if (
			!value ||
			typeof value !== "object" ||
			!("webSocketDebuggerUrl" in value) ||
			typeof value.webSocketDebuggerUrl !== "string"
		)
			throw new Error("Browser endpoint unavailable.");
		const url = new URL(value.webSocketDebuggerUrl);
		if (
			url.protocol !== "ws:" ||
			url.hostname !== "127.0.0.1" ||
			url.port !== String(port) ||
			url.username ||
			url.password ||
			url.search ||
			url.hash ||
			!/^\/devtools\/browser\/[a-f0-9-]+$/.test(url.pathname)
		)
			throw new Error("Unexpected browser endpoint.");
		return url.href;
	}

	private async availablePort(): Promise<number> {
		const server = createServer();
		await new Promise<void>((resolve, reject) => {
			server.once("error", reject);
			server.listen(0, "127.0.0.1", resolve);
		});
		const address = server.address();
		await new Promise<void>((resolve, reject) =>
			server.close((error) => (error ? reject(error) : resolve())),
		);
		if (!address || typeof address === "string")
			throw new Error("Port unavailable.");
		return address.port;
	}
}
