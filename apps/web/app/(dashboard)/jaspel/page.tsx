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
	basicIndex: number;
	positionIndex: number;
	riskIndex: number;
}

interface JaspelDistribution {
	employeeId: number;
	name: string;
	employeeCode: string;
	penaltyDays: number;
	totalIndex: number;
	finalPoint: number;
	finalAmount: number;
}

interface JaspelDistributions {
	fund?: {
		totalFund: number;
		status: "DRAFT" | "REVIEWED" | "FINAL" | "LOCKED";
		formulaVersion: string;
	};
	distributions: JaspelDistribution[];
	meta: PageMeta;
}

export default function JaspelPage() {
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState<"variables" | "simulation">(
		"variables",
	);
	const [month, setMonth] = useState(new Date().getMonth() + 1);
	const [year, setYear] = useState(new Date().getFullYear());
	const [totalFundInput, setTotalFundInput] = useState<string>("");
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
				`/jaspel/distributions?month=${month}&year=${year}&page=${distributionsPage}&limit=10`,
			);
			return res.data;
		},
	});

	// Calculate Mutation
	const calculateMutation = useMutation({
		mutationFn: async (totalFund: number) => {
			const res = await api.post("/jaspel/calculate", {
				month,
				year,
				totalFund,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["jaspel-distributions", month, year],
			});
		},
	});

	const handleCalculate = () => {
		const fund = Number(totalFundInput.replace(/\D/g, ""));
		if (fund > 0) calculateMutation.mutate(fund);
	};
	const transition = useMutation({
		mutationFn: async (action: "review" | "finalize" | "lock") =>
			api.patch(`/jaspel/${action}`, { month, year }),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: ["jaspel-distributions", month, year],
			}),
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
						Kelola variabel indeks pegawai dan hitung otomatis pembagian Jaspel.
					</p>
				</div>
			</div>

			{/* Tabs */}
			<div className="grid w-full grid-cols-2 rounded-lg border border-black/5 bg-white p-1 shadow-sm sm:w-fit">
				<button
					type="button"
					onClick={() => setActiveTab("variables")}
					className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-[14px] font-medium transition-all ${
						activeTab === "variables"
							? "bg-[#00647c] text-white shadow-md"
							: "text-[#6e797e] hover:bg-[#f0f3ff] hover:text-[#111c2d]"
					}`}
				>
					<Users className="w-4 h-4" />
					Variabel Pegawai
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("simulation")}
					className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-[14px] font-medium transition-all ${
						activeTab === "simulation"
							? "bg-[#00647c] text-white shadow-md"
							: "text-[#6e797e] hover:bg-[#f0f3ff] hover:text-[#111c2d]"
					}`}
				>
					<Calculator className="w-4 h-4" />
					Simulasi Pembagian
				</button>
			</div>

			{activeTab === "variables" ? (
				<div className="bg-white rounded-xl border border-black/5 shadow-sm overflow-hidden">
					<div className="p-5 border-b border-black/5 bg-[#f0f3ff]/50">
						<h3 className="font-semibold text-[#111c2d]">
							Pengaturan Indeks Pegawai
						</h3>
						<p className="text-[13px] text-[#6e797e] mt-1">
							Atur bobot Poin Pendidikan/Dasar, Poin Jabatan, dan Poin Risiko
							untuk setiap pegawai.
						</p>
					</div>
					<div className="mobile-scroll-hint">
						Geser tabel untuk mengatur seluruh indeks
					</div>
					<div className="overflow-x-auto">
						<table className="w-full text-left border-collapse">
							<thead>
								<tr className="bg-[#f8f9fa] border-b border-black/5">
									<th className="px-5 py-3 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider">
										Pegawai
									</th>
									<th className="px-5 py-3 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider">
										Indeks Dasar
									</th>
									<th className="px-5 py-3 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider">
										Indeks Jabatan
									</th>
									<th className="px-5 py-3 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider">
										Indeks Risiko
									</th>
									<th className="px-5 py-3 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider">
										Total Poin
									</th>
									<th className="px-5 py-3 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider text-right">
										Aksi
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-black/5">
								{isVariablesLoading ? (
									<tr>
										<td colSpan={6} className="text-center py-10">
											<div className="flex justify-center">
												<RefreshCw className="w-6 h-6 animate-spin text-[#00647c]" />
											</div>
										</td>
									</tr>
								) : variables?.length === 0 ? (
									<tr>
										<td
											colSpan={6}
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
			) : (
				<div className="space-y-6">
					{/* Controls for Simulation */}
					<div className="bg-white rounded-xl border border-black/5 shadow-sm p-6">
						<div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
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
											{new Date(2000, m - 1).toLocaleString("id-ID", {
												month: "long",
											})}
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
									htmlFor="totalFund"
									className="block text-[13px] font-semibold text-[#6e797e] mb-2 uppercase tracking-wide"
								>
									Total Dana Dibagikan (Rp)
								</label>
								<input
									id="totalFund"
									type="text"
									placeholder="Contoh: 10000000"
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
							</div>
						</div>
					</div>

					{/* Results Table */}
					<div className="bg-white rounded-xl border border-black/5 shadow-sm overflow-hidden">
						<div className="p-5 border-b border-black/5 flex justify-between items-center bg-[#f0f3ff]/50">
							<div>
								<h3 className="font-semibold text-[#111c2d]">
									Hasil Pembagian
								</h3>
								{distributionsData?.fund && (
									<p className="text-[13px] text-[#006c49] mt-1 font-medium flex items-center gap-1">
										<CheckCircle2 className="w-3.5 h-3.5" />
										Telah dihitung dari total Rp{" "}
										{new Intl.NumberFormat("id-ID").format(
											distributionsData.fund.totalFund,
										)}
										· {distributionsData.fund.status} ·{" "}
										{distributionsData.fund.formulaVersion}
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
							Geser tabel untuk melihat rincian pembagian
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-left border-collapse">
								<thead>
									<tr className="bg-[#f8f9fa] border-b border-black/5">
										<th className="px-5 py-3 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider">
											Pegawai
										</th>
										<th className="px-5 py-3 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider text-center">
											Potongan Kehadiran
										</th>
										<th className="px-5 py-3 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider text-center">
											Total Indeks (Poin)
										</th>
										<th className="px-5 py-3 font-sans text-[12px] font-semibold text-[#6e797e] uppercase tracking-wider text-center">
											Poin Akhir
										</th>
										<th className="px-5 py-3 font-sans text-[12px] font-bold text-[#111c2d] uppercase tracking-wider text-right">
											Nominal Jaspel
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-black/5">
									{isDistributionsLoading ? (
										<tr>
											<td colSpan={5} className="text-center py-10">
												<RefreshCw className="w-6 h-6 animate-spin text-[#00647c] mx-auto" />
											</td>
										</tr>
									) : distributionsData?.distributions?.length === 0 ? (
										<tr>
											<td
												colSpan={5}
												className="text-center py-12 text-[#6e797e]"
											>
												<Calculator className="w-10 h-10 mx-auto mb-3 opacity-20" />
												<p>Belum ada data simulasi untuk bulan ini.</p>
												<p className="text-[13px] mt-1">
													Masukkan nominal dana dan klik Hitung Jaspel.
												</p>
											</td>
										</tr>
									) : (
										distributionsData?.distributions?.map((dist) => (
											<tr key={dist.employeeId} className="hover:bg-[#f9f9ff]">
												<td className="px-5 py-4">
													<p className="font-medium text-[#111c2d] text-[14px]">
														{dist.name}
													</p>
													<p className="text-[12px] text-[#6e797e]">
														{dist.employeeCode}
													</p>
												</td>
												<td className="px-5 py-4 text-center">
													{dist.penaltyDays > 0 ? (
														<span className="inline-flex px-2 py-1 bg-[#ba1a1a]/10 text-[#ba1a1a] rounded text-[12px] font-bold">
															- {dist.penaltyDays} Hari
														</span>
													) : (
														<span className="text-[13px] text-[#6e797e]">
															-
														</span>
													)}
												</td>
												<td className="px-5 py-4 text-center text-[14px] font-medium text-[#3e484d]">
													{dist.totalIndex.toFixed(1)}
												</td>
												<td className="px-5 py-4 text-center text-[14px] font-semibold text-[#00647c]">
													{dist.finalPoint.toFixed(2)}
												</td>
												<td className="px-5 py-4 text-right text-[15px] font-bold text-[#111c2d]">
													Rp{" "}
													{new Intl.NumberFormat("id-ID").format(
														dist.finalAmount,
													)}
												</td>
											</tr>
										))
									)}
								</tbody>
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
		</motion.div>
	);
}

function VariableRow({ employee }: { employee: JaspelVariable }) {
	const queryClient = useQueryClient();
	const [basic, setBasic] = useState(employee.basicIndex);
	const [position, setPosition] = useState(employee.positionIndex);
	const [risk, setRisk] = useState(employee.riskIndex);
	const [isEditing, setIsEditing] = useState(false);

	const updateMutation = useMutation({
		mutationFn: async () => {
			await api.put(`/jaspel/variables/${employee.employeeId}`, {
				basicIndex: Number(basic),
				positionIndex: Number(position),
				riskIndex: Number(risk),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["jaspel-variables"] });
			setIsEditing(false);
		},
	});

	const total = Number(basic) + Number(position) + Number(risk);

	return (
		<tr className="hover:bg-[#f9f9ff]">
			<td className="px-5 py-3">
				<p className="font-medium text-[#111c2d] text-[14px]">
					{employee.name}
				</p>
				<p className="text-[12px] text-[#6e797e]">{employee.employeeCode}</p>
			</td>
			<td className="px-5 py-3">
				{isEditing ? (
					<input
						type="number"
						value={basic}
						onChange={(e) => setBasic(Number(e.target.value))}
						className="w-20 px-2 py-1 border border-black/20 rounded text-[13px]"
					/>
				) : (
					<span className="text-[14px]">{employee.basicIndex}</span>
				)}
			</td>
			<td className="px-5 py-3">
				{isEditing ? (
					<input
						type="number"
						value={position}
						onChange={(e) => setPosition(Number(e.target.value))}
						className="w-20 px-2 py-1 border border-black/20 rounded text-[13px]"
					/>
				) : (
					<span className="text-[14px]">{employee.positionIndex}</span>
				)}
			</td>
			<td className="px-5 py-3">
				{isEditing ? (
					<input
						type="number"
						value={risk}
						onChange={(e) => setRisk(Number(e.target.value))}
						className="w-20 px-2 py-1 border border-black/20 rounded text-[13px]"
					/>
				) : (
					<span className="text-[14px]">{employee.riskIndex}</span>
				)}
			</td>
			<td className="px-5 py-3 font-semibold text-[#00647c]">
				{total.toFixed(1)}
			</td>
			<td className="px-5 py-3 text-right">
				{isEditing ? (
					<button
						type="button"
						onClick={() => updateMutation.mutate()}
						disabled={updateMutation.isPending}
						className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#006c49] text-white text-[12px] font-medium rounded hover:bg-[#005237]"
					>
						<Save className="w-3.5 h-3.5" />
						Simpan
					</button>
				) : (
					<button
						type="button"
						onClick={() => setIsEditing(true)}
						className="inline-flex items-center px-3 py-1.5 border border-black/10 text-[#3e484d] text-[12px] font-medium rounded hover:bg-white"
					>
						Edit Poin
					</button>
				)}
			</td>
		</tr>
	);
}
