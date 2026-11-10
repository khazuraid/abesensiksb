"use client";

import type { AttendanceLog } from "@adms/shared-types";
import { useQuery } from "@tanstack/react-query";
import { Download, LogIn, LogOut, Search } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import PaginationControls from "@/components/pagination-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

export default function AttendanceLogsPage() {
	const [search, setSearch] = React.useState("");
	const [filterStatus, setFilterStatus] = React.useState("");

	const getTodayStr = () => {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
	};

	const [filterStartDate, setFilterStartDate] = React.useState(getTodayStr());
	const [filterEndDate, setFilterEndDate] = React.useState(getTodayStr());
	const [photoModal, setPhotoModal] = React.useState<string | null>(null);
	const [expandedRowId, setExpandedRowId] = React.useState<number | null>(null);
	const [page, setPage] = React.useState(1);
	const [debouncedSearch, setDebouncedSearch] = React.useState("");

	React.useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(search), 400);
		return () => clearTimeout(timer);
	}, [search]);

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
			if (debouncedSearch) params.append("search", debouncedSearch);
			if (filterStatus) params.append("status", filterStatus);
			if (filterStartDate) params.append("startDate", filterStartDate);
			if (filterEndDate) params.append("endDate", filterEndDate);
			params.append("page", page.toString());
			params.append("limit", "15");

			const res = await api.get(`/attendance-logs?${params.toString()}`);
			return res.data;
		},
	});

	const logs: AttendanceLog[] = response?.data || [];
	const meta = response?.meta;

	const handleExport = async () => {
		try {
			const res = await api.get(
				`/attendance-logs/export?startDate=${filterStartDate}&endDate=${filterEndDate}`,
				{ responseType: "blob" },
			);
			const url = window.URL.createObjectURL(new Blob([res.data]));
			const link = document.createElement("a");
			link.href = url;
			link.setAttribute(
				"download",
				`Log_Presensi_${filterStartDate}_sd_${filterEndDate}.xlsx`,
			);
			document.body.appendChild(link);
			link.click();
			link.remove();
			toast.success("Berhasil mengunduh laporan Excel");
		} catch {
			toast.error("Gagal mengunduh laporan");
		}
	};

	return (
		<div className="page-shell space-y-6">
			{/* Level 1: Page Header */}
			<PageHeader
				title="Log Presensi Mesin"
				description="Audit rekaman absensi real-time dari seluruh mesin sidik jari dan RFID ADMS."
				action={
					<Button
						variant="outline"
						size="sm"
						onClick={handleExport}
						className="gap-1.5"
					>
						<Download className="h-4 w-4" />
						Export Excel
					</Button>
				}
			/>

			{/* Filter & Toolbar Section (Level 2) */}
			<div className="border border-border bg-card p-4 space-y-3">
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
					{/* Search */}
					<div className="space-y-1">
						<label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
							Cari Pegawai
						</label>
						<div className="relative">
							<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
							<Input
								placeholder="Nama atau NIP..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="pl-8 text-xs h-8"
							/>
						</div>
					</div>

					{/* Date Range Start */}
					<div className="space-y-1">
						<label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
							Dari Tanggal
						</label>
						<Input
							type="date"
							value={filterStartDate}
							onChange={(e) => setFilterStartDate(e.target.value)}
							className="text-xs h-8 font-mono"
						/>
					</div>

					{/* Date Range End */}
					<div className="space-y-1">
						<label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
							Sampai Tanggal
						</label>
						<Input
							type="date"
							value={filterEndDate}
							onChange={(e) => setFilterEndDate(e.target.value)}
							className="text-xs h-8 font-mono"
						/>
					</div>

					{/* Status Selector */}
					<div className="space-y-1">
						<label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
							Status Kehadiran
						</label>
						<select
							value={filterStatus}
							onChange={(e) => setFilterStatus(e.target.value)}
							className="flex h-8 w-full border border-border bg-card px-3 text-xs text-foreground focus:border-primary focus:outline-none"
						>
							<option value="">Semua Status</option>
							<option value="ON_TIME">Tepat Waktu</option>
							<option value="LATE">Terlambat</option>
							<option value="EARLY_DEPARTURE">Pulang Cepat</option>
						</select>
					</div>
				</div>
			</div>

			{/* Table Container */}
			<div className="border border-border bg-card">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Waktu Log</TableHead>
							<TableHead>NIP</TableHead>
							<TableHead>Nama Pegawai</TableHead>
							<TableHead>Tipe</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Perangkat</TableHead>
							<TableHead className="text-right">Verifikasi</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							[1, 2, 3, 4, 5].map((k) => (
								<TableRow key={k} className="animate-pulse">
									<TableCell colSpan={7} className="h-12 bg-card" />
								</TableRow>
							))
						) : logs.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={7}
									className="py-12 text-center text-xs text-muted-foreground"
								>
									Tidak ada riwayat log yang sesuai kriteria.
								</TableCell>
							</TableRow>
						) : (
							logs.map((log) => {
								const date = new Date(log.timestamp);
								const isIn = log.type === "IN";
								const isLate = log.status === "LATE";
								const isExpanded = expandedRowId === log.id;

								return (
									<React.Fragment key={log.id}>
										<TableRow
											onClick={() =>
												setExpandedRowId((prev) =>
													prev === log.id ? null : log.id,
												)
											}
											className={cn(
												"cursor-pointer select-none",
												isExpanded && "bg-muted/40",
											)}
										>
											<TableCell className="font-mono text-xs">
												{date.toLocaleDateString("id-ID", {
													day: "2-digit",
													month: "short",
													year: "numeric",
												})}{" "}
												<span className="font-bold text-foreground">
													{date.toLocaleTimeString("id-ID", {
														hour: "2-digit",
														minute: "2-digit",
														second: "2-digit",
													})}
												</span>
											</TableCell>
											<TableCell className="font-mono text-xs text-muted-foreground">
												{log.employee?.employeeCode ?? "—"}
											</TableCell>
											<TableCell className="font-semibold text-foreground">
												{log.employee?.name ?? "Tidak Diketahui"}
											</TableCell>
											<TableCell>
												<Badge
													variant={isIn ? "success" : "secondary"}
													className="gap-1 text-[10px]"
												>
													{isIn ? (
														<LogIn className="h-3 w-3" />
													) : (
														<LogOut className="h-3 w-3" />
													)}
													{isIn ? "MASUK" : "KELUAR"}
												</Badge>
											</TableCell>
											<TableCell>
												<Badge
													variant={isLate ? "warning" : "success"}
													className="text-[10px]"
												>
													{isLate ? "TERLAMBAT" : "TEPAT"}
												</Badge>
											</TableCell>
											<TableCell className="font-mono text-xs text-muted-foreground">
												{log.device?.name ?? "Mesin ADMS"}
											</TableCell>
											<TableCell className="text-right font-mono text-xs text-muted-foreground">
												{log.verified ? "Terverifikasi" : "Manual"}
											</TableCell>
										</TableRow>

										{/* Inline Detail Expansion */}
										{isExpanded && (
											<TableRow className="bg-muted/30 border-b border-border/80">
												<TableCell colSpan={7} className="p-4">
													<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border border-border bg-card p-4">
														<div className="space-y-1">
															<span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
																Metadata Mesin ADMS
															</span>
															<p className="text-xs font-mono text-foreground">
																SN Perangkat: {log.device?.serialNumber ?? "—"}
															</p>
															<p className="text-xs font-mono text-foreground">
																Raw Timestamp: {String(log.timestamp)}
															</p>
														</div>

														<div className="space-y-1">
															<span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
																Detail Pegawai
															</span>
															<p className="text-xs text-foreground">
																Departemen: {log.employee?.department || "—"}
															</p>
															<p className="text-xs text-foreground">
																Jabatan: {log.employee?.position || "—"}
															</p>
														</div>

														{log.photoUrl && (
															<div className="space-y-1">
																<span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
																	Foto Snapshot Mesin
																</span>
																<button
																	type="button"
																	onClick={(e) => {
																		e.stopPropagation();
																		setPhotoModal(log.photoUrl ?? null);
																	}}
																	className="block border border-border hover:border-primary"
																>
																	<img
																		src={log.photoUrl}
																		alt="Snapshot"
																		className="h-16 w-16 object-cover"
																	/>
																</button>
															</div>
														)}
													</div>
												</TableCell>
											</TableRow>
										)}
									</React.Fragment>
								);
							})
						)}
					</TableBody>
				</Table>

				{/* Pagination */}
				<div className="p-3 border-t border-border bg-card">
					<PaginationControls
						meta={meta}
						onPageChange={setPage}
						disabled={isLoading}
					/>
				</div>
			</div>

			{/* Photo Modal */}
			{photoModal && (
				<Modal
					open={Boolean(photoModal)}
					onOpenChange={() => setPhotoModal(null)}
					title="Foto Snapshot Presensi"
					maxWidth="md"
				>
					<div className="flex justify-center p-2">
						<img
							src={photoModal}
							alt="Foto Presensi"
							className="max-h-96 w-auto border border-border object-contain"
						/>
					</div>
				</Modal>
			)}
		</div>
	);
}
