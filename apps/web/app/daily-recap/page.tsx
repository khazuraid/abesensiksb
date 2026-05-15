"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
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
	const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecap | null>(null);
	const [editingDay, setEditingDay] = useState<{ date: string; field: "in" | "out"; value: string } | null>(null);
	const queryClient = useQueryClient();

	const { data, isLoading } = useQuery<EmployeeRecap[]>({
		queryKey: ["daily-recap", month, year],
		queryFn: async () => (await api.get(`/reports/daily-recap?month=${month}&year=${year}`)).data,
	});

	const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

	const updateMutation = useMutation({
		mutationFn: async ({ id, timestamp }: { id: number; timestamp: string }) => {
			await api.patch(`/attendance-logs/${id}`, { timestamp });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["daily-recap", month, year] });
			setEditingDay(null);
		},
	});

	const createMutation = useMutation({
		mutationFn: async ({ employeeId, timestamp, type }: { employeeId: number; timestamp: string; type: "IN" | "OUT" }) => {
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
			createMutation.mutate({ employeeId: selectedEmployee.id, timestamp, type: editingDay.field === "in" ? "IN" : "OUT" });
		}
	};
	const prevMonth = () => { if (month === 1) { setMonth(12); setYear(year - 1); } else setMonth(month - 1); };
	const nextMonth = () => { if (month === 12) { setMonth(1); setYear(year + 1); } else setMonth(month + 1); };

	const filtered = data?.filter(
		(i) => i.name.toLowerCase().includes(search.toLowerCase()) || i.employeeCode.toLowerCase().includes(search.toLowerCase()),
	);

	const statusColor = (s: string, isHoliday?: boolean, isWorkDay?: boolean) => {
		if (isHoliday) return "bg-purple-500/10 text-purple-500";
		if (!isWorkDay) return "bg-blue-500/10 text-blue-500";
		switch (s) {
			case "PRESENT": return "bg-emerald-500/10 text-emerald-500";
			case "LATE": return "bg-amber-500/10 text-amber-500";
			case "EARLY_OUT": return "bg-orange-500/10 text-orange-500";
			case "ABSENT": return "bg-red-500/10 text-red-500";
			case "LEAVE": return "bg-cyan-500/10 text-cyan-500";
			default: return "bg-white/5 text-foreground/30";
		}
	};

	const statusLabel = (s: string, isHoliday?: boolean, isWorkDay?: boolean) => {
		if (isHoliday) return "L";
		if (!isWorkDay) return "O";
		switch (s) {
			case "PRESENT": return "H";
			case "LATE": return "T";
			case "EARLY_OUT": return "PC";
			case "ABSENT": return "A";
			case "LEAVE": return "C";
			default: return "-";
		}
	};

	const handleExport = async () => {
		try {
			const res = await api.get(`/reports/daily-recap/export?month=${month}&year=${year}`, { responseType: "blob" });
			const url = window.URL.createObjectURL(new Blob([res.data]));
			const a = document.createElement("a");
			a.href = url;
			a.download = `Rekap-Harian-${months[month - 1]}-${year}.xlsx`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			window.URL.revokeObjectURL(url);
		} catch (e: any) {
			alert("Gagal export: " + (e?.response?.status || e?.message));
		}
	};

	return (
		<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">Rekap Harian</h2>
					<p className="text-foreground/60">Detail kehadiran per hari berdasarkan shift. H=Hadir, T=Telat, PC=Pulang Cepat, A=Alpa, C=Cuti/Izin, L=Libur, O=Off</p>
				</div>
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
						<button type="button" onClick={prevMonth} className="p-1 hover:bg-white/10 rounded-lg"><ChevronLeft size={18} /></button>
						<span className="font-bold min-w-[140px] text-center">{months[month - 1]} {year}</span>
						<button type="button" onClick={nextMonth} className="p-1 hover:bg-white/10 rounded-lg"><ChevronRight size={18} /></button>
					</div>
					<button type="button" onClick={handleExport} className="flex items-center gap-2 bg-emerald-500 text-white px-5 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all">
						<Download size={18} /> Export
					</button>
				</div>
			</div>

			<div className="glass-card">
				<div className="p-4 border-b border-white/5">
					<div className="relative max-w-md">
						<Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
						<input type="text" placeholder="Cari pegawai..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50" />
					</div>
				</div>

				{isLoading ? (
					<div className="p-8 text-center text-foreground/40">Memuat data...</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-xs border-collapse">
							<thead>
								<tr className="bg-white/5 text-foreground/60">
									<th className="px-3 py-3 text-left font-medium sticky left-0 z-20 bg-[#0f1117] min-w-[180px] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-white/10">Pegawai</th>
									{Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => (
										<th key={i} className="px-1 py-3 text-center font-medium min-w-[32px]">{i + 1}</th>
									))}
									<th className="px-2 py-3 text-center font-medium">H</th>
									<th className="px-2 py-3 text-center font-medium">T</th>
									<th className="px-2 py-3 text-center font-medium">PC</th>
									<th className="px-2 py-3 text-center font-medium">C</th>
									<th className="px-2 py-3 text-center font-medium">A</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-white/5">
								{filtered?.map((emp) => (
									<tr key={emp.id} className="hover:bg-white/5 cursor-pointer" onClick={() => setSelectedEmployee(emp)}>
										<td className="px-3 py-2 sticky left-0 z-20 bg-[#0f1117] min-w-[180px] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-white/10 relative">
											<div className="font-semibold truncate">{emp.name}</div>
											<div className="text-foreground/40 text-[10px]">{emp.shiftName}</div>
										</td>
										{emp.days.map((day) => (
											<td key={day.date} className="px-0.5 py-2 text-center">
												<span className={`inline-block w-6 h-6 leading-6 rounded text-[10px] font-bold ${statusColor(day.status, day.isHoliday, day.isWorkDay)}`}>
													{statusLabel(day.status, day.isHoliday, day.isWorkDay)}
												</span>
											</td>
										))}
										<td className="px-2 py-2 text-center font-bold text-emerald-500">{emp.totalPresent}</td>
										<td className="px-2 py-2 text-center font-bold text-amber-500">{emp.totalLate}</td>
										<td className="px-2 py-2 text-center font-bold text-orange-500">{emp.totalEarlyOut}</td>
										<td className="px-2 py-2 text-center font-bold text-cyan-500">{emp.totalLeave}</td>
										<td className="px-2 py-2 text-center font-bold text-red-500">{emp.totalAbsent}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{selectedEmployee && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={() => setSelectedEmployee(null)}>
					<div className="glass-card w-full max-w-2xl h-[95vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
						<div className="p-6 border-b border-white/5 flex justify-between items-center">
							<div>
								<h3 className="text-xl font-bold">{selectedEmployee.name}</h3>
								<p className="text-sm text-foreground/50">{selectedEmployee.shiftName} • {months[month - 1]} {year}</p>
							</div>
							<button type="button" onClick={() => setSelectedEmployee(null)} className="p-2 hover:bg-white/5 rounded-lg text-foreground/50">✕</button>
						</div>
						<div className="p-4 overflow-y-auto flex-1">
							<table className="w-full text-sm">
								<thead>
									<tr className="text-foreground/60 border-b border-white/10">
										<th className="py-2 text-left">Tanggal</th>
										<th className="py-2 text-center">Masuk</th>
										<th className="py-2 text-center">Pulang</th>
										<th className="py-2 text-center">Status</th>
										<th className="py-2 text-center">Telat</th>
										<th className="py-2 text-center">Pulang Cepat</th>
										<th className="py-2 text-left">Ket</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-white/5">
									{selectedEmployee.days.filter((d) => d.isWorkDay || d.isHoliday).map((day) => (
										<tr key={day.date} className={`hover:bg-white/5 ${day.isHoliday ? "opacity-60" : ""}`}>
											<td className="py-2">{new Date(day.date + "T00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric" })}</td>
											<td className="py-2 text-center font-mono">
												{editingDay?.date === day.date && editingDay.field === "in" ? (
													<span className="flex items-center gap-1 justify-center">
														<input type="time" value={editingDay.value} onChange={(e) => setEditingDay({ ...editingDay, value: e.target.value })} className="bg-white/10 border border-white/20 rounded px-1 py-0.5 text-xs w-20" />
														<button type="button" onClick={() => handleSaveEdit(day)} className="text-emerald-500 text-xs">✓</button>
														<button type="button" onClick={() => setEditingDay(null)} className="text-red-500 text-xs">✕</button>
													</span>
												) : (
													<span onClick={(e) => { e.stopPropagation(); if (day.isWorkDay && !day.isHoliday) setEditingDay({ date: day.date, field: "in", value: day.clockIn || "07:00" }); }} className={day.isWorkDay && !day.isHoliday ? "cursor-pointer hover:text-primary" : ""}>{day.clockIn || "-"}</span>
												)}
											</td>
											<td className="py-2 text-center font-mono">
												{editingDay?.date === day.date && editingDay.field === "out" ? (
													<span className="flex items-center gap-1 justify-center">
														<input type="time" value={editingDay.value} onChange={(e) => setEditingDay({ ...editingDay, value: e.target.value })} className="bg-white/10 border border-white/20 rounded px-1 py-0.5 text-xs w-20" />
														<button type="button" onClick={() => handleSaveEdit(day)} className="text-emerald-500 text-xs">✓</button>
														<button type="button" onClick={() => setEditingDay(null)} className="text-red-500 text-xs">✕</button>
													</span>
												) : (
													<span onClick={(e) => { e.stopPropagation(); if (day.isWorkDay && !day.isHoliday) setEditingDay({ date: day.date, field: "out", value: day.clockOut || "16:00" }); }} className={day.isWorkDay && !day.isHoliday ? "cursor-pointer hover:text-primary" : ""}>{day.clockOut || "-"}</span>
												)}
											</td>
											<td className="py-2 text-center">
												<span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColor(day.status, day.isHoliday, day.isWorkDay)}`}>
													{statusLabel(day.status, day.isHoliday, day.isWorkDay)}
												</span>
											</td>
											<td className="py-2 text-center">{day.lateMinutes > 0 ? `${day.lateMinutes} mnt` : "-"}</td>
											<td className="py-2 text-center">{day.earlyOutMinutes > 0 ? `${day.earlyOutMinutes} mnt` : "-"}</td>
											<td className="py-2 text-left text-xs text-foreground/50">
												{day.isHoliday ? "" : !day.isWorkDay ? "" : day.status === "LEAVE" ? "Cuti/Izin" : day.status === "LATE" ? "Terlambat" : day.status === "EARLY_OUT" ? "Pulang cepat" : !day.clockIn && !day.clockOut ? "Tidak absen" : !day.clockOut ? "Tidak absen pulang" : ""}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			)}
		</motion.div>
	);
}
