import { randomUUID } from "node:crypto";
import * as schema from "@adms/database";
import type {
	CreateDevice,
	CreateEmployee,
	CreateHoliday,
	CreateShift,
	SendCommand,
	UpdateDevice,
	UpdateEmployee,
	UpdateHoliday,
	UpdateShift,
} from "@adms/shared-types";
import * as bcrypt from "bcrypt";
import type { Queue } from "bullmq";
import {
	and,
	asc,
	between,
	count,
	desc,
	eq,
	gte,
	ilike,
	inArray,
	isNull,
	lte,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import { Workbook } from "exceljs";
import { ApiError, type SessionUser } from "./api";
import { createToken } from "./auth";
import {
	createPageMeta,
	normalizePageParams,
	type PageParams,
} from "./pagination";
import {
	assertValidShiftAssignmentRange,
	type ShiftAssignmentRange,
} from "./shift-assignment";

type Db = typeof schema.db;
type DbExecutor = Pick<Db, "execute" | "select">;
type Logger = Pick<Console, "debug" | "error" | "info" | "log" | "warn">;

type ListFilter = PageParams & { search?: string };

function jaspelPeriod(date: Date | string) {
	const value = date instanceof Date ? date : new Date(`${date}T00:00:00`);
	return { month: value.getMonth() + 1, year: value.getFullYear() };
}

async function lockJaspelPeriod(db: DbExecutor, date: Date | string) {
	const { month, year } = jaspelPeriod(date);
	await db.execute(sql`SELECT pg_advisory_xact_lock(${year}, ${month})`);
}

async function assertJaspelPeriodMutable(db: DbExecutor, date: Date | string) {
	const { month, year } = jaspelPeriod(date);
	await lockJaspelPeriod(db, date);
	const [fund] = await db
		.select({ status: schema.jaspelFunds.status })
		.from(schema.jaspelFunds)
		.where(
			and(
				eq(schema.jaspelFunds.month, month),
				eq(schema.jaspelFunds.year, year),
			),
		)
		.limit(1);
	if (fund && fund.status !== "DRAFT")
		throw new ApiError(409, "Jaspel source period is locked");
}

export class UsersService {
	constructor(private db: Db) {}

	async findAll(filter: ListFilter = {}) {
		const pagination = normalizePageParams(filter);
		const where = filter.search
			? or(
					ilike(schema.users.name, `%${filter.search}%`),
					ilike(schema.users.email, `%${filter.search}%`),
				)
			: undefined;
		const data = await this.db
			.select({
				id: schema.users.id,
				email: schema.users.email,
				name: schema.users.name,
				role: schema.users.role,
				createdAt: schema.users.createdAt,
			})
			.from(schema.users)
			.where(where)
			.orderBy(asc(schema.users.name))
			.limit(pagination.limit)
			.offset(pagination.offset);
		const [{ count: total = 0 } = { count: 0 }] = await this.db
			.select({ count: count() })
			.from(schema.users)
			.where(where);
		return { data, meta: createPageMeta(total, pagination) };
	}

	async findOne(id: number) {
		const [user] = await this.db
			.select()
			.from(schema.users)
			.where(eq(schema.users.id, id));
		return user ?? null;
	}

	async findByEmail(email: string) {
		const [user] = await this.db
			.select()
			.from(schema.users)
			.where(eq(schema.users.email, email));
		return user ?? null;
	}

	async create(data: {
		email: string;
		name: string;
		role: "ADMIN" | "HRD" | "USER";
		password: string;
	}) {
		const [user] = await this.db
			.insert(schema.users)
			.values({ ...data, password: await bcrypt.hash(data.password, 12) })
			.returning({
				id: schema.users.id,
				email: schema.users.email,
				name: schema.users.name,
				role: schema.users.role,
			});
		return user;
	}

	async adminUpdate(
		id: number,
		data: { email?: string; name?: string; role?: "ADMIN" | "HRD" | "USER" },
	) {
		const [user] = await this.db
			.update(schema.users)
			.set({
				...data,
				sessionVersion: sql`${schema.users.sessionVersion} + 1`,
				updatedAt: new Date(),
			})
			.where(eq(schema.users.id, id))
			.returning({
				id: schema.users.id,
				email: schema.users.email,
				name: schema.users.name,
				role: schema.users.role,
			});
		if (!user) throw new ApiError(404, "User tidak ditemukan");
		return user;
	}

	async resetPassword(id: number, password: string) {
		await this.updatePassword(id, await bcrypt.hash(password, 12));
		return { message: "Password berhasil direset" };
	}

	async update(id: number, data: { name?: string; email?: string }) {
		const [user] = await this.db
			.update(schema.users)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(schema.users.id, id))
			.returning({
				id: schema.users.id,
				email: schema.users.email,
				name: schema.users.name,
				role: schema.users.role,
			});
		if (!user) throw new ApiError(404, "User tidak ditemukan");
		return user;
	}

	updatePassword(id: number, password: string) {
		return this.db
			.update(schema.users)
			.set({
				password,
				sessionVersion: sql`${schema.users.sessionVersion} + 1`,
				updatedAt: new Date(),
			})
			.where(eq(schema.users.id, id));
	}
}

export class AuthService {
	constructor(private users: UsersService) {}

	async login(data: { email: string; password: string }) {
		const user = await this.users.findByEmail(data.email);
		if (!user || !(await bcrypt.compare(data.password, user.password))) {
			throw new ApiError(401, "Kredensial tidak valid");
		}
		const session: SessionUser = {
			userId: user.id,
			email: user.email,
			role: user.role,
			sessionVersion: user.sessionVersion,
		};
		return {
			access_token: createToken(session),
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
			},
		};
	}

	async changePassword(
		userId: number,
		currentPassword: string,
		newPassword: string,
	) {
		const user = await this.users.findOne(userId);
		if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
			throw new ApiError(
				401,
				user ? "Password lama salah" : "User tidak ditemukan",
			);
		}
		await this.users.updatePassword(userId, await bcrypt.hash(newPassword, 12));
		return { message: "Password berhasil diubah" };
	}
}

export class AuditService {
	constructor(private db: Db) {}

	async record(data: {
		userId?: number;
		action: string;
		target: string;
		details?: Record<string, unknown>;
	}) {
		await this.db.insert(schema.auditLogs).values(data);
	}

	async findAll(filter: ListFilter = {}) {
		const pagination = normalizePageParams(filter);
		const where = filter.search
			? or(
					ilike(schema.auditLogs.action, `%${filter.search}%`),
					ilike(schema.auditLogs.target, `%${filter.search}%`),
				)
			: undefined;
		const data = await this.db
			.select({
				id: schema.auditLogs.id,
				action: schema.auditLogs.action,
				target: schema.auditLogs.target,
				details: schema.auditLogs.details,
				createdAt: schema.auditLogs.createdAt,
				user: {
					id: schema.users.id,
					name: schema.users.name,
					email: schema.users.email,
				},
			})
			.from(schema.auditLogs)
			.leftJoin(schema.users, eq(schema.users.id, schema.auditLogs.userId))
			.where(where)
			.orderBy(desc(schema.auditLogs.createdAt))
			.limit(pagination.limit)
			.offset(pagination.offset);
		const [{ count: total = 0 } = { count: 0 }] = await this.db
			.select({ count: count() })
			.from(schema.auditLogs)
			.where(where);
		return { data, meta: createPageMeta(total, pagination) };
	}
}

export class EmployeesService {
	constructor(private db: Db) {}
	async findAll(filter: ListFilter = {}) {
		const pagination = normalizePageParams(filter);
		const where = filter.search
			? or(
					ilike(schema.employees.name, `%${filter.search}%`),
					ilike(schema.employees.employeeCode, `%${filter.search}%`),
					ilike(schema.employees.department, `%${filter.search}%`),
				)
			: undefined;
		const rows = await this.db
			.select()
			.from(schema.employees)
			.where(where)
			.orderBy(asc(schema.employees.name))
			.limit(pagination.limit)
			.offset(pagination.offset);
		const [{ count: total = 0 } = { count: 0 }] = await this.db
			.select({ count: count() })
			.from(schema.employees)
			.where(where);
		return {
			data: await this.withShiftAssignments(rows),
			meta: createPageMeta(total, pagination),
		};
	}
	async findOne(id: number) {
		const [result] = await this.db
			.select()
			.from(schema.employees)
			.where(eq(schema.employees.id, id));
		if (!result) throw new ApiError(404, `Employee with ID ${id} not found`);
		return (await this.withShiftAssignments([result]))[0];
	}
	async create(data: CreateEmployee) {
		await this.validateShiftIds(data.shiftIds);
		const [result] = await this.db
			.insert(schema.employees)
			.values(data)
			.returning();
		return result;
	}
	async bulkCreate(data: CreateEmployee[]) {
		if (!data.length) return [];
		await this.validateShiftIds(data.flatMap((employee) => employee.shiftIds));
		return this.db.insert(schema.employees).values(data).returning();
	}
	async update(id: number, data: UpdateEmployee) {
		if (data.shiftIds) await this.validateShiftIds(data.shiftIds);
		const [result] = await this.db
			.update(schema.employees)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(schema.employees.id, id))
			.returning();
		if (!result) throw new ApiError(404, `Employee with ID ${id} not found`);
		return result;
	}
	async remove(id: number) {
		const [result] = await this.db
			.delete(schema.employees)
			.where(eq(schema.employees.id, id))
			.returning();
		if (!result) throw new ApiError(404, `Employee with ID ${id} not found`);
		return { message: "Employee deleted successfully" };
	}
	async bulkAssignShift(
		employeeIds: number[] | null,
		shiftIds: number[],
		range: ShiftAssignmentRange,
	) {
		try {
			assertValidShiftAssignmentRange(range.startDate, range.endDate);
		} catch (error) {
			throw new ApiError(400, (error as Error).message);
		}
		await this.validateShiftIds(shiftIds);
		let resolvedIds: number[] = employeeIds ?? [];
		if (employeeIds === null) {
			const allEmployees = await this.db
				.select({ id: schema.employees.id })
				.from(schema.employees);
			resolvedIds = allEmployees.map((e) => e.id);
			if (resolvedIds.length === 0)
				throw new ApiError(404, "Tidak ada pegawai untuk diberi shift");
		}
		const employees = await this.db
			.select({ id: schema.employees.id })
			.from(schema.employees)
			.where(inArray(schema.employees.id, resolvedIds));
		if (employees.length !== new Set(resolvedIds).size)
			throw new ApiError(404, "Pegawai tidak ditemukan");
		const conflicts = await this.db
			.select({
				employeeId: schema.employeeShiftAssignments.employeeId,
				employeeName: schema.employees.name,
				startDate: schema.employeeShiftAssignments.startDate,
				endDate: schema.employeeShiftAssignments.endDate,
			})
			.from(schema.employeeShiftAssignments)
			.innerJoin(
				schema.employees,
				eq(schema.employees.id, schema.employeeShiftAssignments.employeeId),
			)
			.where(
				and(
					inArray(schema.employeeShiftAssignments.employeeId, resolvedIds),
					or(
						isNull(schema.employeeShiftAssignments.endDate),
						gte(schema.employeeShiftAssignments.endDate, range.startDate),
					),
					lte(
						schema.employeeShiftAssignments.startDate,
						range.endDate ?? range.startDate,
					),
				),
			);
		if (conflicts.length)
			throw new ApiError(
				409,
				"Periode shift bentrok dengan jadwal yang sudah ada",
				{
					conflicts,
				},
			);
		const assignmentGroupId = randomUUID();
		await this.db.transaction(async (tx) => {
			await tx.insert(schema.employeeShiftAssignments).values(
				resolvedIds.flatMap((employeeId) =>
					shiftIds.map((shiftId) => ({
						employeeId,
						shiftId,
						assignmentGroupId,
						startDate: range.startDate,
						endDate: range.endDate ?? null,
					})),
				),
			);
			await tx
				.update(schema.employees)
				.set({ shiftIds, updatedAt: new Date() })
				.where(inArray(schema.employees.id, resolvedIds));
		});
		return { message: `Shift diterapkan ke ${resolvedIds.length} pegawai` };
	}
	async resolveEmployeeId(userId: number) {
		const [employee] = await this.db
			.select({ id: schema.employees.id })
			.from(schema.employees)
			.where(eq(schema.employees.userId, userId));
		if (!employee)
			throw new ApiError(403, "Akun belum terhubung ke data pegawai");
		return employee.id;
	}
	async validateShiftIds(shiftIds: number[]) {
		if (!shiftIds.length) return;
		const rows = await this.db
			.select({ id: schema.shifts.id })
			.from(schema.shifts)
			.where(
				and(
					inArray(schema.shifts.id, shiftIds),
					eq(schema.shifts.isActive, true),
				),
			);
		if (rows.length !== new Set(shiftIds).size)
			throw new ApiError(400, "Shift tidak valid atau tidak aktif");
	}
	private async withShiftAssignments<T extends { id: number }>(rows: T[]) {
		if (!rows.length) return [];
		const assignments = await this.db
			.select({
				id: schema.employeeShiftAssignments.id,
				employeeId: schema.employeeShiftAssignments.employeeId,
				shiftId: schema.employeeShiftAssignments.shiftId,
				startDate: schema.employeeShiftAssignments.startDate,
				endDate: schema.employeeShiftAssignments.endDate,
				shiftName: schema.shifts.name,
				startTime: schema.shifts.startTime,
				endTime: schema.shifts.endTime,
			})
			.from(schema.employeeShiftAssignments)
			.innerJoin(
				schema.shifts,
				eq(schema.shifts.id, schema.employeeShiftAssignments.shiftId),
			)
			.where(
				inArray(
					schema.employeeShiftAssignments.employeeId,
					rows.map((row) => row.id),
				),
			)
			.orderBy(desc(schema.employeeShiftAssignments.startDate));
		return rows.map((row) => ({
			...row,
			shiftAssignments: assignments.filter(
				(assignment) => assignment.employeeId === row.id,
			),
		}));
	}
}

export class ShiftsService {
	constructor(private db: Db) {}
	async findAll(filter: ListFilter = {}) {
		const pagination = normalizePageParams(filter);
		const where = filter.search
			? ilike(schema.shifts.name, `%${filter.search}%`)
			: undefined;
		const data = await this.db
			.select()
			.from(schema.shifts)
			.where(where)
			.orderBy(asc(schema.shifts.name))
			.limit(pagination.limit)
			.offset(pagination.offset);
		const [{ count: total = 0 } = { count: 0 }] = await this.db
			.select({ count: count() })
			.from(schema.shifts)
			.where(where);
		return { data, meta: createPageMeta(total, pagination) };
	}
	async findOne(id: number) {
		const [result] = await this.db
			.select()
			.from(schema.shifts)
			.where(eq(schema.shifts.id, id));
		if (!result) throw new ApiError(404, `Shift with ID ${id} not found`);
		return result;
	}
	async create(data: CreateShift) {
		const [result] = await this.db
			.insert(schema.shifts)
			.values(data)
			.returning();
		return result;
	}
	async update(id: number, data: UpdateShift) {
		const [result] = await this.db
			.update(schema.shifts)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(schema.shifts.id, id))
			.returning();
		if (!result) throw new ApiError(404, `Shift with ID ${id} not found`);
		return result;
	}
	async remove(id: number) {
		const [result] = await this.db
			.delete(schema.shifts)
			.where(eq(schema.shifts.id, id))
			.returning();
		if (!result) throw new ApiError(404, `Shift with ID ${id} not found`);
		return { message: "Shift deleted successfully" };
	}
}

export class DevicesService {
	constructor(private db: Db) {}
	async findAll(filter: ListFilter = {}) {
		const pagination = normalizePageParams(filter);
		const where = filter.search
			? or(
					ilike(schema.devices.name, `%${filter.search}%`),
					ilike(schema.devices.serialNumber, `%${filter.search}%`),
				)
			: undefined;
		const data = await this.db
			.select()
			.from(schema.devices)
			.where(where)
			.orderBy(asc(schema.devices.name))
			.limit(pagination.limit)
			.offset(pagination.offset);
		const [{ count: total = 0 } = { count: 0 }] = await this.db
			.select({ count: count() })
			.from(schema.devices)
			.where(where);
		return { data, meta: createPageMeta(total, pagination) };
	}
	async findOne(id: number) {
		const [result] = await this.db
			.select()
			.from(schema.devices)
			.where(eq(schema.devices.id, id));
		if (!result) throw new ApiError(404, `Device with ID ${id} not found`);
		return result;
	}
	async create(data: CreateDevice) {
		const [result] = await this.db
			.insert(schema.devices)
			.values(data)
			.returning();
		return result;
	}
	async update(id: number, data: UpdateDevice) {
		const [result] = await this.db
			.update(schema.devices)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(schema.devices.id, id))
			.returning();
		if (!result) throw new ApiError(404, `Device with ID ${id} not found`);
		return result;
	}
	async remove(id: number) {
		const [result] = await this.db
			.delete(schema.devices)
			.where(eq(schema.devices.id, id))
			.returning();
		if (!result) throw new ApiError(404, `Device with ID ${id} not found`);
		return { message: "Device deleted successfully" };
	}
	async setBlocked(id: number, blocked: boolean) {
		const [result] = await this.db
			.update(schema.devices)
			.set({ isBlocked: blocked, updatedAt: new Date() })
			.where(eq(schema.devices.id, id))
			.returning();
		if (!result) throw new ApiError(404, `Device with ID ${id} not found`);
		return result;
	}
	async getCommands(deviceId: number, filter: PageParams = {}) {
		const pagination = normalizePageParams(filter);
		const where = eq(schema.deviceCommands.deviceId, deviceId);
		const data = await this.db
			.select()
			.from(schema.deviceCommands)
			.where(where)
			.orderBy(desc(schema.deviceCommands.createdAt))
			.limit(pagination.limit)
			.offset(pagination.offset);
		const [{ count: total = 0 } = { count: 0 }] = await this.db
			.select({ count: count() })
			.from(schema.deviceCommands)
			.where(where);
		return { data, meta: createPageMeta(total, pagination) };
	}
	async sendCommand(dto: SendCommand) {
		await this.findOne(dto.deviceId);
		if (dto.type === "command.system")
			throw new ApiError(400, "System commands are disabled");
		const commands: string[] = [];
		switch (dto.type) {
			case "check":
				commands.push("CHECK");
				break;
			case "reset":
				commands.push("REBOOT");
				break;
			case "info":
				commands.push("INFO");
				break;
			case "log":
				commands.push("LOG");
				break;
			case "reboot":
				commands.push("REBOOT");
				break;
			case "reload":
				commands.push("RELOAD OPTIONS");
				break;
			case "set.timezone":
				commands.push(`SET OPTION DtFmt=${dto.timezone ?? 7}`, "REBOOT");
				break;
			case "set.time": {
				const now = new Date();
				const p = (n: number) => String(n).padStart(2, "0");
				commands.push(
					`SET OPTION DateTime=${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`,
				);
				break;
			}
			case "camera.enable":
				commands.push("SET OPTION CapturePhoto=1", "SET OPTION PhotoStamp=1");
				break;
			case "camera.disable":
				commands.push("SET OPTION CapturePhoto=0");
				break;
			case "set.volume":
				commands.push(`SET OPTION VOLUME=${dto.volume ?? 50}`);
				break;
			case "set.language":
				commands.push(`SET OPTION Language=${dto.language ?? "83"}`);
				break;
			case "user.info":
				if (!dto.user_id) throw new ApiError(400, "user_id is required");
				commands.push(
					`DATA QUERY USERINFO PIN=${dto.user_id}`,
					`DATA QUERY FINGERTMP PIN=${dto.user_id}`,
				);
				break;
			case "user.sync":
				commands.push("DATA QUERY USERINFO");
				break;
			case "user.edit": {
				if (!dto.user_id) throw new ApiError(400, "user_id is required");
				const parts = [`PIN=${dto.user_id}`];
				if (dto.name) parts.push(`Name=${dto.name}`);
				if (dto.privilege !== undefined) parts.push(`Pri=${dto.privilege}`);
				if (dto.password !== undefined) parts.push(`Passwd=${dto.password}`);
				commands.push(`DATA UPDATE USERINFO ${parts.join("\t")}`);
				break;
			}
			case "user.delete":
				if (!dto.user_id) throw new ApiError(400, "user_id is required");
				commands.push(
					`DATA DELETE USERINFO PIN=${dto.user_id}`,
					`DATA DELETE FINGERTMP PIN=${dto.user_id}`,
				);
				break;
			case "user.clone":
				return this.cloneUser(dto);
			case "attendance.download":
			case "attendance.verify":
				if (!dto.start_date || !dto.end_date)
					throw new ApiError(400, "start_date and end_date required");
				commands.push(
					`${dto.type === "attendance.download" ? "DATA QUERY" : "VERIFY SUM"} ATTLOG StartTime=${dto.start_date} EndTime=${dto.end_date}`,
				);
				break;
			case "attendance.clear":
				commands.push("CLEAR LOG");
				break;
			default:
				throw new ApiError(
					400,
					`Unsupported command type: ${(dto as { type: string }).type}`,
				);
		}
		const results = [];
		for (const command of commands) {
			const [result] = await this.db
				.insert(schema.deviceCommands)
				.values({ deviceId: dto.deviceId, command })
				.returning();
			results.push(result);
		}
		return results;
	}
	private async cloneUser(dto: SendCommand) {
		if (!dto.user_id || !dto.device_target?.length)
			throw new ApiError(400, "user_id and device_target are required");
		const [employee] = await this.db
			.select()
			.from(schema.employees)
			.where(
				or(
					eq(schema.employees.biometricId, dto.user_id),
					eq(schema.employees.employeeCode, dto.user_id),
				),
			);
		const templates = await this.db
			.select()
			.from(schema.fingerprintTemplates)
			.where(
				and(
					eq(schema.fingerprintTemplates.deviceId, dto.deviceId),
					eq(schema.fingerprintTemplates.userId, dto.user_id),
				),
			);
		const results = [];
		for (const deviceId of dto.device_target) {
			if (deviceId === dto.deviceId) continue;
			const [user] = await this.db
				.insert(schema.deviceCommands)
				.values({
					deviceId,
					command: `DATA UPDATE USERINFO PIN=${dto.user_id}\tName=${employee?.name ?? dto.user_id}\tPri=0\tPasswd=\tCard=\tGrp=`,
				})
				.returning();
			results.push(user);
			for (const template of templates) {
				if (!template.template) continue;
				const [fp] = await this.db
					.insert(schema.deviceCommands)
					.values({
						deviceId,
						command: `DATA UPDATE FINGERTMP PIN=${template.userId}\tFID=${template.fid}\tSize=${template.size ?? 0}\tValid=${template.valid ? 1 : 0}\tTMP=${template.template}`,
					})
					.returning();
				results.push(fp);
			}
		}
		return results;
	}
}

export type AttendanceLogFilter = {
	from?: Date;
	to?: Date;
	status?: string;
	deviceId?: number;
	limit?: number;
	page?: number;
	search?: string;
};

export class AttendanceLogsService {
	constructor(
		private db: Db,
		private shiftEngine?: ShiftEngineService,
	) {}
	async findAll(filter: AttendanceLogFilter & { employeeId?: number } = {}) {
		const pagination = normalizePageParams(filter);
		const conditions: SQL[] = [];
		if (filter.employeeId)
			conditions.push(eq(schema.attendanceLogs.employeeId, filter.employeeId));
		if (filter.from)
			conditions.push(gte(schema.attendanceLogs.timestamp, filter.from));
		if (filter.to)
			conditions.push(lte(schema.attendanceLogs.timestamp, filter.to));
		if (
			filter.status &&
			["PRESENT", "LATE", "ABSENT", "EARLY_OUT"].includes(filter.status)
		)
			conditions.push(
				eq(
					schema.attendanceLogs.status,
					filter.status as (typeof schema.attendanceLogs.status.enumValues)[number],
				),
			);
		if (filter.deviceId)
			conditions.push(eq(schema.attendanceLogs.deviceId, filter.deviceId));
		if (filter.search)
			conditions.push(
				or(
					ilike(schema.employees.name, `%${filter.search}%`),
					ilike(schema.employees.employeeCode, `%${filter.search}%`),
				) as SQL,
			);
		const where = conditions.length ? and(...conditions) : undefined;
		const query = this.db
			.select({
				id: schema.attendanceLogs.id,
				timestamp: schema.attendanceLogs.timestamp,
				type: schema.attendanceLogs.type,
				status: schema.attendanceLogs.status,
				photoUrl: schema.attendanceLogs.photoUrl,
				employee: {
					name: schema.employees.name,
					employeeCode: schema.employees.employeeCode,
				},
				device: {
					name: schema.devices.name,
					serialNumber: schema.devices.serialNumber,
				},
			})
			.from(schema.attendanceLogs)
			.leftJoin(
				schema.employees,
				eq(schema.attendanceLogs.employeeId, schema.employees.id),
			)
			.leftJoin(
				schema.devices,
				eq(schema.attendanceLogs.deviceId, schema.devices.id),
			)
			.where(where)
			.orderBy(desc(schema.attendanceLogs.timestamp));
		const [{ count: total = 0 } = { count: 0 }] = await this.db
			.select({ count: count() })
			.from(schema.attendanceLogs)
			.leftJoin(
				schema.employees,
				eq(schema.attendanceLogs.employeeId, schema.employees.id),
			)
			.where(where);
		return {
			data: await query.limit(pagination.limit).offset(pagination.offset),
			meta: createPageMeta(total, pagination),
		};
	}
	async createCorrection(
		attendanceLogId: number,
		requestedBy: number,
		newTimestamp: Date,
		reason: string,
	) {
		return this.db.transaction(async (tx) => {
			const [log] = await tx
				.select()
				.from(schema.attendanceLogs)
				.where(eq(schema.attendanceLogs.id, attendanceLogId));
			if (!log) throw new ApiError(404, "Attendance log not found");
			await assertJaspelPeriodMutable(tx, log.timestamp);
			await assertJaspelPeriodMutable(tx, newTimestamp);
			const [result] = await tx
				.insert(schema.attendanceCorrections)
				.values({
					attendanceLogId,
					requestedBy,
					oldTimestamp: log.timestamp,
					newTimestamp,
					reason,
				})
				.returning();
			return result;
		});
	}
	async findCorrections(filter: PageParams = {}) {
		const pagination = normalizePageParams(filter);
		const data = await this.db
			.select()
			.from(schema.attendanceCorrections)
			.orderBy(desc(schema.attendanceCorrections.createdAt))
			.limit(pagination.limit)
			.offset(pagination.offset);
		const [{ count: total = 0 } = { count: 0 }] = await this.db
			.select({ count: count() })
			.from(schema.attendanceCorrections);
		return { data, meta: createPageMeta(total, pagination) };
	}
	async reviewCorrection(
		id: number,
		reviewedBy: number,
		status: "APPROVED" | "REJECTED",
		reviewNote?: string,
	) {
		return this.db.transaction(async (tx) => {
			const [correction] = await tx
				.update(schema.attendanceCorrections)
				.set({ status: "PROCESSING", reviewedBy, updatedAt: new Date() })
				.where(
					and(
						eq(schema.attendanceCorrections.id, id),
						eq(schema.attendanceCorrections.status, "PENDING"),
					),
				)
				.returning();
			if (!correction)
				throw new ApiError(404, "Correction not found or already processed");
			await assertJaspelPeriodMutable(tx, correction.oldTimestamp);
			await assertJaspelPeriodMutable(tx, correction.newTimestamp);
			if (status === "APPROVED") {
				const [log] = await tx
					.select({
						employeeId: schema.attendanceLogs.employeeId,
						type: schema.attendanceLogs.type,
						shiftIds: schema.employees.shiftIds,
					})
					.from(schema.attendanceLogs)
					.innerJoin(
						schema.employees,
						eq(schema.employees.id, schema.attendanceLogs.employeeId),
					)
					.where(eq(schema.attendanceLogs.id, correction.attendanceLogId));
				if (!log) throw new ApiError(404, "Attendance log not found");
				const evaluation = this.shiftEngine
					? await this.shiftEngine.evaluateAttendance({
							employeeId: log.employeeId,
							shiftIds: log.shiftIds,
							timestamp: correction.newTimestamp,
							type: log.type,
						})
					: ("PRESENT" as const);
				await tx
					.update(schema.attendanceLogs)
					.set({
						timestamp: correction.newTimestamp,
						status: evaluation,
						verified: true,
					})
					.where(eq(schema.attendanceLogs.id, correction.attendanceLogId));
			}
			const [result] = await tx
				.update(schema.attendanceCorrections)
				.set({ status, reviewedBy, reviewNote, updatedAt: new Date() })
				.where(
					and(
						eq(schema.attendanceCorrections.id, id),
						eq(schema.attendanceCorrections.status, "PROCESSING"),
					),
				)
				.returning();
			return result;
		});
	}
	async generateExcel(
		filter: AttendanceLogFilter & { employeeId?: number } = {},
	) {
		const workbook = new Workbook(),
			sheet = workbook.addWorksheet("Log Absensi");
		sheet.columns = [
			{ header: "WAKTU", key: "timestamp", width: 22 },
			{ header: "NIP", key: "code", width: 18 },
			{ header: "PEGAWAI", key: "name", width: 30 },
			{ header: "TIPE", key: "type", width: 10 },
			{ header: "STATUS", key: "status", width: 14 },
			{ header: "PERANGKAT", key: "device", width: 24 },
		];
		const result = await this.findAll({ ...filter, page: 1, limit: 10000 });
		for (const row of result.data)
			sheet.addRow({
				timestamp: row.timestamp,
				code: row.employee?.employeeCode ?? "-",
				name: row.employee?.name ?? "-",
				type: row.type,
				status: row.status,
				device: row.device?.name ?? "Manual",
			});
		return workbook;
	}
	async createManualLog(
		employeeId: number,
		timestamp: Date,
		type: "IN" | "OUT",
	) {
		return this.db.transaction(async (tx) => {
			await assertJaspelPeriodMutable(tx, timestamp);
			const [result] = await tx
				.insert(schema.attendanceLogs)
				.values({
					employeeId,
					timestamp,
					type,
					status: "PRESENT",
					verified: false,
				})
				.returning();
			return result;
		});
	}
	async getStats() {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);
		const [totalEmployees] = await this.db
			.select({ count: count() })
			.from(schema.employees)
			.where(eq(schema.employees.isActive, true));
		const logs = await this.db
			.select({
				employeeId: schema.attendanceLogs.employeeId,
				status: schema.attendanceLogs.status,
			})
			.from(schema.attendanceLogs)
			.where(
				and(
					gte(schema.attendanceLogs.timestamp, today),
					lte(schema.attendanceLogs.timestamp, tomorrow),
					eq(schema.attendanceLogs.type, "IN"),
				),
			);
		const devices = await this.db.select().from(schema.devices);
		const weeklyTrend = [];
		const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
		for (let i = 6; i >= 0; i--) {
			const start = new Date();
			start.setDate(start.getDate() - i);
			start.setHours(0, 0, 0, 0);
			const end = new Date(start);
			end.setDate(end.getDate() + 1);
			const rows = await this.db
				.select({ status: schema.attendanceLogs.status })
				.from(schema.attendanceLogs)
				.where(
					and(
						gte(schema.attendanceLogs.timestamp, start),
						lte(schema.attendanceLogs.timestamp, end),
						eq(schema.attendanceLogs.type, "IN"),
					),
				);
			weeklyTrend.push({
				name: days[start.getDay()],
				present: rows.filter((r) => r.status === "PRESENT").length,
				late: rows.filter((r) => r.status === "LATE").length,
				absent: rows.filter((r) => r.status === "ABSENT").length,
			});
		}
		return {
			totalEmployees: totalEmployees?.count ?? 0,
			presentToday: new Set(logs.map((l) => l.employeeId)).size,
			lateToday: new Set(
				logs.filter((l) => l.status === "LATE").map((l) => l.employeeId),
			).size,
			devicesOnline: devices.filter((d) => d.isOnline).length,
			devicesTotal: devices.length,
			weeklyTrend,
		};
	}
}

export type LeaveFilter = {
	employeeId?: number;
	page?: number;
	limit?: number;
	search?: string;
};
export class LeavesService {
	constructor(private db: Db) {}
	async findAll(filter: LeaveFilter = {}) {
		const pagination = normalizePageParams(filter);
		const conditions: SQL[] = [];
		if (filter.employeeId)
			conditions.push(eq(schema.leaves.employeeId, filter.employeeId));
		if (filter.search)
			conditions.push(
				or(
					ilike(schema.employees.name, `%${filter.search}%`),
					ilike(schema.employees.employeeCode, `%${filter.search}%`),
				) as SQL,
			);
		const where = conditions.length ? and(...conditions) : undefined;
		const query = this.db
			.select({
				id: schema.leaves.id,
				type: schema.leaves.type,
				startDate: schema.leaves.startDate,
				endDate: schema.leaves.endDate,
				reason: schema.leaves.reason,
				status: schema.leaves.status,
				createdAt: schema.leaves.createdAt,
				employee: {
					name: schema.employees.name,
					employeeCode: schema.employees.employeeCode,
				},
			})
			.from(schema.leaves)
			.leftJoin(
				schema.employees,
				eq(schema.leaves.employeeId, schema.employees.id),
			)
			.where(where)
			.orderBy(desc(schema.leaves.createdAt));
		const [{ count: total = 0 } = { count: 0 }] = await this.db
			.select({ count: count() })
			.from(schema.leaves)
			.leftJoin(
				schema.employees,
				eq(schema.leaves.employeeId, schema.employees.id),
			)
			.where(where);
		return {
			data: await query.limit(pagination.limit).offset(pagination.offset),
			meta: createPageMeta(total, pagination),
		};
	}
	async create(data: typeof schema.leaves.$inferInsert) {
		if (data.startDate > data.endDate)
			throw new ApiError(400, "startDate must not be after endDate");
		return this.db.transaction(async (tx) => {
			await assertJaspelPeriodMutable(tx, data.startDate);
			await assertJaspelPeriodMutable(tx, data.endDate);
			const overlap = await tx
				.select({ id: schema.leaves.id })
				.from(schema.leaves)
				.where(
					and(
						eq(schema.leaves.employeeId, data.employeeId),
						inArray(schema.leaves.status, ["PENDING", "APPROVED"]),
						lte(schema.leaves.startDate, data.endDate),
						gte(schema.leaves.endDate, data.startDate),
					),
				)
				.limit(1);
			if (overlap.length)
				throw new ApiError(409, "Leave period overlaps an existing request");
			const [result] = await tx.insert(schema.leaves).values(data).returning();
			return result;
		});
	}
	async setStatus(
		id: number,
		userId: number,
		status: "APPROVED" | "REJECTED",
		rejectionReason?: string,
	) {
		if (status === "REJECTED" && !rejectionReason?.trim())
			throw new ApiError(400, "Alasan penolakan wajib diisi");
		return this.db.transaction(async (tx) => {
			const [leave] = await tx
				.select({
					startDate: schema.leaves.startDate,
					endDate: schema.leaves.endDate,
				})
				.from(schema.leaves)
				.where(eq(schema.leaves.id, id));
			if (!leave) throw new ApiError(404, "Leave not found");
			await assertJaspelPeriodMutable(tx, leave.startDate);
			await assertJaspelPeriodMutable(tx, leave.endDate);
			const [result] = await tx
				.update(schema.leaves)
				.set({
					status,
					approvedBy: userId,
					rejectionReason: status === "REJECTED" ? rejectionReason : null,
					updatedAt: new Date(),
				})
				.where(
					and(eq(schema.leaves.id, id), eq(schema.leaves.status, "PENDING")),
				)
				.returning();
			if (!result)
				throw new ApiError(404, "Leave not found or already processed");
			return result;
		});
	}
	async remove(id: number) {
		return this.db.transaction(async (tx) => {
			const [leave] = await tx
				.select({
					startDate: schema.leaves.startDate,
					endDate: schema.leaves.endDate,
				})
				.from(schema.leaves)
				.where(eq(schema.leaves.id, id));
			if (!leave) throw new ApiError(404, "Leave not found");
			await assertJaspelPeriodMutable(tx, leave.startDate);
			await assertJaspelPeriodMutable(tx, leave.endDate);
			const [result] = await tx
				.delete(schema.leaves)
				.where(eq(schema.leaves.id, id))
				.returning();
			if (!result) throw new ApiError(404, "Leave not found");
			return { message: "Leave deleted" };
		});
	}
}

const SECRET_KEYS = new Set(["TELEGRAM_TOKEN", "HOLIDAY_API_KEY"]);
const SETTING_KEYS = new Set([
	"TELEGRAM_TOKEN",
	"TELEGRAM_CHAT_ID",
	"TELEGRAM_NOTIFY_ATTENDANCE",
	"TELEGRAM_NOTIFY_DEVICE_OFFLINE",
	"HOLIDAY_API_URL",
	"HOLIDAY_API_KEY",
]);
export class SettingsService {
	constructor(private db: Db) {}
	async getAll() {
		return (await this.db.select().from(schema.settings)).map((setting) => ({
			...setting,
			value:
				SECRET_KEYS.has(setting.key) && setting.value
					? "********"
					: setting.value,
		}));
	}
	async get(key: string) {
		const [result] = await this.db
			.select()
			.from(schema.settings)
			.where(eq(schema.settings.key, key));
		return result?.value ?? null;
	}
	async setBulk(data: Record<string, string>) {
		for (const [key, value] of Object.entries(data)) {
			if (!SETTING_KEYS.has(key))
				throw new ApiError(400, `Unknown setting: ${key}`);
			if (SECRET_KEYS.has(key) && (!value || value === "********")) continue;
			await this.db
				.insert(schema.settings)
				.values({ key, value })
				.onConflictDoUpdate({
					target: schema.settings.key,
					set: { value, updatedAt: new Date() },
				});
		}
		return { message: "Settings updated" };
	}
}

export class HolidaysService {
	constructor(
		private db: Db,
		private settings: SettingsService,
		private logger: Logger = console,
	) {}
	async findAll(
		filter: { page?: number; limit?: number; search?: string } = {},
	) {
		const pagination = normalizePageParams(filter);
		const where = filter.search
			? ilike(schema.holidays.name, `%${filter.search}%`)
			: undefined;
		const query = this.db
			.select()
			.from(schema.holidays)
			.where(where)
			.orderBy(asc(schema.holidays.date));
		const [{ count: total = 0 } = { count: 0 }] = await this.db
			.select({ count: count() })
			.from(schema.holidays)
			.where(where);
		return {
			data: await query.limit(pagination.limit).offset(pagination.offset),
			meta: createPageMeta(total, pagination),
		};
	}
	async create(data: CreateHoliday) {
		const [result] = await this.db
			.insert(schema.holidays)
			.values(data)
			.returning();
		return result;
	}
	async update(id: number, data: UpdateHoliday) {
		const [result] = await this.db
			.update(schema.holidays)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(schema.holidays.id, id))
			.returning();
		if (!result) throw new ApiError(404, `Holiday with ID ${id} not found`);
		return result;
	}
	async remove(id: number) {
		const [result] = await this.db
			.delete(schema.holidays)
			.where(eq(schema.holidays.id, id))
			.returning();
		if (!result) throw new ApiError(404, `Holiday with ID ${id} not found`);
		return { message: "Holiday deleted successfully" };
	}
	async syncFromExternal(year = new Date().getFullYear()) {
		const configured = await this.settings.get("HOLIDAY_API_URL");
		const url = new URL(
			(
				configured || "https://use.api.co.id/holidays/indonesia/?year={year}"
			).replace("{year}", String(year)),
		);
		if (
			url.protocol !== "https:" ||
			!["use.api.co.id", "api.co.id"].includes(url.hostname)
		)
			throw new ApiError(400, "Holiday API host is not allowed");
		if (!url.searchParams.has("year"))
			url.searchParams.set("year", String(year));
		const apiKey =
			(await this.settings.get("HOLIDAY_API_KEY")) ||
			process.env.HOLIDAY_API_KEY;
		if (!apiKey) throw new ApiError(400, "API Key hari libur belum diatur");
		this.logger.log(`Syncing holidays from ${url.origin}`);
		const response = await fetch(url, {
			headers: { "x-api-co-id": apiKey },
			signal: AbortSignal.timeout(10_000),
		});
		if (!response.ok)
			throw new ApiError(
				400,
				`Gagal mengambil data hari libur (${response.status})`,
			);
		const json = (await response.json()) as { data?: unknown } | unknown[];
		const rows = Array.isArray(json) ? json : json.data;
		if (!Array.isArray(rows))
			throw new ApiError(400, "Format respons hari libur tidak dikenali");
		let synced = 0;
		for (const item of rows as {
			date: string;
			name: string;
			type?: string;
			is_national_holiday: boolean;
		}[]) {
			if (!item.is_national_holiday && item.type !== "Joint Holiday") continue;
			const inserted = await this.db
				.insert(schema.holidays)
				.values({
					date: item.date,
					name: item.name,
					description: `${item.type === "Joint Holiday" ? "Cuti Bersama" : "Hari Libur Nasional"} (sync otomatis)`,
				})
				.onConflictDoNothing({ target: schema.holidays.date })
				.returning({ id: schema.holidays.id });
			synced += inserted.length;
		}
		return { synced };
	}
}

function parseTime(value: string) {
	const [h = "0", m = "0"] = value.split(":");
	return Number(h) * 60 + Number(m);
}
function formatTime(value: Date) {
	return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}
export class ReportsService {
	constructor(private db: DbExecutor) {}
	async getAvailablePeriods() {
		const result = await this.db.execute(
			sql`SELECT DISTINCT EXTRACT(MONTH FROM timestamp) as month, EXTRACT(YEAR FROM timestamp) as year FROM attendance_logs ORDER BY year DESC, month DESC`,
		);
		return result.rows.length
			? result.rows.map((row) => ({
					month: Number(row.month),
					year: Number(row.year),
				}))
			: [{ month: new Date().getMonth() + 1, year: new Date().getFullYear() }];
	}
	private async buildDailyRecap(
		month: number,
		year: number,
		filter?: ListFilter & { employeeId?: number },
	) {
		const daysInMonth = new Date(year, month, 0).getDate();
		const pagination = filter ? normalizePageParams(filter) : undefined;
		const employeeWhere = and(
			eq(schema.employees.isActive, true),
			filter?.employeeId
				? eq(schema.employees.id, filter.employeeId)
				: undefined,
			filter?.search
				? or(
						ilike(schema.employees.name, `%${filter.search}%`),
						ilike(schema.employees.employeeCode, `%${filter.search}%`),
					)
				: undefined,
		);
		const employeeQuery = this.db
			.select({
				id: schema.employees.id,
				name: schema.employees.name,
				employeeCode: schema.employees.employeeCode,
				department: schema.employees.department,
				shiftIds: schema.employees.shiftIds,
			})
			.from(schema.employees)
			.where(employeeWhere)
			.orderBy(asc(schema.employees.name));
		const employees = pagination
			? await employeeQuery.limit(pagination.limit).offset(pagination.offset)
			: await employeeQuery;
		if (!employees.length) return [];
		const employeeIds = employees.map((employee) => employee.id);
		const shifts = await this.db.select().from(schema.shifts);
		const shiftAssignments = await this.db
			.select()
			.from(schema.employeeShiftAssignments)
			.where(inArray(schema.employeeShiftAssignments.employeeId, employeeIds));
		const logs = await this.db
			.select()
			.from(schema.attendanceLogs)
			.where(
				and(
					between(
						schema.attendanceLogs.timestamp,
						new Date(year, month - 1, 1),
						new Date(year, month, 0, 23, 59, 59),
					),
					inArray(schema.attendanceLogs.employeeId, employeeIds),
				),
			);
		const holidays = new Set(
			(
				await this.db
					.select()
					.from(schema.holidays)
					.where(
						between(
							schema.holidays.date,
							`${year}-${String(month).padStart(2, "0")}-01`,
							`${year}-${String(month).padStart(2, "0")}-${daysInMonth}`,
						),
					)
			).map((h) => h.date),
		);
		const leaves = await this.db
			.select()
			.from(schema.leaves)
			.where(
				and(
					eq(schema.leaves.status, "APPROVED"),
					inArray(schema.leaves.employeeId, employeeIds),
				),
			);
		return employees.map((employee) => {
			let totalPresent = 0,
				totalLate = 0,
				totalEarlyOut = 0,
				totalAbsent = 0,
				totalLeave = 0,
				totalLateMinutesSum = 0,
				totalEarlyOutMinutesSum = 0;
			const days = [];
			for (let day = 1; day <= daysInMonth; day++) {
				const date = new Date(year, month - 1, day);
				const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
				const employeeAssignments = shiftAssignments.filter(
					(assignment) => assignment.employeeId === employee.id,
				);
				const datedShiftIds = employeeAssignments
					.filter(
						(assignment) =>
							assignment.startDate <= dateStr &&
							(!assignment.endDate || assignment.endDate >= dateStr),
					)
					.map((assignment) => assignment.shiftId);
				const applicableShiftIds = employeeAssignments.length
					? datedShiftIds
					: employee.shiftIds;
				const shift =
					shifts
						.filter(
							(s) =>
								applicableShiftIds.includes(s.id) &&
								s.isActive &&
								s.workDays.includes(date.getDay()) &&
								(!s.effectiveFrom || dateStr >= s.effectiveFrom) &&
								(!s.effectiveTo || dateStr <= s.effectiveTo),
						)
						.sort(
							(a, b) =>
								(b.effectiveFrom ?? "").localeCompare(a.effectiveFrom ?? "") ||
								a.id - b.id,
						)[0] ?? null;
				const isHoliday = holidays.has(dateStr),
					isWorkDay = Boolean(shift) && !isHoliday;
				const dayLogs = logs
					.filter(
						(log) =>
							log.employeeId === employee.id &&
							log.timestamp.getFullYear() === year &&
							log.timestamp.getMonth() === month - 1 &&
							log.timestamp.getDate() === day,
					)
					.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
				const inLog = dayLogs.find((log) => log.type === "IN") ?? dayLogs[0];
				const outLog =
					[...dayLogs].reverse().find((log) => log.type === "OUT") ??
					(dayLogs.length > 1 ? dayLogs.at(-1) : undefined);
				let status = "ABSENT",
					lateMinutes = 0,
					earlyOutMinutes = 0;
				if (!isWorkDay) status = "-";
				else if (inLog || outLog) {
					status = "PRESENT";
					if (!inLog) status = "ABSENT";
					else if (shift) {
						const scan =
							inLog.timestamp.getHours() * 60 + inLog.timestamp.getMinutes();
						const cutoff = parseTime(shift.startTime) + shift.toleranceMinutes;
						if (shift.maxLateTime && scan > parseTime(shift.maxLateTime))
							status = "ABSENT";
						else if (scan > cutoff) {
							status = "LATE";
							lateMinutes = scan - cutoff;
						}
					}
					if (outLog && shift) {
						const scan =
							outLog.timestamp.getHours() * 60 + outLog.timestamp.getMinutes();
						const limit = parseTime(shift.endTime) - shift.earlyOutTolerance;
						if (scan < limit) {
							earlyOutMinutes = parseTime(shift.endTime) - scan;
							if (status !== "ABSENT") status = "EARLY_OUT";
						}
					}
					if (["PRESENT", "LATE"].includes(status)) totalPresent++;
					if (status === "LATE") totalLate++;
					if (status === "EARLY_OUT") {
						totalEarlyOut++;
						totalPresent++;
					}
				} else if (date < new Date(new Date().setHours(0, 0, 0, 0))) {
					if (
						leaves.some(
							(leave) =>
								leave.employeeId === employee.id &&
								dateStr >= leave.startDate &&
								dateStr <= leave.endDate,
						)
					) {
						status = "LEAVE";
						totalLeave++;
					} else totalAbsent++;
				} else
					status =
						dateStr === new Date().toLocaleDateString("en-CA")
							? "IN_PROGRESS"
							: "-";
				totalLateMinutesSum += lateMinutes;
				totalEarlyOutMinutesSum += earlyOutMinutes;
				days.push({
					date: dateStr,
					isWorkDay,
					isHoliday,
					clockIn: inLog ? formatTime(inLog.timestamp) : null,
					clockOut: outLog ? formatTime(outLog.timestamp) : null,
					inLogId: inLog?.id ?? null,
					outLogId: outLog?.id ?? null,
					status,
					lateMinutes,
					earlyOutMinutes,
				});
			}
			return {
				id: employee.id,
				name: employee.name,
				employeeCode: employee.employeeCode,
				department: employee.department ?? "",
				shiftName:
					shifts
						.filter(
							(s) =>
								(shiftAssignments.some(
									(assignment) => assignment.employeeId === employee.id,
								)
									? shiftAssignments.some(
											(assignment) =>
												assignment.employeeId === employee.id &&
												assignment.shiftId === s.id,
										)
									: employee.shiftIds.includes(s.id)) && s.isActive,
						)
						.map((s) => s.name)
						.join(", ") || "-",
				days,
				totalPresent,
				totalLate,
				totalEarlyOut,
				totalAbsent,
				totalLeave,
				totalLateMinutesSum,
				totalEarlyOutMinutesSum,
			};
		});
	}
	buildDailyRecapForCalculation(month: number, year: number) {
		return this.buildDailyRecap(month, year);
	}
	async getDailyRecap(
		month: number,
		year: number,
		filter: ListFilter & { employeeId?: number } = {},
	) {
		const pagination = normalizePageParams(filter);
		const where = and(
			eq(schema.employees.isActive, true),
			filter.employeeId
				? eq(schema.employees.id, filter.employeeId)
				: undefined,
			filter.search
				? or(
						ilike(schema.employees.name, `%${filter.search}%`),
						ilike(schema.employees.employeeCode, `%${filter.search}%`),
					)
				: undefined,
		);
		const [{ count: total = 0 } = { count: 0 }] = await this.db
			.select({ count: count() })
			.from(schema.employees)
			.where(where);
		return {
			data: await this.buildDailyRecap(month, year, filter),
			meta: createPageMeta(total, pagination),
		};
	}
	async getMonthlySummary(
		month: number,
		year: number,
		filter: ListFilter = {},
	) {
		const recap = await this.getDailyRecap(month, year, filter);
		return {
			data: recap.data.map((e) => ({
				id: e.id,
				name: e.name,
				employeeCode: e.employeeCode,
				department: e.department,
				totalPresent: e.totalPresent,
				totalLate: e.totalLate,
				totalAbsent: e.totalAbsent,
				totalLeave: e.totalLeave,
			})),
			meta: recap.meta,
		};
	}
	async generateExcel(month: number, year: number) {
		const workbook = new Workbook(),
			sheet = workbook.addWorksheet("Laporan Absensi");
		sheet.columns = [
			{ header: "NAMA PEGAWAI", key: "name", width: 30 },
			{ header: "NIP", key: "employeeCode", width: 20 },
			{ header: "DEPARTEMEN", key: "department", width: 20 },
			{ header: "HADIR", key: "totalPresent", width: 10 },
			{ header: "TERLAMBAT", key: "totalLate", width: 15 },
			{ header: "ALPA", key: "totalAbsent", width: 10 },
			{ header: "CUTI/IZIN", key: "totalLeave", width: 15 },
		];
		for (const row of (await this.buildDailyRecap(month, year)).map((e) => ({
			id: e.id,
			name: e.name,
			employeeCode: e.employeeCode,
			department: e.department,
			totalPresent: e.totalPresent,
			totalLate: e.totalLate,
			totalAbsent: e.totalAbsent,
			totalLeave: e.totalLeave,
		})))
			sheet.addRow(row);
		return workbook;
	}
	async generateDailyRecapExcel(month: number, year: number) {
		const workbook = new Workbook();
		for (const employee of await this.buildDailyRecap(month, year)) {
			const sheet = workbook.addWorksheet(
				employee.name.substring(0, 31).replace(/[*?:/\\[\]]/g, ""),
			);
			sheet.columns = [
				{ header: "Tanggal", key: "date", width: 15 },
				{ header: "Masuk", key: "clockIn", width: 10 },
				{ header: "Pulang", key: "clockOut", width: 10 },
				{ header: "Status", key: "status", width: 12 },
				{ header: "Telat (mnt)", key: "late", width: 12 },
				{ header: "Pulang Cepat (mnt)", key: "early", width: 18 },
			];
			for (const day of employee.days)
				sheet.addRow({
					date: day.date,
					clockIn: day.clockIn ?? "-",
					clockOut: day.clockOut ?? "-",
					status: day.status,
					late: day.lateMinutes || "-",
					early: day.earlyOutMinutes || "-",
				});
		}
		return workbook;
	}
}

export class JaspelService {
	constructor(private db: Db) {}
	async getVariables(filter: ListFilter = {}) {
		const pagination = normalizePageParams(filter);
		const where = and(
			eq(schema.employees.isActive, true),
			filter.search
				? or(
						ilike(schema.employees.name, `%${filter.search}%`),
						ilike(schema.employees.employeeCode, `%${filter.search}%`),
					)
				: undefined,
		);
		const employees = await this.db
			.select({
				id: schema.employees.id,
				name: schema.employees.name,
				employeeCode: schema.employees.employeeCode,
			})
			.from(schema.employees)
			.where(where)
			.orderBy(asc(schema.employees.name))
			.limit(pagination.limit)
			.offset(pagination.offset);
		const values = employees.length
			? await this.db
					.select()
					.from(schema.employeeJaspelVariables)
					.where(
						inArray(
							schema.employeeJaspelVariables.employeeId,
							employees.map((employee) => employee.id),
						),
					)
			: [];
		const [{ count: total = 0 } = { count: 0 }] = await this.db
			.select({ count: count() })
			.from(schema.employees)
			.where(where);
		return {
			data: employees.map((employee) => ({
				employeeId: employee.id,
				name: employee.name,
				employeeCode: employee.employeeCode,
				basicIndex:
					values.find((v) => v.employeeId === employee.id)?.basicIndex ?? 0,
				positionIndex:
					values.find((v) => v.employeeId === employee.id)?.positionIndex ?? 0,
				riskIndex:
					values.find((v) => v.employeeId === employee.id)?.riskIndex ?? 0,
			})),
			meta: createPageMeta(total, pagination),
		};
	}
	async updateVariable(
		employeeId: number,
		basicIndex: number,
		positionIndex: number,
		riskIndex: number,
	) {
		await this.db
			.insert(schema.employeeJaspelVariables)
			.values({ employeeId, basicIndex, positionIndex, riskIndex })
			.onConflictDoUpdate({
				target: schema.employeeJaspelVariables.employeeId,
				set: { basicIndex, positionIndex, riskIndex, updatedAt: new Date() },
			});
		return { success: true };
	}
	async getDistributions(month: number, year: number, filter: ListFilter = {}) {
		const pagination = normalizePageParams(filter);
		const where = and(
			eq(schema.jaspelDistributions.month, month),
			eq(schema.jaspelDistributions.year, year),
			filter.search
				? or(
						ilike(schema.employees.name, `%${filter.search}%`),
						ilike(schema.employees.employeeCode, `%${filter.search}%`),
					)
				: undefined,
		);
		const [fund] = await this.db
			.select()
			.from(schema.jaspelFunds)
			.where(
				and(
					eq(schema.jaspelFunds.month, month),
					eq(schema.jaspelFunds.year, year),
				),
			)
			.limit(1);
		const distributions = await this.db
			.select({
				id: schema.jaspelDistributions.id,
				employeeId: schema.jaspelDistributions.employeeId,
				name: schema.employees.name,
				employeeCode: schema.employees.employeeCode,
				basicIndex: schema.jaspelDistributions.basicIndex,
				positionIndex: schema.jaspelDistributions.positionIndex,
				riskIndex: schema.jaspelDistributions.riskIndex,
				totalLateMins: schema.jaspelDistributions.totalLateMins,
				totalEarlyMins: schema.jaspelDistributions.totalEarlyMins,
				missedPunches: schema.jaspelDistributions.missedPunches,
				penaltyDays: schema.jaspelDistributions.penaltyDays,
				totalIndex: schema.jaspelDistributions.totalIndex,
				finalPoint: schema.jaspelDistributions.finalPoint,
				finalAmount: schema.jaspelDistributions.finalAmount,
			})
			.from(schema.jaspelDistributions)
			.innerJoin(
				schema.employees,
				eq(schema.employees.id, schema.jaspelDistributions.employeeId),
			)
			.where(where)
			.orderBy(asc(schema.employees.name))
			.limit(pagination.limit)
			.offset(pagination.offset);
		const [{ count: total = 0 } = { count: 0 }] = await this.db
			.select({ count: count() })
			.from(schema.jaspelDistributions)
			.innerJoin(
				schema.employees,
				eq(schema.employees.id, schema.jaspelDistributions.employeeId),
			)
			.where(where);
		return {
			fund: fund ?? null,
			distributions,
			meta: createPageMeta(total, pagination),
		};
	}
	async calculate(month: number, year: number, totalFund: number) {
		return this.db.transaction(async (tx) => {
			await tx.execute(sql`SELECT pg_advisory_xact_lock(${year}, ${month})`);
			const [existing] = await tx
				.select()
				.from(schema.jaspelFunds)
				.where(
					and(
						eq(schema.jaspelFunds.month, month),
						eq(schema.jaspelFunds.year, year),
					),
				)
				.limit(1);
			if (existing && existing.status !== "DRAFT")
				throw new ApiError(409, "Jaspel period is locked");
			const reports = new ReportsService(tx);
			const ruleSnapshot = {
				formula: "RBFI",
				formulaVersion: "RBFI-2026.1",
				workdayMinutes: 420,
				missedPunchesPerPenaltyDay: 2,
				complianceFloor: 0,
			};
			const recaps = await reports.buildDailyRecapForCalculation(month, year),
				variables = await tx.select().from(schema.employeeJaspelVariables),
				rows: (typeof schema.jaspelDistributions.$inferInsert)[] = [];
			let totalPoints = 0;
			for (const employee of recaps) {
				const variable = variables.find(
					(v) => v.employeeId === employee.id,
				) ?? {
					basicIndex: 0,
					positionIndex: 0,
					riskIndex: 0,
				};
				const missedPunches = employee.days.filter(
					(d) =>
						d.isWorkDay &&
						!d.isHoliday &&
						d.status !== "LEAVE" &&
						Boolean(d.clockIn) !== Boolean(d.clockOut),
				).length;
				const penaltyDays =
					Math.round(
						(employee.totalLateMinutesSum + employee.totalEarlyOutMinutesSum) /
							ruleSnapshot.workdayMinutes,
					) +
					Math.floor(missedPunches / ruleSnapshot.missedPunchesPerPenaltyDay) +
					employee.totalAbsent;
				const workingDays =
					employee.days.filter((d) => d.isWorkDay).length || 1;
				const totalIndex =
					variable.basicIndex + variable.positionIndex + variable.riskIndex;
				const finalPoint =
					(totalIndex *
						Math.max(ruleSnapshot.complianceFloor, workingDays - penaltyDays)) /
					workingDays;
				totalPoints += finalPoint;
				rows.push({
					month,
					year,
					employeeId: employee.id,
					basicIndex: variable.basicIndex,
					positionIndex: variable.positionIndex,
					riskIndex: variable.riskIndex,
					totalLateMins: employee.totalLateMinutesSum,
					totalEarlyMins: employee.totalEarlyOutMinutesSum,
					missedPunches,
					penaltyDays,
					totalIndex,
					finalPoint,
					finalAmount: 0,
				});
			}
			if (totalFund > 0 && totalPoints <= 0)
				throw new ApiError(409, "No eligible Jaspel points");
			let allocated = 0;
			for (const [index, row] of rows.entries()) {
				row.finalAmount =
					index === rows.length - 1
						? totalFund - allocated
						: totalPoints
							? Math.floor((row.finalPoint / totalPoints) * totalFund)
							: 0;
				allocated += row.finalAmount;
			}
			await tx
				.delete(schema.jaspelDistributions)
				.where(
					and(
						eq(schema.jaspelDistributions.month, month),
						eq(schema.jaspelDistributions.year, year),
					),
				);
			if (!existing) {
				await tx.insert(schema.jaspelFunds).values({
					month,
					year,
					totalFund,
					status: "DRAFT",
					formulaVersion: ruleSnapshot.formulaVersion,
					ruleSnapshot,
				});
			} else {
				const [updated] = await tx
					.update(schema.jaspelFunds)
					.set({
						totalFund,
						formulaVersion: ruleSnapshot.formulaVersion,
						ruleSnapshot,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(schema.jaspelFunds.id, existing.id),
							eq(schema.jaspelFunds.status, "DRAFT"),
						),
					)
					.returning();
				if (!updated) throw new ApiError(409, "Jaspel period is locked");
			}
			if (rows.length) await tx.insert(schema.jaspelDistributions).values(rows);
			return {
				success: true,
				status: "DRAFT",
				formulaVersion: ruleSnapshot.formulaVersion,
			};
		});
	}
	async transition(
		month: number,
		year: number,
		userId: number,
		status: "REVIEWED" | "FINAL" | "LOCKED",
	) {
		return this.db.transaction(async (tx) => {
			await tx.execute(sql`SELECT pg_advisory_xact_lock(${year}, ${month})`);
			const [fund] = await tx
				.select()
				.from(schema.jaspelFunds)
				.where(
					and(
						eq(schema.jaspelFunds.month, month),
						eq(schema.jaspelFunds.year, year),
					),
				)
				.limit(1);
			if (!fund) throw new ApiError(404, "Jaspel period not found");
			const allowed: Record<string, string> = {
				DRAFT: "REVIEWED",
				REVIEWED: "FINAL",
				FINAL: "LOCKED",
			};
			if (allowed[fund.status] !== status)
				throw new ApiError(
					409,
					`Illegal Jaspel transition: ${fund.status} -> ${status}`,
				);
			const [result] = await tx
				.update(schema.jaspelFunds)
				.set({
					status,
					reviewedBy: status === "REVIEWED" ? userId : fund.reviewedBy,
					finalizedBy: status === "FINAL" ? userId : fund.finalizedBy,
					lockedAt: status === "LOCKED" ? new Date() : fund.lockedAt,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(schema.jaspelFunds.id, fund.id),
						eq(schema.jaspelFunds.status, fund.status),
					),
				)
				.returning();
			if (!result)
				throw new ApiError(409, "Jaspel period changed concurrently");
			return result;
		});
	}
	async generateExcel(month: number, year: number) {
		const data = await this.getDistributions(month, year, {
			page: 1,
			limit: 10000,
		});
		const workbook = new Workbook(),
			sheet = workbook.addWorksheet("Distribusi Jaspel");
		sheet.columns = [
			{ header: "NIP", key: "employeeCode", width: 18 },
			{ header: "PEGAWAI", key: "name", width: 30 },
			{ header: "POIN", key: "finalPoint", width: 14 },
			{ header: "NOMINAL", key: "finalAmount", width: 20 },
		];
		for (const row of data.distributions) sheet.addRow(row);
		return workbook;
	}
}

export class ShiftEngineService {
	constructor(private db: Db) {}
	async evaluateAttendance(input: {
		employeeId?: number;
		shiftIds?: number[] | null;
		timestamp: Date;
		type: "IN" | "OUT";
	}) {
		const date = `${input.timestamp.getFullYear()}-${String(input.timestamp.getMonth() + 1).padStart(2, "0")}-${String(input.timestamp.getDate()).padStart(2, "0")}`;
		if (
			(
				await this.db
					.select({ id: schema.holidays.id })
					.from(schema.holidays)
					.where(eq(schema.holidays.date, date))
			).length
		)
			return "PRESENT" as const;
		const datedAssignments = input.employeeId
			? await this.db
					.select({ shiftId: schema.employeeShiftAssignments.shiftId })
					.from(schema.employeeShiftAssignments)
					.where(
						and(
							eq(schema.employeeShiftAssignments.employeeId, input.employeeId),
							lte(schema.employeeShiftAssignments.startDate, date),
							or(
								isNull(schema.employeeShiftAssignments.endDate),
								gte(schema.employeeShiftAssignments.endDate, date),
							),
						),
					)
			: [];
		const hasDatedHistory = input.employeeId
			? Boolean(
					(
						await this.db
							.select({ id: schema.employeeShiftAssignments.id })
							.from(schema.employeeShiftAssignments)
							.where(
								eq(
									schema.employeeShiftAssignments.employeeId,
									input.employeeId,
								),
							)
							.limit(1)
					).length,
				)
			: false;
		const shiftIds = hasDatedHistory
			? datedAssignments.map((assignment) => assignment.shiftId)
			: input.shiftIds;
		if (hasDatedHistory && !shiftIds?.length) return "PRESENT" as const;
		const shifts = shiftIds?.length
			? await this.db
					.select()
					.from(schema.shifts)
					.where(
						and(
							inArray(schema.shifts.id, shiftIds),
							eq(schema.shifts.isActive, true),
						),
					)
			: await this.db
					.select()
					.from(schema.shifts)
					.where(eq(schema.shifts.isActive, true));
		const shift = shifts
			.filter(
				(s) =>
					s.workDays.includes(input.timestamp.getDay()) &&
					(!s.effectiveFrom || date >= s.effectiveFrom) &&
					(!s.effectiveTo || date <= s.effectiveTo),
			)
			.sort(
				(a, b) =>
					(b.effectiveFrom ?? "").localeCompare(a.effectiveFrom ?? "") ||
					a.id - b.id,
			)[0];
		if (!shift) return "PRESENT" as const;
		const scan = input.timestamp.getHours() * 60 + input.timestamp.getMinutes();
		const overnight = parseTime(shift.endTime) <= parseTime(shift.startTime);
		const normalizedScan =
			overnight && input.type === "OUT" && scan < parseTime(shift.startTime)
				? scan + 1440
				: scan;
		const normalizedEnd = parseTime(shift.endTime) + (overnight ? 1440 : 0);
		if (input.type === "IN") {
			if (shift.minInTime && scan < parseTime(shift.minInTime))
				return "ABSENT" as const;
			if (shift.maxLateTime && scan > parseTime(shift.maxLateTime))
				return "ABSENT" as const;
			return scan > parseTime(shift.startTime) + shift.toleranceMinutes
				? ("LATE" as const)
				: ("PRESENT" as const);
		}
		const minOut = shift.minOutTime
			? parseTime(shift.minOutTime) +
				(overnight && parseTime(shift.minOutTime) < parseTime(shift.startTime)
					? 1440
					: 0)
			: undefined;
		const maxOut = shift.maxOutTime
			? parseTime(shift.maxOutTime) +
				(overnight && parseTime(shift.maxOutTime) < parseTime(shift.startTime)
					? 1440
					: 0)
			: undefined;
		if (minOut !== undefined && normalizedScan < minOut)
			return "ABSENT" as const;
		if (maxOut !== undefined && normalizedScan > maxOut)
			return "ABSENT" as const;
		return normalizedScan < normalizedEnd - shift.earlyOutTolerance
			? ("EARLY_OUT" as const)
			: ("PRESENT" as const);
	}
}

export class AdmsService {
	constructor(
		private db: Db,
		private queue: Queue,
		private shifts: ShiftEngineService,
		private logger: Logger = console,
	) {}
	async findDevice(sn: string) {
		const [device] = await this.db
			.select()
			.from(schema.devices)
			.where(eq(schema.devices.serialNumber, sn));
		return device;
	}
	async findClaimedDevice(ip: string) {
		if (!ip) return;
		const [claim] = await this.db
			.select({ device: schema.devices })
			.from(schema.admsDeviceClaims)
			.innerJoin(
				schema.devices,
				eq(schema.admsDeviceClaims.deviceId, schema.devices.id),
			)
			.where(
				and(
					eq(schema.admsDeviceClaims.sourceIp, ip),
					eq(schema.admsDeviceClaims.status, "APPROVED"),
				),
			);
		return claim?.device;
	}
	async registerDevice(sn: string, ip: string) {
		if (!ip) return;
		const serialNumber =
			sn === "unknown" ? `NO-SN-${ip.replace(/[^a-zA-Z0-9]/g, "-")}` : sn;
		return this.db.transaction(async (tx) => {
			const [existing] = await tx
				.select()
				.from(schema.devices)
				.where(eq(schema.devices.serialNumber, serialNumber))
				.limit(1);
			const now = new Date();
			if (existing) {
				await tx
					.update(schema.devices)
					.set({ isOnline: true, lastSeen: now, ipAddress: ip, updatedAt: now })
					.where(eq(schema.devices.id, existing.id));
				return {
					...existing,
					isOnline: true,
					lastSeen: now,
					ipAddress: ip,
					updatedAt: now,
				};
			}
			const [device] = await tx
				.insert(schema.devices)
				.values({
					serialNumber,
					name: `Terminal ${ip}`,
					ipAddress: ip,
					isOnline: true,
					lastSeen: now,
				})
				.returning();
			await tx.insert(schema.deviceCommands).values({
				deviceId: device!.id,
				command: "DATA QUERY USERINFO",
			});
			return device;
		});
	}
	async findClaims(filter: PageParams = {}) {
		const pagination = normalizePageParams(filter);
		const where = eq(schema.admsDeviceClaims.status, "PENDING");
		const data = await this.db
			.select()
			.from(schema.admsDeviceClaims)
			.where(where)
			.orderBy(desc(schema.admsDeviceClaims.lastSeen))
			.limit(pagination.limit)
			.offset(pagination.offset);
		const [{ count: total = 0 } = { count: 0 }] = await this.db
			.select({ count: count() })
			.from(schema.admsDeviceClaims)
			.where(where);
		return { data, meta: createPageMeta(total, pagination) };
	}
	async approveClaim(id: number, deviceId: number, userId: number) {
		return this.db.transaction(async (tx) => {
			const [claim] = await tx
				.select()
				.from(schema.admsDeviceClaims)
				.where(
					and(
						eq(schema.admsDeviceClaims.id, id),
						eq(schema.admsDeviceClaims.status, "PENDING"),
					),
				);
			if (!claim)
				throw new ApiError(404, "Permintaan perangkat tidak ditemukan");
			const [device] = await tx
				.select({ id: schema.devices.id })
				.from(schema.devices)
				.where(eq(schema.devices.id, deviceId));
			if (!device)
				throw new ApiError(404, "Device with ID ${deviceId} not found");
			const now = new Date();
			await tx
				.update(schema.admsDeviceClaims)
				.set({ status: "REJECTED", resolvedBy: userId, resolvedAt: now })
				.where(
					and(
						eq(schema.admsDeviceClaims.sourceIp, claim.sourceIp),
						eq(schema.admsDeviceClaims.status, "APPROVED"),
					),
				);
			const [approved] = await tx
				.update(schema.admsDeviceClaims)
				.set({
					deviceId,
					status: "APPROVED",
					resolvedBy: userId,
					resolvedAt: now,
				})
				.where(eq(schema.admsDeviceClaims.id, id))
				.returning();
			return approved;
		});
	}
	async registerClaim(id: number, userId: number) {
		return this.db.transaction(async (tx) => {
			const [claim] = await tx
				.select()
				.from(schema.admsDeviceClaims)
				.where(
					and(
						eq(schema.admsDeviceClaims.id, id),
						eq(schema.admsDeviceClaims.status, "PENDING"),
					),
				);
			if (!claim)
				throw new ApiError(404, "Permintaan perangkat tidak ditemukan");
			const now = new Date();
			const [device] = await tx
				.insert(schema.devices)
				.values({
					serialNumber: `NO-SN-${claim.id}`,
					name: `Terminal ${claim.sourceIp}`,
					ipAddress: claim.sourceIp,
					isOnline: true,
					lastSeen: now,
				})
				.returning();
			await tx.insert(schema.deviceCommands).values({
				deviceId: device!.id,
				command: "DATA QUERY USERINFO",
			});
			await tx
				.update(schema.admsDeviceClaims)
				.set({
					deviceId: device!.id,
					status: "APPROVED",
					resolvedBy: userId,
					resolvedAt: now,
				})
				.where(eq(schema.admsDeviceClaims.id, id));
			return device;
		});
	}
	updateDeviceStatus(sn: string, ip: string, deviceId?: number) {
		return this.db
			.update(schema.devices)
			.set({
				isOnline: true,
				lastSeen: new Date(),
				ipAddress: ip,
				updatedAt: new Date(),
			})
			.where(
				deviceId
					? eq(schema.devices.id, deviceId)
					: eq(schema.devices.serialNumber, sn),
			);
	}
	async getPendingCommands(sn: string, deviceId?: number) {
		const [device] = await this.db
			.select()
			.from(schema.devices)
			.where(
				deviceId
					? eq(schema.devices.id, deviceId)
					: eq(schema.devices.serialNumber, sn),
			);
		if (!device) return "OK";
		const stale = new Date(
			Date.now() - Number(process.env.COMMAND_ACK_TIMEOUT_MS || 60_000),
		);
		await this.db
			.update(schema.deviceCommands)
			.set({ status: "PENDING", updatedAt: new Date() })
			.where(
				and(
					eq(schema.deviceCommands.deviceId, device.id),
					eq(schema.deviceCommands.status, "SENT"),
					lte(schema.deviceCommands.updatedAt, stale),
				),
			);
		const commands = await this.db
			.select()
			.from(schema.deviceCommands)
			.where(
				and(
					eq(schema.deviceCommands.deviceId, device.id),
					eq(schema.deviceCommands.status, "PENDING"),
				),
			);
		if (!commands.length) return "OK";
		await this.db
			.update(schema.deviceCommands)
			.set({ status: "SENT", updatedAt: new Date() })
			.where(
				inArray(
					schema.deviceCommands.id,
					commands.map((c) => c.id),
				),
			);
		return commands.map((c) => `C:${c.id}:${c.command}`).join("\n");
	}
	async ackCommand(
		id: number,
		success: boolean,
		sn: string,
		deviceId?: number,
	) {
		const [device] = await this.db
			.select({ id: schema.devices.id })
			.from(schema.devices)
			.where(
				deviceId
					? eq(schema.devices.id, deviceId)
					: eq(schema.devices.serialNumber, sn),
			);
		if (!device) return;
		await this.db
			.update(schema.deviceCommands)
			.set({ status: success ? "COMPLETED" : "ERROR", updatedAt: new Date() })
			.where(
				and(
					eq(schema.deviceCommands.id, id),
					eq(schema.deviceCommands.deviceId, device.id),
				),
			);
	}
	async handleLogData(sn: string, raw: string, deviceId?: number) {
		const [device] = await this.db
			.select()
			.from(schema.devices)
			.where(
				deviceId
					? eq(schema.devices.id, deviceId)
					: eq(schema.devices.serialNumber, sn),
			);
		let queued = 0;
		this.logger.info(
			`[ATTLOG] handleLogData sn=${sn} deviceId=${deviceId ?? "none"} lines=${raw.split("\n").filter(Boolean).length}`,
		);
		for (const line of raw.split("\n").filter(Boolean)) {
			try {
				let pin: string | undefined;
				let timestamp: Date;
				let type: "IN" | "OUT";
				if (line.includes("=")) {
					const fields = Object.fromEntries(
						line
							.split("	")
							.map((part) => {
								const i = part.indexOf("=");
								return [part.slice(0, i).trim(), part.slice(i + 1).trim()];
							})
							.filter(([key]) => key),
					);
					pin = fields.PIN || fields.Pin;
					const time = fields.Time || fields.time;
					if (!pin || !time) continue;
					timestamp = new Date(time);
					type = fields.type === "1" || fields.Type === "1" ? "OUT" : "IN";
				} else {
					const parts = line.split("	");
					if (parts.length < 5) continue;
					pin = parts[0]?.trim();
					timestamp = new Date(parts[1]?.trim() ?? "");
					type = parts[2]?.trim() === "0" ? ("IN" as const) : ("OUT" as const);
				}
				if (!pin || Number.isNaN(timestamp.getTime())) continue;
				let [employee] = await this.db
					.select()
					.from(schema.employees)
					.where(
						or(
							eq(schema.employees.biometricId, pin),
							eq(schema.employees.employeeCode, pin),
						),
					);
				if (!employee) {
					const [created] = await this.db
						.insert(schema.employees)
						.values({
							employeeCode: pin,
							name: `Pegawai ${pin}`,
							biometricId: pin,
							biometricSyncedAt: new Date(),
						})
						.onConflictDoNothing({ target: schema.employees.biometricId })
						.returning();
					if (created) employee = created;
					else {
						[employee] = await this.db
							.select()
							.from(schema.employees)
							.where(eq(schema.employees.biometricId, pin));
					}
				}
				if (!employee) {
					this.logger.warn(
						`Biometric PIN could not be resolved: ${pin} (device: ${device?.name ?? sn})`,
					);
					continue;
				}
				const duplicate = await this.db
					.select({ id: schema.attendanceLogs.id })
					.from(schema.attendanceLogs)
					.where(
						and(
							eq(schema.attendanceLogs.employeeId, employee.id),
							eq(schema.attendanceLogs.timestamp, timestamp),
							eq(schema.attendanceLogs.type, type),
						),
					);
				if (duplicate.length) continue;
				const status = await this.shifts.evaluateAttendance({
					employeeId: employee.id,
					shiftIds: employee.shiftIds,
					timestamp,
					type,
				});
				await this.queue.add(
					"process-log",
					{
						sn,
						log: {
							employeeId: employee.id,
							deviceId: device?.id ?? null,
							timestamp,
							type,
							status,
						},
					},
					{
						jobId: `${employee.id}-${timestamp.getTime()}-${type}`,
						attempts: 5,
						backoff: { type: "exponential", delay: 1000 },
						removeOnComplete: 1000,
						removeOnFail: 5000,
					},
				);
				this.logger.info(
					`[ATTLOG] enqueued pin=${pin} emp=${employee.id} ts=${timestamp.toISOString()} type=${type} status=${status}`,
				);
				queued++;
			} catch (error) {
				this.logger.warn(
					`[ATTLOG] line rejected: ${line.substring(0, 80)}`,
					error,
				);
			}
		}
		return `OK: ${queued}`;
	}
	async handleUserData(_sn: string, raw: string) {
		let synced = 0;
		for (const rawLine of raw.split("\n").filter(Boolean)) {
			const fields = Object.fromEntries(
				rawLine
					.replace(/^USER\s+/i, "")
					.split("\t")
					.map((part) => {
						const i = part.indexOf("=");
						return [part.slice(0, i), part.slice(i + 1)];
					})
					.filter(([key]) => key),
			);
			const pin = fields.PIN || fields["USER PIN"] || fields.UserId,
				name = fields.Name || fields.name;
			if (!pin) continue;
			let [employee] = await this.db
				.select()
				.from(schema.employees)
				.where(
					or(
						eq(schema.employees.biometricId, pin),
						eq(schema.employees.employeeCode, pin),
					),
				);
			if (!employee && name) {
				const byName = await this.db
					.select()
					.from(schema.employees)
					.where(
						sql`lower(trim(${schema.employees.name})) = lower(trim(${name}))`,
					)
					.limit(2);
				if (byName.length === 1 && !byName[0]?.biometricId)
					employee = byName[0];
				else if (byName.length === 1 && byName[0]?.biometricId !== pin) {
					this.logger.warn(
						`Biometric PIN mismatch skipped: ${pin} (${byName[0]?.name})`,
					);
					continue;
				}
			}
			if (!employee && name)
				await this.db.insert(schema.employees).values({
					employeeCode: pin,
					name,
					biometricId: pin,
					biometricSyncedAt: new Date(),
				});
			else if (employee)
				await this.db
					.update(schema.employees)
					.set({
						...(name && employee.name.startsWith("Pegawai ") ? { name } : {}),
						...(employee.biometricId ? {} : { biometricId: pin }),
						biometricSyncedAt: new Date(),
						updatedAt: new Date(),
					})
					.where(eq(schema.employees.id, employee.id));
			synced++;
		}
		return `OK: ${synced}`;
	}
	async handleFingerprintData(sn: string, raw: string) {
		const [device] = await this.db
			.select()
			.from(schema.devices)
			.where(eq(schema.devices.serialNumber, sn));
		if (!device) return "OK";
		let saved = 0;
		for (const line of raw.split("\n").filter(Boolean)) {
			const fields = Object.fromEntries(
				line
					.replace(/^FP\s+/i, "")
					.split("\t")
					.map((part) => {
						const i = part.indexOf("=");
						return [part.slice(0, i).trim(), part.slice(i + 1).trim()];
					})
					.filter(([key]) => key),
			);
			if (!fields.PIN || !fields.FID) continue;
			const [existing] = await this.db
				.select()
				.from(schema.fingerprintTemplates)
				.where(
					and(
						eq(schema.fingerprintTemplates.deviceId, device.id),
						eq(schema.fingerprintTemplates.userId, fields.PIN),
						eq(schema.fingerprintTemplates.fid, fields.FID),
					),
				);
			const data = {
				deviceId: device.id,
				userId: fields.PIN,
				fid: fields.FID,
				size: fields.Size ? Number(fields.Size) : null,
				valid: fields.Valid !== "0",
				template: fields.TMP || null,
			};
			if (existing)
				await this.db
					.update(schema.fingerprintTemplates)
					.set({ ...data, updatedAt: new Date() })
					.where(eq(schema.fingerprintTemplates.id, existing.id));
			else await this.db.insert(schema.fingerprintTemplates).values(data);
			saved++;
		}
		return `OK: ${saved}`;
	}
	async handlePhotoUpload(
		sn: string,
		pin: string,
		fileName: string,
		data: Buffer,
	) {
		const { mkdir, writeFile } = await import("node:fs/promises");
		const path = await import("node:path");
		const safeSn = sn.replace(/[^\w.-]/g, "_"),
			safePin = pin.replace(/[^\w.-]/g, "_"),
			safeFile = path
				.basename(fileName || `${Date.now()}.jpg`)
				.replace(/[^\w.-]/g, "_");
		const dir = path.join(process.cwd(), "uploads", safeSn, safePin);
		await mkdir(dir, { recursive: true });
		await writeFile(path.join(dir, safeFile), data);
		const photoUrl = `/uploads/${safeSn}/${safePin}/${safeFile}`;
		const [device] = await this.db
			.select()
			.from(schema.devices)
			.where(eq(schema.devices.serialNumber, sn));
		const [employee] = await this.db
			.select()
			.from(schema.employees)
			.where(
				or(
					eq(schema.employees.biometricId, pin),
					eq(schema.employees.employeeCode, pin),
				),
			);
		if (employee && device) {
			const earliest = new Date(Date.now() - 10 * 60_000);
			const [log] = await this.db
				.select({ id: schema.attendanceLogs.id })
				.from(schema.attendanceLogs)
				.where(
					and(
						eq(schema.attendanceLogs.employeeId, employee.id),
						eq(schema.attendanceLogs.deviceId, device.id),
						gte(schema.attendanceLogs.timestamp, earliest),
						sql`${schema.attendanceLogs.photoUrl} IS NULL`,
					),
				)
				.orderBy(desc(schema.attendanceLogs.timestamp))
				.limit(1);
			if (log)
				await this.db
					.update(schema.attendanceLogs)
					.set({ photoUrl })
					.where(eq(schema.attendanceLogs.id, log.id));
			else
				this.logger.warn(
					`Orphan attendance photo stored for review: ${photoUrl}`,
				);
		}
	}
}
