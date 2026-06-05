"use client";

import type { AttendanceLog } from "@adms/shared-types";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
	CalendarDays,
	CheckCircle2,
	Clock,
	Download,
	FileText,
	Filter,
	Monitor,
	Search,
	TrendingUp,
	User,
	XCircle,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function AttendanceLogsPage() {
	const [search, setSearch] = useState("");
	const [filterStatus, setFilterStatus] = useState("");
	const getTodayStr = () => {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
	};
	const [filterStartDate, setFilterStartDate] = useState(getTodayStr());
	const [filterEndDate, setFilterEndDate] = useState(getTodayStr());
	const [photoModal, setPhotoModal] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [debouncedSearch, setDebouncedSearch] = useState("");

	// Debounce search so it doesn't fire immediately on every keystroke
	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(search), 500);
		return () => clearTimeout(timer);
	}, [search]);

	const apiBase =
		process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
		"http://localhost:8888";

	const { data: response, isLoading } = useQuery({
		queryKey: [
			"attendance-logs",
			filterStatus,
			filterStartDate,
			filterEndDate,
			page,
			debouncedSearch,
		],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (filterStatus) params.set("status", filterStatus);
			if (filterStartDate) {
				params.set("from", `${filterStartDate}T00:00:00`);
			}
			if (filterEndDate) {
				params.set("to", `${filterEndDate}T23:59:59`);
			}
			if (debouncedSearch) {
				params.set("search", debouncedSearch);
			}
			params.set("page", String(page));
			params.set("limit", "20");
			return (await api.get(`/attendance-logs?${params}`)).data;
		},
		refetchInterval: 10000,
	});

	const logs: any[] = response?.data || [];
	const meta = response?.meta;

	const formatDate = (date: string | Date) =>
		new Intl.DateTimeFormat("id-ID", {
			dateStyle: "medium",
			timeStyle: "short",
		}).format(new Date(date));

	const handleExport = async () => {
		const params = new URLSearchParams();
		if (filterStartDate) {
			params.set("from", `${filterStartDate}T00:00:00`);
		}
		if (filterEndDate) {
			params.set("to", `${filterEndDate}T23:59:59`);
		}
		try {
			const res = await api.get(`/reports/export?${params}`, {
				responseType: "blob",
			});
			const url = window.URL.createObjectURL(new Blob([res.data]));
			const a = document.createElement("a");
			a.href = url;
			a.download = `Log-Absensi-${filterStartDate || "all"}-to-${filterEndDate || "all"}.xlsx`;
			a.click();
		} catch {
			/* ignore */
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className="space-y-6 max-w-[1440px] mx-auto"
		>
			{/* Page Header & Actions */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h2 className="font-display text-3xl font-semibold text-[#111c2d]">
						Riwayat Absensi
					</h2>
					<p className="font-sans text-sm text-[#6e797e] mt-1">
						Monitoring log kehadiran real-time dari seluruh perangkat.
					</p>
				</div>
				<div className="flex flex-wrap gap-3">
					<button
						type="button"
						onClick={handleExport}
						className="flex items-center gap-2 px-4 py-2 bg-white border border-black/5 rounded-lg text-[#111c2d] hover:bg-[#f9f9ff] transition-all font-semibold text-[13px] shadow-sm active:scale-95"
					>
						<Download size={18} /> Export Excel
					</button>
					<button
						type="button"
						className="flex items-center gap-2 px-4 py-2 bg-white border border-black/5 rounded-lg text-[#111c2d] hover:bg-[#f9f9ff] transition-all font-semibold text-[13px] shadow-sm active:scale-95"
					>
						<FileText size={18} /> Export PDF
					</button>
				</div>
			</div>

			{/* Stats Bento Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<div className="bg-white p-5 rounded-xl border border-black/5 shadow-sm relative overflow-hidden group">
					<div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity">
						<User size={32} className="text-[#00647c]" />
					</div>
					<p className="font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider mb-2">
						Total Kehadiran
					</p>
					<div className="flex items-end gap-3">
						<h3 className="font-display text-[32px] font-bold text-[#111c2d] leading-none">
							{meta?.total || 0}
						</h3>
						<span className="text-[12px] font-semibold text-[#006c49] flex items-center mb-1 bg-[#006c49]/10 px-1.5 py-0.5 rounded">
							<TrendingUp size={14} className="mr-1" /> 12%
						</span>
					</div>
					<p className="font-mono text-[11px] text-[#6e797e] mt-2">Hari ini</p>
				</div>
			</div>

			{/* Filters & Controls */}
			<div className="bg-white rounded-xl p-4 flex flex-col lg:flex-row gap-4 items-end lg:items-center justify-between shadow-sm border border-black/5">
				<div className="flex flex-wrap gap-4 w-full lg:w-auto">
					{/* Search */}
					<div className="flex flex-col gap-1 w-full sm:w-auto">
						<label
							htmlFor="search-emp"
							className="font-sans text-[12px] font-semibold text-[#6e797e]"
						>
							Pencarian Pegawai
						</label>
						<div className="relative">
							<Search
								className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e797e]"
								size={18}
							/>
							<input
								className="w-full sm:w-64 bg-white border border-[#bdc8ce] rounded-lg py-2 pl-10 pr-4 text-[13px] font-sans text-[#111c2d] focus:outline-none focus:border-[#00647c] focus:ring-1 focus:ring-[#00647c]/50 transition-all shadow-sm placeholder:text-[#6e797e]"
								placeholder="Cari nama atau NIP..."
								type="text"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</div>
					</div>

					{/* Date Range */}
					<div className="flex flex-col gap-1 w-full sm:w-auto">
						<label
							htmlFor="date-range"
							className="font-sans text-[12px] font-semibold text-[#6e797e]"
						>
							Rentang Tanggal
						</label>
						<div className="flex items-center gap-2">
							<div className="relative">
								<CalendarDays
									className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e797e]"
									size={18}
								/>
								<input
									id="date-range"
									type="date"
									value={filterStartDate}
									onChange={(e) => setFilterStartDate(e.target.value)}
									className="w-full sm:w-36 bg-white border border-[#bdc8ce] rounded-lg py-2 pl-10 pr-2 text-[13px] font-sans text-[#111c2d] focus:outline-none focus:border-[#00647c] focus:ring-1 focus:ring-[#00647c]/50 transition-all shadow-sm"
								/>
							</div>
							<span className="text-[#6e797e] text-[13px] font-medium">-</span>
							<div className="relative">
								<CalendarDays
									className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e797e]"
									size={18}
								/>
								<input
									type="date"
									value={filterEndDate}
									onChange={(e) => setFilterEndDate(e.target.value)}
									className="w-full sm:w-36 bg-white border border-[#bdc8ce] rounded-lg py-2 pl-10 pr-2 text-[13px] font-sans text-[#111c2d] focus:outline-none focus:border-[#00647c] focus:ring-1 focus:ring-[#00647c]/50 transition-all shadow-sm"
								/>
							</div>
						</div>
					</div>

					{/* Status Filter */}
					<div className="flex flex-col gap-1 w-full sm:w-auto">
						<label
							htmlFor="status-filter"
							className="font-sans text-[12px] font-semibold text-[#6e797e]"
						>
							Status
						</label>
						<div className="relative">
							<Filter
								className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e797e]"
								size={18}
							/>
							<select
								value={filterStatus}
								onChange={(e) => setFilterStatus(e.target.value)}
								className="w-full sm:w-40 bg-white border border-[#bdc8ce] rounded-lg py-2 pl-10 pr-8 text-[13px] font-sans text-[#111c2d] focus:outline-none focus:border-[#00647c] focus:ring-1 focus:ring-[#00647c]/50 transition-all shadow-sm appearance-none cursor-pointer"
							>
								<option value="">Semua Status</option>
								<option value="PRESENT">Hadir</option>
								<option value="LATE">Terlambat</option>
								<option value="ABSENT">Mangkir</option>
							</select>
						</div>
					</div>
				</div>
			</div>

			{/* Main Data Table */}
			<div className="bg-white rounded-xl shadow-sm border border-black/5 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse min-w-[800px]">
						<thead>
							<tr className="bg-[#f9f9ff] border-b border-black/5">
								<th className="px-6 py-4 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider">
									Pegawai
								</th>
								<th className="px-6 py-4 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider">
									Waktu
								</th>
								<th className="px-6 py-4 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider">
									Tipe
								</th>
								<th className="px-6 py-4 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider">
									Status
								</th>
								<th className="px-6 py-4 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider">
									Perangkat
								</th>
								<th className="px-6 py-4 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider text-center">
									Foto
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-black/5">
							{isLoading ? (
								[1, 2, 3, 4, 5].map((k) => (
									<tr key={k} className="animate-pulse">
										<td colSpan={6} className="px-6 py-6 h-14 bg-white" />
									</tr>
								))
							) : logs?.length === 0 ? (
								<tr>
									<td
										colSpan={6}
										className="px-6 py-20 text-center text-[#6e797e] font-sans text-sm"
									>
										Tidak ada data absensi yang ditemukan.
									</td>
								</tr>
							) : (
								logs?.map((log: AttendanceLog) => (
									<tr
										key={log.id}
										className="hover:bg-[#f9f9ff] transition-colors"
									>
										<td className="px-6 py-3">
											<div className="flex items-center gap-3">
												<div className="w-9 h-9 rounded-full bg-[#dee8ff] border border-black/5 flex items-center justify-center text-[#00647c] font-bold text-xs shrink-0">
													{log.employee?.name?.[0] || "?"}
												</div>
												<div>
													<div className="font-sans text-[14px] font-medium text-[#111c2d]">
														{log.employee?.name}
													</div>
													<div className="font-mono text-[11px] text-[#6e797e]">
														{log.employee?.employeeCode}
													</div>
												</div>
											</div>
										</td>
										<td className="px-6 py-3">
											<div className="flex items-center gap-2 font-mono text-[13px] text-[#111c2d]">
												<Clock size={14} className="text-[#6e797e]" />
												{formatDate(log.timestamp)}
											</div>
										</td>
										<td className="px-6 py-3">
											<span
												className={`px-2.5 py-1 rounded-md text-[11px] font-mono tracking-wider border flex items-center gap-1.5 uppercase font-medium w-max ${log.type === "IN" ? "bg-[#006c49]/10 text-[#006c49] border-[#006c49]/20" : "bg-[#00647c]/10 text-[#00647c] border-[#00647c]/20"}`}
											>
												{log.type === "IN" ? "MASUK" : "KELUAR"}
											</span>
										</td>
										<td className="px-6 py-3">
											<div className="flex items-center gap-2">
												<span className="relative flex h-2 w-2">
													<span
														className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${log.status === "PRESENT" ? "bg-[#006c49]" : log.status === "LATE" ? "bg-[#a86516]" : "bg-[#ba1a1a]"}`}
													></span>
													<span
														className={`relative inline-flex rounded-full h-2 w-2 ${log.status === "PRESENT" ? "bg-[#006c49]" : log.status === "LATE" ? "bg-[#a86516]" : "bg-[#ba1a1a]"}`}
													></span>
												</span>
												<span className="font-sans text-[14px] text-[#111c2d]">
													{log.status === "PRESENT"
														? "Hadir"
														: log.status === "LATE"
															? "Terlambat"
															: "Mangkir"}
												</span>
											</div>
										</td>
										<td className="px-6 py-3">
											<div className="flex items-center gap-2 text-[#3e484d] font-sans text-[13px]">
												<Monitor size={14} className="text-[#6e797e]" />
												{log.device?.name || "-"}
											</div>
										</td>
										<td className="px-6 py-3 text-center">
											{log.photoUrl ? (
												<button
													type="button"
													onClick={() =>
														setPhotoModal(`${apiBase}${log.photoUrl}`)
													}
													className="text-[12px] font-semibold text-[#00647c] hover:text-[#007f9d] transition-colors bg-[#00647c]/5 hover:bg-[#00647c]/10 px-3 py-1.5 rounded-lg border border-[#00647c]/10"
												>
													<CheckCircle2 size={14} className="inline mr-1" />
													Lihat
												</button>
											) : (
												<span className="text-[12px] text-[#bdc8ce] flex items-center justify-center gap-1">
													<XCircle size={14} />-
												</span>
											)}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination Controls */}
				{meta && meta.totalPages > 1 && (
					<div className="p-4 border-t border-black/5 flex items-center justify-between bg-[#f9f9ff]">
						<div className="text-[12px] text-[#6e797e] font-medium">
							Menampilkan Halaman {meta.page} dari {meta.totalPages} (Total{" "}
							{meta.total} data)
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={page === 1}
								className="px-3 py-1.5 bg-white border border-black/10 rounded-lg text-[12px] font-semibold text-[#111c2d] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#dee8ff]/50 transition-colors"
							>
								Sebelumnya
							</button>
							<div className="flex gap-1">
								{Array.from(
									{ length: Math.min(5, meta.totalPages) },
									(_, i) => {
										let pageNum = i + 1;
										if (meta.totalPages > 5) {
											if (page > 3) {
												pageNum = page - 2 + i;
											}
											if (pageNum > meta.totalPages) return null;
										}
										return (
											<button
												key={pageNum}
												type="button"
												onClick={() => setPage(pageNum)}
												className={`w-8 h-8 rounded-lg text-[12px] font-bold transition-colors ${page === pageNum ? "bg-[#00647c] text-white" : "bg-white border border-black/10 text-[#3e484d] hover:bg-[#dee8ff]/50"}`}
											>
												{pageNum}
											</button>
										);
									},
								)}
							</div>
							<button
								type="button"
								onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
								disabled={page === meta.totalPages}
								className="px-3 py-1.5 bg-white border border-black/10 rounded-lg text-[12px] font-semibold text-[#111c2d] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#dee8ff]/50 transition-colors"
							>
								Selanjutnya
							</button>
						</div>
					</div>
				)}
			</div>

			{photoModal && (
				<div
					className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#111c2d]/80 backdrop-blur-sm"
					onClick={() => setPhotoModal(null)}
				>
					<div
						className="bg-white rounded-xl p-2 max-w-lg shadow-2xl relative border border-black/10"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="relative w-[300px] sm:w-[400px] h-[300px] sm:h-[400px]">
							<Image
								src={photoModal}
								alt="Foto Absensi"
								fill
								className="rounded-lg object-contain"
								sizes="(max-width: 768px) 100vw, 400px"
							/>
						</div>
						<button
							type="button"
							onClick={() => setPhotoModal(null)}
							className="mt-2 w-full py-2.5 text-center text-[13px] font-semibold text-[#3e484d] hover:bg-[#f9f9ff] hover:text-[#111c2d] rounded-lg transition-colors"
						>
							Tutup
						</button>
					</div>
				</div>
			)}
		</motion.div>
	);
}
