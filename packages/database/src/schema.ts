import { relations } from "drizzle-orm";
import {
	boolean,
	date,
	doublePrecision,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	serial,
	text,
	time,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["ADMIN", "HRD", "USER"]);

export const attendanceTypeEnum = pgEnum("attendance_type", ["IN", "OUT"]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
	"PRESENT",
	"LATE",
	"ABSENT",
	"EARLY_OUT",
]);

export const users = pgTable("users", {
	id: serial("id").primaryKey(),

	email: varchar("email", { length: 255 }).notNull().unique(),

	// Password wajib disimpan dalam bentuk hash, bukan teks asli
	password: varchar("password", { length: 255 }).notNull(),

	name: varchar("name", { length: 255 }).notNull(),

	role: roleEnum("role").notNull().default("USER"),

	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employees = pgTable("employees", {
	id: serial("id").primaryKey(),

	// Opsional: pegawai bisa punya akun login
	userId: integer("user_id").references(() => users.id, {
		onDelete: "set null",
	}),

	// Bisa diisi NIP, NIK, atau kode pegawai internal
	employeeCode: varchar("employee_code", { length: 100 }).notNull().unique(),

	name: varchar("name", { length: 255 }).notNull(),

	department: varchar("department", { length: 100 }),
	position: varchar("position", { length: 100 }),
	branch: varchar("branch", { length: 100 }),

	// Array of shift IDs that apply to this employee
	shiftIds: jsonb("shift_ids").$type<number[]>().default([]).notNull(),

	// USERID pada mesin biometrik (PIN). Null = belum tersinkron
	biometricId: varchar("biometric_id", { length: 50 }).unique(),
	biometricSyncedAt: timestamp("biometric_synced_at"),

	// Telegram Chat ID for bot interactions (Self-Service)
	telegramChatId: varchar("telegram_chat_id", { length: 50 }).unique(),

	isActive: boolean("is_active").default(true).notNull(),

	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const shifts = pgTable("shifts", {
	id: serial("id").primaryKey(),

	name: varchar("name", { length: 100 }).notNull(),

	// Format HH:mm, contoh 07:30
	startTime: time("start_time").notNull(),
	endTime: time("end_time").notNull(),

	// Toleransi keterlambatan (menit) setelah startTime
	toleranceMinutes: integer("tolerance_minutes").default(0).notNull(),

	// Toleransi pulang awal (menit) sebelum endTime — jika pulang sebelum ini = EARLY_OUT
	earlyOutTolerance: integer("early_out_tolerance").default(0).notNull(),

	// Batas maksimal jam masuk — lewat dari ini dianggap ABSENT (format HH:mm)
	maxLateTime: time("max_late_time"),

	// Batas awal jam masuk (paling cepat boleh absen)
	minInTime: time("min_in_time"),

	// Batas minimal jam pulang — pulang sebelum ini dianggap ABSENT (format HH:mm)
	minOutTime: time("min_out_time"),

	// Batas maksimal jam pulang — lebih dari ini tidak dihitung (atau lembur)
	maxOutTime: time("max_out_time"),

	// Hari kerja aktif untuk shift ini (array: 0=Minggu, 1=Senin, ..., 6=Sabtu)
	// Contoh: [1,2,3,4,5] = Senin-Jumat
	workDays: jsonb("work_days")
		.$type<number[]>()
		.default([1, 2, 3, 4, 5])
		.notNull(),

	// Tanggal berlaku shift (opsional, jika null = berlaku selamanya)
	effectiveFrom: date("effective_from"),
	effectiveTo: date("effective_to"),

	isActive: boolean("is_active").default(true).notNull(),

	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const devices = pgTable("devices", {
	id: serial("id").primaryKey(),

	serialNumber: varchar("serial_number", { length: 100 }).notNull().unique(),

	name: varchar("name", { length: 255 }).notNull(),

	location: varchar("location", { length: 255 }),

	latitude: varchar("latitude", { length: 50 }),
	longitude: varchar("longitude", { length: 50 }),

	ipAddress: varchar("ip_address", { length: 50 }),

	// Webhook URL untuk forward attendance data (comma-separated untuk multiple)
	webhookUrl: text("webhook_url"),

	// Webhook secret untuk signature verification
	webhookSecret: varchar("webhook_secret", { length: 255 }),

	// Delay polling interval (detik)
	delay: integer("delay").default(30).notNull(),

	// Error delay (detik) - interval saat error
	errorDelay: integer("error_delay").default(60).notNull(),

	isOnline: boolean("is_online").default(false).notNull(),

	lastSeen: timestamp("last_seen"),

	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const attendanceLogs = pgTable(
	"attendance_logs",
	{
		id: serial("id").primaryKey(),

		employeeId: integer("employee_id")
			.notNull()
			.references(() => employees.id, {
				onDelete: "restrict",
			}),

		deviceId: integer("device_id").references(() => devices.id, {
			onDelete: "set null",
		}),

		timestamp: timestamp("timestamp").notNull(),

		type: attendanceTypeEnum("type").notNull(),

		status: attendanceStatusEnum("status").notNull().default("PRESENT"),

		photoUrl: text("photo_url"),

		verified: boolean("verified").default(true).notNull(),

		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_attendance_employee_timestamp").on(
			table.employeeId,
			table.timestamp,
		),
		index("idx_attendance_timestamp").on(table.timestamp),
	],
);

export const commandStatusEnum = pgEnum("command_status", [
	"PENDING",
	"SENT",
	"COMPLETED",
	"ERROR",
]);

export const deviceCommands = pgTable("device_commands", {
	id: serial("id").primaryKey(),
	deviceId: integer("device_id")
		.notNull()
		.references(() => devices.id, {
			onDelete: "cascade",
		}),
	command: text("command").notNull(),
	status: commandStatusEnum("status").default("PENDING").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").references(() => users.id, {
		onDelete: "set null",
	}),
	action: varchar("action", { length: 50 }).notNull(), // CREATE, UPDATE, DELETE, LOGIN
	target: varchar("target", { length: 100 }).notNull(), // table name or feature
	details: jsonb("details"), // metadata: { old: ..., new: ..., ip: ... }
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leaveStatusEnum = pgEnum("leave_status", [
	"PENDING",
	"APPROVED",
	"REJECTED",
]);

export const leaveTypeEnum = pgEnum("leave_type", [
	"ANNUAL",
	"SICK",
	"PERMISSION",
	"MATERNITY",
	"OTHER",
]);

export const leaves = pgTable("leaves", {
	id: serial("id").primaryKey(),
	employeeId: integer("employee_id")
		.notNull()
		.references(() => employees.id, { onDelete: "cascade" }),
	type: leaveTypeEnum("type").notNull(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	reason: text("reason"),
	status: leaveStatusEnum("status").default("PENDING").notNull(),
	approvedBy: integer("approved_by").references(() => users.id, {
		onDelete: "set null",
	}),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Hari libur / cuti perusahaan untuk Work Calendar
 */
export const holidays = pgTable("holidays", {
	id: serial("id").primaryKey(),
	date: date("date").notNull().unique(),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Konfigurasi sistem (Telegram token, MinIO bucket, dll)
 */
export const settings = pgTable("settings", {
	id: serial("id").primaryKey(),
	key: varchar("key", { length: 100 }).notNull().unique(),
	value: text("value"),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Template sidik jari dari mesin (untuk clone antar device)
 */
export const fingerprintTemplates = pgTable("fingerprint_templates", {
	id: serial("id").primaryKey(),
	deviceId: integer("device_id")
		.notNull()
		.references(() => devices.id, { onDelete: "cascade" }),
	userId: varchar("user_id", { length: 50 }).notNull(),
	fid: varchar("fid", { length: 10 }).notNull(),
	size: integer("size"),
	valid: boolean("valid").default(true),
	template: text("template"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * RELATIONS
 */

export const usersRelations = relations(users, ({ one, many }) => ({
	employee: one(employees, {
		fields: [users.id],
		references: [employees.userId],
	}),
	auditLogs: many(auditLogs),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
	user: one(users, {
		fields: [auditLogs.userId],
		references: [users.id],
	}),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
	user: one(users, {
		fields: [employees.userId],
		references: [users.id],
	}),
	attendanceLogs: many(attendanceLogs),
	jaspelVariables: one(employeeJaspelVariables),
	jaspelDistributions: many(jaspelDistributions),
}));

export const shiftsRelations = relations(shifts, ({ many }) => ({
	employees: many(employees),
}));

export const devicesRelations = relations(devices, ({ many }) => ({
	attendanceLogs: many(attendanceLogs),
	commands: many(deviceCommands),
}));

export const deviceCommandsRelations = relations(deviceCommands, ({ one }) => ({
	device: one(devices, {
		fields: [deviceCommands.deviceId],
		references: [devices.id],
	}),
}));

export const attendanceLogsRelations = relations(attendanceLogs, ({ one }) => ({
	employee: one(employees, {
		fields: [attendanceLogs.employeeId],
		references: [employees.id],
	}),

	device: one(devices, {
		fields: [attendanceLogs.deviceId],
		references: [devices.id],
	}),
}));

/**
 * JASA PELAYANAN (JASPEL) / REMUNERATION TABLES
 */

export const jaspelFunds = pgTable(
	"jaspel_funds",
	{
		id: serial("id").primaryKey(),
		month: integer("month").notNull(),
		year: integer("year").notNull(),
		totalFund: integer("total_fund").notNull(), // Disimpan dalam Rupiah utuh
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(t) => [index("idx_jaspel_funds_month_year").on(t.month, t.year)],
);

export const employeeJaspelVariables = pgTable("employee_jaspel_variables", {
	id: serial("id").primaryKey(),
	employeeId: integer("employee_id")
		.notNull()
		.unique()
		.references(() => employees.id, { onDelete: "cascade" }),
	basicIndex: doublePrecision("basic_index").default(0).notNull(),
	positionIndex: doublePrecision("position_index").default(0).notNull(),
	riskIndex: doublePrecision("risk_index").default(0).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const jaspelDistributions = pgTable(
	"jaspel_distributions",
	{
		id: serial("id").primaryKey(),
		month: integer("month").notNull(),
		year: integer("year").notNull(),
		employeeId: integer("employee_id")
			.notNull()
			.references(() => employees.id, { onDelete: "cascade" }),

		// Data histori (supaya tidak berubah jika variabel diedit)
		basicIndex: doublePrecision("basic_index").notNull(),
		positionIndex: doublePrecision("position_index").notNull(),
		riskIndex: doublePrecision("risk_index").notNull(),

		// Variabel Kehadiran (diambil saat hitung)
		totalLateMins: integer("total_late_mins").notNull(),
		totalEarlyMins: integer("total_early_mins").notNull(),
		missedPunches: integer("missed_punches").notNull(),
		penaltyDays: integer("penalty_days").notNull(),

		// Skor Akhir
		totalIndex: doublePrecision("total_index").notNull(),
		finalPoint: doublePrecision("final_point").notNull(),
		finalAmount: integer("final_amount").notNull(), // Uang jaspel

		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		index("idx_jaspel_dist_month_year").on(t.month, t.year),
		index("idx_jaspel_dist_employee").on(t.employeeId),
	],
);

export const employeeJaspelVariablesRelations = relations(
	employeeJaspelVariables,
	({ one }) => ({
		employee: one(employees, {
			fields: [employeeJaspelVariables.employeeId],
			references: [employees.id],
		}),
	}),
);

export const jaspelDistributionsRelations = relations(
	jaspelDistributions,
	({ one }) => ({
		employee: one(employees, {
			fields: [jaspelDistributions.employeeId],
			references: [employees.id],
		}),
	}),
);
