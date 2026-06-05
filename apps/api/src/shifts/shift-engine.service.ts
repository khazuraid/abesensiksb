import * as schema from "@adms/database";
import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE } from "../database/database.module";

interface EvaluateAttendanceInput {
	employeeId: number;
	shiftIds?: number[] | null;
	timestamp: Date;
	type: "IN" | "OUT";
}

type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "EARLY_OUT";

/**
 * Mesin perhitungan absensi:
 *
 * Scan IN:
 * - scanTime <= startTime + toleranceMinutes → PRESENT
 * - scanTime > startTime + toleranceMinutes → LATE
 * - scanTime > maxLateTime (jika di-set) → ABSENT
 *
 * Scan OUT:
 * - scanTime >= endTime - earlyOutTolerance → PRESENT
 * - scanTime < endTime - earlyOutTolerance → EARLY_OUT
 *
 * Hari libur: selalu PRESENT (tidak trigger LATE/ABSENT)
 */
@Injectable()
export class ShiftEngineService {
	constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

	async evaluateAttendance(
		input: EvaluateAttendanceInput,
	): Promise<AttendanceStatus> {
		// Cek hari libur
		const dateStr = this.formatDate(input.timestamp);
		const holiday = await this.db
			.select()
			.from(schema.holidays)
			.where(eq(sql`${schema.holidays.date}::text`, dateStr));
		if (holiday.length > 0) return "PRESENT";

		// Ambil shift: jika ada shiftId gunakan itu, jika tidak cari berdasarkan hari
		const dayOfWeek = input.timestamp.getDay();
		let shift: typeof schema.shifts.$inferSelect | undefined;

		if (input.shiftIds && input.shiftIds.length > 0) {
			const results = await this.db
				.select()
				.from(schema.shifts)
				.where(
					and(
						inArray(schema.shifts.id, input.shiftIds),
						eq(schema.shifts.isActive, true),
					),
				);
			// Cari shift yang berlaku untuk hari ini
			shift = results.find((s) =>
				(s.workDays || [1, 2, 3, 4, 5]).includes(dayOfWeek),
			);
			if (!shift && results.length > 0) {
				shift = results[0]; // fallback ke shift pertama jika tidak ada yang cocok hari ini
			}
		}

		if (!shift) {
			// Auto-match berdasarkan workDays untuk semua shift aktif jika tidak punya shiftIds
			const allShifts = await this.db
				.select()
				.from(schema.shifts)
				.where(eq(schema.shifts.isActive, true));
			shift = allShifts.find((s) => s.workDays?.includes(dayOfWeek));
		}

		if (!shift) return "PRESENT";

		// Cek apakah hari ini termasuk hari kerja shift
		const workDays = shift.workDays || [1, 2, 3, 4, 5];
		if (!workDays.includes(dayOfWeek)) return "PRESENT";

		const {
			startTime,
			endTime,
			toleranceMinutes,
			earlyOutTolerance,
			maxLateTime,
			minOutTime,
		} = shift;
		const scanMinutes =
			input.timestamp.getHours() * 60 + input.timestamp.getMinutes();

		// === SCAN MASUK ===
		if (input.type === "IN") {
			const startMinutes = this.parseTimeToMinutes(startTime);
			const cutoff = startMinutes + (toleranceMinutes ?? 0);

			// Cek apakah lewat batas maksimal jam absen
			if (maxLateTime) {
				const maxMinutes = this.parseTimeToMinutes(maxLateTime);
				if (scanMinutes > maxMinutes) {
					return "ABSENT";
				}
			}

			return scanMinutes > cutoff ? "LATE" : "PRESENT";
		}

		// === SCAN PULANG ===
		if (input.type === "OUT") {
			// Cek batas minimal jam pulang — sebelum ini = ABSENT
			if (minOutTime) {
				const minMinutes = this.parseTimeToMinutes(minOutTime);
				if (scanMinutes < minMinutes) {
					return "ABSENT";
				}
			}

			const endMinutes = this.parseTimeToMinutes(endTime);
			const earlyLimit = endMinutes - (earlyOutTolerance ?? 0);

			if (scanMinutes < earlyLimit) {
				return "EARLY_OUT";
			}
			return "PRESENT";
		}

		return "PRESENT";
	}

	private parseTimeToMinutes(time: string): number {
		const [h = "0", m = "0"] = time.split(":");
		return Number.parseInt(h, 10) * 60 + Number.parseInt(m, 10);
	}

	private formatDate(d: Date): string {
		const yyyy = d.getFullYear();
		const mm = String(d.getMonth() + 1).padStart(2, "0");
		const dd = String(d.getDate()).padStart(2, "0");
		return `${yyyy}-${mm}-${dd}`;
	}
}
