import { runSideEffects } from "./side-effects.js";

export type AttendanceLogJob = {
	sn: string;
	completedEffects?: string[];
	log: {
		employeeId: number;
		deviceId: number | null;
		timestamp: Date | string;
		type: "IN" | "OUT";
		status: "PRESENT" | "LATE" | "ABSENT" | "EARLY_OUT";
	};
};

type Employee = {
	name: string;
	employeeCode: string;
	biometricId: string | null;
};

type Device = {
	name: string;
	webhookUrl: string | null;
	webhookSecret: string | null;
};

type ProcessorDeps = {
	insert(
		log: AttendanceLogJob["log"] & { timestamp: Date },
	): Promise<{ completedEffects?: string[] } | undefined>;
	findEmployee(id: number): Promise<Employee | undefined>;
	findDevice(id: number): Promise<Device | undefined>;
	forward(
		url: string,
		secret: string | null,
		payload: WebhookPayload,
		idempotencyKey: string,
	): Promise<void>;
	notify(data: {
		name: string;
		time: string;
		type: "IN" | "OUT";
		status: AttendanceLogJob["log"]["status"];
		device: string;
	}): Promise<void>;
	emit(event: string, data: unknown): void;
	checkpoint?(completedEffects: string[]): Promise<void>;
};

export type WebhookPayload = {
	sn: string;
	timestamp: string;
	user_id: string;
	verify: number;
	status: number;
	workcode: number;
};

export function formatWebhookPayload(
	sn: string,
	log: AttendanceLogJob["log"] & { timestamp: Date },
	employee: Pick<Employee, "biometricId" | "employeeCode"> | undefined,
): WebhookPayload {
	return {
		sn,
		timestamp: log.timestamp.toISOString().replace("T", " ").slice(0, 19),
		user_id:
			employee?.biometricId || employee?.employeeCode || String(log.employeeId),
		verify: 1,
		status: log.type === "IN" ? 0 : 1,
		workcode: 0,
	};
}

export async function processAttendanceJob(
	job: AttendanceLogJob,
	deps: ProcessorDeps,
) {
	const log = { ...job.log, timestamp: new Date(job.log.timestamp) };
	const persisted = await deps.insert(log);
	const employee = await deps.findEmployee(log.employeeId);
	const device = log.deviceId ? await deps.findDevice(log.deviceId) : undefined;
	const effects: Array<{ name: string; run(): Promise<unknown> }> = [];
	if (device?.webhookUrl) {
		const webhookUrls = device.webhookUrl
			.split(",")
			.map((value) => value.trim())
			.filter(Boolean);
		for (const [index, webhookUrl] of webhookUrls.entries()) {
			const name = `webhook:${index}`;
			effects.push({
				name,
				run: () =>
					deps.forward(
						webhookUrl,
						device.webhookSecret,
						formatWebhookPayload(job.sn, log, employee),
						`${job.sn}:${log.employeeId}:${log.timestamp.toISOString()}:${log.type}:${name}`,
					),
			});
		}
	}
	effects.push({
		name: "telegram",
		run: () =>
			deps.notify({
				name: employee?.name || "Unknown",
				time: new Intl.DateTimeFormat("id-ID", {
					dateStyle: "medium",
					timeStyle: "short",
				}).format(log.timestamp),
				type: log.type,
				status: log.status,
				device: device?.name || job.sn,
			}),
	});
	effects.push({
		name: "socket",
		run: async () =>
			deps.emit("onNewLog", {
				sn: job.sn,
				...log,
				employeeName: employee?.name || "Unknown",
			}),
	});
	await runSideEffects(
		effects,
		[
			...new Set([
				...(persisted?.completedEffects ?? []),
				...(job.completedEffects ?? []),
			]),
		],
		deps.checkpoint,
	);
	return { success: true };
}
