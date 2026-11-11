"use client";

import { useQuery } from "@tanstack/react-query";
import {
	Building2,
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
	const today = new Date();
	const [month, setMonth] = React.useState(today.getMonth() + 1);
	const [year, setYear] = React.useState(today.getFullYear());
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
				`/reports/summary?month=${month}&year=${year}&page=${page}&limit=10&search=${encodeURIComponent(search)}`,
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
				"LAPORAN PERFORMA PEGAWAI",
				`Periode ${monthName} ${year} — Analitik Kehadiran & Kedisiplinan`,
				pageWidth,
			);

			const tableData = reportData.map((row, index) => [
				index + 1,
				row.name,
				row.employeeCode,
				row.department || "-",
				row.totalPresent,
				row.totalLate,
				row.totalAbsent,
				row.totalLeave,
			]);

			(doc as any).autoTable({
				...TABLE_STYLES.primary,
				startY: 110,
				head: [
					[
						"No",
						"Nama Pegawai",
						"NIP",
						"Departemen",
						"Hadir",
						"Telat",
						"Alpa",
						"Cuti",
					],
				],
				body: tableData,
				columnStyles: {
					0: { cellWidth: 30, halign: "center" },
					1: { cellWidth: 140 },
					2: { cellWidth: 70 },
					3: { cellWidth: 90 },
					4: { cellWidth: 45, halign: "center" },
					5: { cellWidth: 45, halign: "center" },
					6: { cellWidth: 45, halign: "center" },
					7: { cellWidth: 45, halign: "center" },
				},
				didDrawPage: () => {
					drawFooter(doc, pageWidth, pageHeight);
				},
			});

			doc.save(`Laporan-Performa-${month}-${year}.pdf`);
			toast.success("Berkas PDF berhasil diunduh");
		} catch {
			toast.error("Gagal mencetak dokumen PDF");
		} finally {
			setIsExporting(null);
		}
	};

	const totalPresentSum = React.useMemo(
		() => reportData.reduce((acc, r) => acc + (r.totalPresent || 0), 0),
		[reportData],
	);
	const totalLateSum = React.useMemo(
		() => reportData.reduce((acc, r) => acc + (r.totalLate || 0), 0),
		[reportData],
	);
	const totalAbsentSum = React.useMemo(
		() => reportData.reduce((acc, r) => acc + (r.totalAbsent || 0), 0),
		[reportData],
	);

	return (
		<div className="page-shell space-y-6">
			{/* Level 1: Page Header */}
			<PageHeader
				title="Laporan Presensi Bulanan"
				description="Akumulasi kehadiran bulanan seluruh pegawai, rekap ketepatan waktu, dan ekspor formal."
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

			{/* KPI Stat Cards */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
				<StatCard
					title="Pegawai Terdata"
					value={meta?.total ?? reportData.length}
					icon={<Users className="h-4 w-4" />}
					description="Pada periode terpilih"
				/>
				<StatCard
					title="Total Hadir"
					value={totalPresentSum}
					icon={<UserCheck className="h-4 w-4 text-emerald-600" />}
					description="Akumulasi kehadiran masuk"
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
					description="Hari tanpa keterangan"
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
						placeholder="Cari pegawai atau NIP..."
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
						className="pl-8 text-xs h-8"
					/>
				</div>
			</div>

			{/* Main Summary Table */}
			<div className="border border-border bg-card">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-32">NIP</TableHead>
							<TableHead>Nama Pegawai</TableHead>
							<TableHead>Departemen</TableHead>
							<TableHead className="text-center">Hadir</TableHead>
							<TableHead className="text-center">Terlambat</TableHead>
							<TableHead className="text-center">Alpa</TableHead>
							<TableHead className="text-center">Cuti / Izin</TableHead>
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
						) : reportData.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={8}
									className="py-12 text-center text-xs text-muted-foreground"
								>
									Tidak ada rekaman data pada periode ini.
								</TableCell>
							</TableRow>
						) : (
							reportData.map((row) => (
								<TableRow
									key={row.id}
									className="hover:bg-muted/30 transition-colors"
								>
									<TableCell className="font-mono text-xs text-muted-foreground">
										{row.employeeCode}
									</TableCell>
									<TableCell className="font-semibold text-foreground">
										{row.name}
									</TableCell>
									<TableCell className="text-xs text-muted-foreground">
										<div className="inline-flex items-center gap-1.5">
											<Building2 className="h-3 w-3 opacity-60" />
											<span>{row.department || "Umum"}</span>
										</div>
									</TableCell>
									<TableCell className="text-center font-mono text-xs font-bold text-emerald-600 bg-emerald-500/5">
										{row.totalPresent}
									</TableCell>
									<TableCell className="text-center font-mono text-xs font-bold text-amber-600 bg-amber-500/5">
										{row.totalLate}
									</TableCell>
									<TableCell className="text-center font-mono text-xs font-bold text-red-600 bg-red-500/5">
										{row.totalAbsent}
									</TableCell>
									<TableCell className="text-center font-mono text-xs font-bold text-sky-600 bg-sky-500/5">
										{row.totalLeave}
									</TableCell>
									<TableCell className="text-right">
										<Button
											variant="outline"
											size="sm"
											className="text-xs gap-1 h-7 px-2.5"
											onClick={() => setSelectedEmployee(row.id)}
										>
											<Eye className="h-3.5 w-3.5" />
											Rincian
										</Button>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>

				{meta && (
					<PaginationControls
						meta={meta}
						onPageChange={setPage}
						disabled={isLoading}
					/>
				)}
			</div>

			{/* Modal Detail Individu */}
			{selectedEmployee && (
				<Modal
					open={Boolean(selectedEmployee)}
					onOpenChange={() => setSelectedEmployee(null)}
					title="Rincian Kehadiran Pegawai"
					description="Rincian hari kerja, jam log, dan kalkulasi keterlambatan per tanggal."
					maxWidth="4xl"
				>
					{isLoadingDaily ? (
						<div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
							<Loader2 className="h-4 w-4 animate-spin" /> Memuat rincian
							data...
						</div>
					) : selectedEmployeeDetail ? (
						<div className="space-y-4">
							{/* Mini KPI */}
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border border-border p-3 bg-muted/20">
								<div>
									<span className="text-[10px] uppercase font-mono text-muted-foreground">
										Total Keterlambatan
									</span>
									<p className="text-base font-bold font-mono text-amber-600">
										{selectedEmployeeDetail.totalLateMinutesSum} Menit
									</p>
								</div>
								<div>
									<span className="text-[10px] uppercase font-mono text-muted-foreground">
										Pulang Cepat
									</span>
									<p className="text-base font-bold font-mono text-amber-600">
										{selectedEmployeeDetail.totalEarlyOutMinutesSum} Menit
									</p>
								</div>
								<div>
									<span className="text-[10px] uppercase font-mono text-muted-foreground">
										Total Alpa
									</span>
									<p className="text-base font-bold font-mono text-red-600">
										{selectedEmployeeDetail.totalAbsent} Hari
									</p>
								</div>
								<div>
									<span className="text-[10px] uppercase font-mono text-muted-foreground">
										Total Cuti / Izin
									</span>
									<p className="text-base font-bold font-mono text-sky-600">
										{selectedEmployeeDetail.totalLeave} Hari
									</p>
								</div>
							</div>

							{/* Tabel Harian Individu */}
							<div className="border border-border max-h-[50vh] overflow-y-auto">
								<Table>
									<TableHeader className="sticky top-0 bg-muted z-10">
										<TableRow>
											<TableHead>Tanggal</TableHead>
											<TableHead className="text-center">Jam Masuk</TableHead>
											<TableHead className="text-center">Jam Pulang</TableHead>
											<TableHead className="text-center">Telat</TableHead>
											<TableHead className="text-center">Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{selectedEmployeeDetail.days.map((d) => (
											<TableRow key={d.date} className="hover:bg-muted/20">
												<TableCell className="font-mono text-xs">
													{d.date}
												</TableCell>
												<TableCell className="text-center font-mono text-xs font-semibold">
													{d.clockIn || "—"}
												</TableCell>
												<TableCell className="text-center font-mono text-xs font-semibold">
													{d.clockOut || "—"}
												</TableCell>
												<TableCell className="text-center font-mono text-xs">
													{d.lateMinutes > 0 ? (
														<span className="text-amber-600 font-bold">
															{d.lateMinutes}m
														</span>
													) : (
														"—"
													)}
												</TableCell>
												<TableCell className="text-center">
													{d.isHoliday ? (
														<span className="border border-purple-200 bg-purple-50 text-purple-700 font-mono text-[10px] px-1.5 py-0.5">
															LIBUR
														</span>
													) : !d.isWorkDay ? (
														<span className="border border-border bg-muted text-muted-foreground font-mono text-[10px] px-1.5 py-0.5">
															OFF
														</span>
													) : d.status === "PRESENT" ? (
														<Badge variant="success" className="text-[10px]">
															HADIR
														</Badge>
													) : d.status === "LATE" ? (
														<Badge variant="warning" className="text-[10px]">
															TELAT
														</Badge>
													) : d.status === "ABSENT" ? (
														<Badge
															variant="destructive"
															className="text-[10px]"
														>
															ALPA
														</Badge>
													) : (
														<Badge variant="info" className="text-[10px]">
															{d.status}
														</Badge>
													)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</div>
					) : (
						<p className="text-xs text-muted-foreground text-center py-6">
							Data tidak ditemukan.
						</p>
					)}
				</Modal>
			)}
		</div>
	);
}
