import * as schema from "@adms/database";
import { Inject, Injectable } from "@nestjs/common";
import { between, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Workbook } from "exceljs";
import { DRIZZLE } from "../database/database.module";

function parseTime(t: string): number {
	const [h = "0", m = "0"] = t.split(":");
	return Number.parseInt(h, 10) * 60 + Number.parseInt(m, 10);
}

function formatTime(d: Date): string {
	return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function getWIBMinutes(d: Date): number {
	return d.getHours() * 60 + d.getMinutes();
}

@Injectable()
export class ReportsService {
	constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

	async getDailyRecap(month: number, year: number) {
		const startDate = new Date(year, month - 1, 1);
		const endDate = new Date(year, month, 0, 23, 59, 59);
		const daysInMonth = new Date(year, month, 0).getDate();

		const allEmployees = await this.db
			.select({
				id: schema.employees.id,
				name: schema.employees.name,
				employeeCode: schema.employees.employeeCode,
				shiftId: schema.employees.shiftId,
			})
			.from(schema.employees)
			.where(eq(schema.employees.isActive, true));

		const shifts = await this.db.select().from(schema.shifts);
		const shiftMap = new Map(shifts.map((s) => [s.id, s]));

		const logs = await this.db
			.select()
			.from(schema.attendanceLogs)
			.where(between(schema.attendanceLogs.timestamp, startDate, endDate));

		const holidays = await this.db
			.select()
			.from(schema.holidays)
			.where(between(schema.holidays.date, `${year}-${String(month).padStart(2, "0")}-01`, `${year}-${String(month).padStart(2, "0")}-${daysInMonth}`));
		const holidayDates = new Set(holidays.map((h) => h.date));

		return allEmployees.map((emp) => {
			const shift = emp.shiftId ? shiftMap.get(emp.shiftId) : null;
			const workDays = (shift?.workDays as number[]) || [1, 2, 3, 4, 5];
			const empLogs = logs.filter((l) => l.employeeId === emp.id);

			const days: {
				date: string;
				isWorkDay: boolean;
				isHoliday: boolean;
				clockIn: string | null;
				clockOut: string | null;
				inLogId: number | null;
				outLogId: number | null;
				status: string;
				lateMinutes: number;
				earlyOutMinutes: number;
			}[] = [];

			let totalLate = 0;
			let totalEarlyOut = 0;
			let totalPresent = 0;
			let totalAbsent = 0;

			for (let d = 1; d <= daysInMonth; d++) {
				const date = new Date(year, month - 1, d);
				const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
				const dow = date.getDay();
				const isHoliday = holidayDates.has(dateStr);
				const isWorkDay = workDays.includes(dow) && !isHoliday;

				const dayLogs = empLogs.filter((l) => {
					return l.timestamp.getFullYear() === year && l.timestamp.getMonth() === month - 1 && l.timestamp.getDate() === d;
				});

				const inLog = dayLogs.find((l) => l.type === "IN");
				const outLog = dayLogs.filter((l) => l.type === "OUT").pop();

				let lateMinutes = 0;
				let earlyOutMinutes = 0;
				let status = "ABSENT";

				if (!isWorkDay) {
					status = "-";
				} else if (inLog) {
					// Hitung ulang status berdasarkan shift saat ini
					if (shift) {
						const startMinutes = parseTime(shift.startTime);
						const scanInMinutes = getWIBMinutes(inLog.timestamp);
						const cutoff = startMinutes + (shift.toleranceMinutes ?? 0);

						if (shift.maxLateTime) {
							const maxMinutes = parseTime(shift.maxLateTime);
							if (scanInMinutes > maxMinutes) {
								status = "ABSENT";
							} else if (scanInMinutes > cutoff) {
								status = "LATE";
								lateMinutes = scanInMinutes - cutoff;
							} else {
								status = "PRESENT";
							}
						} else {
							status = scanInMinutes > cutoff ? "LATE" : "PRESENT";
							if (status === "LATE") lateMinutes = scanInMinutes - cutoff;
						}

						// Cek pulang cepat
						if (outLog) {
							const endMinutes = parseTime(shift.endTime);
							const scanOutMinutes = getWIBMinutes(outLog.timestamp);
							const earlyLimit = endMinutes - (shift.earlyOutTolerance ?? 0);
							if (scanOutMinutes < earlyLimit) {
								earlyOutMinutes = endMinutes - scanOutMinutes;
								if (status !== "ABSENT") status = "EARLY_OUT";
							}
						}
					} else {
						status = "PRESENT";
					}

					if (status === "PRESENT" || status === "LATE") totalPresent++;
					if (status === "LATE") totalLate++;
					if (status === "EARLY_OUT") { totalEarlyOut++; totalPresent++; }
				} else {
					// Hari kerja tapi tidak ada log — cek apakah hari sudah lewat
					if (date <= new Date()) totalAbsent++;
					else status = "-";
				}

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
				id: emp.id,
				name: emp.name,
				employeeCode: emp.employeeCode,
				shiftName: shift?.name || "-",
				days,
				totalPresent,
				totalLate,
				totalEarlyOut,
				totalAbsent,
			};
		});
	}

	async getMonthlySummary(month: number, year: number) {
		const startDate = new Date(year, month - 1, 1);
		const endDate = new Date(year, month, 0, 23, 59, 59);

		// Ambil semua pegawai
		const allEmployees = await this.db
			.select({
				id: schema.employees.id,
				name: schema.employees.name,
				employeeCode: schema.employees.employeeCode,
				department: schema.employees.department,
			})
			.from(schema.employees)
			.where(eq(schema.employees.isActive, true));

		// Ambil log absensi untuk rentang waktu tersebut
		const logs = await this.db
			.select()
			.from(schema.attendanceLogs)
			.where(between(schema.attendanceLogs.timestamp, startDate, endDate));

		// Agregasi data per pegawai
		const summary = allEmployees.map((emp) => {
			const empLogs = logs.filter((log) => log.employeeId === emp.id);
			const present = new Set(
				empLogs.map((log) => log.timestamp.toDateString()),
			).size;
			const late = empLogs.filter((log) => log.status === "LATE").length;

			return {
				...emp,
				totalPresent: present,
				totalLate: late,
				// Logika absensi: (jumlah hari kerja - hadir)
				// Untuk sementara kita asumsikan 20 hari kerja
				totalAbsent: Math.max(0, 20 - present),
			};
		});

		return summary;
	}

	async generateExcel(month: number, year: number) {
		const data = await this.getMonthlySummary(month, year);
		const workbook = new Workbook();
		const worksheet = workbook.addWorksheet("Laporan Absensi");

		// Styling Header
		worksheet.columns = [
			{ header: "NAMA PEGAWAI", key: "name", width: 30 },
			{ header: "NIP", key: "employeeCode", width: 20 },
			{ header: "DEPARTEMEN", key: "department", width: 20 },
			{ header: "HADIR", key: "totalPresent", width: 10 },
			{ header: "TERLAMBAT", key: "totalLate", width: 15 },
			{ header: "ALPA", key: "totalAbsent", width: 10 },
		];

		worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
		worksheet.getRow(1).fill = {
			type: "pattern",
			pattern: "solid",
			fgColor: { argb: "FF4F46E5" }, // Indigo 600
		};

		// Add Data
		for (const item of data) {
			worksheet.addRow(item);
		}

		// Styling rows
		worksheet.eachRow((row, rowNumber) => {
			if (rowNumber > 1) {
				row.border = {
					bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
				};
			}
		});

		return workbook;
	}

	async generateDailyRecapExcel(month: number, year: number) {
		const data = await this.getDailyRecap(month, year);
		const workbook = new Workbook();
		const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

		for (const emp of data) {
			const sheetName = emp.name.substring(0, 31).replace(/[*?:/\\[\]]/g, "");
			const ws = workbook.addWorksheet(sheetName);

			ws.columns = [
				{ header: "Tanggal", key: "date", width: 15 },
				{ header: "Masuk", key: "clockIn", width: 10 },
				{ header: "Pulang", key: "clockOut", width: 10 },
				{ header: "Status", key: "status", width: 12 },
				{ header: "Telat (mnt)", key: "late", width: 12 },
				{ header: "Pulang Cepat (mnt)", key: "early", width: 18 },
				{ header: "Keterangan", key: "note", width: 25 },
			];

			// Title
			ws.insertRow(1, [`${emp.name} - ${months[month - 1]} ${year} (${emp.shiftName})`]);
			ws.mergeCells("A1:G1");
			ws.getRow(1).font = { bold: true, size: 14 };
			ws.insertRow(2, []);

			// Header row is now row 3
			const headerRow = ws.getRow(3);
			headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
			headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };

			for (const day of emp.days) {
				const d = new Date(day.date + "T00:00:00");
				const dayName = d.toLocaleDateString("id-ID", { weekday: "short" });
				const dayNum = d.getDate();

				let statusLabel = "-";
				if (day.isHoliday) statusLabel = "LIBUR";
				else if (!day.isWorkDay) statusLabel = "OFF";
				else {
					switch (day.status) {
						case "PRESENT": statusLabel = "HADIR"; break;
						case "LATE": statusLabel = "TELAT"; break;
						case "EARLY_OUT": statusLabel = "PULANG CEPAT"; break;
						case "ABSENT": statusLabel = "ALPA"; break;
					}
				}

				let note = "";
				if (day.isWorkDay && !day.isHoliday) {
					if (!day.clockIn && !day.clockOut) note = "Tidak absen";
					else if (!day.clockIn) note = "Tidak absen masuk";
					else if (!day.clockOut) note = "Tidak absen pulang";
				}

				ws.addRow({
					date: `${dayName}, ${dayNum}`,
					clockIn: day.clockIn || "-",
					clockOut: day.clockOut || "-",
					status: statusLabel,
					late: day.lateMinutes > 0 ? day.lateMinutes : "-",
					early: day.earlyOutMinutes > 0 ? day.earlyOutMinutes : "-",
					note,
				});
			}

			// Summary row
			ws.addRow([]);
			ws.addRow(["TOTAL", "", "", "", "", "", ""]);
			ws.addRow(["Hadir", emp.totalPresent, "", "Telat", emp.totalLate, "Pulang Cepat", emp.totalEarlyOut]);
			ws.addRow(["Alpa", emp.totalAbsent]);
		}

		return workbook;
	}
}
