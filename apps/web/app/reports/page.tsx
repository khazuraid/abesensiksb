"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { useMemo, useState } from "react";
import api from "@/lib/api";

interface ReportItem {
	id: number;
	name: string;
	employeeCode: string;
	totalPresent: number;
	totalLate: number;
	totalAbsent: number;
}

export default function ReportsPage() {
	const [month, setMonth] = useState(new Date().getMonth() + 1);
	const [year, setYear] = useState(new Date().getFullYear());
	const [search, setSearch] = useState("");

	const { data: reportData, isLoading } = useQuery<ReportItem[]>({
		queryKey: ["reports", month, year],
		queryFn: async () => (await api.get(`/reports/summary?month=${month}&year=${year}`)).data,
	});

	const summary = useMemo(() => {
		if (!reportData || reportData.length === 0) return { attendance: 0, late: 0, absent: 0 };
		const totalPresent = reportData.reduce((s, i) => s + i.totalPresent, 0);
		const totalLate = reportData.reduce((s, i) => s + i.totalLate, 0);
		const totalAbsent = reportData.reduce((s, i) => s + i.totalAbsent, 0);
		const totalDays = totalPresent + totalAbsent;
		return {
			attendance: totalDays > 0 ? Math.round((totalPresent / totalDays) * 100) : 0,
			late: totalLate,
			absent: totalAbsent,
		};
	}, [reportData]);

	const filtered = reportData?.filter(
		(i) => i.name.toLowerCase().includes(search.toLowerCase()) || i.employeeCode.toLowerCase().includes(search.toLowerCase()),
	);

	const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

	const prevMonth = () => { if (month === 1) { setMonth(12); setYear(year - 1); } else setMonth(month - 1); };
	const nextMonth = () => { if (month === 12) { setMonth(1); setYear(year + 1); } else setMonth(month + 1); };

	const handleExport = async () => {
		try {
			const res = await api.get(`/reports/export?month=${month}&year=${year}`, { responseType: "blob" });
			const url = window.URL.createObjectURL(new Blob([res.data]));
			const a = document.createElement("a");
			a.href = url;
			a.download = `Laporan-${months[month - 1]}-${year}.xlsx`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			window.URL.revokeObjectURL(url);
		} catch (e: any) {
			alert("Gagal download laporan: " + (e?.response?.status || e?.message || "Unknown error"));
		}
	};

	return (
		<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">Laporan Bulanan</h2>
					<p className="text-foreground/60">Rekapitulasi kehadiran, keterlambatan, dan absen pegawai.</p>
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

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="glass-card p-6 border-l-4 border-l-emerald-500">
					<div className="text-foreground/60 text-sm font-medium mb-1">Kehadiran</div>
					<div className="text-3xl font-bold">{isLoading ? "-" : `${summary.attendance}%`}</div>
				</div>
				<div className="glass-card p-6 border-l-4 border-l-amber-500">
					<div className="text-foreground/60 text-sm font-medium mb-1">Total Terlambat</div>
					<div className="text-3xl font-bold">{isLoading ? "-" : summary.late}</div>
				</div>
				<div className="glass-card p-6 border-l-4 border-l-destructive">
					<div className="text-foreground/60 text-sm font-medium mb-1">Total Absen</div>
					<div className="text-3xl font-bold">{isLoading ? "-" : summary.absent}</div>
				</div>
			</div>

			<div className="glass-card">
				<div className="p-6 border-b border-white/5">
					<div className="relative max-w-md">
						<Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
						<input type="text" placeholder="Cari pegawai..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50" />
					</div>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse">
						<thead>
							<tr className="bg-white/5 text-foreground/60 text-sm">
								<th className="px-6 py-4 font-medium">Pegawai</th>
								<th className="px-6 py-4 font-medium text-center">Hadir</th>
								<th className="px-6 py-4 font-medium text-center">Terlambat</th>
								<th className="px-6 py-4 font-medium text-center">Absen</th>
								<th className="px-6 py-4 font-medium text-right">%</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-white/5">
							{isLoading ? (
								[1,2,3,4,5].map((k) => <tr key={k} className="animate-pulse"><td colSpan={5} className="px-6 py-6 h-14 bg-white/5" /></tr>)
							) : filtered?.length === 0 ? (
								<tr><td colSpan={5} className="px-6 py-20 text-center text-foreground/40">Tidak ada data untuk periode ini.</td></tr>
							) : (
								filtered?.map((item) => {
									const total = item.totalPresent + item.totalAbsent;
									const pct = total > 0 ? Math.round((item.totalPresent / total) * 100) : 0;
									return (
										<tr key={item.id} className="hover:bg-white/5 transition-colors">
											<td className="px-6 py-4">
												<div className="flex items-center gap-3">
													<div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center font-bold text-xs text-primary">{item.name[0]}</div>
													<div>
														<div className="font-semibold">{item.name}</div>
														<div className="text-xs text-foreground/40 font-mono">{item.employeeCode}</div>
													</div>
												</div>
											</td>
											<td className="px-6 py-4 text-center"><span className="font-bold text-emerald-500">{item.totalPresent}</span></td>
											<td className="px-6 py-4 text-center"><span className="font-bold text-amber-500">{item.totalLate}</span></td>
											<td className="px-6 py-4 text-center"><span className="font-bold text-destructive">{item.totalAbsent}</span></td>
											<td className="px-6 py-4 text-right font-mono font-bold text-primary">{pct}%</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>
		</motion.div>
	);
}
