"use client";

import { useQuery } from "@tanstack/react-query";
import {
	Eye,
	FileSpreadsheet,
	FileText,
	Loader2,
	Search,
	TimerOff,
	UserCheck,
	Users,
	UserX,
} from "lucide-react";
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
import { StatCard } from "@/components/ui/stat-card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import api from "@/lib/api";

interface MonthlyReport {
	id: string;
	employeeCode: string;
	name: string;
	department: string;
	totalPresent: number;
	totalLate: number;
	totalAbsent: number;
	totalLeave: number;
}

interface DailyReportDay {
	date: string;
	isWorkDay: boolean;
	isHoliday: boolean;
	status: string;
	clockIn: string | null;
	clockOut: string | null;
	lateMinutes: number;
	earlyOutMinutes: number;
}

interface DailyReportEmployee {
	id: number;
	name: string;
	totalLateMinutesSum: number;
	totalEarlyOutMinutesSum: number;
	totalAbsent: number;
	totalLeave: number;
	days: DailyReportDay[];
}

export default function ReportsPage() {
	const [month, setMonth] = React.useState(new Date().getMonth() + 1);
	const [year, setYear] = React.useState(new Date().getFullYear());
	const [search, setSearch] = React.useState("");
	const [page, setPage] = React.useState(1);
	const [selectedEmployee, setSelectedEmployee] = React.useState<string | null>(
		null,
	);
	const [isExporting, setIsExporting] = React.useState<"excel" | "pdf" | null>(
		null,
	);

	const { data: response, isLoading } = useQuery<{
		data: MonthlyReport[];
		meta: PageMeta;
	}>({
		queryKey: ["reports", month, year, page, search],
		queryFn: async () => {
			const res = await api.get(
				`/reports?month=${month}&year=${year}&page=${page}&limit=10&search=${encodeURIComponent(search)}`,
			);
			return res.data;
		},
	});

	const reportData = response?.data || [];
	const meta = response?.meta;

	const { data: dailyRecapResponse, isLoading: isLoadingDaily } = useQuery<{
		data: DailyReportEmployee[];
	}>({
		queryKey: ["daily-recap-detail", month, year, selectedEmployee],
		queryFn: async () => {
			return (
				await api.get(
					`/reports/daily-recap?month=${month}&year=${year}&employeeId=${selectedEmployee}&page=1&limit=1`,
				)
			).data;
		},
		enabled: Boolean(selectedEmployee),
	});

	const selectedEmployeeDetail = dailyRecapResponse?.data?.find(
		(emp) => emp.id === Number(selectedEmployee),
	);

	const handleExport = async () => {
		setIsExporting("excel");
		try {
			const res = await api.get(`/reports?month=${month}&year=${year}`, {
				responseType: "blob",
			});
			const url = window.URL.createObjectURL(new Blob([res.data]));
			const a = document.createElement("a");
			a.href = url;
			a.download = `Laporan-Absensi-${month}-${year}.xlsx`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			toast.success("Berkas Excel berhasil diunduh");
		} catch {
			toast.error("Gagal mengunduh laporan Excel");
		} finally {
			setIsExporting(null);
		}
	};

	const handleExportPdf = async () => {
		if (!reportData || reportData.length === 0) {
			toast.error("Tidak ada data untuk diekspor");
			return;
		}
		setIsExporting("pdf");
		try {
			const { jsPDF } = await import("jspdf");
			await import("jspdf-autotable");
			const { PDF_COLORS, drawHeader, drawFooter, TABLE_STYLES } = await import(
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
				"LAPORAN PERFORMA PEGAWAI",
				`Periode ${monthName} ${year} — Analitik Kehadiran & Kedisiplinan`,
				pageWidth,
			);

			// @ts-expect-error jspdf-autotable augments jsPDF
			doc.autoTable({
				...TABLE_STYLES.primary,
				head: [
					["Nama", "NIP", "Departemen", "Hadir", "Telat", "Alpa", "Cuti/Izin"],
				],
				body: reportData.map((row) => [
					row.name,
					row.employeeCode,
					row.department || "-",
					String(row.totalPresent),
					String(row.totalLate),
					String(row.totalAbsent),
					String(row.totalLeave),
				]),
				startY: 120,
				styles: { fontSize: 8, cellPadding: 4, lineColor: PDF_COLORS.border },
			});

			drawFooter(doc, pageWidth, pageHeight);
			doc.save(`Laporan-Absensi-${month}-${year}.pdf`);
			toast.success("Berkas PDF berhasil diunduh");
		} catch {
			toast.error("Gagal mengunduh PDF");
		} finally {
			setIsExporting(null);
		}
	};

	const totalPresentSum = reportData.reduce(
		(acc, r) => acc + r.totalPresent,
		0,
	);
	const totalLateSum = reportData.reduce((acc, r) => acc + r.totalLate, 0);
	const totalAbsentSum = reportData.reduce((acc, r) => acc + r.totalAbsent, 0);

	return (
		<div className="page-shell space-y-6">
			{/* Level 1: Page Header */}
			<PageHeader
				title="Laporan & Rekapitulasi Ekspor"
				description="Konsolidasi laporan kedisiplinan pegawai, absensi periodik, dan berkas cetak resmi."
				action={
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={handleExport}
							disabled={Boolean(isExporting)}
							className="gap-1.5"
						>
							<FileSpreadsheet className="h-4 w-4" />
							{isExporting === "excel" ? "Mengunduh..." : "Export Excel"}
						</Button>
						<Button
							variant="primary"
							size="sm"
							onClick={handleExportPdf}
							disabled={Boolean(isExporting)}
							className="gap-1.5"
						>
							<FileText className="h-4 w-4" />
							{isExporting === "pdf" ? "Mengunduh..." : "Cetak PDF"}
						</Button>
					</div>
				}
			/>

			{/* KPI Stat Cards */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
				<StatCard
					title="Pegawai Terdata"
					value={meta?.total ?? reportData.length}
					icon={<Users className="h-4 w-4" />}
					description="Pada periode terpilih"
				/>
				<StatCard
					title="Total Presensi"
					value={totalPresentSum}
					icon={<UserCheck className="h-4 w-4 text-emerald-600" />}
					description="Akumulasi kehadiran hadir"
				/>
				<StatCard
					title="Total Terlambat"
					value={totalLateSum}
					icon={<TimerOff className="h-4 w-4 text-amber-600" />}
					description="Akumulasi kejadian telat"
				/>
				<StatCard
					title="Total Alpa"
					value={totalAbsentSum}
					icon={<UserX className="h-4 w-4 text-red-600" />}
					description="Tanpa keterangan sah"
				/>
			</div>

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
						placeholder="Cari nama atau NIP..."
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
							<TableHead>NIP</TableHead>
							<TableHead>Nama Pegawai</TableHead>
							<TableHead>Departemen</TableHead>
							<TableHead className="text-center">Hadir</TableHead>
							<TableHead className="text-center">Terlambat</TableHead>
							<TableHead className="text-center">Alpa</TableHead>
							<TableHead className="text-center">Cuti/Izin</TableHead>
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
						) : reportData.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={8}
									className="py-10 text-center text-xs text-muted-foreground"
								>
									Tidak ada rekaman data pada periode ini.
								</TableCell>
							</TableRow>
						) : (
							reportData.map((row) => (
								<TableRow key={row.id}>
									<TableCell className="font-mono text-xs text-muted-foreground">
										{row.employeeCode}
									</TableCell>
									<TableCell className="font-bold text-foreground">
										{row.name}
									</TableCell>
									<TableCell className="text-xs text-muted-foreground">
										{row.department || "—"}
									</TableCell>
									<TableCell className="text-center font-mono text-xs font-bold text-emerald-600">
										{row.totalPresent}
									</TableCell>
									<TableCell className="text-center font-mono text-xs font-bold text-amber-600">
										{row.totalLate}
									</TableCell>
									<TableCell className="text-center font-mono text-xs font-bold text-red-600">
										{row.totalAbsent}
									</TableCell>
									<TableCell className="text-center font-mono text-xs font-bold text-sky-600">
										{row.totalLeave}
									</TableCell>
									<TableCell className="text-right">
										<Button
											variant="outline"
											size="sm"
											className="text-xs gap-1"
											onClick={() => setSelectedEmployee(row.id)}
										>
											<Eye className="h-3.5 w-3.5" />
											Detail
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

			{/* Detail Inspector Modal */}
			{selectedEmployee && (
				<Modal
					open={Boolean(selectedEmployee)}
					onOpenChange={() => setSelectedEmployee(null)}
					title="Rekapitulasi Kehadiran Individu"
					description="Rincian status harian pegawai pada bulan terpilih."
					maxWidth="4xl"
				>
					{isLoadingDaily ? (
						<div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
							<Loader2 className="h-4 w-4 animate-spin" /> Memuat data...
						</div>
					) : selectedEmployeeDetail ? (
						<div className="space-y-4">
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border border-border p-3 bg-muted/20">
								<div>
									<span className="text-[10px] uppercase font-mono text-muted-foreground">
										Total Menit Telat
									</span>
									<p className="text-sm font-bold font-mono text-foreground">
										{selectedEmployeeDetail.totalLateMinutesSum}m
									</p>
								</div>
								<div>
									<span className="text-[10px] uppercase font-mono text-muted-foreground">
										Total Pulang Cepat
									</span>
									<p className="text-sm font-bold font-mono text-foreground">
										{selectedEmployeeDetail.totalEarlyOutMinutesSum}m
									</p>
								</div>
								<div>
									<span className="text-[10px] uppercase font-mono text-muted-foreground">
										Total Alpa
									</span>
									<p className="text-sm font-bold font-mono text-red-600">
										{selectedEmployeeDetail.totalAbsent} hari
									</p>
								</div>
								<div>
									<span className="text-[10px] uppercase font-mono text-muted-foreground">
										Total Cuti
									</span>
									<p className="text-sm font-bold font-mono text-sky-600">
										{selectedEmployeeDetail.totalLeave} hari
									</p>
								</div>
							</div>

							<div className="border border-border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Tanggal</TableHead>
											<TableHead>Jam Masuk</TableHead>
											<TableHead>Jam Pulang</TableHead>
											<TableHead>Telat (m)</TableHead>
											<TableHead>Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{selectedEmployeeDetail.days.map((day) => (
											<TableRow key={day.date}>
												<TableCell className="font-mono text-xs">
													{day.date}
												</TableCell>
												<TableCell className="font-mono text-xs">
													{day.clockIn || "—"}
												</TableCell>
												<TableCell className="font-mono text-xs">
													{day.clockOut || "—"}
												</TableCell>
												<TableCell className="font-mono text-xs text-muted-foreground">
													{day.lateMinutes > 0 ? `${day.lateMinutes}m` : "—"}
												</TableCell>
												<TableCell>
													<Badge
														variant={
															day.status === "PRESENT"
																? "success"
																: day.status === "LATE"
																	? "warning"
																	: "default"
														}
														className="text-[10px]"
													>
														{day.status}
													</Badge>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</div>
					) : (
						<div className="py-8 text-center text-xs text-muted-foreground">
							Detail harian tidak ditemukan.
						</div>
					)}
				</Modal>
			)}
		</div>
	);
}
