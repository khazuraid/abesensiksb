"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
	ChevronRight,
	FileSpreadsheet,
	FileText,
	Search,
	Users,
	X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import PaginationControls, {
	type PageMeta,
} from "@/components/pagination-controls";
import api from "@/lib/api";
import { useModalAccessibility } from "@/lib/use-modal-accessibility";

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
	const [month, setMonth] = useState(new Date().getMonth() + 1);
	const [year, setYear] = useState(new Date().getFullYear());
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [selectedEmployee, setSelectedEmployee] =
		useState<EmployeeRecap | null>(null);
	const [editingDay, setEditingDay] = useState<{
		date: string;
		field: "in" | "out";
		value: string;
	} | null>(null);
	const editDialogRef = useRef<HTMLDivElement>(null);
	const closeEdit = useCallback(() => setEditingDay(null), []);
	useModalAccessibility(editDialogRef, closeEdit, Boolean(editingDay));
	const queryClient = useQueryClient();

	const {
		data: response,
		isLoading,
		isFetching,
	} = useQuery<{ data: EmployeeRecap[]; meta: PageMeta }>({
		queryKey: ["daily-recap", month, year, page, search],
		queryFn: async () =>
			(
				await api.get(
					`/reports/daily-recap?month=${month}&year=${year}&page=${page}&limit=10&search=${encodeURIComponent(search)}`,
				)
			).data,
	});
	const data = response?.data;

	const { data: availablePeriods } = useQuery<
		{ month: number; year: number }[]
	>({
		queryKey: ["available-periods"],
		queryFn: async () => {
			return (await api.get(`/reports/available-periods`)).data;
		},
	});

	const months = [
		"Januari",
		"Februari",
		"Maret",
		"April",
		"Mei",
		"Juni",
		"Juli",
		"Agustus",
		"September",
		"Oktober",
		"November",
		"Desember",
	];

	const updateMutation = useMutation({
		mutationFn: async ({
			id,
			timestamp,
		}: {
			id: number;
			timestamp: string;
		}) => {
			const reason = window.prompt(
				"Alasan koreksi absensi (minimal 5 karakter)",
			);
			if (!reason || reason.trim().length < 5)
				throw new Error("Alasan koreksi wajib diisi");
			await api.post("/attendance-corrections", {
				attendanceLogId: id,
				timestamp,
				reason,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["daily-recap", month, year] });
			setEditingDay(null);
		},
	});

	const createMutation = useMutation({
		mutationFn: async ({
			employeeId,
			timestamp,
			type,
		}: {
			employeeId: number;
			timestamp: string;
			type: "IN" | "OUT";
		}) => {
			await api.post("/attendance-logs", { employeeId, timestamp, type });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["daily-recap", month, year] });
			setEditingDay(null);
		},
	});

	const handleSaveEdit = (day: DayData) => {
		if (!editingDay || !selectedEmployee) return;
		const logId = editingDay.field === "in" ? day.inLogId : day.outLogId;
		const timestamp = `${day.date}T${editingDay.value}:00`;
		if (logId) {
			updateMutation.mutate({ id: logId, timestamp });
		} else {
			createMutation.mutate({
				employeeId: selectedEmployee.id,
				timestamp,
				type: editingDay.field === "in" ? "IN" : "OUT",
			});
		}
	};

	const filtered = data;

	const statusColor = (s: string, isHoliday?: boolean, isWorkDay?: boolean) => {
		if (isHoliday) return "bg-purple-100 text-purple-700";
		if (!isWorkDay) return "bg-gray-100 text-gray-500";
		switch (s) {
			case "PRESENT":
				return "bg-[#6cf8bb]/50 text-[#00714d]";
			case "LATE":
				return "bg-[#ffeebb] text-[#894e00]";
			case "EARLY_OUT":
				return "bg-orange-100 text-orange-700";
			case "ABSENT":
				return "bg-[#ffdad6] text-[#ba1a1a]";
			case "LEAVE":
				return "bg-cyan-100 text-cyan-700";
			case "IN_PROGRESS":
				return "bg-blue-100 text-blue-700";
			default:
				return "bg-transparent text-gray-400";
		}
	};

	const statusLabel = (s: string, isHoliday?: boolean, isWorkDay?: boolean) => {
		if (isHoliday) return "L";
		if (!isWorkDay) return "O";
		switch (s) {
			case "PRESENT":
				return "H";
			case "LATE":
				return "T";
			case "EARLY_OUT":
				return "PC";
			case "ABSENT":
				return "A";
			case "LEAVE":
				return "C";
			case "IN_PROGRESS":
				return "…";
			default:
				return "-";
		}
	};

	const handleExport = async () => {
		try {
			const res = await api.get(
				`/reports/daily-recap/export?month=${month}&year=${year}`,
				{ responseType: "blob" },
			);
			const url = window.URL.createObjectURL(new Blob([res.data]));
			const a = document.createElement("a");
			a.href = url;
			a.download = `Rekap-Harian-${months[month - 1]}-${year}.xlsx`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			window.URL.revokeObjectURL(url);
		} catch (e: unknown) {
			const err = e as { response?: { status?: number }; message?: string };
			alert(`Gagal export: ${err?.response?.status || err?.message}`);
		}
	};
	const handleExportPdf = async () => {
		if (!data || data.length === 0) return;

		// Dynamically import jsPDF and autoTable to avoid Next.js SSR Turbopack errors
		const { jsPDF } = await import("jspdf");
		await import("jspdf-autotable");
		const {
			PDF_COLORS,
			drawHeader,
			drawStatCards,
			drawSectionTitle,
			drawFormulaNote,
			drawFooter,
			TABLE_STYLES,
			computePenalty,
		} = await import("@/lib/pdf-design");

		const doc = new jsPDF("l", "pt", "a4");
		const pageWidth = doc.internal.pageSize.getWidth();
		const pageHeight = doc.internal.pageSize.getHeight();

		// --- Header ---
		drawHeader(
			doc,
			`REKAP HARIAN PEGAWAI`,
			`Periode ${months[month - 1]} ${year} — Matriks Kehadiran Harian`,
			pageWidth,
		);

		// --- Stat cards ---
		drawStatCards(
			doc,
			[
				{
					label: "Pegawai Tampil",
					value: `${data.length}`,
					color: PDF_COLORS.primary,
				},
				{
					label: "Total Hadir",
					value: `${pageSummary.present}`,
					color: PDF_COLORS.green,
				},
				{
					label: "Total Telat",
					value: `${pageSummary.late}`,
					color: PDF_COLORS.amber,
				},
				{
					label: "Total Alpa",
					value: `${pageSummary.absent}`,
					color: PDF_COLORS.red,
				},
			],
			72,
			pageWidth,
		);

		// --- Section: Matriks Kehadiran ---
		drawSectionTitle(doc, "Matriks Kehadiran Harian", 152);

		const daysInMonth = new Date(year, month, 0).getDate();
		const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

		const head = [
			[
				"No",
				"Nama",
				"Kode",
				...daysArray.map((d) => d.toString()),
				"H",
				"T",
				"C",
				"A",
			],
		];

		const body = data.map((emp, idx) => [
			(idx + 1).toString(),
			emp.name,
			emp.employeeCode,
			...daysArray.map((day) => {
				const cellData = emp.days.find(
					(d) => new Date(d.date).getDate() === day,
				);
				return cellData
					? statusLabel(cellData.status, cellData.isHoliday, cellData.isWorkDay)
					: "-";
			}),
			emp.totalPresent.toString(),
			emp.totalLate.toString(),
			emp.totalLeave.toString(),
			emp.totalAbsent.toString(),
		]);

		// @ts-expect-error jspdf-autotable augments jsPDF at runtime
		doc.autoTable({
			...TABLE_STYLES.primary,
			head,
			body,
			startY: 160,
			styles: {
				fontSize: 7,
				cellPadding: 2,
				halign: "center",
				lineColor: PDF_COLORS.border,
			},
			headStyles: {
				...TABLE_STYLES.primary.headStyles,
				fontSize: 7,
				halign: "center",
			},
			columnStyles: {
				0: { halign: "left", cellWidth: 20, fontStyle: "bold" },
				1: { halign: "left", cellWidth: 70, fontStyle: "bold" },
				2: { halign: "left", cellWidth: 40 },
				...Object.fromEntries([
					...daysArray.map((_, i) => [i + 3, { cellWidth: 16 }]),
				] as [number, object][]),
				[daysArray.length + 3]: {
					halign: "center",
					cellWidth: 25,
					fontStyle: "bold",
					fillColor: PDF_COLORS.lightBg,
				},
				[daysArray.length + 4]: {
					halign: "center",
					cellWidth: 25,
					fontStyle: "bold",
				},
				[daysArray.length + 5]: {
					halign: "center",
					cellWidth: 25,
					fontStyle: "bold",
				},
				[daysArray.length + 6]: {
					halign: "center",
					cellWidth: 25,
					fontStyle: "bold",
				},
			},
		});

		// --- Legend ---
		// @ts-expect-error lastAutoTable injected by autotable
		let afterY = doc.lastAutoTable?.finalY ?? 160;
		afterY += 24;

		if (afterY > pageHeight - 200) {
			doc.addPage();
			afterY = 72;
		}

		doc.setFontSize(8);
		doc.setFont("helvetica", "bold");
		doc.setTextColor(...PDF_COLORS.gray);
		doc.text("Keterangan:", 40, afterY);
		doc.setFont("helvetica", "normal");
		doc.text(
			"H = Hadir   T = Telat   PC = Pulang Cepat   A = Alpa   C = Cuti/Izin   L = Libur   O = Off   … = Sedang Berjalan",
			95,
			afterY,
		);
		doc.setTextColor(...PDF_COLORS.dark);

		// --- Section: Rincian Perhitungan Potongan ---
		afterY += 22;
		if (afterY > pageHeight - 220) {
			doc.addPage();
			afterY = 72;
		}

		drawSectionTitle(doc, "Rincian Perhitungan Potongan (Hari)", afterY);

		drawFormulaNote(
			doc,
			[
				"Akumulasi Jam = (Total Telat + Total Pulang Cepat) ÷ 420 menit — dibulatkan ke bawah",
				"Lupa Absen = Jumlah absen tidak lengkap ÷ 2 — dibulatkan ke bawah",
				"Alpa = Total hari tidak hadir tanpa keterangan",
				"Cuti/Izin = Total hari cuti/izin yang disetujui",
			],
			afterY + 14,
		);

		// Penalty summary section
		const penaltyRows = data.map((emp) => {
			const p = computePenalty(emp);
			return [
				emp.name,
				`${p.totalLateMins} + ${p.totalEarlyMins} = ${p.totalMins} mnt`,
				`${p.totalMins} ÷ 420 = ${p.penaltyMins}`,
				`${p.missed} ÷ 2 = ${p.penaltyPunch}`,
				`${p.totalAbsent}`,
				`${p.totalLeave}`,
				`${p.total}`,
			];
		});

		const grandTotalMins = data.reduce(
			(s, e) =>
				s + (e.totalLateMinutesSum || 0) + (e.totalEarlyOutMinutesSum || 0),
			0,
		);
		const grandTotalPunch = data.reduce(
			(s, e) => s + computePenalty(e).penaltyPunch,
			0,
		);
		const grandTotalAbsent = data.reduce((s, e) => s + e.totalAbsent, 0);
		const grandTotalLeave = data.reduce((s, e) => s + e.totalLeave, 0);
		const grandTotalPenalty = data.reduce(
			(s, e) => s + computePenalty(e).total,
			0,
		);

		// @ts-expect-error jspdf-autotable augments jsPDF at runtime
		doc.autoTable({
			...TABLE_STYLES.primary,
			head: [
				[
					"Nama",
					"Menit Terlambat\n+ Pulang Cepat",
					"Akumulasi\n(÷ 420)",
					"Lupa Absen\n(÷ 2)",
					"Alpa",
					"Cuti/Izin",
					"Total\nPotongan",
				],
			],
			body: penaltyRows,
			startY: afterY + 68,
			styles: {
				fontSize: 7,
				cellPadding: 3,
				lineColor: PDF_COLORS.border,
				valign: "middle",
			},
			headStyles: {
				...TABLE_STYLES.primary.headStyles,
				fontSize: 7,
			},
			columnStyles: {
				0: { cellWidth: 120, fontStyle: "bold" },
				1: { halign: "center", cellWidth: 100 },
				2: { halign: "center", cellWidth: 80 },
				3: { halign: "center", cellWidth: 70 },
				4: { halign: "center", cellWidth: 50 },
				5: { halign: "center", cellWidth: 55 },
				6: {
					halign: "center",
					cellWidth: 60,
					fontStyle: "bold",
					fillColor: PDF_COLORS.lightBg,
				},
			},
			didParseCell: (data: {
				section: string;
				column: number;
				cell: { styles: { textColor: number[]; fontStyle: string } };
			}) => {
				if (data.section === "body" && data.column === 6) {
					data.cell.styles.textColor = [...PDF_COLORS.red];
					data.cell.styles.fontStyle = "bold";
				}
			},
		});

		// --- Grand total row ---
		// @ts-expect-error lastAutoTable injected by autotable
		afterY = doc.lastAutoTable?.finalY ?? afterY + 68;
		// @ts-expect-error jspdf-autotable augments jsPDF at runtime
		doc.autoTable({
			...TABLE_STYLES.primary,
			head: [],
			body: [
				[
					"TOTAL KESELURUHAN",
					"",
					`${grandTotalMins} mnt`,
					`${grandTotalPunch}`,
					`${grandTotalAbsent}`,
					`${grandTotalLeave}`,
					`${grandTotalPenalty}`,
				],
			],
			startY: afterY + 2,
			styles: {
				fontSize: 8,
				cellPadding: 4,
				fillColor: PDF_COLORS.primary,
				textColor: PDF_COLORS.white,
				fontStyle: "bold",
				lineColor: PDF_COLORS.primary,
			},
			columnStyles: {
				0: { cellWidth: 120 },
				1: { cellWidth: 100 },
				2: { halign: "center", cellWidth: 80 },
				3: { halign: "center", cellWidth: 70 },
				4: { halign: "center", cellWidth: 50 },
				5: { halign: "center", cellWidth: 55 },
				6: { halign: "center", cellWidth: 60 },
			},
			theme: "grid",
		});

		drawFooter(doc, pageWidth, pageHeight);
		doc.save(`Rekap-Harian-${months[month - 1]}-${year}.pdf`);
	};
	const daysInMonth = new Date(year, month, 0).getDate();
	const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
	const pageSummary = (data ?? []).reduce(
		(summary, employee) => ({
			present: summary.present + employee.totalPresent,
			late: summary.late + employee.totalLate,
			absent: summary.absent + employee.totalAbsent,
		}),
		{ present: 0, late: 0, absent: 0 },
	);

	return (
		<motion.div
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.35 }}
			className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-full flex-col gap-5 md:gap-6"
		>
			<header className="flex shrink-0 flex-col gap-5 border-b border-[#d5ded9] pb-5 md:flex-row md:items-end md:justify-between md:pb-6">
				<div className="max-w-2xl">
					<div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#087066]">
						<span className="h-px w-6 bg-[#087066]" />
						Matriks kehadiran
					</div>
					<h1 className="text-[28px] leading-tight md:text-[34px]">
						Rekap harian pegawai
					</h1>
					<p className="mt-2 max-w-xl text-sm leading-6">
						Tinjau pola kehadiran per tanggal, temukan pengecualian, lalu
						koreksi catatan langsung dari kalender.
					</p>
				</div>
				<div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] md:w-auto">
					<div className="relative min-w-0 md:min-w-48">
						<select
							aria-label="Periode rekap"
							className="w-full appearance-none bg-white py-2 pl-3 pr-10 text-[13px] font-semibold"
							value={`${month}-${year}`}
							onChange={(e) => {
								const [m, y] = e.target.value.split("-");
								setMonth(Number(m));
								setYear(Number(y));
								setPage(1);
							}}
						>
							{availablePeriods?.map((period) => (
								<option
									key={`${period.month}-${period.year}`}
									value={`${period.month}-${period.year}`}
								>
									{months[period.month - 1]} {period.year}
								</option>
							))}
							{!availablePeriods && (
								<option value={`${month}-${year}`}>
									{months[month - 1]} {year}
								</option>
							)}
						</select>
						<ChevronRight
							size={16}
							className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[#53635d]"
						/>
					</div>
					<button
						type="button"
						onClick={handleExport}
						className="adms-button-outline"
					>
						<FileSpreadsheet size={16} /> Excel
					</button>
					<button
						type="button"
						onClick={handleExportPdf}
						className="adms-button"
					>
						<FileText size={16} /> PDF
					</button>
				</div>
			</header>

			<section
				aria-label="Ringkasan rekap"
				className="grid overflow-hidden border border-[#d5ded9] bg-white sm:grid-cols-4"
			>
				<div className="flex items-center gap-3 p-4 sm:border-r sm:border-[#d5ded9]">
					<Users size={18} className="text-[#087066]" />
					<div>
						<p className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em]">
							Pegawai tampil
						</p>
						<strong className="block text-xl tabular-nums text-[#14211d]">
							{data?.length ?? 0}
						</strong>
					</div>
				</div>
				<div className="flex items-center justify-between border-t border-[#d5ded9] p-4 sm:border-r sm:border-t-0">
					<span className="text-xs font-semibold text-[#53635d]">Hadir</span>
					<strong className="font-mono text-xl text-[#23734b]">
						{pageSummary.present}
					</strong>
				</div>
				<div className="flex items-center justify-between border-t border-[#d5ded9] p-4 sm:border-r sm:border-t-0">
					<span className="text-xs font-semibold text-[#53635d]">
						Terlambat
					</span>
					<strong className="font-mono text-xl text-[#946617]">
						{pageSummary.late}
					</strong>
				</div>
				<div className="flex items-center justify-between border-t border-[#d5ded9] p-4 sm:border-t-0">
					<span className="text-xs font-semibold text-[#53635d]">
						Tidak hadir
					</span>
					<strong className="font-mono text-xl text-[#a9433d]">
						{pageSummary.absent}
					</strong>
				</div>
			</section>

			<section className="flex flex-1 flex-col overflow-hidden border border-[#d5ded9] bg-white">
				<header className="flex flex-col gap-4 border-b border-[#d5ded9] bg-[#eaf0ed] p-4 lg:flex-row lg:items-center lg:justify-between">
					<div className="relative w-full lg:w-80">
						<Search
							size={16}
							className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#53635d]"
						/>
						<input
							className="w-full py-2 pl-9 pr-3 text-sm"
							placeholder="Cari nama atau kode pegawai..."
							type="search"
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setPage(1);
							}}
						/>
					</div>
					<div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-[#53635d]">
						<span className="flex items-center gap-1.5">
							<i className="h-2 w-2 bg-[#23734b]" />
							Hadir
						</span>
						<span className="flex items-center gap-1.5">
							<i className="h-2 w-2 bg-[#946617]" />
							Telat
						</span>
						<span className="flex items-center gap-1.5">
							<i className="h-2 w-2 bg-[#b5662f]" />
							Pulang cepat
						</span>
						<span className="flex items-center gap-1.5">
							<i className="h-2 w-2 bg-[#a9433d]" />
							Alpa
						</span>
						<span className="flex items-center gap-1.5">
							<i className="h-2 w-2 bg-[#087066]" />
							Cuti / izin
						</span>
					</div>
				</header>

				<div className="mobile-scroll-hint">
					Geser matriks untuk melihat seluruh tanggal dan ringkasan
				</div>
				<div className="overflow-x-auto flex-1 relative custom-scrollbar">
					<table
						className="w-full text-left border-collapse"
						style={{ minWidth: `${daysInMonth * 32 + 300}px` }}
					>
						<thead className="sticky top-0 bg-[#f9f9ff] z-20 shadow-sm border-b border-black/5">
							<tr>
								<th className="p-4 font-sans text-[12px] text-[#6e797e] uppercase tracking-wider font-semibold sticky left-0 bg-[#f9f9ff] z-30 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] w-[250px] min-w-[250px]">
									Pegawai
								</th>
								{daysArray.map((day) => (
									<th
										key={day}
										className="p-2 text-center font-sans text-[12px] text-[#6e797e] w-8 min-w-[32px]"
									>
										{day}
									</th>
								))}
								<th className="p-2 text-center font-sans text-[12px] text-[#006c49] font-bold w-10 min-w-[40px] sticky right-[160px] bg-[#f9f9ff]/90 backdrop-blur shadow-[-1px_0_0_0_rgba(0,0,0,0.05)] z-30">
									H
								</th>
								<th className="p-2 text-center font-sans text-[12px] text-[#894e00] font-bold w-10 min-w-[40px] sticky right-[120px] bg-[#f9f9ff]/90 backdrop-blur z-30">
									T
								</th>
								<th className="p-2 text-center font-sans text-[12px] text-orange-700 font-bold w-10 min-w-[40px] sticky right-[80px] bg-[#f9f9ff]/90 backdrop-blur z-30">
									PC
								</th>
								<th className="p-2 text-center font-sans text-[12px] text-[#00647c] font-bold w-10 min-w-[40px] sticky right-[40px] bg-[#f9f9ff]/90 backdrop-blur z-30">
									C
								</th>
								<th className="p-2 text-center font-sans text-[12px] text-[#ba1a1a] font-bold w-10 min-w-[40px] sticky right-0 bg-[#f9f9ff]/90 backdrop-blur z-30">
									A
								</th>
							</tr>
						</thead>
						<tbody className="font-sans text-[13px] text-[#111c2d] divide-y divide-black/5">
							{isLoading ? (
								<tr>
									<td
										colSpan={daysInMonth + 6}
										className="p-12 text-center text-[#6e797e]"
									>
										Memuat data rekap...
									</td>
								</tr>
							) : filtered?.length === 0 ? (
								<tr>
									<td
										colSpan={daysInMonth + 6}
										className="p-12 text-center text-[#6e797e]"
									>
										Tidak ada data untuk periode ini.
									</td>
								</tr>
							) : (
								filtered?.map((emp) => (
									<tr
										key={emp.id}
										className="hover:bg-[#dee8ff]/20 transition-colors group"
									>
										<td className="p-4 sticky left-0 bg-white group-hover:bg-[#f0f3ff] z-10 border-r border-black/5 w-[250px] min-w-[250px]">
											<div className="font-semibold text-[#111c2d] truncate">
												{emp.name}
											</div>
											<div className="text-[11px] text-[#6e797e] mt-0.5 truncate">
												{emp.shiftName || "-"}
											</div>
										</td>
										{daysArray.map((dayNum) => {
											// Match dayNum with date in emp.days
											const dayDateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
											const dayData = emp.days.find(
												(d) => d.date === dayDateStr,
											);

											if (!dayData) {
												return (
													<td
														key={dayNum}
														className="p-1 text-center border-r border-black/5 last:border-r-0"
													>
														<div className="w-6 h-6 rounded-full mx-auto flex items-center justify-center text-[10px] font-bold bg-transparent text-gray-300">
															-
														</div>
													</td>
												);
											}

											const colorCls = statusColor(
												dayData.status,
												dayData.isHoliday,
												dayData.isWorkDay,
											);
											const label = statusLabel(
												dayData.status,
												dayData.isHoliday,
												dayData.isWorkDay,
											);

											return (
												<td
													key={dayNum}
													className="p-1 text-center cursor-pointer border-r border-black/5 last:border-r-0 hover:bg-[#dee8ff]/40"
													onClick={() => {
														setSelectedEmployee(emp);
														// Defaults to editing "in"
														setEditingDay({
															date: dayData.date,
															field: "in",
															value: dayData.clockIn || "",
														});
													}}
													title={`${dayData.date}\nIn: ${dayData.clockIn || "-"}\nOut: ${dayData.clockOut || "-"}`}
												>
													<div
														className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center text-[10px] font-bold ${colorCls}`}
													>
														{label}
													</div>
												</td>
											);
										})}
										<td className="p-2 text-center font-semibold text-[#006c49] sticky right-[160px] bg-white group-hover:bg-[#f0f3ff] border-l border-black/5 z-10">
											{emp.totalPresent}
										</td>
										<td className="p-2 text-center font-semibold text-[#894e00] sticky right-[120px] bg-white group-hover:bg-[#f0f3ff] z-10">
											{emp.totalLate}
										</td>
										<td className="p-2 text-center font-semibold text-orange-700 sticky right-[80px] bg-white group-hover:bg-[#f0f3ff] z-10">
											{emp.totalEarlyOut}
										</td>
										<td className="p-2 text-center font-semibold text-[#00647c] sticky right-[40px] bg-white group-hover:bg-[#f0f3ff] z-10">
											{emp.totalLeave}
										</td>
										<td className="p-2 text-center font-semibold text-[#ba1a1a] sticky right-0 bg-white group-hover:bg-[#f0f3ff] z-10">
											{emp.totalAbsent}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
				<PaginationControls
					meta={response?.meta}
					onPageChange={setPage}
					disabled={isFetching}
				/>
			</section>

			{/* Modal Edit */}
			{editingDay && selectedEmployee && (
				<div
					ref={editDialogRef}
					className="fixed inset-0 z-50 flex items-end justify-center bg-[#14211d]/60 p-0 sm:items-center sm:p-4"
					role="dialog"
					aria-modal="true"
					aria-labelledby="edit-attendance-title"
				>
					<div className="flex w-full max-w-sm flex-col overflow-hidden border border-[#d5ded9] bg-white shadow-lg">
						<div className="flex items-center justify-between border-b border-[#d5ded9] bg-[#14211d] px-5 py-4 text-white">
							<h3
								id="edit-attendance-title"
								className="font-semibold !text-white"
							>
								Koreksi catatan
							</h3>
							<button
								type="button"
								onClick={() => setEditingDay(null)}
								className="flex h-9 w-9 items-center justify-center border border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
								aria-label="Tutup dialog koreksi"
							>
								<X size={17} />
							</button>
						</div>
						<div className="p-6">
							<p className="text-[13px] text-[#3e484d] mb-4">
								<span className="font-semibold text-[#111c2d]">
									{selectedEmployee.name}
								</span>
								<br />
								{editingDay.date}
							</p>

							<div className="mb-4">
								<div className="block text-[12px] font-semibold text-[#6e797e] mb-1">
									Pilih Tipe
								</div>
								<div className="flex gap-2">
									<button
										type="button"
										className={`flex-1 py-1.5 rounded-md text-[13px] font-medium transition-colors ${editingDay.field === "in" ? "bg-[#00647c] text-white" : "bg-gray-100 text-[#3e484d]"}`}
										onClick={() => {
											const dayData = selectedEmployee.days.find(
												(d) => d.date === editingDay.date,
											);
											setEditingDay({
												...editingDay,
												field: "in",
												value: dayData?.clockIn || "",
											});
										}}
									>
										Jam Masuk
									</button>
									<button
										type="button"
										className={`flex-1 py-1.5 rounded-md text-[13px] font-medium transition-colors ${editingDay.field === "out" ? "bg-[#00647c] text-white" : "bg-gray-100 text-[#3e484d]"}`}
										onClick={() => {
											const dayData = selectedEmployee.days.find(
												(d) => d.date === editingDay.date,
											);
											setEditingDay({
												...editingDay,
												field: "out",
												value: dayData?.clockOut || "",
											});
										}}
									>
										Jam Keluar
									</button>
								</div>
							</div>

							<div className="mb-6">
								<label
									htmlFor="time-input"
									className="block text-[12px] font-semibold text-[#6e797e] mb-1"
								>
									{editingDay.field === "in" ? "Waktu Masuk" : "Waktu Keluar"}
								</label>
								<input
									id="time-input"
									type="time"
									value={editingDay.value}
									onChange={(e) =>
										setEditingDay({ ...editingDay, value: e.target.value })
									}
									className="w-full bg-white border border-[#bdc8ce] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c]"
								/>
							</div>

							<button
								type="button"
								onClick={() => {
									const dayData = selectedEmployee.days.find(
										(d) => d.date === editingDay.date,
									);
									if (dayData) handleSaveEdit(dayData);
								}}
								disabled={
									!editingDay.value ||
									updateMutation.isPending ||
									createMutation.isPending
								}
								className="adms-button w-full"
							>
								{updateMutation.isPending || createMutation.isPending
									? "Menyimpan..."
									: "Simpan Perubahan"}
							</button>
						</div>
					</div>
				</div>
			)}
		</motion.div>
	);
}
