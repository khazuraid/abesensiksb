import * as schema from "@adms/database";
import {
	CreateDeviceSchema,
	CreateEmployeeSchema,
	CreateHolidaySchema,
	CreateShiftSchema,
	RoleSchema,
	SendCommandSchema,
	UpdateDeviceSchema,
	UpdateEmployeeSchema,
	UpdateHolidaySchema,
	UpdateShiftSchema,
} from "@adms/shared-types";
import type { NextRequest } from "next/server";
import { z } from "zod";
import {
	ApiError,
	dateValue,
	handle,
	parseWith,
	positiveInt,
	requireRole,
} from "@/lib/server/api";
import { readSession } from "@/lib/server/auth";
import {
	attendanceLogs,
	audit,
	devices,
	employees,
	holidays,
	jaspel,
	leaves,
	reports,
	settings,
	shifts,
	users,
} from "@/lib/server/container";

export const runtime = "nodejs";
const admin = ["ADMIN"] as const;
const managers = ["ADMIN", "HRD"] as const;
const managerOnlyResources = new Set([
	"employees",
	"devices",
	"shifts",
	"holidays",
	"reports",
	"jaspel",
]);
const bulkShiftSchema = z.object({
	employeeIds: z.array(z.number().int().positive()).min(1),
	shiftIds: z.array(z.number().int().positive()),
});
const leaveSchema = z.object({
	employeeId: z.number().int().positive(),
	type: z.enum(["ANNUAL", "SICK", "PERMISSION", "MATERNITY", "OTHER"]),
	startDate: z.string().date(),
	endDate: z.string().date(),
	reason: z.string().max(2000).optional(),
});
const manualLogSchema = z.object({
	employeeId: z.number().int().positive(),
	timestamp: z.string(),
	type: z.enum(["IN", "OUT"]),
});
const correctionSchema = z.object({
	attendanceLogId: z.number().int().positive(),
	timestamp: z.string(),
	reason: z.string().min(5).max(2000),
});
const reviewSchema = z.object({
	note: z.string().max(2000).optional(),
	rejectionReason: z.string().max(2000).optional(),
});
const jaspelVariableSchema = z.object({
	basicIndex: z.number().nonnegative(),
	positionIndex: z.number().nonnegative(),
	riskIndex: z.number().nonnegative(),
});
const jaspelCalculateSchema = z.object({
	month: z.number().int().min(1).max(12),
	year: z.number().int().min(2000).max(2200),
	totalFund: z.number().int().nonnegative(),
});
const userCreateSchema = z.object({
	email: z.string().email(),
	name: z.string().min(1).max(255),
	role: RoleSchema,
	password: z.string().min(12),
});
const userUpdateSchema = userCreateSchema
	.omit({ password: true })
	.partial()
	.refine((value) => Object.keys(value).length > 0);
const resetSchema = z.object({ password: z.string().min(12) });

const segments = (request: NextRequest) =>
	request.nextUrl.pathname
		.replace(/^\/api\/?/, "")
		.split("/")
		.filter(Boolean);
const idAt = (parts: string[], index = 1) => positiveInt(parts[index] ?? null);
const pageParams = (request: NextRequest) => ({
	page: request.nextUrl.searchParams.get("page")
		? positiveInt(request.nextUrl.searchParams.get("page"))
		: undefined,
	limit: request.nextUrl.searchParams.get("limit")
		? positiveInt(request.nextUrl.searchParams.get("limit"))
		: undefined,
	search: request.nextUrl.searchParams.get("search") || undefined,
});
const period = (request: NextRequest) => ({
	month: positiveInt(request.nextUrl.searchParams.get("month")),
	year: positiveInt(request.nextUrl.searchParams.get("year")),
});
const logFilter = (request: NextRequest) => {
	const p = request.nextUrl.searchParams;
	return {
		from: p.get("from") ? dateValue(p.get("from"), "from") : undefined,
		to: p.get("to") ? dateValue(p.get("to"), "to") : undefined,
		status: p.get("status") || undefined,
		deviceId: p.get("deviceId") ? positiveInt(p.get("deviceId")) : undefined,
		limit: p.get("limit") ? positiveInt(p.get("limit")) : undefined,
		page: p.get("page") ? positiveInt(p.get("page")) : undefined,
		search: p.get("search") || undefined,
	};
};
async function resolveEmployeeId(
	user: Awaited<ReturnType<typeof readSession>>,
) {
	return employees.resolveEmployeeId(user.userId);
}
async function readValidSession(request: NextRequest) {
	const session = await readSession(request);
	const currentUser = await users.findOne(session.userId);
	if (
		!currentUser ||
		currentUser.sessionVersion !== (session.sessionVersion ?? 0)
	)
		throw new ApiError(401, "Sesi tidak berlaku lagi");
	return session;
}
async function audited<T>(
	userId: number,
	action: string,
	target: string,
	details: Record<string, unknown>,
	fn: () => Promise<T>,
) {
	const result = await fn();
	await audit.record({ userId, action, target, details });
	return result;
}
function xlsx(
	workbook: Awaited<ReturnType<typeof reports.generateExcel>>,
	filename: string,
) {
	return workbook.xlsx.writeBuffer().then(
		(bytes) =>
			new Response(Buffer.from(bytes), {
				headers: {
					"content-type":
						"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					"content-disposition": `attachment; filename=${filename}`,
				},
			}),
	);
}

export async function GET(request: NextRequest) {
	return handle(request, async () => {
		const path = segments(request);
		if (!path.length) return { message: "Next.js ADMS API berjalan" };
		if (path[0] === "health-db") {
			const result = await schema.db.execute("SELECT 1 as ok");
			return { status: "ok", connected: result.rows.length > 0 };
		}
		const user = await readValidSession(request);
		if (managerOnlyResources.has(path[0] ?? ""))
			requireRole(user, [...managers]);
		switch (path[0]) {
			case "users":
				requireRole(user, [...admin]);
				return path[1]
					? users.findOne(idAt(path))
					: users.findAll(pageParams(request));
			case "audit-logs":
				requireRole(user, [...admin]);
				return audit.findAll(pageParams(request));
			case "employees":
				return path[1]
					? employees.findOne(idAt(path))
					: employees.findAll(pageParams(request));
			case "devices":
				return path[2] === "commands"
					? devices.getCommands(idAt(path), pageParams(request))
					: path[1]
						? devices.findOne(idAt(path))
						: devices.findAll(pageParams(request));
			case "shifts":
				return path[1]
					? shifts.findOne(idAt(path))
					: shifts.findAll(pageParams(request));
			case "holidays":
				return holidays.findAll(pageParams(request));
			case "leaves": {
				const employeeId =
					user.role === "USER"
						? await resolveEmployeeId(user)
						: request.nextUrl.searchParams.get("employeeId")
							? positiveInt(request.nextUrl.searchParams.get("employeeId"))
							: undefined;
				return leaves.findAll({ ...pageParams(request), employeeId });
			}
			case "attendance-corrections":
				requireRole(user, [...managers]);
				return attendanceLogs.findCorrections(pageParams(request));
			case "attendance-logs": {
				if (path[1] === "stats") {
					requireRole(user, [...managers]);
					return attendanceLogs.getStats();
				}
				const filter = {
					...logFilter(request),
					...(user.role === "USER"
						? { employeeId: await resolveEmployeeId(user) }
						: {}),
				};
				if (path[0] === "attendance-logs" && path[1] === "export") {
					const workbook = await attendanceLogs.generateExcel(filter);
					return xlsx(workbook, "Log-Absensi.xlsx");
				}
				return attendanceLogs.findAll(filter);
			}
			case "reports": {
				const { month, year } = period(request);
				if (path[1] === "available-periods")
					return reports.getAvailablePeriods();
				if (path[1] === "summary")
					return reports.getMonthlySummary(month, year, pageParams(request));
				if (path[1] === "daily-recap" && path[2] !== "export")
					return reports.getDailyRecap(month, year, {
						...pageParams(request),
						employeeId: request.nextUrl.searchParams.get("employeeId")
							? positiveInt(request.nextUrl.searchParams.get("employeeId"))
							: undefined,
					});
				const workbook =
					path[1] === "daily-recap"
						? await reports.generateDailyRecapExcel(month, year)
						: await reports.generateExcel(month, year);
				return xlsx(
					workbook,
					`${path[1] === "daily-recap" ? "Rekap-Harian" : "Laporan-Absensi"}-${month}-${year}.xlsx`,
				);
			}
			case "jaspel":
				requireRole(user, [...managers]);
				if (path[1] === "variables")
					return jaspel.getVariables(pageParams(request));
				if (path[1] === "distributions") {
					const p = period(request);
					return jaspel.getDistributions(p.month, p.year, pageParams(request));
				}
				if (path[1] === "export") {
					const p = period(request);
					return xlsx(
						await jaspel.generateExcel(p.month, p.year),
						`Jaspel-${p.month}-${p.year}.xlsx`,
					);
				}
				break;
			case "settings":
				requireRole(user, [...admin]);
				return settings.getAll();
		}
		throw new ApiError(404, "Route not found");
	});
}

export async function POST(request: NextRequest) {
	return handle(request, async ({ body }) => {
		const path = segments(request),
			user = await readValidSession(request);
		switch (path[0]) {
			case "users":
				requireRole(user, [...admin]);
				{
					const data = parseWith(userCreateSchema, body);
					return audited(
						user.userId,
						"CREATE",
						"users",
						{ email: data.email, role: data.role },
						() => users.create(data),
					);
				}
			case "employees":
				requireRole(user, [...managers]);
				if (path[1] === "bulk") {
					const data = z
						.array(CreateEmployeeSchema)
						.min(1)
						.parse(body)
						.map((item) => ({
							...item,
							shiftIds: item.shiftIds ?? [],
							isActive: item.isActive ?? true,
						}));
					const result = await employees.bulkCreate(data);
					await audit.record({
						userId: user.userId,
						action: "CREATE",
						target: "employees",
						details: { bulk: true, count: data.length },
					});
					return result;
				}
				if (path[1] === "sync-device") {
					const { deviceId } = z
						.object({ deviceId: z.number().int().positive() })
						.parse(body);
					return audited(
						user.userId,
						"COMMAND",
						"devices",
						{ deviceId, type: "user.sync" },
						async () => {
							await devices.sendCommand({ deviceId, type: "user.sync" });
							return { message: "Perintah sync user dikirim" };
						},
					);
				}
				{
					const data = parseWith(CreateEmployeeSchema, body);
					await employees.validateShiftIds(data.shiftIds ?? []);
					return audited(user.userId, "CREATE", "employees", {}, () =>
						employees.create({
							...data,
							shiftIds: data.shiftIds ?? [],
							isActive: data.isActive ?? true,
						}),
					);
				}
			case "devices":
				requireRole(user, [...admin]);
				if (path[1] === "command" || path[2] === "command") {
					const command = parseWith(
						SendCommandSchema,
						path[2] === "command"
							? { ...(body as object), deviceId: idAt(path) }
							: body,
					);
					return audited(
						user.userId,
						"COMMAND",
						"devices",
						{ deviceId: command.deviceId, type: command.type },
						() => devices.sendCommand(command),
					);
				}
				return audited(user.userId, "CREATE", "devices", {}, () =>
					devices.create(parseWith(CreateDeviceSchema, body)),
				);
			case "shifts":
				requireRole(user, [...managers]);
				{
					const data = parseWith(CreateShiftSchema, body);
					return audited(user.userId, "CREATE", "shifts", {}, () =>
						shifts.create({
							...data,
							isActive: data.isActive ?? true,
							toleranceMinutes: data.toleranceMinutes ?? 0,
							earlyOutTolerance: data.earlyOutTolerance ?? 0,
							workDays: data.workDays ?? [1, 2, 3, 4, 5],
						}),
					);
				}
			case "holidays":
				requireRole(user, [...managers]);
				{
					const result =
						path[1] === "sync"
							? await holidays.syncFromExternal(
									request.nextUrl.searchParams.get("year")
										? positiveInt(request.nextUrl.searchParams.get("year"))
										: undefined,
								)
							: await holidays.create(parseWith(CreateHolidaySchema, body));
					await audit.record({
						userId: user.userId,
						action: "CREATE",
						target: "holidays",
						details: { sync: path[1] === "sync" },
					});
					return result;
				}
			case "leaves": {
				const data = parseWith(leaveSchema, body);
				const employeeId =
					user.role === "USER"
						? await resolveEmployeeId(user)
						: data.employeeId;
				return audited(user.userId, "CREATE", "leaves", { employeeId }, () =>
					leaves.create({ ...data, employeeId }),
				);
			}
			case "attendance-corrections":
				requireRole(user, [...managers]);
				{
					const data = parseWith(correctionSchema, body);
					return audited(
						user.userId,
						"CREATE",
						"attendance-corrections",
						{ attendanceLogId: data.attendanceLogId },
						() =>
							attendanceLogs.createCorrection(
								data.attendanceLogId,
								user.userId,
								dateValue(data.timestamp, "timestamp"),
								data.reason,
							),
					);
				}
			case "attendance-logs":
				requireRole(user, [...managers]);
				{
					const data = parseWith(manualLogSchema, body);
					return audited(
						user.userId,
						"CREATE",
						"attendance-logs",
						{ manual: true, employeeId: data.employeeId },
						() =>
							attendanceLogs.createManualLog(
								data.employeeId,
								dateValue(data.timestamp, "timestamp"),
								data.type,
							),
					);
				}
			case "jaspel":
				requireRole(user, [...managers]);
				if (path[1] === "calculate") {
					const data = parseWith(jaspelCalculateSchema, body);
					return audited(user.userId, "CALCULATE", "jaspel", data, () =>
						jaspel.calculate(data.month, data.year, data.totalFund),
					);
				}
				break;
		}
		throw new ApiError(404, "Route not found");
	});
}

export async function PATCH(request: NextRequest) {
	return handle(request, async ({ body }) => {
		const path = segments(request),
			user = await readValidSession(request);
		switch (path[0]) {
			case "users":
				requireRole(user, [...admin]);
				if (path[2] === "reset-password")
					return audited(
						user.userId,
						"RESET_PASSWORD",
						"users",
						{ id: idAt(path) },
						() =>
							users.resetPassword(
								idAt(path),
								parseWith(resetSchema, body).password,
							),
					);
				return audited(user.userId, "UPDATE", "users", { id: idAt(path) }, () =>
					users.adminUpdate(idAt(path), parseWith(userUpdateSchema, body)),
				);
			case "employees":
				requireRole(user, [...managers]);
				if (path[1] === "bulk" && path[2] === "shift") {
					const data = parseWith(bulkShiftSchema, body);
					return audited(
						user.userId,
						"UPDATE",
						"employees",
						{ bulk: true },
						() => employees.bulkAssignShift(data.employeeIds, data.shiftIds),
					);
				}
				{
					const data = parseWith(UpdateEmployeeSchema, body);
					if (data.shiftIds) await employees.validateShiftIds(data.shiftIds);
					return audited(
						user.userId,
						"UPDATE",
						"employees",
						{ id: idAt(path) },
						() => employees.update(idAt(path), data),
					);
				}
			case "devices":
				requireRole(user, [...admin]);
				return audited(
					user.userId,
					"UPDATE",
					"devices",
					{ id: idAt(path) },
					() => devices.update(idAt(path), parseWith(UpdateDeviceSchema, body)),
				);
			case "shifts":
				requireRole(user, [...managers]);
				return audited(
					user.userId,
					"UPDATE",
					"shifts",
					{ id: idAt(path) },
					() => shifts.update(idAt(path), parseWith(UpdateShiftSchema, body)),
				);
			case "holidays":
				requireRole(user, [...managers]);
				return audited(
					user.userId,
					"UPDATE",
					"holidays",
					{ id: idAt(path) },
					() =>
						holidays.update(idAt(path), parseWith(UpdateHolidaySchema, body)),
				);
			case "leaves":
				requireRole(user, [...managers]);
				if (path[2] === "approve" || path[2] === "reject") {
					const data = parseWith(reviewSchema, body ?? {});
					return audited(
						user.userId,
						path[2].toUpperCase(),
						"leaves",
						{ id: idAt(path) },
						() =>
							leaves.setStatus(
								idAt(path),
								user.userId,
								path[2] === "approve" ? "APPROVED" : "REJECTED",
								data.rejectionReason,
							),
					);
				}
				break;
			case "attendance-corrections":
				requireRole(user, [...managers]);
				if (path[2] === "approve" || path[2] === "reject") {
					const data = parseWith(reviewSchema, body ?? {});
					return audited(
						user.userId,
						path[2].toUpperCase(),
						"attendance-corrections",
						{ id: idAt(path) },
						() =>
							attendanceLogs.reviewCorrection(
								idAt(path),
								user.userId,
								path[2] === "approve" ? "APPROVED" : "REJECTED",
								data.note,
							),
					);
				}
				break;
			case "jaspel":
				requireRole(user, [...managers]);
				if (["review", "finalize", "lock"].includes(path[1] ?? "")) {
					const data = parseWith(
						jaspelCalculateSchema.pick({ month: true, year: true }),
						body,
					);
					const status =
						path[1] === "review"
							? "REVIEWED"
							: path[1] === "finalize"
								? "FINAL"
								: "LOCKED";
					return audited(user.userId, status, "jaspel", data, () =>
						jaspel.transition(data.month, data.year, user.userId, status),
					);
				}
				break;
		}
		throw new ApiError(404, "Route not found");
	});
}

export async function PUT(request: NextRequest) {
	return handle(request, async ({ body }) => {
		const path = segments(request),
			user = await readValidSession(request);
		if (path[0] === "settings") {
			requireRole(user, [...admin]);
			return audited(
				user.userId,
				"UPDATE",
				"settings",
				{ keys: Object.keys(body as object) },
				() => settings.setBulk(z.record(z.string(), z.string()).parse(body)),
			);
		}
		if (path[0] === "jaspel" && path[1] === "variables") {
			requireRole(user, [...managers]);
			const data = parseWith(jaspelVariableSchema, body);
			return audited(
				user.userId,
				"UPDATE",
				"jaspel-variables",
				{ employeeId: idAt(path, 2) },
				() =>
					jaspel.updateVariable(
						idAt(path, 2),
						data.basicIndex,
						data.positionIndex,
						data.riskIndex,
					),
			);
		}
		throw new ApiError(404, "Route not found");
	});
}
export async function DELETE(request: NextRequest) {
	return handle(request, async () => {
		const path = segments(request),
			user = await readValidSession(request);
		const id = idAt(path);
		switch (path[0]) {
			case "employees":
				requireRole(user, [...admin]);
				return audited(user.userId, "DELETE", "employees", { id }, () =>
					employees.remove(id),
				);
			case "devices":
				requireRole(user, [...admin]);
				return audited(user.userId, "DELETE", "devices", { id }, () =>
					devices.remove(id),
				);
			case "shifts":
				requireRole(user, [...managers]);
				return audited(user.userId, "DELETE", "shifts", { id }, () =>
					shifts.remove(id),
				);
			case "holidays":
				requireRole(user, [...managers]);
				return audited(user.userId, "DELETE", "holidays", { id }, () =>
					holidays.remove(id),
				);
			case "leaves":
				requireRole(user, [...managers]);
				return audited(user.userId, "DELETE", "leaves", { id }, () =>
					leaves.remove(id),
				);
		}
		throw new ApiError(404, "Route not found");
	});
}
