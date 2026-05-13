import * as schema from "@adms/database";
import { Inject, Injectable } from "@nestjs/common";
import { between, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Workbook } from "exceljs";
import { DRIZZLE } from "../database/database.module";

@Injectable()
export class ReportsService {
	constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

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
}
