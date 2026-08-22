"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
	Calculator,
	CheckCircle2,
	FileDown,
	RefreshCw,
	Save,
	Users,
} from "lucide-react";
import { useState } from "react";
import PaginationControls, {
	type PageMeta,
} from "@/components/pagination-controls";
import api from "../../../lib/api";

interface JaspelVariable {
	employeeId: number;
	name: string;
	employeeCode: string;
	position: string | null;
	golongan: string | null;
	pendidikan: string | null;
	joinDate: string | null;
	jenisKetenagaanPoin: number;
	masaKerja: number;
	masaKerjaPoin: number;
	rangkapTugas: number;
	tanggungJawabKlaster: number;
}

interface JaspelDistribution {
	employeeId: number;
	name: string;
	employeeCode: string;
	position: string | null;
	golongan: string | null;
	pendidikan: string | null;
	jenisKetenagaanPoin: number;
	masaKerja: number;
	masaKerjaPoin: number;
	rangkapTugas: number;
	tanggungJawabKlaster: number;
	hariMasukKerja: number;
	hariKerja: number;
	poinVariabelKetenagaan: number;
	persentaseKehadiran: number;
	jumlahTotalPoin: number;
	pagu: number;
	finalAmount: number;
}

interface JaspelFund {
	totalFund: number;
	pendapatan: number;
	operasional: number;
	namaPuskesmas: string;
	status: "DRAFT" | "REVIEWED" | "FINAL" | "LOCKED";
	formulaVersion: string;
}

interface JaspelDistributions {
	fund: JaspelFund | null;
	distributions: JaspelDistribution[];
	meta: PageMeta;
}

interface HistoryItem {
	month: number;
	year: number;
	totalFund: number;
	pendapatan: number;
	operasional: number;
	namaPuskesmas: string;
	status: string;
	formulaVersion: string;
	createdAt: string;
	updatedAt: string;
}

export default function JaspelPage() {
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState<
		"variables" | "simulation" | "history"
	>("variables");
	const [month, setMonth] = useState(new Date().getMonth() + 1);
	const [year, setYear] = useState(new Date().getFullYear());
	const [totalFundInput, setTotalFundInput] = useState<string>("");
	const [pendapatanInput, setPendapatanInput] = useState<string>("");
	const [operasionalInput, setOperasionalInput] = useState<string>("");
	const [namaPuskesmasInput, setNamaPuskesmasInput] = useState<string>("");
	const [variablesPage, setVariablesPage] = useState(1);
	const [distributionsPage, setDistributionsPage] = useState(1);

	// Variables Queries
	const {
		data: variablesResponse,
		isLoading: isVariablesLoading,
		isFetching: isVariablesFetching,
	} = useQuery<{ data: JaspelVariable[]; meta: PageMeta }>({
		queryKey: ["jaspel-variables", variablesPage],
		queryFn: async () => {
			const res = await api.get(
				`/jaspel/variables?page=${variablesPage}&limit=10`,
			);
			return res.data;
		},
	});
	const variables = variablesResponse?.data;

	// Distributions Queries
	const {
		data: distributionsData,
		isLoading: isDistributionsLoading,
		isFetching: isDistributionsFetching,
	} = useQuery<JaspelDistributions>({
		queryKey: ["jaspel-distributions", month, year, distributionsPage],
		queryFn: async () => {
			const res = await api.get(
				`/jaspel/distributions?month=${month}&year=${year}&page=${distributionsPage}&limit=100`,
			);
			return res.data;
		},
	});

	// History Query
	const { data: historyData, isLoading: isHistoryLoading } = useQuery<
		HistoryItem[]
	>({
		queryKey: ["jaspel-history"],
		queryFn: async () => {
			const res = await api.get("/jaspel/history");
			return res.data;
		},
	});

	// Calculate Mutation
	const calculateMutation = useMutation({
		mutationFn: async () => {
			const fund = Number(totalFundInput.replace(/\D/g, ""));
			const pendapatan = Number(pendapatanInput.replace(/\D/g, ""));
			const operasional = Number(operasionalInput.replace(/\D/g, ""));
			const res = await api.post("/jaspel/calculate", {
				month,
				year,
				totalFund: fund,
				pendapatan: pendapatan || 0,
				operasional: operasional || 0,
				namaPuskesmas: namaPuskesmasInput || undefined,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["jaspel-distributions", month, year],
			});
			queryClient.invalidateQueries({ queryKey: ["jaspel-history"] });
		},
	});

	const handleCalculate = () => {
		const fund = Number(totalFundInput.replace(/\D/g, ""));
		if (fund > 0) calculateMutation.mutate();
	};

	const transition = useMutation({
		mutationFn: async (action: "review" | "finalize" | "lock" | "unlock") =>
			api.patch(`/jaspel/${action}`, { month, year }),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["jaspel-distributions", month, year],
			});
			queryClient.invalidateQueries({ queryKey: ["jaspel-history"] });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (target: { month: number; year: number }) =>
			api.delete(`/jaspel?month=${target.month}&year=${target.year}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["jaspel-history"] });
			queryClient.invalidateQueries({
				queryKey: ["jaspel-distributions", month, year],
			});
		},
	});

	const handleExport = async () => {
		const response = await api.get(
			`/jaspel/export?month=${month}&year=${year}`,
			{ responseType: "blob" },
		);
		const url = URL.createObjectURL(response.data);
		const link = document.createElement("a");
		link.href = url;
		link.download = `Jaspel-${month}-${year}.xlsx`;
		link.click();
		URL.revokeObjectURL(url);
	};

	const fmtRp = (n: number) => new Intl.NumberFormat("id-ID").format(n || 0);
	const bulanNama = (m: number) =>
		new Date(2000, m - 1).toLocaleString("id-ID", { month: "long" });

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			className="flex flex-col gap-6"
		>
			<div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
				<div>
					<h1 className="text-[24px] sm:text-[28px] font-bold text-[#111c2d] tracking-tight">
						Kalkulator Jasa Pelayanan
					</h1>
					<p className="text-[#6e797e] text-[14px] sm:text-[15px] mt-1">
						Penghitungan Jasa Pelayanan Medis berdasarkan poin ketenagaan,
						kehadiran, dan tanggung jawab.
					</p>
				</div>
			</div>

			{/* Tabs */}
			<div className="grid w-full grid-cols-3 rounded-lg border border-black/5 bg-white p-1 shadow-sm sm:w-fit">
				<button
					type="button"
					onClick={() => setActiveTab("variables")}
					className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-[13px] font-medium transition-all ${
						activeTab === "variables"
							? "bg-[#00647c] text-white shadow-md"
							: "text-[#6e797e] hover:bg-[#f0f3ff] hover:text-[#111c2d]"
					}`}
				>
					<Users className="w-4 h-4" />
					Variabel
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("simulation")}
					className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-[13px] font-medium transition-all ${
						activeTab === "simulation"
							? "bg-[#00647c] text-white shadow-md"
							: "text-[#6e797e] hover:bg-[#f0f3ff] hover:text-[#111c2d]"
					}`}
				>
					<Calculator className="w-4 h-4" />
					Perhitungan
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("history")}
					className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-[13px] font-medium transition-all ${
						activeTab === "history"
							? "bg-[#00647c] text-white shadow-md"
							: "text-[#6e797e] hover:bg-[#f0f3ff] hover:text-[#111c2d]"
					}`}
				>
					<RefreshCw className="w-4 h-4" />
					History
				</button>
			</div>

			{activeTab === "variables" && (
				<div className="bg-white rounded-xl border border-black/5 shadow-sm overflow-hidden">
					<div className="p-5 border-b border-black/5 bg-[#f0f3ff]/50">
						<h3 className="font-semibold text-[#111c2d]">
							Pengaturan Variabel Ketenagaan
						</h3>
						<p className="text-[13px] text-[#6e797e] mt-1">
							Atur poin jenis ketenagaan, masa kerja, rangkap tugas, dan
							tanggung jawab klaster untuk setiap pegawai.
						</p>
					</div>
					<div className="mobile-scroll-hint">
						Geser tabel untuk mengatur seluruh variabel
					</div>
					<div className="overflow-x-auto">
						<table className="w-full text-left border-collapse">
							<thead>
								<tr className="bg-[#f8f9fa] border-b border-black/5">
									<th className="px-3 py-3 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider whitespace-nowrap">
										Pegawai
									</th>
									<th className="px-3 py-3 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider text-center whitespace-nowrap">
										1. Poin Jenis Ketenagaan
									</th>
									<th className="px-3 py-3 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider text-center whitespace-nowrap">
										2. Masa Kerja (thn)
									</th>
									<th className="px-3 py-3 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider text-center whitespace-nowrap">
										3. Poin Masa Kerja
									</th>
									<th className="px-3 py-3 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider text-center whitespace-nowrap">
										6. Rangkap Tugas
									</th>
									<th className="px-3 py-3 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider text-center whitespace-nowrap">
										7. Tg Jawab Klaster
									</th>
									<th className="px-3 py-3 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider text-center whitespace-nowrap">
										8 = 1+3+6+7
									</th>
									<th className="px-3 py-3 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider text-right whitespace-nowrap">
										Aksi
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-black/5">
								{isVariablesLoading ? (
									<tr>
										<td colSpan={8} className="text-center py-10">
											<RefreshCw className="w-6 h-6 animate-spin text-[#00647c] mx-auto" />
										</td>
									</tr>
								) : variables?.length === 0 ? (
									<tr>
										<td
											colSpan={8}
											className="text-center py-10 text-[#6e797e]"
										>
											Belum ada data pegawai aktif.
										</td>
									</tr>
								) : (
									variables?.map((emp) => (
										<VariableRow key={emp.employeeId} employee={emp} />
									))
								)}
							</tbody>
						</table>
					</div>
					<PaginationControls
						meta={variablesResponse?.meta}
						onPageChange={setVariablesPage}
						disabled={isVariablesFetching}
					/>
				</div>
			)}

			{activeTab === "simulation" && (
				<div className="space-y-6">
					{/* Controls */}
					<div className="bg-white rounded-xl border border-black/5 shadow-sm p-6">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
							<div>
								<label
									htmlFor="month"
									className="block text-[13px] font-semibold text-[#6e797e] mb-2 uppercase tracking-wide"
								>
									Bulan
								</label>
								<select
									id="month"
									value={month}
									onChange={(e) => setMonth(Number(e.target.value))}
									className="w-full h-[42px] px-3 bg-[#f8f9fa] border border-black/10 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#00647c]/20"
								>
									{Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
										<option key={m} value={m}>
											{bulanNama(m)}
										</option>
									))}
								</select>
							</div>
							<div>
								<label
									htmlFor="year"
									className="block text-[13px] font-semibold text-[#6e797e] mb-2 uppercase tracking-wide"
								>
									Tahun
								</label>
								<input
									id="year"
									type="number"
									value={year}
									onChange={(e) => setYear(Number(e.target.value))}
									className="w-full h-[42px] px-3 bg-[#f8f9fa] border border-black/10 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#00647c]/20"
								/>
							</div>
							<div>
								<label
									htmlFor="namaPuskesmas"
									className="block text-[13px] font-semibold text-[#6e797e] mb-2 uppercase tracking-wide"
								>
									Nama Puskesmas
								</label>
								<input
									id="namaPuskesmas"
									type="text"
									value={namaPuskesmasInput}
									onChange={(e) => setNamaPuskesmasInput(e.target.value)}
									placeholder="Contoh: PUSKESMAS KESAMBI"
									className="w-full h-[42px] px-3 bg-[#f8f9fa] border border-black/10 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#00647c]/20"
								/>
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
							<div>
								<label
									htmlFor="pendapatan"
									className="block text-[13px] font-semibold text-[#6e797e] mb-2 uppercase tracking-wide"
								>
									Pendapatan Kapitasi (Rp)
								</label>
								<input
									id="pendapatan"
									type="text"
									placeholder="0"
									value={pendapatanInput}
									onChange={(e) => {
										const val = e.target.value.replace(/\D/g, "");
										setPendapatanInput(
											val
												? new Intl.NumberFormat("id-ID").format(Number(val))
												: "",
										);
									}}
									className="w-full h-[42px] px-3 bg-[#f8f9fa] border border-black/10 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#00647c]/20 font-semibold text-[#00647c]"
								/>
							</div>
							<div>
								<label
									htmlFor="operasional"
									className="block text-[13px] font-semibold text-[#6e797e] mb-2 uppercase tracking-wide"
								>
									Biaya Operasional (Rp)
								</label>
								<input
									id="operasional"
									type="text"
									placeholder="0"
									value={operasionalInput}
									onChange={(e) => {
										const val = e.target.value.replace(/\D/g, "");
										setOperasionalInput(
											val
												? new Intl.NumberFormat("id-ID").format(Number(val))
												: "",
										);
									}}
									className="w-full h-[42px] px-3 bg-[#f8f9fa] border border-black/10 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#00647c]/20 font-semibold text-[#00647c]"
								/>
							</div>
							<div>
								<label
									htmlFor="totalFund"
									className="block text-[13px] font-semibold text-[#6e797e] mb-2 uppercase tracking-wide"
								>
									Jumlah Jaspel (Rp)
								</label>
								<input
									id="totalFund"
									type="text"
									placeholder="Contoh: 45570456"
									value={totalFundInput}
									onChange={(e) => {
										const val = e.target.value.replace(/\D/g, "");
										setTotalFundInput(
											val
												? new Intl.NumberFormat("id-ID").format(Number(val))
												: "",
										);
									}}
									className="w-full h-[42px] px-3 bg-[#f8f9fa] border border-black/10 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#00647c]/20 font-semibold text-[#00647c]"
								/>
							</div>
						</div>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={handleCalculate}
								disabled={calculateMutation.isPending}
								className="flex-1 h-[42px] bg-[#00647c] text-white rounded-lg font-medium text-[14px] hover:bg-[#005266] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
							>
								{calculateMutation.isPending ? (
									<RefreshCw className="w-4 h-4 animate-spin" />
								) : (
									<Calculator className="w-4 h-4" />
								)}
								Hitung Jaspel
							</button>
							{distributionsData?.fund?.status === "DRAFT" && (
								<button
									type="button"
									className="adms-button"
									onClick={() => transition.mutate("review")}
								>
									Review
								</button>
							)}
							{distributionsData?.fund?.status === "REVIEWED" && (
								<button
									type="button"
									className="adms-button"
									onClick={() => transition.mutate("finalize")}
								>
									Finalisasi
								</button>
							)}
							{distributionsData?.fund?.status === "FINAL" && (
								<button
									type="button"
									className="adms-button"
									onClick={() => transition.mutate("lock")}
								>
									Kunci
								</button>
							)}
							{distributionsData?.fund &&
								distributionsData.fund.status !== "DRAFT" && (
									<button
										type="button"
										className="h-[42px] px-4 bg-white border border-[#ba1a1a]/30 text-[#ba1a1a] rounded-lg font-medium text-[14px] hover:bg-[#ba1a1a]/5 transition-colors shadow-sm disabled:opacity-50"
										onClick={() => {
											if (
												window.confirm(
													`Buka kunci jaspel ${bulanNama(month)} ${year}? Periode bisa diedit dan dihitung ulang.`,
												)
											)
												transition.mutate("unlock");
										}}
										disabled={transition.isPending}
									>
										Buka Kunci
									</button>
								)}
						</div>
					</div>

					{/* Results Table */}
					<div className="bg-white rounded-xl border border-black/5 shadow-sm overflow-hidden">
						<div className="p-5 border-b border-black/5 flex justify-between items-center bg-[#f0f3ff]/50">
							<div>
								<h3 className="font-semibold text-[#111c2d]">
									Hasil Penghitungan
								</h3>
								{distributionsData?.fund && (
									<p className="text-[13px] text-[#006c49] mt-1 font-medium flex items-center gap-1">
										<CheckCircle2 className="w-3.5 h-3.5" />
										{distributionsData.fund.namaPuskesmas || "PUSKESMAS"} ·{" "}
										Jaspel Rp {fmtRp(distributionsData.fund.totalFund)} ·{" "}
										{distributionsData.fund.status}
									</p>
								)}
							</div>
							{(distributionsData?.distributions?.length ?? 0) > 0 && (
								<button
									type="button"
									onClick={handleExport}
									className="flex items-center gap-2 px-4 py-2 bg-white border border-[#00647c]/30 text-[#00647c] rounded-md text-[13px] font-medium hover:bg-[#f0f3ff] transition-colors shadow-sm"
								>
									<FileDown className="w-4 h-4" />
									Export Excel
								</button>
							)}
						</div>
						<div className="mobile-scroll-hint">
							Geser tabel untuk melihat seluruh kolom perhitungan
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-left border-collapse">
								<thead>
									<tr className="bg-[#f8f9fa] border-b border-black/5">
										<th className="px-2 py-3 font-sans text-[10px] font-semibold text-[#6e797e] uppercase tracking-wider text-center whitespace-nowrap">
											No
										</th>
										<th className="px-2 py-3 font-sans text-[10px] font-semibold text-[#6e797e] uppercase tracking-wider whitespace-nowrap">
											Nama
										</th>
										<th className="px-2 py-3 font-sans text-[10px] font-semibold text-[#6e797e] uppercase tracking-wider whitespace-nowrap">
											Jabatan
										</th>
										<th className="px-2 py-3 font-sans text-[10px] font-semibold text-[#6e797e] uppercase tracking-wider text-center whitespace-nowrap">
											Gol
										</th>
										<th className="px-2 py-3 font-sans text-[10px] font-semibold text-[#6e797e] uppercase tracking-wider text-center whitespace-nowrap">
											Pend
										</th>
										<th className="px-2 py-3 font-sans text-[10px] font-semibold text-[#6e797e] uppercase tracking-wider text-center whitespace-nowrap">
											1 Poin Ket.
										</th>
										<th className="px-2 py-3 font-sans text-[10px] font-semibold text-[#6e797e] uppercase tracking-wider text-center whitespace-nowrap">
											3 Poin MK
										</th>
										<th className="px-2 py-3 font-sans text-[10px] font-semibold text-[#6e797e] uppercase tracking-wider text-center whitespace-nowrap">
											4 Hadir
										</th>
										<th className="px-2 py-3 font-sans text-[10px] font-semibold text-[#6e797e] uppercase tracking-wider text-center whitespace-nowrap">
											5 Hr Kerja
										</th>
										<th className="px-2 py-3 font-sans text-[10px] font-semibold text-[#6e797e] uppercase tracking-wider text-center whitespace-nowrap">
											6 Rangkap
										</th>
										<th className="px-2 py-3 font-sans text-[10px] font-semibold text-[#6e797e] uppercase tracking-wider text-center whitespace-nowrap">
											7 Tg Jawab
										</th>
										<th className="px-2 py-3 font-sans text-[10px] font-semibold text-[#6e797e] uppercase tracking-wider text-center whitespace-nowrap">
											8 Poin Var
										</th>
										<th className="px-2 py-3 font-sans text-[10px] font-semibold text-[#6e797e] uppercase tracking-wider text-center whitespace-nowrap">
											9 % Hadir
										</th>
										<th className="px-2 py-3 font-sans text-[10px] font-semibold text-[#6e797e] uppercase tracking-wider text-center whitespace-nowrap">
											10 Total Poin
										</th>
										<th className="px-2 py-3 font-sans text-[10px] font-bold text-[#111c2d] uppercase tracking-wider text-right whitespace-nowrap">
											Jasa Pelayanan
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-black/5">
									{isDistributionsLoading ? (
										<tr>
											<td colSpan={15} className="text-center py-10">
												<RefreshCw className="w-6 h-6 animate-spin text-[#00647c] mx-auto" />
											</td>
										</tr>
									) : distributionsData?.distributions?.length === 0 ? (
										<tr>
											<td
												colSpan={15}
												className="text-center py-12 text-[#6e797e]"
											>
												<Calculator className="w-10 h-10 mx-auto mb-3 opacity-20" />
												<p>Belum ada data perhitungan untuk bulan ini.</p>
												<p className="text-[13px] mt-1">
													Masukkan nominal dana dan klik Hitung Jaspel.
												</p>
											</td>
										</tr>
									) : (
										distributionsData?.distributions?.map((dist, i) => (
											<tr key={dist.employeeId} className="hover:bg-[#f9f9ff]">
												<td className="px-2 py-3 text-center text-[12px] text-[#6e797e]">
													{i + 1}
												</td>
												<td className="px-2 py-3">
													<p className="font-medium text-[#111c2d] text-[13px]">
														{dist.name}
													</p>
													<p className="text-[10px] text-[#6e797e]">
														{dist.employeeCode}
													</p>
												</td>
												<td className="px-2 py-3 text-[12px] text-[#3e484d]">
													{dist.position || "-"}
												</td>
												<td className="px-2 py-3 text-center text-[12px] text-[#3e484d]">
													{dist.golongan || "-"}
												</td>
												<td className="px-2 py-3 text-center text-[12px] text-[#3e484d]">
													{dist.pendidikan || "-"}
												</td>
												<td className="px-2 py-3 text-center text-[12px] text-[#3e484d]">
													{dist.jenisKetenagaanPoin}
												</td>
												<td className="px-2 py-3 text-center text-[12px] text-[#3e484d]">
													{dist.masaKerjaPoin}
												</td>
												<td className="px-2 py-3 text-center text-[12px] text-[#3e484d]">
													{dist.hariMasukKerja}
												</td>
												<td className="px-2 py-3 text-center text-[12px] text-[#3e484d]">
													{dist.hariKerja}
												</td>
												<td className="px-2 py-3 text-center text-[12px] text-[#3e484d]">
													{dist.rangkapTugas || "-"}
												</td>
												<td className="px-2 py-3 text-center text-[12px] text-[#3e484d]">
													{dist.tanggungJawabKlaster || "-"}
												</td>
												<td className="px-2 py-3 text-center text-[12px] font-medium text-[#3e484d]">
													{dist.poinVariabelKetenagaan.toFixed(2)}
												</td>
												<td className="px-2 py-3 text-center text-[12px] font-medium text-[#3e484d]">
													{(dist.persentaseKehadiran * 100).toFixed(2)}
												</td>
												<td className="px-2 py-3 text-center text-[12px] font-semibold text-[#00647c]">
													{dist.jumlahTotalPoin.toFixed(2)}
												</td>
												<td className="px-2 py-3 text-right text-[13px] font-bold text-[#111c2d]">
													{dist.finalAmount > 0 ? fmtRp(dist.finalAmount) : "-"}
												</td>
											</tr>
										))
									)}
								</tbody>
								{distributionsData?.distributions?.length ? (
									<tfoot>
										<tr className="bg-[#00647c] text-white">
											<td
												colSpan={11}
												className="px-2 py-3 text-right text-[12px] font-bold"
											>
												JUMLAH
											</td>
											<td className="px-2 py-3 text-center text-[12px] font-bold">
												{distributionsData.distributions
													.reduce((s, d) => s + d.poinVariabelKetenagaan, 0)
													.toFixed(2)}
											</td>
											<td className="px-2 py-3" />
											<td className="px-2 py-3 text-center text-[12px] font-bold">
												{distributionsData.distributions
													.reduce((s, d) => s + d.jumlahTotalPoin, 0)
													.toFixed(2)}
											</td>
											<td className="px-2 py-3 text-right text-[12px] font-bold">
												{fmtRp(
													distributionsData.distributions.reduce(
														(s, d) => s + d.finalAmount,
														0,
													),
												)}
											</td>
										</tr>
									</tfoot>
								) : null}
							</table>
						</div>
						<PaginationControls
							meta={distributionsData?.meta}
							onPageChange={setDistributionsPage}
							disabled={isDistributionsFetching}
						/>
					</div>
				</div>
			)}

			{activeTab === "history" && (
				<div className="bg-white rounded-xl border border-black/5 shadow-sm overflow-hidden">
					<div className="p-5 border-b border-black/5 bg-[#f0f3ff]/50">
						<h3 className="font-semibold text-[#111c2d]">
							History Perhitungan
						</h3>
						<p className="text-[13px] text-[#6e797e] mt-1">
							Daftar perhitungan jaspel yang pernah dilakukan per bulan.
						</p>
					</div>
					{isHistoryLoading ? (
						<div className="text-center py-10">
							<RefreshCw className="w-6 h-6 animate-spin text-[#00647c] mx-auto" />
						</div>
					) : !historyData?.length ? (
						<div className="text-center py-12 text-[#6e797e]">
							<p>Belum ada history perhitungan.</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-left border-collapse">
								<thead>
									<tr className="bg-[#f8f9fa] border-b border-black/5">
										<th className="px-5 py-3 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider">
											Periode
										</th>
										<th className="px-5 py-3 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider">
											Puskesmas
										</th>
										<th className="px-5 py-3 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider text-right">
											Pendapatan
										</th>
										<th className="px-5 py-3 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider text-right">
											Operasional
										</th>
										<th className="px-5 py-3 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider text-right">
											Jaspel
										</th>
										<th className="px-5 py-3 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider text-center">
											Status
										</th>
										<th className="px-5 py-3 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider text-center">
											Aksi
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-black/5">
									{historyData?.map((item) => (
										<tr
											key={`${item.year}-${item.month}`}
											className="hover:bg-[#f9f9ff] cursor-pointer"
											onClick={() => {
												setMonth(item.month);
												setYear(item.year);
												setActiveTab("simulation");
											}}
										>
											<td className="px-5 py-4 text-[14px] font-medium text-[#111c2d]">
												{bulanNama(item.month)} {item.year}
											</td>
											<td className="px-5 py-4 text-[13px] text-[#3e484d]">
												{item.namaPuskesmas || "-"}
											</td>
											<td className="px-5 py-4 text-right text-[13px] text-[#3e484d]">
												Rp {fmtRp(item.pendapatan)}
											</td>
											<td className="px-5 py-4 text-right text-[13px] text-[#3e484d]">
												Rp {fmtRp(item.operasional)}
											</td>
											<td className="px-5 py-4 text-right text-[14px] font-bold text-[#111c2d]">
												Rp {fmtRp(item.totalFund)}
											</td>
											<td className="px-5 py-4 text-center">
												<span
													className={`inline-flex px-2 py-1 rounded text-[11px] font-bold ${
														item.status === "LOCKED"
															? "bg-[#ba1a1a]/10 text-[#ba1a1a]"
															: item.status === "FINAL"
																? "bg-[#006c49]/10 text-[#006c49]"
																: item.status === "REVIEWED"
																	? "bg-[#894e00]/10 text-[#894e00]"
																	: "bg-[#00647c]/10 text-[#00647c]"
													}`}
												>
													{item.status}
												</span>
											</td>
											<td className="px-5 py-4 text-center text-[12px]">
												<div className="flex items-center justify-center gap-3">
													<button
														type="button"
														className="text-[#00647c] hover:underline font-medium"
														onClick={() => {
															setMonth(item.month);
															setYear(item.year);
															setActiveTab("simulation");
														}}
													>
														Lihat detail
													</button>
													<button
														type="button"
														className="text-[#ba1a1a] hover:underline font-medium"
														disabled={deleteMutation.isPending}
														onClick={() => {
															if (
																window.confirm(
																	`Hapus perhitungan jaspel ${bulanNama(item.month)} ${item.year}? Data distribusi ikut terhapus dan tidak bisa dikembalikan.`,
																)
															)
																deleteMutation.mutate({
																	month: item.month,
																	year: item.year,
																});
														}}
														onClickCapture={(e) => e.stopPropagation()}
													>
														Hapus
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}
		</motion.div>
	);
}

function VariableRow({ employee }: { employee: JaspelVariable }) {
	const queryClient = useQueryClient();
	const [jenis, setJenis] = useState(employee.jenisKetenagaanPoin);
	const [masaKerja, setMasaKerja] = useState(employee.masaKerja);
	const [masaKerjaPoin, setMasaKerjaPoin] = useState(employee.masaKerjaPoin);
	const [rangkap, setRangkap] = useState(employee.rangkapTugas);
	const [klaster, setKlaster] = useState(employee.tanggungJawabKlaster);
	const [isEditing, setIsEditing] = useState(false);

	const updateMutation = useMutation({
		mutationFn: async () => {
			await api.put(`/jaspel/variables/${employee.employeeId}`, {
				jenisKetenagaanPoin: Number(jenis),
				masaKerja: Number(masaKerja),
				masaKerjaPoin: Number(masaKerjaPoin),
				rangkapTugas: Number(rangkap),
				tanggungJawabKlaster: Number(klaster),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["jaspel-variables"] });
			setIsEditing(false);
		},
	});

	const total =
		Number(jenis) + Number(masaKerjaPoin) + Number(rangkap) + Number(klaster);

	const inputClass =
		"w-16 px-2 py-1 border border-black/20 rounded text-[12px] text-center";

	return (
		<tr className="hover:bg-[#f9f9ff]">
			<td className="px-3 py-3">
				<p className="font-medium text-[#111c2d] text-[13px]">
					{employee.name}
				</p>
				<p className="text-[11px] text-[#6e797e]">
					{employee.employeeCode}
					{employee.position ? ` · ${employee.position}` : ""}
				</p>
			</td>
			<td className="px-3 py-3 text-center">
				{isEditing ? (
					<input
						type="number"
						value={jenis}
						onChange={(e) => setJenis(Number(e.target.value))}
						className={inputClass}
					/>
				) : (
					<span className="text-[13px]">{employee.jenisKetenagaanPoin}</span>
				)}
			</td>
			<td className="px-3 py-3 text-center">
				{isEditing ? (
					<input
						type="number"
						value={masaKerja}
						onChange={(e) => setMasaKerja(Number(e.target.value))}
						className={inputClass}
					/>
				) : (
					<span className="text-[13px]">{employee.masaKerja}</span>
				)}
			</td>
			<td className="px-3 py-3 text-center">
				{isEditing ? (
					<input
						type="number"
						value={masaKerjaPoin}
						onChange={(e) => setMasaKerjaPoin(Number(e.target.value))}
						className={inputClass}
					/>
				) : (
					<span className="text-[13px]">{employee.masaKerjaPoin}</span>
				)}
			</td>
			<td className="px-3 py-3 text-center">
				{isEditing ? (
					<input
						type="number"
						value={rangkap}
						onChange={(e) => setRangkap(Number(e.target.value))}
						className={inputClass}
					/>
				) : (
					<span className="text-[13px]">{employee.rangkapTugas || "-"}</span>
				)}
			</td>
			<td className="px-3 py-3 text-center">
				{isEditing ? (
					<input
						type="number"
						value={klaster}
						onChange={(e) => setKlaster(Number(e.target.value))}
						className={inputClass}
					/>
				) : (
					<span className="text-[13px]">
						{employee.tanggungJawabKlaster || "-"}
					</span>
				)}
			</td>
			<td className="px-3 py-3 text-center font-semibold text-[#00647c] text-[13px]">
				{total.toFixed(2)}
			</td>
			<td className="px-3 py-3 text-right">
				{isEditing ? (
					<button
						type="button"
						onClick={() => updateMutation.mutate()}
						disabled={updateMutation.isPending}
						className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#006c49] text-white text-[12px] font-medium rounded hover:bg-[#005237]"
					>
						<Save className="w-3 h-3" />
						Simpan
					</button>
				) : (
					<button
						type="button"
						onClick={() => setIsEditing(true)}
						className="text-[12px] text-[#00647c] hover:underline font-medium"
					>
						Edit
					</button>
				)}
			</td>
		</tr>
	);
}
