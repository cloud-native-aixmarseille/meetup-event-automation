import type { ChildProcess, SpawnOptions } from "node:child_process";
import { EventEmitter } from "node:events";
import { access } from "node:fs/promises";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HcaptchaProcess } from "./hcaptcha-process.js";

function fixture(output: string, code: number | null = 0) {
	const status = new PassThrough();
	const stdin = new PassThrough();
	const child = Object.assign(new EventEmitter(), {
		pid: 987654,
		stdin,
		stdio: [stdin, null, null, status],
	}) as unknown as ChildProcess;
	const launch = vi
		.fn<
			(command: string, args: string[], options: SpawnOptions) => ChildProcess
		>()
		.mockImplementation(() => {
			stdin.on("finish", () => {
				status.write(output);
				child.emit("close", code);
			});
			return child;
		});
	const kill = vi.spyOn(process, "kill").mockReturnValue(true);
	return {
		solver: new HcaptchaProcess("/solver", launch),
		launch,
		child,
		stdin,
		kill,
	};
}

afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

describe("hCaptcha process isolation", () => {
	it("handles an asynchronous spawn error without exposing its message", async () => {
		// Arrange
		const { solver, launch, child } = fixture("");
		launch.mockImplementation(() => {
			queueMicrotask(() => {
				child.emit("error", new Error("private startup details"));
				child.emit("close", -1);
			});
			return child;
		});

		// Act
		const result = await solver.run({
			endpoint: "ws://127.0.0.1:1234",
			targetUrl: "https://events.example.test/sign-in",
			apiKey: "key",
			model: "model",
		});

		// Assert
		expect(result).toBe("unavailable");
	});

	it("passes configuration through stdin and removes temporary files", async () => {
		// Arrange
		const { solver, launch, stdin } = fixture("solved\n");
		let request = "";
		stdin.on("data", (chunk) => {
			request += chunk.toString();
		});

		// Act
		const result = await solver.run({
			endpoint: "ws://127.0.0.1:1234",
			targetUrl: "https://events.example.test/sign-in",
			apiKey: "synthetic-key",
			model: "model",
		});
		const options = launch.mock.calls[0][2];
		const directoryExists = await access(String(options?.cwd)).then(
			() => true,
			() => false,
		);

		// Assert
		expect(result).toBe("solved");
		expect(JSON.parse(request)).toEqual({
			endpoint: "ws://127.0.0.1:1234",
			targetUrl: "https://events.example.test/sign-in",
			apiKey: "synthetic-key",
			model: "model",
		});
		expect(launch.mock.calls[0].slice(0, 2)).toEqual([
			"/solver/.venv/bin/python",
			["/solver/solve.py"],
		]);
		expect(options).toMatchObject({
			detached: true,
			stdio: ["pipe", "ignore", "ignore", "pipe"],
		});
		expect(options?.env).not.toHaveProperty("GEMINI_API_KEY");
		expect(options?.env).not.toHaveProperty("MEETUP_PASSWORD");
		expect(directoryExists).toBe(false);
	});

	it.each([
		["blocked\n", 0, "blocked"],
		["unavailable\n", 0, "unavailable"],
		["solved\n", 1, "unavailable"],
		["private-provider-output", 0, "unavailable"],
		["x".repeat(100), 0, "unavailable"],
	] as const)(
		"accepts only the fixed status protocol",
		async (output, code, expected) => {
			// Arrange
			const { solver } = fixture(output, code);

			// Act
			const result = await solver.run({
				endpoint: "ws://127.0.0.1:1234",
				targetUrl: "https://events.example.test/sign-in",
				apiKey: "key",
				model: "model",
			});

			// Assert
			expect(result).toBe(expected);
		},
	);

	it("kills the process group after two minutes and reports a blocked attempt", async () => {
		// Arrange
		vi.useFakeTimers();
		const { solver, launch, child, stdin, kill } = fixture("");
		let started: () => void = () => {};
		const ready = new Promise<void>((resolve) => {
			started = resolve;
		});
		launch.mockImplementation(() => {
			stdin.on("finish", started);
			return child;
		});
		kill.mockImplementationOnce(() => {
			queueMicrotask(() => child.emit("close", null));
			return true;
		});

		// Act
		const pending = solver.run({
			endpoint: "ws://127.0.0.1:1234",
			targetUrl: "https://events.example.test/sign-in",
			apiKey: "key",
			model: "model",
		});
		await ready;
		await vi.advanceTimersByTimeAsync(120_000);
		const result = await pending;

		// Assert
		expect(result).toBe("blocked");
		expect(kill).toHaveBeenCalledWith(-987654, "SIGKILL");
	});

	it("redacts a process start failure and deletes its scratch directory", async () => {
		// Arrange
		const { solver, launch } = fixture("");
		launch.mockImplementation(() => {
			throw new Error("private provider details");
		});

		// Act
		const result = await solver.run({
			endpoint: "ws://127.0.0.1:1234",
			targetUrl: "https://events.example.test/sign-in",
			apiKey: "key",
			model: "model",
		});
		const exists = await access(String(launch.mock.calls[0][2]?.cwd)).then(
			() => true,
			() => false,
		);

		// Assert
		expect(result).toBe("unavailable");
		expect(exists).toBe(false);
	});
});
