"use client";

import type { AttendanceLog } from "@adms/shared-types";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Download, Monitor, Search, User, XCircle } from "lucide-react";
import { useState } from "react";
import api from "@/lib/api";

export default function AttendanceLogsPage() {
	const [search, setSearch] = useState("");
	const [filterStatus, setFilterStatus] = useState("");
	const [filterDate, setFilterDate] = useState("");

	const { data: logs, isLoading } = useQuery<AttendanceLog[]>({
		queryKey: ["attendance-logs", filterStatus, filterDate],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (filterStatus) params.set("status", filterStatus);
			if (filterDate) {
				params.set("from", `${filterDate}T00:00:00`);
				params.set("to", `${filterDate}T23:59:59`);
			}
			return (await api.get(`/attendance-logs?${params}`)).data;
		},
		refetchInterval: 10000,
	});

	const filteredLogs = logs?.filter(
		(log) =>
			log.employee?.name?.toLowerCase().includes(search.toLowerCase()) ||
			log.employee?.employeeCode?.toLowerCase().includes(search.toLowerCase()),
	);

	const formatDate = (date: string | Date) =>
		new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));

	const handleExport = async () => {
		const params = new URLSearchParams();
		if (filterDate) { params.set("from", `${filterDate}T00:00:00`); params.set("to", `${filterDate}T23:59:59`); }
		try {
			const res = await api.get(`/reports/export?${params}`, { responseType: "blob" });
			const url = window.URL.createObjectURL(new Blob([res.data]));
			const a = document.createElement("a");
			a.href = url;
			a.download = `Log-Absensi-${filterDate || "all"}.xlsx`;
			a.click();
		} catch { /* ignore */ }
	};

	return (
		<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">Riwayat Absensi</h2>
					<p className="text-foreground/60">Monitoring log kehadiran real-time dari seluruh perangkat.</p>
				</div>
				<button type="button" onClick={handleExport} className="flex items-center gap-2 bg-white/5 border border-white/10 px-6 py-3 rounded-xl font-semibold hover:bg-white/10 transition-all">
					<Download size={20} /> Export
				</button>
			</div>

			<div className="glass-card">
				<div className="p-6 border-b border-white/5 flex flex-col md:flex-row gap-4 items-center">
					<div className="relative flex-1 max-w-md">
						<Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
						<input type="text" placeholder="Cari nama pegawai..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50" />
					</div>
					<input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50" />
					<select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50">
						<option value="">Semua Status</option>
						<option value="PRESENT">Hadir</option>
						<option value="LATE">Terlambat</option>
						<option value="ABSENT">Absen</option>
					</select>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse">
						<thead>
							<tr className="bg-white/5 text-foreground/60 text-sm">
								<th className="px-6 py-4 font-medium">Pegawai</th>
								<th className="px-6 py-4 font-medium">Waktu</th>
								<th className="px-6 py-4 font-medium">Tipe</th>
								<th className="px-6 py-4 font-medium">Status</th>
								<th className="px-6 py-4 font-medium">Perangkat</th>
								<th className="px-6 py-4 font-medium text-right">Foto</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-white/5">
							{isLoading ? (
								[1,2,3,4,5].map((k) => <tr key={k} className="animate-pulse"><td colSpan={6} className="px-6 py-6 h-14 bg-white/5" /></tr>)
							) : filteredLogs?.length === 0 ? (
								<tr><td colSpan={6} className="px-6 py-20 text-center text-foreground/40">Tidak ada log absensi.</td></tr>
							) : (
								filteredLogs?.map((log) => (
									<tr key={log.id} className="hover:bg-white/5 transition-colors">
										<td className="px-6 py-4">
											<div className="flex items-center gap-3">
												<div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center"><User size={16} className="text-foreground/40" /></div>
												<div>
													<div className="font-semibold">{log.employee?.name}</div>
													<div className="text-xs text-foreground/40 font-mono">{log.employee?.employeeCode}</div>
												</div>
											</div>
										</td>
										<td className="px-6 py-4 text-sm"><Clock size={14} className="inline mr-1 text-primary/60" />{formatDate(log.timestamp)}</td>
										<td className="px-6 py-4">
											<span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${log.type === "IN" ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"}`}>{log.type === "IN" ? "Masuk" : "Keluar"}</span>
										</td>
										<td className="px-6 py-4">
											<div className="flex items-center gap-2">
												<div className={`w-2 h-2 rounded-full ${log.status === "PRESENT" ? "bg-emerald-500" : log.status === "LATE" ? "bg-amber-500" : "bg-destructive"}`} />
												<span className="text-sm">{log.status === "PRESENT" ? "Hadir" : log.status === "LATE" ? "Terlambat" : "Absen"}</span>
											</div>
										</td>
										<td className="px-6 py-4 text-sm text-foreground/60"><Monitor size={14} className="inline mr-1" />{log.device?.name || "-"}</td>
										<td className="px-6 py-4 text-right">
											{log.photoUrl ? <span className="text-xs text-primary"><CheckCircle2 size={14} className="inline" /> Ada</span> : <span className="text-xs text-foreground/30"><XCircle size={14} className="inline" /></span>}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</motion.div>
	);
}
