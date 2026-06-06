import * as schema from "@adms/database";
import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE } from "../database/database.module";
import { ReportsService } from "../reports/reports.service";

@Injectable()
export class JaspelService {
	constructor(
		// biome-ignore lint/suspicious/noExplicitAny: using any for drizzle db
		@Inject(DRIZZLE) private readonly db: any,
		private readonly reportsService: ReportsService,
	) {}

	async getVariables() {
		const employees = await this.db
			.select({
				id: schema.employees.id,
				name: schema.employees.name,
				employeeCode: schema.employees.employeeCode,
				isActive: schema.employees.isActive,
			})
			.from(schema.employees)
			.where(eq(schema.employees.isActive, true));

		const variables = await this.db
			.select()
			.from(schema.employeeJaspelVariables);

		// Map together
		return employees.map((emp) => {
			const v = variables.find((v) => v.employeeId === emp.id);
			return {
				employeeId: emp.id,
				name: emp.name,
				employeeCode: emp.employeeCode,
				basicIndex: v?.basicIndex || 0,
				positionIndex: v?.positionIndex || 0,
				riskIndex: v?.riskIndex || 0,
			};
		});
	}

	async updateVariable(
		employeeId: number,
		basicIndex: number,
		positionIndex: number,
		riskIndex: number,
	) {
		const existing = await this.db
			.select()
			.from(schema.employeeJaspelVariables)
			.where(eq(schema.employeeJaspelVariables.employeeId, employeeId));

		if (existing.length > 0) {
			await this.db
				.update(schema.employeeJaspelVariables)
				.set({ basicIndex, positionIndex, riskIndex, updatedAt: new Date() })
				.where(eq(schema.employeeJaspelVariables.employeeId, employeeId));
		} else {
			await this.db.insert(schema.employeeJaspelVariables).values({
				employeeId,
				basicIndex,
				positionIndex,
				riskIndex,
			});
		}

		return { success: true };
	}

	async getDistributions(month: number, year: number) {
		const funds = await this.db
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
			.where(
				and(
					eq(schema.jaspelDistributions.month, month),
					eq(schema.jaspelDistributions.year, year),
				),
			);

		return {
			fund: funds[0] || null,
			distributions,
		};
	}

	async calculate(month: number, year: number, totalFund: number) {
		// 1. Dapatkan recap absensi
		const recaps = await this.reportsService.getDailyRecap(month, year);

		// 2. Dapatkan variabel Jaspel pegawai
		const variablesList = await this.db
			.select()
			.from(schema.employeeJaspelVariables);

		// biome-ignore lint/suspicious/noExplicitAny: complex object array
		const distributionsData: any[] = [];
		let totalAllPoints = 0;

		const WORKING_DAYS = 22; // Asumsi hari kerja standar sebulan

		for (const emp of recaps) {
			const v = variablesList.find((v) => v.employeeId === emp.id) || {
				basicIndex: 0,
				positionIndex: 0,
				riskIndex: 0,
			};

			// Hitung Potongan
			const penaltyFromMins = Math.round(
				(emp.totalLateMinutesSum + emp.totalEarlyOutMinutesSum) / 420,
			);

			let missedPunches = 0;
			for (const day of emp.days) {
				if (day.isWorkDay && !day.isHoliday && day.status !== "LEAVE") {
					if (
						(day.clockIn && !day.clockOut) ||
						(!day.clockIn && day.clockOut)
					) {
						missedPunches++;
					}
				}
			}
			const penaltyFromPunches = Math.floor(missedPunches / 2);
			const penaltyDays = penaltyFromMins + penaltyFromPunches;

			// Kehadiran maksimal adalah WORKING_DAYS
			const effectiveDays = Math.max(0, WORKING_DAYS - penaltyDays);
			const attendanceScore = effectiveDays / WORKING_DAYS; // Maksimal 1.0

			const totalIndex = v.basicIndex + v.positionIndex + v.riskIndex;
			const finalPoint = totalIndex * attendanceScore;

			distributionsData.push({
				month,
				year,
				employeeId: emp.id,
				basicIndex: v.basicIndex,
				positionIndex: v.positionIndex,
				riskIndex: v.riskIndex,
				totalLateMins: emp.totalLateMinutesSum,
				totalEarlyMins: emp.totalEarlyOutMinutesSum,
				missedPunches,
				penaltyDays,
				totalIndex,
				finalPoint,
				finalAmount: 0, // Akan dihitung setelah totalAllPoints diketahui
			});

			totalAllPoints += finalPoint;
		}

		// 3. Hitung proporsi uang
		for (const dist of distributionsData) {
			if (totalAllPoints > 0) {
				dist.finalAmount = Math.round(
					(dist.finalPoint / totalAllPoints) * totalFund,
				);
			} else {
				dist.finalAmount = 0;
			}
		}

		// 4. Simpan ke database
		await this.db.transaction(async (tx) => {
			// Hapus data bulan ini jika sudah ada
			await tx
				.delete(schema.jaspelFunds)
				.where(
					and(
						eq(schema.jaspelFunds.month, month),
						eq(schema.jaspelFunds.year, year),
					),
				);

			await tx
				.delete(schema.jaspelDistributions)
				.where(
					and(
						eq(schema.jaspelDistributions.month, month),
						eq(schema.jaspelDistributions.year, year),
					),
				);

			// Insert fund
			await tx.insert(schema.jaspelFunds).values({
				month,
				year,
				totalFund,
			});

			// Insert distributions
			if (distributionsData.length > 0) {
				await tx.insert(schema.jaspelDistributions).values(distributionsData);
			}
		});

		return { success: true };
	}
}
