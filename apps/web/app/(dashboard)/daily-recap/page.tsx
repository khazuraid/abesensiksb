"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, FileText, Search } from "lucide-react";
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

export default function DailyRecapPage() {
	const queryClient = useQueryClient();
	const [month, setMonth] = React.useState(new Date().getMonth() + 1);
	const [year, setYear] = React.useState(new Date().getFullYear());
	const [search, setSearch] = React.useState("");
	const [page, setPage] = React.useState(1);
	const [selectedEmployee, setSelectedEmployee] =
		React.useState<EmployeeRecap | null>(null);
	const [editingDay, setEditingDay] = React.useState<{
		date: string;
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
				`/reports/daily-recap?month=${month}&year=${year}&page=${page}&limit=10&search=${encodeURIComponent(search)}`,
			);
			return res.data;
		},
	});

	const data = response?.data || [];
	const meta = response?.meta;
	const _daysInMonth = data[0]?.days || [];

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
			if (!editingDay || !selectedEmployee) return;
			const day = selectedEmployee.days.find((d) => d.date === editingDay.date);
			if (!day) return;

			const inChanged = (day.clockIn || "") !== editingDay.inValue;
			const outChanged = (day.clockOut || "") !== editingDay.outValue;
			if (!inChanged && !outChanged) return;

			const needsReason = Boolean(
				(inChanged && editingDay.inValue && day.inLogId) ||
					(outChanged && editingDay.outValue && day.outLogId),
			);
			let reason: string | null = null;
			if (needsReason) {
				reason = window.prompt("Alasan koreksi absensi (minimal 5 karakter)");
				if (!reason || reason.trim().length < 5) {
					throw new Error("Alasan koreksi wajib diisi");
				}
			}

			if (inChanged) {
				if (editingDay.inValue) {
					const timestamp = `${day.date}T${editingDay.inValue}:00`;
					if (day.inLogId) {
						await api.post("/attendance-corrections", {
							attendanceLogId: day.inLogId,
							timestamp,
							reason,
						});
					} else {
						await api.post("/attendance-logs", {
							employeeId: selectedEmployee.id,
							timestamp,
							type: "IN",
						});
					}
				} else if (day.inLogId) {
					await api.delete(`/attendance-logs/${day.inLogId}`);
				}
			}

			if (outChanged) {
				if (editingDay.outValue) {
					const timestamp = `${day.date}T${editingDay.outValue}:00`;
					if (day.outLogId) {
						await api.post("/attendance-corrections", {
							attendanceLogId: day.outLogId,
							timestamp,
							reason,
						});
					} else {
						await api.post("/attendance-logs", {
							employeeId: selectedEmployee.id,
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
			setEditingDay(null);
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
				title="Rekap Presensi Harian"
				description="Matriks kehadiran bulanan per pegawai, kalkulasi keterlambatan, dan koreksi data."
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
				</div>

				<div className="relative w-full sm:w-64">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
					<Input
						placeholder="Cari nama atau NIP pegawai..."
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
							<TableHead className="sticky left-0 z-10 bg-muted">
								Pegawai
							</TableHead>
							<TableHead>Shift</TableHead>
							<TableHead className="text-center">Hadir</TableHead>
							<TableHead className="text-center">Telat</TableHead>
							<TableHead className="text-center">Alpa</TableHead>
							<TableHead className="text-center">Cuti</TableHead>
							<TableHead className="text-center">Total Telat</TableHead>
							<TableHead className="text-right">Aksi</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							[1, 2, 3].map((k) => (
								<TableRow key={k} className="animate-pulse">
									<TableCell colSpan={8} className="h-12 bg-card" />
								</TableRow>
							))
						) : data.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={8}
									className="py-12 text-center text-xs text-muted-foreground"
								>
									Tidak ada rekap presensi pada periode ini.
								</TableCell>
							</TableRow>
						) : (
							data.map((emp) => (
								<TableRow key={emp.id} className="hover:bg-muted/30">
									<TableCell className="sticky left-0 z-10 bg-card font-medium text-foreground">
										<div className="flex flex-col">
											<span>{emp.name}</span>
											<span className="text-[11px] font-mono text-muted-foreground">
												{emp.employeeCode}
											</span>
										</div>
									</TableCell>
									<TableCell className="text-xs text-muted-foreground font-mono">
										{emp.shiftName || "Default"}
									</TableCell>
									<TableCell className="text-center font-mono text-xs font-bold text-emerald-600">
										{emp.totalPresent}
									</TableCell>
									<TableCell className="text-center font-mono text-xs font-bold text-amber-600">
										{emp.totalLate}
									</TableCell>
									<TableCell className="text-center font-mono text-xs font-bold text-red-600">
										{emp.totalAbsent}
									</TableCell>
									<TableCell className="text-center font-mono text-xs font-bold text-sky-600">
										{emp.totalLeave}
									</TableCell>
									<TableCell className="text-center font-mono text-xs text-muted-foreground">
										{emp.totalLateMinutesSum}m
									</TableCell>
									<TableCell className="text-right">
										<Button
											variant="outline"
											size="sm"
											className="text-xs"
											onClick={() => setSelectedEmployee(emp)}
										>
											Detail Harian
										</Button>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>

				<div className="p-3 border-t border-border bg-card">
					<PaginationControls
						meta={meta}
						onPageChange={setPage}
						disabled={isLoading}
					/>
				</div>
			</div>

			{/* Detail Harian Modal (Data Dasar Pattern) */}
			{selectedEmployee && (
				<Modal
					open={Boolean(selectedEmployee)}
					onOpenChange={() => setSelectedEmployee(null)}
					title={`Rincian Harian: ${selectedEmployee.name}`}
					description={`NIP: ${selectedEmployee.employeeCode} · Periode: ${month}/${year}`}
					maxWidth="5xl"
				>
					<div className="border border-border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Tanggal</TableHead>
									<TableHead>Jam Masuk</TableHead>
									<TableHead>Jam Pulang</TableHead>
									<TableHead>Keterlambatan</TableHead>
									<TableHead>Pulang Cepat</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Koreksi</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{selectedEmployee.days.map((day) => (
									<TableRow key={day.date}>
										<TableCell className="font-mono text-xs">
											{day.date}
										</TableCell>
										<TableCell className="font-mono text-xs text-foreground font-semibold">
											{day.clockIn || "—"}
										</TableCell>
										<TableCell className="font-mono text-xs text-foreground font-semibold">
											{day.clockOut || "—"}
										</TableCell>
										<TableCell className="font-mono text-xs text-muted-foreground">
											{day.lateMinutes > 0 ? `${day.lateMinutes}m` : "—"}
										</TableCell>
										<TableCell className="font-mono text-xs text-muted-foreground">
											{day.earlyOutMinutes > 0
												? `${day.earlyOutMinutes}m`
												: "—"}
										</TableCell>
										<TableCell>
											{statusBadge(day.status, day.isHoliday, day.isWorkDay)}
										</TableCell>
										<TableCell className="text-right">
											<Button
												variant="ghost"
												size="sm"
												className="text-xs text-primary hover:underline"
												onClick={() =>
													setEditingDay({
														date: day.date,
														inValue: day.clockIn || "",
														outValue: day.clockOut || "",
													})
												}
											>
												Edit
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</Modal>
			)}

			{/* Day Punch Correction Modal */}
			{editingDay && selectedEmployee && (
				<Modal
					open={Boolean(editingDay)}
					onOpenChange={() => setEditingDay(null)}
					title="Koreksi Waktu Presensi"
					description={`Pegawai: ${selectedEmployee.name} · Tanggal: ${editingDay.date}`}
					maxWidth="md"
					footer={
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setEditingDay(null)}
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
								{saveDayMutation.isPending ? "Menyimpan..." : "Simpan Koreksi"}
							</Button>
						</div>
					}
				>
					<div className="space-y-4">
						<div className="space-y-1.5">
							<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
								Jam Masuk (Format HH:MM)
							</label>
							<Input
								type="time"
								value={editingDay.inValue}
								onChange={(e) =>
									setEditingDay({ ...editingDay, inValue: e.target.value })
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
								value={editingDay.outValue}
								onChange={(e) =>
									setEditingDay({ ...editingDay, outValue: e.target.value })
								}
								className="font-mono text-xs"
							/>
						</div>
					</div>
				</Modal>
			)}
		</div>
	);
}
