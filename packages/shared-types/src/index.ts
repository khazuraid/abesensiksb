import { z } from "zod";

export const RoleSchema = z.enum(["ADMIN", "HRD", "USER"]);
export type Role = z.infer<typeof RoleSchema>;

export const UserSchema = z.object({
	email: z.string().email(),
	password: z.string().min(6),
	name: z.string(),
	role: RoleSchema.optional(),
});

export type User = z.infer<typeof UserSchema>;

export const EmployeeSchema = z.object({
	id: z.number(),
	userId: z.number().nullable().optional(),
	employeeCode: z.string().min(1, "NIP/Kode Pegawai wajib diisi"),
	name: z.string().min(1, "Nama wajib diisi"),
	department: z.string().nullable().optional(),
	position: z.string().nullable().optional(),
	branch: z.string().nullable().optional(),
	shiftIds: z.array(z.number()).default([]),
	shiftAssignments: z
		.array(
			z.object({
				id: z.number(),
				employeeId: z.number(),
				shiftId: z.number(),
				startDate: z.string(),
				endDate: z.string().nullable(),
				shiftName: z.string(),
				startTime: z.string(),
				endTime: z.string(),
			}),
		)
		.optional(),
	biometricId: z.string().nullable().optional(),
	biometricSyncedAt: z.date().nullable().optional(),
	isActive: z.boolean().default(true),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const CreateEmployeeSchema = EmployeeSchema.omit({
	id: true,
	biometricSyncedAt: true,
	createdAt: true,
	updatedAt: true,
	shiftAssignments: true,
});

export const UpdateEmployeeSchema = CreateEmployeeSchema.partial();

export type Employee = z.infer<typeof EmployeeSchema>;
export type CreateEmployee = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployee = z.infer<typeof UpdateEmployeeSchema>;

export const AttendanceLogSchema = z.object({
	id: z.number(),
	employeeId: z.number(),
	deviceId: z.number().nullable().optional(),
	timestamp: z.date(),
	type: z.enum(["IN", "OUT"]),
	status: z.enum(["PRESENT", "LATE", "ABSENT"]),
	photoUrl: z.string().nullable().optional(),
	verified: z.boolean().default(true),
	createdAt: z.date(),
});

export type AttendanceLog = z.infer<typeof AttendanceLogSchema> & {
	employee?: Partial<Employee>;
	device?: Partial<Device>;
};

export const DeviceSchema = z.object({
	id: z.number(),
	serialNumber: z.string().optional().default(""),
	name: z.string().min(1, "Nama Perangkat wajib diisi"),
	location: z.string().nullable().optional(),
	ipAddress: z.string().nullable().optional(),
	isOnline: z.boolean().default(false),
	isBlocked: z.boolean().default(false),
	lastSeen: z.date().nullable().optional(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const CreateDeviceSchema = DeviceSchema.omit({
	id: true,
	isOnline: true,
	isBlocked: true,
	lastSeen: true,
	createdAt: true,
	updatedAt: true,
});

export const UpdateDeviceSchema = CreateDeviceSchema.partial();

export type Device = z.infer<typeof DeviceSchema>;
export type CreateDevice = z.infer<typeof CreateDeviceSchema>;
export type UpdateDevice = z.infer<typeof UpdateDeviceSchema>;

export const ShiftSchema = z.object({
	id: z.number(),
	name: z.string().min(1, "Nama Shift wajib diisi"),
	startTime: z.string().min(1),
	endTime: z.string().min(1),
	toleranceMinutes: z.number().min(0).default(0),
	earlyOutTolerance: z.number().min(0).default(0),
	minInTime: z.string().nullable().optional(),
	maxLateTime: z.string().nullable().optional(),
	minOutTime: z.string().nullable().optional(),
	maxOutTime: z.string().nullable().optional(),
	workDays: z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5]),
	effectiveFrom: z.string().nullable().optional(),
	effectiveTo: z.string().nullable().optional(),
	isActive: z.boolean().default(true),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const CreateShiftSchema = ShiftSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});

export const UpdateShiftSchema = CreateShiftSchema.partial();

export type Shift = z.infer<typeof ShiftSchema>;
export type CreateShift = z.infer<typeof CreateShiftSchema>;
export type UpdateShift = z.infer<typeof UpdateShiftSchema>;

export const HolidaySchema = z.object({
	id: z.number(),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD"),
	name: z.string().min(1, "Nama wajib diisi"),
	description: z.string().nullable().optional(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const CreateHolidaySchema = HolidaySchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});

export const UpdateHolidaySchema = CreateHolidaySchema.partial();

export type Holiday = z.infer<typeof HolidaySchema>;
export type CreateHoliday = z.infer<typeof CreateHolidaySchema>;
export type UpdateHoliday = z.infer<typeof UpdateHolidaySchema>;

export const LoginSchema = z.object({
	email: z.string().email("Email tidak valid"),
	password: z.string().min(6, "Password minimal 6 karakter"),
});

export type Login = z.infer<typeof LoginSchema>;

/**
 * Schema untuk validasi record mentah dari mesin ADMS (key=value\tkey=value).
 * Memastikan minimal USERID & CHECKTIME ada dan bertipe valid.
 */
export const ADMSRecordSchema = z.object({
	USERID: z.string().min(1),
	CHECKTIME: z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), {
		message: "CHECKTIME bukan tanggal valid",
	}),
	CHECKTYPE: z.string().optional(),
	VERIFYCODE: z.string().optional(),
	SN: z.string().optional(),
});

export type ADMSRecord = z.infer<typeof ADMSRecordSchema>;

export const DashboardStatsSchema = z.object({
	totalEmployees: z.number(),
	presentToday: z.number(),
	lateToday: z.number(),
	devicesOnline: z.number(),
	devicesTotal: z.number(),
});

export type DashboardStats = z.infer<typeof DashboardStatsSchema>;

export const DeviceCommandTypeEnum = z.enum([
	"check",
	"reset",
	"info",
	"log",
	"reboot",
	"reload",
	"set.timezone",
	"set.time",
	"set.volume",
	"set.language",
	"camera.enable",
	"camera.disable",
	"user.info",
	"user.sync",
	"user.edit",
	"user.delete",
	"user.clone",
	"user.move",
	"attendance.download",
	"attendance.verify",
	"attendance.clear",
	"command.system",
]);

export type DeviceCommandType = z.infer<typeof DeviceCommandTypeEnum>;

export const SendCommandSchema = z.object({
	deviceId: z.number(),
	type: DeviceCommandTypeEnum,
	// Optional payload fields depending on command type
	timezone: z.number().optional(),
	volume: z.number().min(0).max(100).optional(),
	language: z.string().optional(),
	user_id: z.string().optional(),
	name: z.string().optional(),
	privilege: z.number().optional(),
	password: z.union([z.string(), z.number()]).optional(),
	start_date: z.string().optional(),
	end_date: z.string().optional(),
	command: z.string().optional(),
	device_target: z.array(z.number()).optional(),
});

export type SendCommand = z.infer<typeof SendCommandSchema>;
