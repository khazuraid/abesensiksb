"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
	Calendar as CalendarIcon,
	CheckCircle,
	ChevronDown,
	Download,
	Eye,
	Search,
	TimerOff,
	Users,
	UserX,
	X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import PaginationControls, {
	type PageMeta,
} from "@/components/pagination-controls";
import api from "@/lib/api";
import { useModalAccessibility } from "@/lib/use-modal-accessibility";

interface MonthlyReport {
	id: string;
	employeeCode: string;
	name: string;
	department: string;
	totalPresent: number;
	totalLate: number;
	totalAbsent: number;
	totalLeave: number;
}

interface DailyReportDay {
	date: string;
	isWorkDay: boolean;
	isHoliday: boolean;
	status: string;
	clockIn: string | null;
	clockOut: string | null;
	lateMinutes: number;
	earlyOutMinutes: number;
}

interface DailyReportEmployee {
	id: number;
	name: string;
	totalLateMinutesSum: number;
	totalEarlyOutMinutesSum: number;
	totalAbsent: number;
	totalLeave: number;
	days: DailyReportDay[];
}

export default function ReportsPage() {
	const [month, setMonth] = useState(new Date().getMonth() + 1);
	const [year, setYear] = useState(new Date().getFullYear());
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
	const detailDialogRef = useRef<HTMLDivElement>(null);
	const closeDetail = useCallback(() => setSelectedEmployee(null), []);
	useModalAccessibility(
		detailDialogRef,
		closeDetail,
		Boolean(selectedEmployee),
	);

	const {
		data: reportResponse,
		isLoading,
		isFetching,
	} = useQuery<{ data: MonthlyReport[]; meta: PageMeta }>({
		queryKey: ["monthly-report", month, year, page, search],
		queryFn: async () => {
			return (
				await api.get(
					`/reports/summary?month=${month}&year=${year}&page=${page}&limit=10&search=${encodeURIComponent(search)}`,
				)
			).data;
		},
	});
	const reportData = reportResponse?.data;

	const { data: availablePeriods } = useQuery<
		{ month: number; year: number }[]
	>({
		queryKey: ["available-periods"],
		queryFn: async () => {
			return (await api.get(`/reports/available-periods`)).data;
		},
	});

	const filteredData = reportData ?? [];

	const { data: dailyRecapResponse, isLoading: isLoadingDaily } = useQuery<{
		data: DailyReportEmployee[];
	}>({
		queryKey: ["daily-recap-detail", month, year, selectedEmployee],
		queryFn: async () => {
			return (
				await api.get(
					`/reports/daily-recap?month=${month}&year=${year}&employeeId=${selectedEmployee}&page=1&limit=1`,
				)
			).data;
		},
		enabled: !!selectedEmployee,
	});
	const dailyRecapData = dailyRecapResponse?.data;

	const selectedEmployeeDetail = dailyRecapData?.find(
		(emp) => emp.id === Number(selectedEmployee),
	);

	const handleExport = async () => {
		try {
			const res = await api.get(`/reports/export?month=${month}&year=${year}`, {
				responseType: "blob",
			});
			const url = window.URL.createObjectURL(new Blob([res.data]));
			const a = document.createElement("a");
			a.href = url;
			a.download = `Laporan-Absensi-${month}-${year}.xlsx`;
			a.click();
		} catch {
			alert("Gagal export laporan");
		}
	};

	const monthName = new Date(0, month - 1).toLocaleString("id-ID", {
		month: "long",
	});

	const stats = {
		totalEmployees: reportData?.length || 0,
		avgAttendance: 0,
		totalLate: 0,
		absentRate: 0,
	};

	if (reportData && reportData.length > 0) {
		const totalDays = reportData.reduce(
			(acc, curr) =>
				acc + curr.totalPresent + curr.totalAbsent + curr.totalLeave,
			0,
		);
		const totalPresent = reportData.reduce(
			(acc, curr) => acc + curr.totalPresent,
			0,
		);
		const totalAbsent = reportData.reduce(
			(acc, curr) => acc + curr.totalAbsent,
			0,
		);

		stats.totalLate = reportData.reduce((acc, curr) => acc + curr.totalLate, 0);

		if (totalDays > 0) {
			stats.avgAttendance = Number(
				((totalPresent / totalDays) * 100).toFixed(1),
			);
			stats.absentRate = Number(((totalAbsent / totalDays) * 100).toFixed(1));
		}
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className="space-y-8 max-w-[1440px] mx-auto min-h-[calc(100vh-6rem)]"
		>
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h2 className="font-display text-3xl font-semibold text-[#111c2d]">
						Laporan Performa Pegawai
					</h2>
					<p className="font-sans text-sm text-[#6e797e] mt-1">
						Ringkasan analitik kehadiran dan kedisiplinan periode {monthName}{" "}
						{year}.
					</p>
				</div>
				<div className="grid w-full grid-cols-1 gap-2 min-[390px]:grid-cols-2 md:flex md:w-auto md:items-center md:gap-3">
					<div className="relative min-w-0">
						<select
							className="appearance-none bg-white border border-[#bdc8ce] rounded-lg pl-10 pr-10 py-2 cursor-pointer hover:bg-[#f9f9ff] transition-colors shadow-sm font-semibold text-[13px] text-[#111c2d] outline-none focus:ring-2 focus:ring-[#00647c]/20 focus:border-[#00647c]"
							value={`${month}-${year}`}
							onChange={(e) => {
								const [m, y] = e.target.value.split("-");
								setMonth(Number(m));
								setYear(Number(y));
							}}
						>
							{availablePeriods?.map((p) => {
								const mName = new Date(0, p.month - 1).toLocaleString("id-ID", {
									month: "long",
								});
								return (
									<option
										key={`${p.month}-${p.year}`}
										value={`${p.month}-${p.year}`}
									>
										{mName} {p.year}
									</option>
								);
							})}
							{!availablePeriods && (
								<option value={`${month}-${year}`}>
									{monthName} {year}
								</option>
							)}
						</select>
						<CalendarIcon
							size={18}
							className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e797e] pointer-events-none"
						/>
						<ChevronDown
							size={18}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e797e] pointer-events-none"
						/>
					</div>
					<button
						type="button"
						onClick={handleExport}
						className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#bdc8ce] text-[#00647c] rounded-lg font-semibold text-[13px] hover:bg-[#dee8ff]/50 hover:border-[#00647c]/50 transition-colors shadow-sm active:scale-95"
					>
						<Download size={18} />
						Export Laporan
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{/* Cards */}
				<div className="bg-white rounded-xl p-6 border border-black/5 shadow-sm relative overflow-hidden group hover:border-[#00647c]/30 transition-colors">
					<div className="absolute top-0 right-0 w-24 h-24 bg-[#00647c]/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
					<div className="flex justify-between items-start mb-4 relative z-10">
						<div className="p-2 bg-[#f0f3ff] rounded-lg text-[#00647c]">
							<Users size={24} />
						</div>
						<span className="font-semibold text-[11px] text-[#006c49] flex items-center bg-[#6cf8bb]/30 px-2 py-1 rounded-full">
							+2.4%
						</span>
					</div>
					<h3 className="font-sans text-[14px] text-[#6e797e] relative z-10">
						Total Pegawai Aktif
					</h3>
					<p className="font-display text-[32px] font-semibold text-[#111c2d] mt-1 relative z-10">
						{stats.totalEmployees}
					</p>
				</div>

				<div className="bg-white rounded-xl p-6 border border-black/5 shadow-sm relative overflow-hidden group hover:border-[#00647c]/30 transition-colors">
					<div className="absolute top-0 right-0 w-24 h-24 bg-[#006c49]/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
					<div className="flex justify-between items-start mb-4 relative z-10">
						<div className="p-2 bg-[#f0f3ff] rounded-lg text-[#006c49]">
							<CheckCircle size={24} />
						</div>
					</div>
					<h3 className="font-sans text-[14px] text-[#6e797e] relative z-10">
						Rata-rata Kehadiran
					</h3>
					<p className="font-display text-[32px] font-semibold text-[#111c2d] mt-1 relative z-10">
						{stats.avgAttendance}
						<span className="text-[24px]">%</span>
					</p>
				</div>

				<div className="bg-white rounded-xl p-6 border border-black/5 shadow-sm relative overflow-hidden group hover:border-[#00647c]/30 transition-colors">
					<div className="absolute top-0 right-0 w-24 h-24 bg-[#894e00]/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
					<div className="flex justify-between items-start mb-4 relative z-10">
						<div className="p-2 bg-[#f0f3ff] rounded-lg text-[#894e00]">
							<TimerOff size={24} />
						</div>
					</div>
					<h3 className="font-sans text-[14px] text-[#6e797e] relative z-10">
						Total Keterlambatan
					</h3>
					<p className="font-display text-[32px] font-semibold text-[#111c2d] mt-1 relative z-10">
						{stats.totalLate}
						<span className="font-semibold text-[24px] text-[#6e797e] ml-1">
							Kali
						</span>
					</p>
				</div>

				<div className="bg-white rounded-xl p-6 border border-black/5 shadow-sm relative overflow-hidden group hover:border-[#00647c]/30 transition-colors">
					<div className="absolute top-0 right-0 w-24 h-24 bg-[#ba1a1a]/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
					<div className="flex justify-between items-start mb-4 relative z-10">
						<div className="p-2 bg-[#f0f3ff] rounded-lg text-[#ba1a1a]">
							<UserX size={24} />
						</div>
					</div>
					<h3 className="font-sans text-[14px] text-[#6e797e] relative z-10">
						Tingkat Absensi
					</h3>
					<p className="font-display text-[32px] font-semibold text-[#111c2d] mt-1 relative z-10">
						{stats.absentRate}
						<span className="text-[24px]">%</span>
					</p>
				</div>
			</div>

			<div className="bg-white rounded-xl border border-black/5 shadow-sm overflow-hidden flex flex-col">
				<div className="px-6 py-5 border-b border-black/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#f9f9ff]/50">
					<h2 className="font-semibold text-[20px] text-[#111c2d]">
						Detail Performa Individu
					</h2>
					<div className="relative w-full sm:w-auto">
						<Search
							size={18}
							className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e797e]"
						/>
						<input
							type="text"
							placeholder="Cari nama atau NIK..."
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setPage(1);
							}}
							className="w-full sm:w-64 bg-white border border-[#bdc8ce] rounded-lg py-2 pl-10 pr-4 text-[13px] text-[#111c2d] focus:outline-none focus:border-[#00647c] focus:ring-1 focus:ring-[#00647c] transition-all"
						/>
					</div>
				</div>

				<div className="mobile-scroll-hint">
					Geser tabel untuk melihat seluruh metrik
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse min-w-[800px]">
						<thead>
							<tr className="bg-[#f0f3ff] border-b border-black/5">
								<th className="px-6 py-4 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider w-1/4">
									Nama Pegawai
								</th>
								<th className="px-6 py-4 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider">
									Departemen
								</th>
								<th className="px-6 py-4 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider text-center">
									Kehadiran
								</th>
								<th className="px-6 py-4 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider text-center">
									Terlambat
								</th>
								<th className="px-6 py-4 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider text-center">
									Skor
								</th>
								<th className="px-6 py-4 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider text-right">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-black/5 font-sans text-[14px] text-[#111c2d]">
							{isLoading ? (
								[1, 2, 3].map((k) => (
									<tr key={k} className="animate-pulse">
										<td colSpan={6} className="px-6 py-4 h-16 bg-white" />
									</tr>
								))
							) : filteredData.length === 0 ? (
								<tr>
									<td
										colSpan={6}
										className="py-16 text-center text-[#6e797e] text-sm"
									>
										Tidak ada data laporan.
									</td>
								</tr>
							) : (
								filteredData.map((row) => {
									const totalRowDays =
										row.totalPresent + row.totalAbsent + row.totalLeave;
									const attendanceRate =
										totalRowDays > 0
											? (row.totalPresent / totalRowDays) * 100
											: 0;
									const scoreValue = Math.round(
										attendanceRate - row.totalLate * 2,
									);
									const score =
										scoreValue >= 90
											? "A"
											: scoreValue >= 80
												? "B"
												: scoreValue >= 70
													? "C"
													: "D";

									return (
										<tr
											key={row.id}
											className="hover:bg-[#dee8ff]/20 transition-colors group"
										>
											<td className="px-6 py-4">
												<div className="flex items-center gap-3">
													<div className="w-8 h-8 rounded-full bg-[#007f9d] text-white flex items-center justify-center font-semibold text-[12px]">
														{row.name
															.split(" ")
															.map((n) => n[0])
															.join("")
															.slice(0, 2)
															.toUpperCase()}
													</div>
													<div>
														<div className="font-semibold text-[#111c2d]">
															{row.name}
														</div>
														<div className="text-[#6e797e] text-[11px] font-medium">
															NIK: {row.employeeCode}
														</div>
													</div>
												</div>
											</td>
											<td className="px-6 py-4 text-[#3e484d]">
												{row.department || "-"}
											</td>
											<td className="px-6 py-4 text-center">
												{row.totalPresent}/{totalRowDays} Hari
											</td>
											<td className="px-6 py-4 text-center">
												<span
													className={
														row.totalLate > 0
															? "text-[#894e00] font-medium"
															: "text-[#3e484d]"
													}
												>
													{row.totalLate > 0 ? `${row.totalLate} Kali` : "-"}
												</span>
											</td>
											<td className="px-6 py-4 text-center">
												<span
													className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full font-semibold text-[11px] ${
														scoreValue >= 90
															? "bg-[#6cf8bb]/30 text-[#006c49]"
															: scoreValue >= 80
																? "bg-[#ffeebb] text-[#894e00]"
																: "bg-[#ffdad6] text-[#ba1a1a]"
													}`}
												>
													{score} ({Math.max(0, scoreValue)})
												</span>
											</td>
											<td className="px-6 py-4 text-right">
												<button
													type="button"
													onClick={() => setSelectedEmployee(row.id)}
													title="Lihat Detail Harian"
													className="text-[#00647c] hover:text-[#007f9d] p-1.5 rounded-lg hover:bg-[#dee8ff]/50 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
												>
													<Eye size={20} />
												</button>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
				<PaginationControls
					meta={reportResponse?.meta}
					onPageChange={setPage}
					disabled={isFetching}
				/>
			</div>

			{selectedEmployee && (
				<div
					ref={detailDialogRef}
					className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
					role="dialog"
					aria-modal="true"
					aria-labelledby="report-detail-title"
				>
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						className="bg-white rounded-t-xl sm:rounded-md shadow-xl w-full max-w-4xl max-h-[calc(100dvh-env(safe-area-inset-top))] sm:max-h-[90dvh] flex flex-col overflow-hidden"
					>
						<div className="px-6 py-4 border-b border-black/5 flex justify-between items-center bg-[#f9f9ff]">
							<h3
								id="report-detail-title"
								className="font-semibold text-[18px] text-[#111c2d]"
							>
								Detail Riwayat Harian
							</h3>
							<button
								type="button"
								onClick={() => setSelectedEmployee(null)}
								className="text-[#6e797e] hover:text-[#ba1a1a] transition-colors p-1"
							>
								<X size={24} />
							</button>
						</div>

						<div className="p-0 overflow-y-auto bg-[#f9f9ff] flex-1">
							{isLoadingDaily ? (
								<div className="flex justify-center items-center py-20">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00647c]" />
								</div>
							) : selectedEmployeeDetail ? (
								<div className="flex flex-col md:flex-row h-full">
									{/* Sidebar Ringkasan (Kiri) */}
									<div className="w-full md:w-80 bg-white border-r border-black/5 p-6 flex flex-col gap-6 shrink-0">
										<div className="text-center">
											<div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#00647c] to-[#004e61] text-white flex items-center justify-center font-bold text-[28px] shadow-md mb-4">
												{selectedEmployeeDetail.name
													.split(" ")
													.map((n: string) => n[0])
													.join("")
													.slice(0, 2)
													.toUpperCase()}
											</div>
											<h4 className="text-[18px] font-bold text-[#111c2d] leading-tight">
												{selectedEmployeeDetail.name}
											</h4>
											<p className="text-[#6e797e] text-[13px] font-medium mt-1">
												Bulan: {monthName} {year}
											</p>
										</div>

										{(() => {
											const totalLate =
												selectedEmployeeDetail.totalLateMinutesSum || 0;
											const totalEarly =
												selectedEmployeeDetail.totalEarlyOutMinutesSum || 0;
											const penaltyMins = Math.round(
												(totalLate + totalEarly) / 420,
											);

											let missed = 0;
											selectedEmployeeDetail.days.forEach((d) => {
												if (
													d.isWorkDay &&
													!d.isHoliday &&
													d.status !== "LEAVE"
												) {
													if (
														(d.clockIn && !d.clockOut) ||
														(!d.clockIn && d.clockOut)
													) {
														missed++;
													}
												}
											});
											const penaltyPunch = Math.floor(missed / 2);
											const totalAbsent =
												selectedEmployeeDetail.totalAbsent || 0;
											const totalLeave = selectedEmployeeDetail.totalLeave || 0;

											const totalPenalty =
												penaltyMins + penaltyPunch + totalAbsent + totalLeave;

											return (
												<div className="flex flex-col gap-4 mt-2">
													<div className="bg-[#f0f3ff] rounded-xl p-4 border border-[#00647c]/10 relative overflow-hidden">
														<div className="absolute top-0 right-0 w-16 h-16 bg-[#00647c]/5 rounded-bl-full -mr-2 -mt-2" />
														<p className="text-[12px] font-bold text-[#00647c] uppercase tracking-wider mb-3">
															Total Potongan
														</p>
														<div className="flex items-baseline gap-2">
															<span className="text-[32px] font-black text-[#111c2d] leading-none">
																{totalPenalty}
															</span>
															<span className="text-[14px] font-medium text-[#6e797e]">
																Hari
															</span>
														</div>
													</div>

													<div className="space-y-3">
														<div className="flex justify-between items-center text-[13px]">
															<span className="text-[#6e797e]">
																Akumulasi Jam (÷ 420)
															</span>
															<span className="font-semibold text-[#111c2d]">
																{penaltyMins} hr
															</span>
														</div>
														<div className="flex justify-between items-center text-[13px]">
															<span className="text-[#6e797e]">
																Lupa Absen (÷ 2)
															</span>
															<span className="font-semibold text-[#111c2d]">
																{penaltyPunch} hr
															</span>
														</div>
														<div className="flex justify-between items-center text-[13px]">
															<span className="text-[#6e797e]">
																Alpa (Tidak Hadir)
															</span>
															<span className="font-semibold text-[#111c2d]">
																{totalAbsent} hr
															</span>
														</div>
														<div className="flex justify-between items-center text-[13px]">
															<span className="text-[#6e797e]">
																Cuti / Izin
															</span>
															<span className="font-semibold text-[#111c2d]">
																{totalLeave} hr
															</span>
														</div>
													</div>
												</div>
											);
										})()}
									</div>

									{/* Tabel Detail (Kanan) */}
									<div className="min-w-0 flex-1 p-4 sm:p-6">
										<div className="bg-white border border-black/5 rounded-xl overflow-hidden shadow-sm">
											<div className="mobile-scroll-hint">
												Geser tabel untuk melihat detail waktu
											</div>
											<div className="overflow-x-auto">
												<table className="w-full text-left border-collapse">
													<thead>
														<tr className="bg-[#f8f9fa] border-b border-black/5">
															<th className="px-5 py-3.5 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider">
																Tanggal
															</th>
															<th className="px-5 py-3.5 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider">
																Status
															</th>
															<th className="px-5 py-3.5 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider text-center">
																Waktu
															</th>
															<th className="px-5 py-3.5 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider text-right">
																Penalti (Mnt)
															</th>
														</tr>
													</thead>
													<tbody className="divide-y divide-black/5 text-[13px]">
														{selectedEmployeeDetail.days.map((day) => {
															let statusColor = "text-[#3e484d] bg-[#f0f3ff]";
															let statusLabel = "-";

															if (day.isHoliday) {
																statusLabel = "Libur";
																statusColor = "text-[#894e00] bg-[#fff8e6]";
															} else if (!day.isWorkDay) {
																statusLabel = "Off";
															} else {
																switch (day.status) {
																	case "PRESENT":
																		statusLabel = "Hadir";
																		statusColor = "text-[#006c49] bg-[#e6fbf2]";
																		break;
																	case "LATE":
																		statusLabel = "Telat";
																		statusColor = "text-[#894e00] bg-[#fff8e6]";
																		break;
																	case "EARLY_OUT":
																		statusLabel = "Pulang Cepat";
																		statusColor = "text-[#894e00] bg-[#fff8e6]";
																		break;
																	case "ABSENT":
																		statusLabel = "Alpa";
																		statusColor =
																			"text-[#ba1a1a] bg-[#ffdad6]/50";
																		break;
																	case "LEAVE":
																		statusLabel = "Cuti/Izin";
																		statusColor = "text-[#00647c] bg-[#e6f4f8]";
																		break;
																}
															}

															return (
																<tr
																	key={day.date}
																	className="hover:bg-[#f9f9ff] transition-colors"
																>
																	<td className="px-5 py-4 font-medium text-[#111c2d]">
																		{day.date}
																	</td>
																	<td className="px-5 py-4">
																		<span
																			className={`inline-flex px-2.5 py-1 rounded font-semibold text-[11px] ${statusColor}`}
																		>
																			{statusLabel}
																		</span>
																	</td>
																	<td className="px-5 py-4 text-center">
																		<div className="flex items-center justify-center gap-2 text-[#3e484d] font-medium">
																			<span>{day.clockIn || "--:--"}</span>
																			<span className="text-[#bdc8ce]">-</span>
																			<span>{day.clockOut || "--:--"}</span>
																		</div>
																	</td>
																	<td className="px-5 py-4 text-right">
																		{day.lateMinutes > 0 ||
																		day.earlyOutMinutes > 0 ? (
																			<span className="text-[#ba1a1a] font-semibold">
																				{day.lateMinutes + day.earlyOutMinutes}
																			</span>
																		) : (
																			<span className="text-[#bdc8ce]">-</span>
																		)}
																	</td>
																</tr>
															);
														})}
													</tbody>
												</table>
											</div>
										</div>
									</div>
								</div>
							) : (
								<div className="text-center py-10 text-[#6e797e]">
									Detail tidak ditemukan.
								</div>
							)}
						</div>
					</motion.div>
				</div>
			)}
		</motion.div>
	);
}
