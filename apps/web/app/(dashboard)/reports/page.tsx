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
import { useState } from "react";
import api from "@/lib/api";

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

export default function ReportsPage() {
	const [month, setMonth] = useState(new Date().getMonth() + 1);
	const [year, setYear] = useState(new Date().getFullYear());
	const [search, setSearch] = useState("");
	const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

	const { data: reportData, isLoading } = useQuery<MonthlyReport[]>({
		queryKey: ["monthly-report", month, year],
		queryFn: async () => {
			return (await api.get(`/reports/summary?month=${month}&year=${year}`))
				.data;
		},
	});

	const { data: availablePeriods } = useQuery<
		{ month: number; year: number }[]
	>({
		queryKey: ["available-periods"],
		queryFn: async () => {
			return (await api.get(`/reports/available-periods`)).data;
		},
	});

	const filteredData =
		reportData?.filter(
			(d) =>
				d.name.toLowerCase().includes(search.toLowerCase()) ||
				d.employeeCode.toLowerCase().includes(search.toLowerCase()),
		) || [];

	const { data: dailyRecapData, isLoading: isLoadingDaily } = useQuery({
		queryKey: ["daily-recap", month, year],
		queryFn: async () => {
			return (await api.get(`/reports/daily-recap?month=${month}&year=${year}`))
				.data;
		},
		enabled: !!selectedEmployee,
	});

	const selectedEmployeeDetail = dailyRecapData?.find(
		/* biome-ignore lint/suspicious/noExplicitAny: too complex */
		(emp: any) => emp.id === selectedEmployee,
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
				<div className="flex items-center gap-3">
					<div className="relative">
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
							onChange={(e) => setSearch(e.target.value)}
							className="w-full sm:w-64 bg-white border border-[#bdc8ce] rounded-lg py-2 pl-10 pr-4 text-[13px] text-[#111c2d] focus:outline-none focus:border-[#00647c] focus:ring-1 focus:ring-[#00647c] transition-all"
						/>
					</div>
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
													className="text-[#00647c] hover:text-[#007f9d] p-1.5 rounded-lg hover:bg-[#dee8ff]/50 transition-colors opacity-0 group-hover:opacity-100"
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
			</div>

			{/* Modal Detail Harian */}
			{selectedEmployee && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
					>
						<div className="px-6 py-4 border-b border-black/5 flex justify-between items-center bg-[#f9f9ff]">
							<h3 className="font-semibold text-[18px] text-[#111c2d]">
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

						<div className="p-6 overflow-y-auto bg-white flex-1">
							{isLoadingDaily ? (
								<div className="flex justify-center items-center py-20">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00647c]" />
								</div>
							) : selectedEmployeeDetail ? (
								<div className="space-y-6">
									<div className="grid grid-cols-2 gap-4">
										<div>
											<p className="text-[12px] text-[#6e797e] font-semibold uppercase tracking-wider">
												Nama Pegawai
											</p>
											<p className="text-[#111c2d] font-medium text-[15px]">
												{selectedEmployeeDetail.name}
											</p>
										</div>
										<div>
											<p className="text-[12px] text-[#6e797e] font-semibold uppercase tracking-wider">
												Bulan / Tahun
											</p>
											<p className="text-[#111c2d] font-medium text-[15px]">
												{monthName} {year}
											</p>
										</div>
									</div>

									<div className="border border-black/5 rounded-lg overflow-hidden">
										<table className="w-full text-left border-collapse">
											<thead>
												<tr className="bg-[#f0f3ff] border-b border-black/5">
													<th className="px-4 py-3 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider">
														Tanggal
													</th>
													<th className="px-4 py-3 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider">
														Status
													</th>
													<th className="px-4 py-3 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider">
														Jam Masuk
													</th>
													<th className="px-4 py-3 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider">
														Jam Pulang
													</th>
													<th className="px-4 py-3 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider">
														Terlambat
													</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-black/5 text-[13px]">
												{selectedEmployeeDetail.days.map(
													/* biome-ignore lint/suspicious/noExplicitAny: complex object */
													(day: any, _i: number) => {
														let statusColor = "text-[#3e484d]";
														let statusLabel = "-";

														if (day.isHoliday) {
															statusLabel = "Libur";
															statusColor = "text-[#894e00]";
														} else if (!day.isWorkDay) {
															statusLabel = "Off";
														} else {
															switch (day.status) {
																case "PRESENT":
																	statusLabel = "Hadir";
																	statusColor = "text-[#006c49]";
																	break;
																case "LATE":
																	statusLabel = "Telat";
																	statusColor = "text-[#894e00]";
																	break;
																case "EARLY_OUT":
																	statusLabel = "Pulang Cepat";
																	statusColor = "text-[#894e00]";
																	break;
																case "ABSENT":
																	statusLabel = "Alpa";
																	statusColor = "text-[#ba1a1a]";
																	break;
																case "LEAVE":
																	statusLabel = "Cuti/Izin";
																	statusColor = "text-[#00647c]";
																	break;
															}
														}

														return (
															<tr key={day.date} className="hover:bg-[#f9f9ff]">
																<td className="px-4 py-3 font-medium">
																	{day.date}
																</td>
																<td
																	className={`px-4 py-3 font-semibold ${statusColor}`}
																>
																	{statusLabel}
																</td>
																<td className="px-4 py-3">
																	{day.clockIn || "-"}
																</td>
																<td className="px-4 py-3">
																	{day.clockOut || "-"}
																</td>
																<td className="px-4 py-3 text-[#ba1a1a]">
																	{day.lateMinutes > 0
																		? `${day.lateMinutes} mnt`
																		: "-"}
																</td>
															</tr>
														);
													},
												)}
											</tbody>
										</table>
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
