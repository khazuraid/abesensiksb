"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, FileSpreadsheet, FileText, Search } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import PaginationControls, {
	type PageMeta,
} from "@/components/pagination-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

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
	const today = new Date();
	const [month, setMonth] = React.useState(today.getMonth() + 1);
	const [year, setYear] = React.useState(today.getFullYear());
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
				`/reports/daily-recap?month=${month}&year=${year}&page=${page}&limit=10&search=${encodeURIComponent(search)}`,
			);
			return res.data;
		},
	});

	const data = response?.data || [];
	const meta = response?.meta;

	// Daftar hari dalam bulan (1 - 28/29/30/31)
	const daysInMonth = React.useMemo(() => {
		const total = new Date(year, month, 0).getDate();
		return Array.from({ length: total }, (_, i) => {
			const dayNum = i + 1;
			const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
			return { dayNum, dateStr };
		});
	}, [month, year]);

	const handleExportExcel = async () => {
		try {
			setIsExporting("excel");
			const res = await api.get(
				`/reports/daily-recap/export?month=${month}&year=${year}`,
				{ responseType: "blob" },
			);
			const url = window.URL.createObjectURL(new Blob([res.data]));
			const a = document.createElement("a");
			a.href = url;
			a.download = `Rekap_Presensi_${month}_${year}.xlsx`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			toast.success("Berhasil mengunduh rekap EXCEL");
		} catch {
			toast.error("Gagal mengunduh rekap EXCEL");
		} finally {
			setIsExporting(null);
		}
	};

	const handleExportPdf = async () => {
		if (!data || data.length === 0) {
			toast.error("Tidak ada data untuk diekspor");
			return;
		}
		try {
			setIsExporting("pdf");
			const { jsPDF } = await import("jspdf");
			await import("jspdf-autotable");
			const { drawHeader, drawFooter, TABLE_STYLES } = await import(
				"@/lib/pdf-design"
			);

			const doc = new jsPDF("p", "pt", "a4");
			const pageWidth = doc.internal.pageSize.getWidth();
			const pageHeight = doc.internal.pageSize.getHeight();
			const monthName = new Date(year, month - 1).toLocaleString("id-ID", {
				month: "long",
			});

			drawHeader(
				doc,
				"REKAP PRESENSI HARIAN",
				`Periode ${monthName} ${year} — Rekapitulasi Kehadiran Pegawai`,
				pageWidth,
			);

			(doc as any).autoTable({
				...TABLE_STYLES.primary,
				startY: 110,
				head: [
					["No", "Nama Pegawai", "NIP", "Shift", "Hadir", "Telat", "Alpa"],
				],
				body: data.map((emp, index) => [
					index + 1,
					emp.name,
					emp.employeeCode,
					emp.shiftName || "-",
					emp.totalPresent,
					emp.totalLate,
					emp.totalAbsent,
				]),
				columnStyles: {
					0: { cellWidth: 30, halign: "center" },
					1: { cellWidth: 170 },
					2: { cellWidth: 75 },
					3: { cellWidth: 85 },
					4: { cellWidth: 50, halign: "center" },
					5: { cellWidth: 50, halign: "center" },
					6: { cellWidth: 50, halign: "center" },
				},
				didDrawPage: () => {
					drawFooter(doc, pageWidth, pageHeight);
				},
			});

			doc.save(`Rekap_Presensi_${month}_${year}.pdf`);
			toast.success("Berhasil mengunduh rekap PDF");
		} catch {
			toast.error("Gagal mengunduh rekap PDF");
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

	// Helper warna & visual per cell hari
	const renderDayCell = (emp: EmployeeRecap, dateStr: string) => {
		const day = emp.days.find((d) => d.date === dateStr);
		if (!day) {
			return (
				<td
					key={dateStr}
					className="border-r border-border/40 p-0 text-center text-muted-foreground/30 font-mono text-[10px]"
				>
					—
				</td>
			);
		}

		let cellBg = "bg-transparent";
		let label: string;
		let textCol: string;
		let badgeBg = "bg-muted text-muted-foreground";

		if (day.isHoliday) {
			cellBg = "bg-purple-500/10";
			label = "L";
			textCol = "text-purple-600 dark:text-purple-400 font-bold";
			badgeBg =
				"bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
		} else if (!day.isWorkDay) {
			cellBg = "bg-muted/40";
			label = "OFF";
			textCol = "text-muted-foreground/50";
			badgeBg = "bg-muted text-muted-foreground";
		} else if (day.status === "PRESENT") {
			cellBg = "bg-emerald-500/10 hover:bg-emerald-500/20";
			label = "H";
			textCol = "text-emerald-700 dark:text-emerald-400 font-bold";
			badgeBg =
				"bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
		} else if (day.status === "LATE") {
			cellBg = "bg-amber-500/15 hover:bg-amber-500/25";
			label = "T";
			textCol = "text-amber-700 dark:text-amber-400 font-bold";
			badgeBg =
				"bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
		} else if (day.status === "EARLY_OUT") {
			cellBg = "bg-amber-500/15 hover:bg-amber-500/25";
			label = "PC";
			textCol = "text-amber-700 dark:text-amber-400 font-bold";
			badgeBg =
				"bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
		} else if (day.status === "ABSENT") {
			cellBg = "bg-red-500/15 hover:bg-red-500/25";
			label = "A";
			textCol = "text-red-700 dark:text-red-400 font-bold";
			badgeBg = "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
		} else if (day.status === "LEAVE") {
			cellBg = "bg-sky-500/15 hover:bg-sky-500/25";
			label = "C";
			textCol = "text-sky-700 dark:text-sky-400 font-bold";
			badgeBg = "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300";
		} else {
			label = "—";
			textCol = "text-muted-foreground/40";
		}

		return (
			<td
				key={dateStr}
				className={cn(
					"border-r border-border/40 p-0 text-center transition-colors relative group",
					cellBg,
				)}
			>
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							type="button"
							onClick={() =>
								setEditingTarget({
									employeeId: emp.id,
									employeeName: emp.name,
									day,
									inValue: day.clockIn || "",
									outValue: day.clockOut || "",
								})
							}
							className={cn(
								"w-full h-11 flex items-center justify-center font-mono text-[11px] cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary",
								textCol,
							)}
						>
							<span className="leading-none">{label}</span>
						</button>
					</TooltipTrigger>
					<TooltipContent
						side="top"
						className="text-xs p-2.5 max-w-xs space-y-1 z-50"
					>
						<p className="font-bold text-foreground">
							{emp.name} · {dateStr}
						</p>
						<div className="text-[11px] space-y-0.5 font-mono text-muted-foreground">
							<p>Masuk: {day.clockIn || "Tidak ada"}</p>
							<p>Pulang: {day.clockOut || "Tidak ada"}</p>
							{day.lateMinutes > 0 && (
								<p className="text-amber-500 font-bold">
									Terlambat: {day.lateMinutes} menit
								</p>
							)}
							{day.earlyOutMinutes > 0 && (
								<p className="text-amber-500">
									Pulang Cepat: {day.earlyOutMinutes} menit
								</p>
							)}
							<p>
								Status:{" "}
								<span
									className={cn("px-1 py-0.2 rounded-none font-bold", badgeBg)}
								>
									{day.isHoliday ? "LIBUR" : day.status}
								</span>
							</p>
						</div>
						<p className="text-[10px] text-primary pt-1 border-t border-border/50">
							Klik untuk koreksi jam masuk/pulang
						</p>
					</TooltipContent>
				</Tooltip>
			</td>
		);
	};

	return (
		<TooltipProvider delayDuration={150}>
			<div className="page-shell space-y-5">
				{/* Level 1: Page Header */}
				<PageHeader
					title="Rekap Presensi Harian"
					description="Matriks presensi tanggal 1–31 seluruh pegawai. Pantau status kehadiran dan klik kotak tanggal untuk koreksi jam presensi."
					action={
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={handleExportExcel}
								disabled={Boolean(isExporting)}
								className="gap-1.5"
							>
								<FileSpreadsheet className="h-4 w-4" />
								{isExporting === "excel" ? "Mengunduh..." : "Export Excel"}
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={handleExportPdf}
								disabled={Boolean(isExporting)}
								className="gap-1.5"
							>
								<FileText className="h-4 w-4" />
								{isExporting === "pdf" ? "Mengunduh..." : "Export PDF"}
							</Button>
						</div>
					}
				/>

				{/* Legend & Summary Ribbon */}
				<div className="border border-border bg-card p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
					<div className="flex flex-wrap items-center gap-3">
						<span className="font-mono uppercase text-[11px] font-bold text-muted-foreground">
							Keterangan:
						</span>
						<span className="inline-flex items-center gap-1.5 font-mono">
							<span className="h-4 w-5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/40 text-[10px] flex items-center justify-center">
								H
							</span>
							Hadir
						</span>
						<span className="inline-flex items-center gap-1.5 font-mono">
							<span className="h-4 w-5 bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/40 text-[10px] flex items-center justify-center">
								T
							</span>
							Telat
						</span>
						<span className="inline-flex items-center gap-1.5 font-mono">
							<span className="h-4 w-5 bg-red-500/20 text-red-700 dark:text-red-400 font-bold border border-red-500/40 text-[10px] flex items-center justify-center">
								A
							</span>
							Alpa
						</span>
						<span className="inline-flex items-center gap-1.5 font-mono">
							<span className="h-4 w-5 bg-sky-500/20 text-sky-700 dark:text-sky-400 font-bold border border-sky-500/40 text-[10px] flex items-center justify-center">
								C
							</span>
							Cuti
						</span>
						<span className="inline-flex items-center gap-1.5 font-mono">
							<span className="h-4 w-5 bg-purple-500/20 text-purple-700 dark:text-purple-400 font-bold border border-purple-500/40 text-[10px] flex items-center justify-center">
								L
							</span>
							Libur
						</span>
						<span className="inline-flex items-center gap-1.5 font-mono">
							<span className="h-4 w-5 bg-muted text-muted-foreground border border-border text-[10px] flex items-center justify-center">
								OFF
							</span>
							Libur Shift
						</span>
					</div>
					<span className="text-[11px] text-muted-foreground italic">
						* Klik pada kotak tanggal untuk mengedit waktu masuk/pulang
					</span>
				</div>

				{/* Level 2: Toolbar Filters */}
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

				{/* 1-31 Matrix Table with Sticky Left Column */}
				<div className="border border-border bg-card overflow-hidden">
					<div>
						<table className="w-full border-collapse text-left table-fixed">
							<colgroup>
								<col className="w-[190px]" />
								{daysInMonth.map((d) => (
									<col key={d.dateStr} />
								))}
								<col className="w-[38px]" />
								<col className="w-[38px]" />
								<col className="w-[38px]" />
								<col className="w-[38px]" />
								<col className="w-[52px]" />
							</colgroup>
							<thead>
								<tr className="border-b border-border bg-muted/60 text-[11px] font-mono uppercase text-muted-foreground">
									{/* Fixed Sticky Left Header */}
									<th className="sticky left-0 z-20 bg-muted px-3 py-2.5 border-r border-border">
										Pegawai & Shift
									</th>

									{/* 1 - 31 Column Headers */}
									{daysInMonth.map((d) => (
										<th
											key={d.dateStr}
											className="px-0.5 py-2 text-center border-r border-border/50 font-mono"
										>
											<span className="block text-[11px] font-bold">
												{d.dayNum}
											</span>
										</th>
									))}

									{/* Summary Columns */}
									<th className="px-1 py-2 text-center border-r border-border text-emerald-600 font-bold">
										H
									</th>
									<th className="px-1 py-2 text-center border-r border-border text-amber-600 font-bold">
										T
									</th>
									<th className="px-1 py-2 text-center border-r border-border text-red-600 font-bold">
										A
									</th>
									<th className="px-1 py-2 text-center border-r border-border text-sky-600 font-bold">
										C
									</th>
									<th className="px-1 py-2 text-center">Telat(m)</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{isLoading ? (
									[1, 2, 3, 4, 5].map((k) => (
										<tr key={k} className="animate-pulse">
											<td
												colSpan={daysInMonth.length + 6}
												className="h-12 bg-card"
											/>
										</tr>
									))
								) : data.length === 0 ? (
									<tr>
										<td
											colSpan={daysInMonth.length + 6}
											className="py-12 text-center text-xs text-muted-foreground"
										>
											Tidak ada rekaman presensi pada periode ini.
										</td>
									</tr>
								) : (
									data.map((emp) => (
										<tr
											key={emp.id}
											className="hover:bg-muted/20 transition-colors group"
										>
											{/* Sticky Employee Column */}
											<td className="sticky left-0 z-10 bg-card group-hover:bg-muted/40 transition-colors px-3 py-2 border-r border-border">
												<div className="flex flex-col">
													<span className="font-semibold text-xs text-foreground truncate">
														{emp.name}
													</span>
													<div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
														<span>{emp.employeeCode}</span>
														<span>·</span>
														<span className="truncate">
															{emp.shiftName || "Default"}
														</span>
													</div>
												</div>
											</td>

											{/* Days 1 - 31 */}
											{daysInMonth.map((d) => renderDayCell(emp, d.dateStr))}

											{/* Summary Values */}
											<td className="px-1 py-2 text-center font-mono text-xs font-bold text-emerald-600 border-r border-border bg-emerald-500/5">
												{emp.totalPresent}
											</td>
											<td className="px-1 py-2 text-center font-mono text-xs font-bold text-amber-600 border-r border-border bg-amber-500/5">
												{emp.totalLate}
											</td>
											<td className="px-1 py-2 text-center font-mono text-xs font-bold text-red-600 border-r border-border bg-red-500/5">
												{emp.totalAbsent}
											</td>
											<td className="px-1 py-2 text-center font-mono text-xs font-bold text-sky-600 border-r border-border bg-sky-500/5">
												{emp.totalLeave}
											</td>
											<td className="px-1 py-2 text-center font-mono text-xs text-muted-foreground">
												{emp.totalLateMinutesSum}m
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

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
									className="gap-1.5"
								>
									<Edit2 className="h-3.5 w-3.5" />
									{saveDayMutation.isPending ? "Menyimpan..." : "Simpan Waktu"}
								</Button>
							</div>
						}
					>
						<div className="space-y-4 py-2">
							<div className="border border-border/60 bg-muted/20 p-3 space-y-1 text-xs">
								<div className="flex justify-between font-mono">
									<span className="text-muted-foreground">Status Sistem:</span>
									<span className="font-bold text-foreground">
										{editingTarget.day.isHoliday
											? "HARI LIBUR"
											: editingTarget.day.status}
									</span>
								</div>
								{editingTarget.day.lateMinutes > 0 && (
									<div className="flex justify-between font-mono text-amber-600">
										<span>Keterlambatan:</span>
										<span className="font-bold">
											{editingTarget.day.lateMinutes} menit
										</span>
									</div>
								)}
							</div>

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
								* Kosongkan kolom jam lalu simpan jika ingin
								membatalkan/menghapus absensi pada hari tersebut.
							</p>
						</div>
					</Modal>
				)}
			</div>
		</TooltipProvider>
	);
}
