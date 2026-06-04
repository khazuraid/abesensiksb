"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
	ChevronLeft,
	ChevronRight,
	Download,
	FileText,
	Search,
} from "lucide-react";
import { useState } from "react";
import api from "@/lib/api";

interface DayData {
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
}

interface EmployeeRecap {
	id: number;
	name: string;
	employeeCode: string;
	shiftName: string;
	days: DayData[];
	totalPresent: number;
	totalLate: number;
	totalEarlyOut: number;
	totalAbsent: number;
	totalLeave: number;
}

export default function DailyRecapPage() {
	const [month, setMonth] = useState(new Date().getMonth() + 1);
	const [year, setYear] = useState(new Date().getFullYear());
	const [search, setSearch] = useState("");
	const [selectedEmployee, setSelectedEmployee] =
		useState<EmployeeRecap | null>(null);
	const [editingDay, setEditingDay] = useState<{
		date: string;
		field: "in" | "out";
		value: string;
	} | null>(null);
	const queryClient = useQueryClient();

	const { data, isLoading } = useQuery<EmployeeRecap[]>({
		queryKey: ["daily-recap", month, year],
		queryFn: async () =>
			(await api.get(`/reports/daily-recap?month=${month}&year=${year}`)).data,
	});

	const { data: availablePeriods } = useQuery<
		{ month: number; year: number }[]
	>({
		queryKey: ["available-periods"],
		queryFn: async () => {
			return (await api.get(`/reports/available-periods`)).data;
		},
	});

	const months = [
		"Januari",
		"Februari",
		"Maret",
		"April",
		"Mei",
		"Juni",
		"Juli",
		"Agustus",
		"September",
		"Oktober",
		"November",
		"Desember",
	];

	const updateMutation = useMutation({
		mutationFn: async ({
			id,
			timestamp,
		}: {
			id: number;
			timestamp: string;
		}) => {
			await api.patch(`/attendance-logs/${id}`, { timestamp });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["daily-recap", month, year] });
			setEditingDay(null);
		},
	});

	const createMutation = useMutation({
		mutationFn: async ({
			employeeId,
			timestamp,
			type,
		}: {
			employeeId: number;
			timestamp: string;
			type: "IN" | "OUT";
		}) => {
			await api.post("/attendance-logs", { employeeId, timestamp, type });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["daily-recap", month, year] });
			setEditingDay(null);
		},
	});

	const handleSaveEdit = (day: DayData) => {
		if (!editingDay || !selectedEmployee) return;
		const logId = editingDay.field === "in" ? day.inLogId : day.outLogId;
		const timestamp = `${day.date}T${editingDay.value}:00`;
		if (logId) {
			updateMutation.mutate({ id: logId, timestamp });
		} else {
			createMutation.mutate({
				employeeId: selectedEmployee.id,
				timestamp,
				type: editingDay.field === "in" ? "IN" : "OUT",
			});
		}
	};

	const filtered = data?.filter(
		(i) =>
			i.name.toLowerCase().includes(search.toLowerCase()) ||
			i.employeeCode.toLowerCase().includes(search.toLowerCase()),
	);

	const statusColor = (s: string, isHoliday?: boolean, isWorkDay?: boolean) => {
		if (isHoliday) return "bg-purple-100 text-purple-700";
		if (!isWorkDay) return "bg-gray-100 text-gray-500";
		switch (s) {
			case "PRESENT":
				return "bg-[#6cf8bb]/50 text-[#00714d]";
			case "LATE":
				return "bg-[#ffeebb] text-[#894e00]";
			case "EARLY_OUT":
				return "bg-orange-100 text-orange-700";
			case "ABSENT":
				return "bg-[#ffdad6] text-[#ba1a1a]";
			case "LEAVE":
				return "bg-cyan-100 text-cyan-700";
			default:
				return "bg-transparent text-gray-400";
		}
	};

	const statusLabel = (s: string, isHoliday?: boolean, isWorkDay?: boolean) => {
		if (isHoliday) return "L";
		if (!isWorkDay) return "O";
		switch (s) {
			case "PRESENT":
				return "H";
			case "LATE":
				return "T";
			case "EARLY_OUT":
				return "PC";
			case "ABSENT":
				return "A";
			case "LEAVE":
				return "C";
			default:
				return "-";
		}
	};

	const handleExport = async () => {
		try {
			const res = await api.get(
				`/reports/daily-recap/export?month=${month}&year=${year}`,
				{ responseType: "blob" },
			);
			const url = window.URL.createObjectURL(new Blob([res.data]));
			const a = document.createElement("a");
			a.href = url;
			a.download = `Rekap-Harian-${months[month - 1]}-${year}.xlsx`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			window.URL.revokeObjectURL(url);
		} catch (e: unknown) {
			const err = e as { response?: { status?: number }; message?: string };
			alert(`Gagal export: ${err?.response?.status || err?.message}`);
		}
	};
	const handleExportPdf = async () => {
		if (!data || data.length === 0) return;

		// Dynamically import jsPDF and autoTable to avoid Next.js SSR Turbopack errors
		const { jsPDF } = await import("jspdf");
		await import("jspdf-autotable");

		const doc = new jsPDF("l", "pt", "a4");

		doc.setFontSize(16);
		doc.text(`Rekap Harian - ${months[month - 1]} ${year}`, 40, 40);

		const daysInMonth = new Date(year, month, 0).getDate();
		const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

		const head = [
			[
				"No",
				"Nama",
				"Kode",
				...daysArray.map((d) => d.toString()),
				"H",
				"T",
				"C",
				"A",
			],
		];

		const body = data.map((emp, idx) => [
			(idx + 1).toString(),
			emp.name,
			emp.employeeCode,
			...daysArray.map((day) => {
				const cellData = emp.days.find(
					(d) => new Date(d.date).getDate() === day,
				);
				return cellData
					? statusLabel(cellData.status, cellData.isHoliday, cellData.isWorkDay)
					: "-";
			}),
			emp.totalPresent.toString(),
			emp.totalLate.toString(),
			emp.totalLeave.toString(),
			emp.totalAbsent.toString(),
		]);

		// @ts-expect-error
		doc.autoTable({
			head,
			body,
			startY: 60,
			styles: { fontSize: 7, cellPadding: 2, halign: "center" },
			columnStyles: {
				0: { halign: "left", cellWidth: 20 },
				1: { halign: "left", cellWidth: 60 },
				2: { halign: "left", cellWidth: 40 },
			},
			theme: "grid",
		});

		doc.save(`Rekap-Harian-${months[month - 1]}-${year}.pdf`);
	};
	// Determine number of days in the selected month
	const daysInMonth = new Date(year, month, 0).getDate();
	const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

	return (
		<motion.div
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className="space-y-6 max-w-full mx-auto min-h-[calc(100vh-6rem)] flex flex-col"
		>
			<div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
				<div>
					<h1 className="font-display text-3xl font-semibold text-[#111c2d] mb-1">
						Rekap Harian
					</h1>
					<p className="font-sans text-sm text-[#6e797e]">
						Detail kehadiran per hari berdasarkan shift. H=Hadir, T=Telat,
						PC=Pulang Cepat, A=Alpa, C=Cuti/Izin, L=Libur, O=Off
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<div className="relative">
						<select
							className="appearance-none bg-white border border-[#bdc8ce] rounded-lg pl-4 pr-10 py-2 cursor-pointer hover:bg-[#f9f9ff] transition-colors shadow-sm font-semibold text-[13px] text-[#111c2d] outline-none focus:ring-2 focus:ring-[#00647c]/20 focus:border-[#00647c]"
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
									{months[month - 1]} {year}
								</option>
							)}
						</select>
						<ChevronRight
							size={16}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e797e] pointer-events-none rotate-90"
						/>
					</div>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={handleExport}
							className="bg-[#00647c] text-white font-semibold text-[13px] px-4 py-2.5 rounded-lg hover:bg-[#007f9d] shadow-sm flex items-center gap-2 transition-colors active:scale-95"
						>
							<Download size={16} /> Excel
						</button>
						<button
							type="button"
							onClick={handleExportPdf}
							className="bg-[#ba1a1a] text-white font-semibold text-[13px] px-4 py-2.5 rounded-lg hover:bg-[#a01313] shadow-sm flex items-center gap-2 transition-colors active:scale-95"
						>
							<FileText size={16} /> PDF
						</button>
					</div>
				</div>
			</div>

			<div className="bg-white border border-black/5 rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden">
				<div className="p-4 border-b border-black/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#f9f9ff]/50">
					<div className="relative w-full sm:w-80">
						<Search
							size={18}
							className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e797e]"
						/>
						<input
							className="w-full bg-white border border-[#bdc8ce] rounded-lg pl-10 pr-4 py-2 text-[13px] font-sans focus:outline-none focus:border-[#00647c] focus:ring-1 focus:ring-[#00647c] transition-all"
							placeholder="Cari pegawai..."
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
					<div className="hidden lg:flex items-center gap-2">
						<span className="px-2 py-1 rounded text-[10px] font-semibold bg-[#6cf8bb]/30 text-[#006c49]">
							H
						</span>
						<span className="px-2 py-1 rounded text-[10px] font-semibold bg-[#ffeebb] text-[#894e00]">
							T
						</span>
						<span className="px-2 py-1 rounded text-[10px] font-semibold bg-orange-100 text-orange-700">
							PC
						</span>
						<span className="px-2 py-1 rounded text-[10px] font-semibold bg-[#ffdad6] text-[#ba1a1a]">
							A
						</span>
					</div>
				</div>

				<div className="overflow-x-auto flex-1 relative custom-scrollbar">
					<table
						className="w-full text-left border-collapse"
						style={{ minWidth: `${daysInMonth * 32 + 300}px` }}
					>
						<thead className="sticky top-0 bg-[#f9f9ff] z-20 shadow-sm border-b border-black/5">
							<tr>
								<th className="p-4 font-sans text-[12px] text-[#6e797e] uppercase tracking-wider font-semibold sticky left-0 bg-[#f9f9ff] z-30 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] w-[250px] min-w-[250px]">
									Pegawai
								</th>
								{daysArray.map((day) => (
									<th
										key={day}
										className="p-2 text-center font-sans text-[12px] text-[#6e797e] w-8 min-w-[32px]"
									>
										{day}
									</th>
								))}
								<th className="p-2 text-center font-sans text-[12px] text-[#006c49] font-bold w-10 min-w-[40px] sticky right-[160px] bg-[#f9f9ff]/90 backdrop-blur shadow-[-1px_0_0_0_rgba(0,0,0,0.05)] z-30">
									H
								</th>
								<th className="p-2 text-center font-sans text-[12px] text-[#894e00] font-bold w-10 min-w-[40px] sticky right-[120px] bg-[#f9f9ff]/90 backdrop-blur z-30">
									T
								</th>
								<th className="p-2 text-center font-sans text-[12px] text-orange-700 font-bold w-10 min-w-[40px] sticky right-[80px] bg-[#f9f9ff]/90 backdrop-blur z-30">
									PC
								</th>
								<th className="p-2 text-center font-sans text-[12px] text-[#00647c] font-bold w-10 min-w-[40px] sticky right-[40px] bg-[#f9f9ff]/90 backdrop-blur z-30">
									C
								</th>
								<th className="p-2 text-center font-sans text-[12px] text-[#ba1a1a] font-bold w-10 min-w-[40px] sticky right-0 bg-[#f9f9ff]/90 backdrop-blur z-30">
									A
								</th>
							</tr>
						</thead>
						<tbody className="font-sans text-[13px] text-[#111c2d] divide-y divide-black/5">
							{isLoading ? (
								<tr>
									<td
										colSpan={daysInMonth + 6}
										className="p-12 text-center text-[#6e797e]"
									>
										Memuat data rekap...
									</td>
								</tr>
							) : filtered?.length === 0 ? (
								<tr>
									<td
										colSpan={daysInMonth + 6}
										className="p-12 text-center text-[#6e797e]"
									>
										Tidak ada data untuk periode ini.
									</td>
								</tr>
							) : (
								filtered?.map((emp) => (
									<tr
										key={emp.id}
										className="hover:bg-[#dee8ff]/20 transition-colors group"
									>
										<td className="p-4 sticky left-0 bg-white group-hover:bg-[#f0f3ff] z-10 border-r border-black/5 w-[250px] min-w-[250px]">
											<div className="font-semibold text-[#111c2d] truncate">
												{emp.name}
											</div>
											<div className="text-[11px] text-[#6e797e] mt-0.5 truncate">
												{emp.shiftName || "-"}
											</div>
										</td>
										{daysArray.map((dayNum) => {
											// Match dayNum with date in emp.days
											const dayDateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
											const dayData = emp.days.find(
												(d) => d.date === dayDateStr,
											);

											if (!dayData) {
												return (
													<td
														key={dayNum}
														className="p-1 text-center border-r border-black/5 last:border-r-0"
													>
														<div className="w-6 h-6 rounded-full mx-auto flex items-center justify-center text-[10px] font-bold bg-transparent text-gray-300">
															-
														</div>
													</td>
												);
											}

											const colorCls = statusColor(
												dayData.status,
												dayData.isHoliday,
												dayData.isWorkDay,
											);
											const label = statusLabel(
												dayData.status,
												dayData.isHoliday,
												dayData.isWorkDay,
											);

											return (
												<td
													key={dayNum}
													className="p-1 text-center cursor-pointer border-r border-black/5 last:border-r-0 hover:bg-[#dee8ff]/40"
													onClick={() => {
														setSelectedEmployee(emp);
														// Defaults to editing "in"
														setEditingDay({
															date: dayData.date,
															field: "in",
															value: dayData.clockIn || "",
														});
													}}
													title={`${dayData.date}\nIn: ${dayData.clockIn || "-"}\nOut: ${dayData.clockOut || "-"}`}
												>
													<div
														className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center text-[10px] font-bold ${colorCls}`}
													>
														{label}
													</div>
												</td>
											);
										})}
										<td className="p-2 text-center font-semibold text-[#006c49] sticky right-[160px] bg-white group-hover:bg-[#f0f3ff] border-l border-black/5 z-10">
											{emp.totalPresent}
										</td>
										<td className="p-2 text-center font-semibold text-[#894e00] sticky right-[120px] bg-white group-hover:bg-[#f0f3ff] z-10">
											{emp.totalLate}
										</td>
										<td className="p-2 text-center font-semibold text-orange-700 sticky right-[80px] bg-white group-hover:bg-[#f0f3ff] z-10">
											{emp.totalEarlyOut}
										</td>
										<td className="p-2 text-center font-semibold text-[#00647c] sticky right-[40px] bg-white group-hover:bg-[#f0f3ff] z-10">
											{emp.totalLeave}
										</td>
										<td className="p-2 text-center font-semibold text-[#ba1a1a] sticky right-0 bg-white group-hover:bg-[#f0f3ff] z-10">
											{emp.totalAbsent}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Modal Edit */}
			{editingDay && selectedEmployee && (
				<div className="fixed inset-0 bg-[#111c2d]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden flex flex-col">
						<div className="px-6 py-4 border-b border-black/5 flex justify-between items-center bg-[#f9f9ff]">
							<h3 className="font-semibold text-[#111c2d]">Edit Absensi</h3>
							<button
								type="button"
								onClick={() => setEditingDay(null)}
								className="text-[#6e797e] hover:text-[#111c2d]"
							>
								<span className="material-symbols-outlined text-[20px]">
									close
								</span>
							</button>
						</div>
						<div className="p-6">
							<p className="text-[13px] text-[#3e484d] mb-4">
								<span className="font-semibold text-[#111c2d]">
									{selectedEmployee.name}
								</span>
								<br />
								{editingDay.date}
							</p>

							<div className="mb-4">
								<div className="block text-[12px] font-semibold text-[#6e797e] mb-1">
									Pilih Tipe
								</div>
								<div className="flex gap-2">
									<button
										type="button"
										className={`flex-1 py-1.5 rounded-md text-[13px] font-medium transition-colors ${editingDay.field === "in" ? "bg-[#00647c] text-white" : "bg-gray-100 text-[#3e484d]"}`}
										onClick={() => {
											const dayData = selectedEmployee.days.find(
												(d) => d.date === editingDay.date,
											);
											setEditingDay({
												...editingDay,
												field: "in",
												value: dayData?.clockIn || "",
											});
										}}
									>
										Jam Masuk
									</button>
									<button
										type="button"
										className={`flex-1 py-1.5 rounded-md text-[13px] font-medium transition-colors ${editingDay.field === "out" ? "bg-[#00647c] text-white" : "bg-gray-100 text-[#3e484d]"}`}
										onClick={() => {
											const dayData = selectedEmployee.days.find(
												(d) => d.date === editingDay.date,
											);
											setEditingDay({
												...editingDay,
												field: "out",
												value: dayData?.clockOut || "",
											});
										}}
									>
										Jam Keluar
									</button>
								</div>
							</div>

							<div className="mb-6">
								<label
									htmlFor="time-input"
									className="block text-[12px] font-semibold text-[#6e797e] mb-1"
								>
									{editingDay.field === "in" ? "Waktu Masuk" : "Waktu Keluar"}
								</label>
								<input
									id="time-input"
									type="time"
									value={editingDay.value}
									onChange={(e) =>
										setEditingDay({ ...editingDay, value: e.target.value })
									}
									className="w-full bg-white border border-[#bdc8ce] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c]"
								/>
							</div>

							<button
								type="button"
								onClick={() => {
									const dayData = selectedEmployee.days.find(
										(d) => d.date === editingDay.date,
									);
									if (dayData) handleSaveEdit(dayData);
								}}
								disabled={
									!editingDay.value ||
									updateMutation.isPending ||
									createMutation.isPending
								}
								className="w-full bg-[#00647c] text-white font-semibold text-[13px] py-2.5 rounded-lg hover:bg-[#007f9d] transition-colors disabled:opacity-50"
							>
								{updateMutation.isPending || createMutation.isPending
									? "Menyimpan..."
									: "Simpan Perubahan"}
							</button>
						</div>
					</div>
				</div>
			)}
		</motion.div>
	);
}
