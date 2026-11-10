"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, FileSpreadsheet, FileText, Search } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import PaginationControls, {
	type PageMeta,
} from "@/components/pagination-controls";
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
	totalLateMinutesSum: number;
	totalEarlyOutMinutesSum: number;
}

interface FlatDayRow {
	employeeId: number;
	employeeName: string;
	employeeCode: string;
	shiftName: string;
	day: DayData;
}

export default function DailyRecapPage() {
	const queryClient = useQueryClient();
	const today = new Date();
	const [month, setMonth] = React.useState(today.getMonth() + 1);
	const [year, setYear] = React.useState(today.getFullYear());
	const [selectedDay, setSelectedDay] = React.useState<string>("all");
	const [statusFilter, setStatusFilter] = React.useState<string>("all");
	const [search, setSearch] = React.useState("");
	const [page, setPage] = React.useState(1);

	const [editingTarget, setEditingTarget] = React.useState<{
		employeeId: number;
		employeeName: string;
		day: DayData;
		inValue: string;
		outValue: string;
	} | null>(null);

	const [isExporting, setIsExporting] = React.useState<"excel" | "pdf" | null>(
		null,
	);

	const { data: response, isLoading } = useQuery<{
		data: EmployeeRecap[];
		meta: PageMeta;
	}>({
		queryKey: ["daily-recap", month, year, page, search],
		queryFn: async () => {
			const res = await api.get(
				`/reports/daily-recap?month=${month}&year=${year}&page=${page}&limit=20&search=${encodeURIComponent(search)}`,
			);
			return res.data;
		},
	});

	const data = response?.data || [];
	const meta = response?.meta;
	const daysList = data[0]?.days?.map((d) => d.date) || [];

	const flatRows: FlatDayRow[] = React.useMemo(() => {
		const rows: FlatDayRow[] = [];
		for (const emp of data) {
			for (const day of emp.days) {
				if (selectedDay !== "all" && day.date !== selectedDay) continue;

				if (statusFilter !== "all") {
					if (statusFilter === "LATE" && day.status !== "LATE") continue;
					if (statusFilter === "ABSENT" && day.status !== "ABSENT") continue;
					if (statusFilter === "PRESENT" && day.status !== "PRESENT") continue;
					if (statusFilter === "LEAVE" && day.status !== "LEAVE") continue;
				}

				rows.push({
					employeeId: emp.id,
					employeeName: emp.name,
					employeeCode: emp.employeeCode,
					shiftName: emp.shiftName,
					day,
				});
			}
		}
		return rows;
	}, [data, selectedDay, statusFilter]);

	const handleExport = async (type: "excel" | "pdf") => {
		try {
			setIsExporting(type);
			const endpoint =
				type === "excel"
					? `/reports/daily-recap?month=${month}&year=${year}&export=true`
					: `/reports/daily-recap/export-pdf?month=${month}&year=${year}`;
			const res = await api.get(endpoint, { responseType: "blob" });
			const url = window.URL.createObjectURL(new Blob([res.data]));
			const a = document.createElement("a");
			a.href = url;
			a.download = `Rekap_Presensi_${month}_${year}.${type === "excel" ? "xlsx" : "pdf"}`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			toast.success(`Berhasil mengunduh rekap ${type.toUpperCase()}`);
		} catch {
			toast.error(`Gagal mengunduh rekap ${type.toUpperCase()}`);
		} finally {
			setIsExporting(null);
		}
	};

	const saveDayMutation = useMutation({
		mutationFn: async () => {
			if (!editingTarget) return;
			const { day, inValue, outValue, employeeId } = editingTarget;

			const inChanged = (day.clockIn || "") !== inValue;
			const outChanged = (day.clockOut || "") !== outValue;
			if (!inChanged && !outChanged) return;

			const needsReason = Boolean(
				(inChanged && inValue && day.inLogId) ||
					(outChanged && outValue && day.outLogId),
			);
			let reason: string | null = null;
			if (needsReason) {
				reason = window.prompt("Alasan koreksi absensi (minimal 5 karakter):");
				if (!reason || reason.trim().length < 5) {
					throw new Error("Alasan koreksi wajib diisi minimal 5 karakter");
				}
			}

			if (inChanged) {
				if (inValue) {
					const timestamp = `${day.date}T${inValue}:00`;
					if (day.inLogId) {
						await api.post("/attendance-corrections", {
							attendanceLogId: day.inLogId,
							timestamp,
							reason,
						});
					} else {
						await api.post("/attendance-logs", {
							employeeId,
							timestamp,
							type: "IN",
						});
					}
				} else if (day.inLogId) {
					await api.delete(`/attendance-logs/${day.inLogId}`);
				}
			}

			if (outChanged) {
				if (outValue) {
					const timestamp = `${day.date}T${outValue}:00`;
					if (day.outLogId) {
						await api.post("/attendance-corrections", {
							attendanceLogId: day.outLogId,
							timestamp,
							reason,
						});
					} else {
						await api.post("/attendance-logs", {
							employeeId,
							timestamp,
							type: "OUT",
						});
					}
				} else if (day.outLogId) {
					await api.delete(`/attendance-logs/${day.outLogId}`);
				}
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["daily-recap", month, year] });
			setEditingTarget(null);
			toast.success("Catatan presensi berhasil diperbarui");
		},
		onError: (err: any) => {
			toast.error(
				err.response?.data?.message || err.message || "Gagal menyimpan absensi",
			);
		},
	});

	const statusBadge = (s: string, isHoliday?: boolean, isWorkDay?: boolean) => {
		if (isHoliday) {
			return (
				<span className="border border-purple-200 bg-purple-50 text-purple-700 font-mono text-[10px] px-1 py-0.5">
					LIBUR
				</span>
			);
		}
		if (!isWorkDay) {
			return (
				<span className="border border-border bg-muted text-muted-foreground font-mono text-[10px] px-1 py-0.5">
					OFF
				</span>
			);
		}
		switch (s) {
			case "PRESENT":
				return (
					<Badge variant="success" className="text-[10px]">
						HADIR
					</Badge>
				);
			case "LATE":
				return (
					<Badge variant="warning" className="text-[10px]">
						TELAT
					</Badge>
				);
			case "EARLY_OUT":
				return (
					<Badge variant="warning" className="text-[10px]">
						PLG CEPAT
					</Badge>
				);
			case "ABSENT":
				return (
					<Badge variant="destructive" className="text-[10px]">
						ALPA
					</Badge>
				);
			case "LEAVE":
				return (
					<Badge variant="info" className="text-[10px]">
						CUTI
					</Badge>
				);
			default:
				return (
					<span className="font-mono text-muted-foreground text-[10px]">—</span>
				);
		}
	};

	return (
		<div className="page-shell space-y-6">
			{/* Level 1: Page Header */}
			<PageHeader
				title="Tabel Rekap Harian"
				description="Pantau presensi harian per tanggal: deteksi telat, alpa, izin, dan edit langsung jam masuk/pulang."
				action={
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => handleExport("excel")}
							disabled={Boolean(isExporting)}
							className="gap-1.5"
						>
							<FileSpreadsheet className="h-4 w-4" />
							{isExporting === "excel" ? "Exporting..." : "Export Excel"}
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => handleExport("pdf")}
							disabled={Boolean(isExporting)}
							className="gap-1.5"
						>
							<FileText className="h-4 w-4" />
							{isExporting === "pdf" ? "Exporting..." : "Export PDF"}
						</Button>
					</div>
				}
			/>

			{/* Level 2: Filters Toolbar */}
			<div className="border border-border bg-card p-3.5 flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap items-center gap-3">
					<div className="flex items-center gap-2">
						<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
							Bulan:
						</label>
						<select
							value={month}
							onChange={(e) => {
								setMonth(Number(e.target.value));
								setPage(1);
							}}
							className="h-8 border border-border bg-card px-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
						>
							{Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
								<option key={m} value={m}>
									{new Date(2026, m - 1).toLocaleString("id-ID", {
										month: "long",
									})}
								</option>
							))}
						</select>
					</div>

					<div className="flex items-center gap-2">
						<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
							Tahun:
						</label>
						<select
							value={year}
							onChange={(e) => {
								setYear(Number(e.target.value));
								setPage(1);
							}}
							className="h-8 border border-border bg-card px-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
						>
							{[year - 1, year, year + 1].map((y) => (
								<option key={y} value={y}>
									{y}
								</option>
							))}
						</select>
					</div>

					<div className="flex items-center gap-2">
						<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
							Tanggal:
						</label>
						<select
							value={selectedDay}
							onChange={(e) => setSelectedDay(e.target.value)}
							className="h-8 border border-border bg-card px-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
						>
							<option value="all">Semua Hari</option>
							{daysList.map((d) => (
								<option key={d} value={d}>
									{d}
								</option>
							))}
						</select>
					</div>

					<div className="flex items-center gap-2">
						<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
							Status:
						</label>
						<select
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
							className="h-8 border border-border bg-card px-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
						>
							<option value="all">Semua Status</option>
							<option value="LATE">Terlambat</option>
							<option value="ABSENT">Tidak Absen / Alpa</option>
							<option value="PRESENT">Hadir Tepat Waktu</option>
							<option value="LEAVE">Cuti / Izin</option>
						</select>
					</div>
				</div>

				<div className="relative w-full sm:w-64">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
					<Input
						placeholder="Cari pegawai / NIP..."
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
						className="pl-8 text-xs h-8"
					/>
				</div>
			</div>

			{/* Table Container */}
			<div className="border border-border bg-card">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-28">Tanggal</TableHead>
							<TableHead>Pegawai</TableHead>
							<TableHead>Shift</TableHead>
							<TableHead className="text-center">Jam Masuk</TableHead>
							<TableHead className="text-center">Jam Pulang</TableHead>
							<TableHead className="text-center">Keterlambatan</TableHead>
							<TableHead className="text-center">Status</TableHead>
							<TableHead className="text-right">Aksi</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							[1, 2, 3, 4, 5].map((k) => (
								<TableRow key={k} className="animate-pulse">
									<TableCell colSpan={8} className="h-12 bg-card" />
								</TableRow>
							))
						) : flatRows.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={8}
									className="py-12 text-center text-xs text-muted-foreground"
								>
									Tidak ada rekaman presensi yang cocok dengan filter.
								</TableCell>
							</TableRow>
						) : (
							flatRows.map((row) => (
								<TableRow
									key={`${row.employeeId}-${row.day.date}`}
									className="hover:bg-muted/30"
								>
									<TableCell className="font-mono text-xs text-foreground font-semibold">
										{row.day.date}
									</TableCell>
									<TableCell className="font-medium text-foreground">
										<div className="flex flex-col">
											<span>{row.employeeName}</span>
											<span className="text-[11px] font-mono text-muted-foreground">
												{row.employeeCode}
											</span>
										</div>
									</TableCell>
									<TableCell className="text-xs text-muted-foreground font-mono">
										{row.shiftName || "Default"}
									</TableCell>
									<TableCell className="text-center font-mono text-xs text-foreground font-bold">
										{row.day.clockIn ? (
											<span>{row.day.clockIn}</span>
										) : (
											<span className="text-muted-foreground/60">—</span>
										)}
									</TableCell>
									<TableCell className="text-center font-mono text-xs text-foreground font-bold">
										{row.day.clockOut ? (
											<span>{row.day.clockOut}</span>
										) : (
											<span className="text-muted-foreground/60">—</span>
										)}
									</TableCell>
									<TableCell className="text-center font-mono text-xs">
										{row.day.lateMinutes > 0 ? (
											<span className="text-amber-600 font-bold">
												{row.day.lateMinutes}m
											</span>
										) : (
											<span className="text-muted-foreground/60">—</span>
										)}
									</TableCell>
									<TableCell className="text-center">
										{statusBadge(
											row.day.status,
											row.day.isHoliday,
											row.day.isWorkDay,
										)}
									</TableCell>
									<TableCell className="text-right">
										<Button
											variant="ghost"
											size="sm"
											className="text-xs text-primary gap-1 px-2 h-7"
											onClick={() =>
												setEditingTarget({
													employeeId: row.employeeId,
													employeeName: row.employeeName,
													day: row.day,
													inValue: row.day.clockIn || "",
													outValue: row.day.clockOut || "",
												})
											}
										>
											<Edit2 className="h-3.5 w-3.5" />
											Koreksi
										</Button>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>

				{meta && (
					<PaginationControls meta={meta} onPageChange={(p) => setPage(p)} />
				)}
			</div>

			{/* Edit Punch Modal */}
			{editingTarget && (
				<Modal
					open={Boolean(editingTarget)}
					onOpenChange={() => setEditingTarget(null)}
					title="Koreksi Waktu Presensi"
					description={`Pegawai: ${editingTarget.employeeName} · Tanggal: ${editingTarget.day.date}`}
					maxWidth="md"
					footer={
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setEditingTarget(null)}
								disabled={saveDayMutation.isPending}
							>
								Batal
							</Button>
							<Button
								variant="primary"
								size="sm"
								onClick={() => saveDayMutation.mutate()}
								disabled={saveDayMutation.isPending}
							>
								{saveDayMutation.isPending ? "Menyimpan..." : "Simpan Waktu"}
							</Button>
						</div>
					}
				>
					<div className="space-y-4 py-2">
						<div className="space-y-1.5">
							<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
								Jam Masuk (Format HH:MM)
							</label>
							<Input
								type="time"
								value={editingTarget.inValue}
								onChange={(e) =>
									setEditingTarget({
										...editingTarget,
										inValue: e.target.value,
									})
								}
								className="font-mono text-xs"
							/>
						</div>

						<div className="space-y-1.5">
							<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
								Jam Pulang (Format HH:MM)
							</label>
							<Input
								type="time"
								value={editingTarget.outValue}
								onChange={(e) =>
									setEditingTarget({
										...editingTarget,
										outValue: e.target.value,
									})
								}
								className="font-mono text-xs"
							/>
						</div>
						<p className="text-[11px] text-muted-foreground italic">
							* Kosongkan input jika ingin menghapus log kehadiran pada jam
							tersebut.
						</p>
					</div>
				</Modal>
			)}
		</div>
	);
}
