"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useState } from "react";
import api from "@/lib/api";

interface DayData {
	date: string;
	isWorkDay: boolean;
	isHoliday: boolean;
	clockIn: string | null;
	clockOut: string | null;
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
}

export default function DailyRecapPage() {
	const [month, setMonth] = useState(new Date().getMonth() + 1);
	const [year, setYear] = useState(new Date().getFullYear());
	const [search, setSearch] = useState("");
	const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecap | null>(null);

	const { data, isLoading } = useQuery<EmployeeRecap[]>({
		queryKey: ["daily-recap", month, year],
		queryFn: async () => (await api.get(`/reports/daily-recap?month=${month}&year=${year}`)).data,
	});

	const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
	const prevMonth = () => { if (month === 1) { setMonth(12); setYear(year - 1); } else setMonth(month - 1); };
	const nextMonth = () => { if (month === 12) { setMonth(1); setYear(year + 1); } else setMonth(month + 1); };

	const filtered = data?.filter(
		(i) => i.name.toLowerCase().includes(search.toLowerCase()) || i.employeeCode.toLowerCase().includes(search.toLowerCase()),
	);

	const statusColor = (s: string) => {
		switch (s) {
			case "PRESENT": return "bg-emerald-500/10 text-emerald-500";
			case "LATE": return "bg-amber-500/10 text-amber-500";
			case "EARLY_OUT": return "bg-orange-500/10 text-orange-500";
			case "ABSENT": return "bg-red-500/10 text-red-500";
			default: return "bg-white/5 text-foreground/30";
		}
	};

	const statusLabel = (s: string) => {
		switch (s) {
			case "PRESENT": return "H";
			case "LATE": return "T";
			case "EARLY_OUT": return "PC";
			case "ABSENT": return "A";
			default: return "-";
		}
	};

	return (
		<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">Rekap Harian</h2>
					<p className="text-foreground/60">Detail kehadiran per hari berdasarkan shift. H=Hadir, T=Telat, PC=Pulang Cepat, A=Alpa</p>
				</div>
				<div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
					<button type="button" onClick={prevMonth} className="p-1 hover:bg-white/10 rounded-lg"><ChevronLeft size={18} /></button>
					<span className="font-bold min-w-[140px] text-center">{months[month - 1]} {year}</span>
					<button type="button" onClick={nextMonth} className="p-1 hover:bg-white/10 rounded-lg"><ChevronRight size={18} /></button>
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
									<th className="px-3 py-3 text-left font-medium sticky left-0 bg-[var(--background)] z-10 min-w-[180px]">Pegawai</th>
									{Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => (
										<th key={i} className="px-1 py-3 text-center font-medium min-w-[32px]">{i + 1}</th>
									))}
									<th className="px-2 py-3 text-center font-medium">H</th>
									<th className="px-2 py-3 text-center font-medium">T</th>
									<th className="px-2 py-3 text-center font-medium">PC</th>
									<th className="px-2 py-3 text-center font-medium">A</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-white/5">
								{filtered?.map((emp) => (
									<tr key={emp.id} className="hover:bg-white/5 cursor-pointer" onClick={() => setSelectedEmployee(emp)}>
										<td className="px-3 py-2 sticky left-0 bg-[var(--background)] z-10">
											<div className="font-semibold truncate">{emp.name}</div>
											<div className="text-foreground/40 text-[10px]">{emp.shiftName}</div>
										</td>
										{emp.days.map((day) => (
											<td key={day.date} className="px-0.5 py-2 text-center">
												<span className={`inline-block w-6 h-6 leading-6 rounded text-[10px] font-bold ${statusColor(day.status)}`}>
													{statusLabel(day.status)}
												</span>
											</td>
										))}
										<td className="px-2 py-2 text-center font-bold text-emerald-500">{emp.totalPresent}</td>
										<td className="px-2 py-2 text-center font-bold text-amber-500">{emp.totalLate}</td>
										<td className="px-2 py-2 text-center font-bold text-orange-500">{emp.totalEarlyOut}</td>
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
					<div className="glass-card w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
						<div className="p-6 border-b border-white/5 flex justify-between items-center">
							<div>
								<h3 className="text-xl font-bold">{selectedEmployee.name}</h3>
								<p className="text-sm text-foreground/50">{selectedEmployee.shiftName} • {months[month - 1]} {year}</p>
							</div>
							<button type="button" onClick={() => setSelectedEmployee(null)} className="p-2 hover:bg-white/5 rounded-lg text-foreground/50">✕</button>
						</div>
						<div className="p-4">
							<table className="w-full text-sm">
								<thead>
									<tr className="text-foreground/60 border-b border-white/10">
										<th className="py-2 text-left">Tanggal</th>
										<th className="py-2 text-center">Masuk</th>
										<th className="py-2 text-center">Pulang</th>
										<th className="py-2 text-center">Status</th>
										<th className="py-2 text-center">Telat</th>
										<th className="py-2 text-center">Pulang Cepat</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-white/5">
									{selectedEmployee.days.filter((d) => d.isWorkDay).map((day) => (
										<tr key={day.date} className="hover:bg-white/5">
											<td className="py-2">{new Date(day.date + "T00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric" })}</td>
											<td className="py-2 text-center font-mono">{day.clockIn || "-"}</td>
											<td className="py-2 text-center font-mono">{day.clockOut || "-"}</td>
											<td className="py-2 text-center">
												<span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColor(day.status)}`}>
													{statusLabel(day.status)}
												</span>
											</td>
											<td className="py-2 text-center">{day.lateMinutes > 0 ? `${day.lateMinutes} mnt` : "-"}</td>
											<td className="py-2 text-center">{day.earlyOutMinutes > 0 ? `${day.earlyOutMinutes} mnt` : "-"}</td>
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
