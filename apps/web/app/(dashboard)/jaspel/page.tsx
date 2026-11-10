"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Calculator,
	FileDown,
	Loader2,
	RefreshCw,
	Save,
	Trash2,
	Users,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import PaginationControls, {
	type PageMeta,
} from "@/components/pagination-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
	const [activeTab, setActiveTab] = React.useState<
		"variables" | "simulation" | "history"
	>("variables");
	const [month, setMonth] = React.useState(new Date().getMonth() + 1);
	const [year, setYear] = React.useState(new Date().getFullYear());
	const [totalFundInput, setTotalFundInput] = React.useState<string>("");
	const [pendapatanInput, setPendapatanInput] = React.useState<string>("");
	const [operasionalInput, setOperasionalInput] = React.useState<string>("");
	const [namaPuskesmasInput, setNamaPuskesmasInput] =
		React.useState<string>("");
	const [variablesPage, setVariablesPage] = React.useState(1);
	const [distributionsPage, setDistributionsPage] = React.useState(1);

	const {
		data: variablesResponse,
		isLoading: isVariablesLoading,
		isFetching: isVariablesFetching,
	} = useQuery<{ data: JaspelVariable[]; meta: PageMeta }>({
		queryKey: ["jaspel-variables", variablesPage],
		queryFn: async () =>
			(await api.get(`/jaspel/variables?page=${variablesPage}&limit=10`)).data,
	});
	const variables = variablesResponse?.data || [];

	const {
		data: distributionsData,
		isLoading: isDistributionsLoading,
		isFetching: isDistributionsFetching,
	} = useQuery<JaspelDistributions>({
		queryKey: ["jaspel-distributions", month, year, distributionsPage],
		queryFn: async () =>
			(
				await api.get(
					`/jaspel/distributions?month=${month}&year=${year}&page=${distributionsPage}&limit=100`,
				)
			).data,
	});

	const { data: historyData, isLoading: isHistoryLoading } = useQuery<
		HistoryItem[]
	>({
		queryKey: ["jaspel-history"],
		queryFn: async () => (await api.get("/jaspel/history")).data,
	});

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
			toast.success("Perhitungan Jaspel berhasil diperbarui");
		},
		onError: (err: any) => {
			toast.error(err.response?.data?.message || "Gagal menghitung Jaspel");
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
			toast.success("Status Jaspel berhasil diperbarui");
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
			toast.success("Data perhitungan berhasil dihapus");
		},
	});

	const handleExport = async () => {
		try {
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
			toast.success("Berkas Excel Jaspel diunduh");
		} catch {
			toast.error("Gagal mengekspor data Jaspel");
		}
	};

	const fmtRp = (n: number) => new Intl.NumberFormat("id-ID").format(n || 0);
	const bulanNama = (m: number) =>
		new Date(2000, m - 1).toLocaleString("id-ID", { month: "long" });

	return (
		<div className="page-shell space-y-6">
			{/* Level 1: Page Header */}
			<PageHeader
				title="Kalkulator Jasa Pelayanan (Jaspel)"
				description="Penghitungan insentif jasa pelayanan medis berdasarkan poin ketenagaan, masa kerja, kehadiran, dan klaster."
			/>

			{/* Navigation Tabs */}
			<div className="inline-flex border border-border bg-card p-1 gap-1">
				<button
					type="button"
					onClick={() => setActiveTab("variables")}
					className={cn(
						"flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-colors border",
						activeTab === "variables"
							? "border-primary bg-primary text-primary-foreground"
							: "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
					)}
				>
					<Users className="h-3.5 w-3.5" />
					Variabel Ketenagaan
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("simulation")}
					className={cn(
						"flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-colors border",
						activeTab === "simulation"
							? "border-primary bg-primary text-primary-foreground"
							: "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
					)}
				>
					<Calculator className="h-3.5 w-3.5" />
					Simulasi & Perhitungan
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("history")}
					className={cn(
						"flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-colors border",
						activeTab === "history"
							? "border-primary bg-primary text-primary-foreground"
							: "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
					)}
				>
					<RefreshCw className="h-3.5 w-3.5" />
					Riwayat Distribusi
				</button>
			</div>

			{/* TAB 1: VARIABLES */}
			{activeTab === "variables" && (
				<div className="border border-border bg-card">
					<div className="p-4 border-b border-border bg-muted/30">
						<h3 className="text-sm font-bold text-foreground">
							Pengaturan Variabel Ketenagaan
						</h3>
						<p className="text-xs text-muted-foreground mt-0.5">
							Atur poin jenis ketenagaan, masa kerja, rangkap tugas, dan
							tanggung jawab klaster per pegawai.
						</p>
					</div>

					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Pegawai</TableHead>
								<TableHead className="text-center">
									1. Poin Ketenagaan
								</TableHead>
								<TableHead className="text-center">
									2. Masa Kerja (Thn)
								</TableHead>
								<TableHead className="text-center">
									3. Poin Masa Kerja
								</TableHead>
								<TableHead className="text-center">4. Rangkap Tugas</TableHead>
								<TableHead className="text-center">
									5. Tg Jawab Klaster
								</TableHead>
								<TableHead className="text-center">Total Poin</TableHead>
								<TableHead className="text-right">Aksi</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isVariablesLoading ? (
								[1, 2, 3].map((k) => (
									<TableRow key={k} className="animate-pulse">
										<TableCell colSpan={8} className="h-12 bg-card" />
									</TableRow>
								))
							) : variables.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={8}
										className="py-10 text-center text-xs text-muted-foreground"
									>
										Belum ada data pegawai.
									</TableCell>
								</TableRow>
							) : (
								variables.map((emp) => (
									<VariableRow key={emp.employeeId} employee={emp} />
								))
							)}
						</TableBody>
					</Table>

					<PaginationControls
						meta={variablesResponse?.meta}
						onPageChange={setVariablesPage}
						disabled={isVariablesFetching}
					/>
				</div>
			)}

			{/* TAB 2: SIMULATION */}
			{activeTab === "simulation" && (
				<div className="space-y-6">
					{/* Input Parameter Box */}
					<div className="border border-border bg-card p-5 space-y-4">
						<div className="border-b border-border/60 pb-3 flex flex-wrap items-center justify-between gap-2">
							<div>
								<h3 className="text-sm font-bold text-foreground">
									Parameter Dana Jasa Pelayanan
								</h3>
								<p className="text-xs text-muted-foreground">
									Tentukan periode dan pagu dana untuk menghitung distribusi per
									pegawai.
								</p>
							</div>
							{distributionsData?.fund && (
								<Badge
									variant={
										distributionsData.fund.status === "LOCKED"
											? "destructive"
											: distributionsData.fund.status === "FINAL"
												? "success"
												: "info"
									}
								>
									STATUS: {distributionsData.fund.status}
								</Badge>
							)}
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
							<div className="space-y-1.5">
								<label className="text-xs font-mono font-semibold uppercase text-muted-foreground">
									Bulan
								</label>
								<select
									value={month}
									onChange={(e) => setMonth(Number(e.target.value))}
									className="flex h-9 w-full border border-border bg-card px-2.5 text-xs font-mono"
								>
									{Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
										<option key={m} value={m}>
											{bulanNama(m)}
										</option>
									))}
								</select>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-mono font-semibold uppercase text-muted-foreground">
									Tahun
								</label>
								<Input
									type="number"
									value={year}
									onChange={(e) => setYear(Number(e.target.value))}
									className="font-mono text-xs"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-mono font-semibold uppercase text-muted-foreground">
									Nama Puskesmas
								</label>
								<Input
									placeholder={
										distributionsData?.fund?.namaPuskesmas || "Puskesmas"
									}
									value={namaPuskesmasInput}
									onChange={(e) => setNamaPuskesmasInput(e.target.value)}
									className="text-xs"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-mono font-semibold uppercase text-muted-foreground">
									Pendapatan (Rp)
								</label>
								<Input
									placeholder={fmtRp(distributionsData?.fund?.pendapatan || 0)}
									value={pendapatanInput}
									onChange={(e) => setPendapatanInput(e.target.value)}
									className="font-mono text-xs"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-mono font-semibold uppercase text-muted-foreground">
									Operasional (Rp)
								</label>
								<Input
									placeholder={fmtRp(distributionsData?.fund?.operasional || 0)}
									value={operasionalInput}
									onChange={(e) => setOperasionalInput(e.target.value)}
									className="font-mono text-xs"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-mono font-semibold uppercase text-primary">
									Pagu Jaspel (Rp) *
								</label>
								<Input
									placeholder={fmtRp(distributionsData?.fund?.totalFund || 0)}
									value={totalFundInput}
									onChange={(e) => setTotalFundInput(e.target.value)}
									className="font-mono text-xs font-bold"
								/>
							</div>
						</div>

						<div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
							<div className="flex flex-wrap items-center gap-2">
								<Button
									variant="primary"
									size="sm"
									onClick={handleCalculate}
									disabled={
										calculateMutation.isPending ||
										distributionsData?.fund?.status === "LOCKED"
									}
									className="gap-1.5"
								>
									{calculateMutation.isPending ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Calculator className="h-4 w-4" />
									)}
									Hitung Jaspel
								</Button>

								{distributionsData?.fund && (
									<>
										<Button
											variant="outline"
											size="sm"
											onClick={() => transition.mutate("review")}
											disabled={transition.isPending}
										>
											Tandai Review
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => transition.mutate("finalize")}
											disabled={transition.isPending}
										>
											Finalisasi
										</Button>
										{distributionsData.fund.status === "LOCKED" ? (
											<Button
												variant="secondary"
												size="sm"
												onClick={() => transition.mutate("unlock")}
												disabled={transition.isPending}
											>
												Buka Kunci
											</Button>
										) : (
											<Button
												variant="destructive"
												size="sm"
												onClick={() => transition.mutate("lock")}
												disabled={transition.isPending}
											>
												Kunci Periode
											</Button>
										)}
									</>
								)}
							</div>

							{distributionsData?.distributions?.length ? (
								<Button
									variant="outline"
									size="sm"
									onClick={handleExport}
									className="gap-1.5"
								>
									<FileDown className="h-4 w-4" />
									Export Excel
								</Button>
							) : null}
						</div>
					</div>

					{/* Distributions Table */}
					<div className="border border-border bg-card">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-10 text-center">No</TableHead>
									<TableHead>Pegawai</TableHead>
									<TableHead>Jabatan</TableHead>
									<TableHead className="text-center">
										Hadir / Hari Kerja
									</TableHead>
									<TableHead className="text-center">% Kehadiran</TableHead>
									<TableHead className="text-center">Poin Variabel</TableHead>
									<TableHead className="text-center">Total Poin</TableHead>
									<TableHead className="text-right">
										Terima Bersih (Rp)
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{isDistributionsLoading ? (
									<TableRow>
										<TableCell colSpan={8} className="py-10 text-center">
											<Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
										</TableCell>
									</TableRow>
								) : !distributionsData?.distributions?.length ? (
									<TableRow>
										<TableCell
											colSpan={8}
											className="py-12 text-center text-xs text-muted-foreground"
										>
											Belum ada data perhitungan pada bulan ini. Masukkan
											nominal Pagu Jaspel dan klik Hitung Jaspel.
										</TableCell>
									</TableRow>
								) : (
									distributionsData.distributions.map((dist, idx) => (
										<TableRow key={dist.employeeId}>
											<TableCell className="text-center font-mono text-xs text-muted-foreground">
												{idx + 1}
											</TableCell>
											<TableCell>
												<div className="flex flex-col">
													<span className="font-bold text-foreground text-xs">
														{dist.name}
													</span>
													<span className="font-mono text-[10px] text-muted-foreground">
														{dist.employeeCode}
													</span>
												</div>
											</TableCell>
											<TableCell className="text-xs text-muted-foreground">
												{dist.position || "—"}
											</TableCell>
											<TableCell className="text-center font-mono text-xs">
												{dist.hariMasukKerja} / {dist.hariKerja}
											</TableCell>
											<TableCell className="text-center font-mono text-xs">
												{(dist.persentaseKehadiran * 100).toFixed(0)}%
											</TableCell>
											<TableCell className="text-center font-mono text-xs">
												{dist.poinVariabelKetenagaan.toFixed(2)}
											</TableCell>
											<TableCell className="text-center font-mono text-xs font-bold text-primary">
												{dist.jumlahTotalPoin.toFixed(2)}
											</TableCell>
											<TableCell className="text-right font-mono text-xs font-bold text-foreground">
												Rp {fmtRp(dist.finalAmount)}
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>

						<PaginationControls
							meta={distributionsData?.meta}
							onPageChange={setDistributionsPage}
							disabled={isDistributionsFetching}
						/>
					</div>
				</div>
			)}

			{/* TAB 3: HISTORY */}
			{activeTab === "history" && (
				<div className="border border-border bg-card">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Periode</TableHead>
								<TableHead>Unit Puskesmas</TableHead>
								<TableHead className="text-right">Pendapatan</TableHead>
								<TableHead className="text-right">Pagu Jaspel</TableHead>
								<TableHead className="text-center">Status</TableHead>
								<TableHead className="text-right">Aksi</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isHistoryLoading ? (
								<TableRow>
									<TableCell colSpan={6} className="py-10 text-center">
										<Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
									</TableCell>
								</TableRow>
							) : !historyData?.length ? (
								<TableRow>
									<TableCell
										colSpan={6}
										className="py-12 text-center text-xs text-muted-foreground"
									>
										Belum ada riwayat perhitungan Jaspel yang tersimpan.
									</TableCell>
								</TableRow>
							) : (
								historyData.map((item) => (
									<TableRow key={`${item.month}-${item.year}`}>
										<TableCell className="font-bold text-foreground text-xs">
											{bulanNama(item.month)} {item.year}
										</TableCell>
										<TableCell className="text-xs text-muted-foreground">
											{item.namaPuskesmas || "—"}
										</TableCell>
										<TableCell className="text-right font-mono text-xs text-muted-foreground">
											Rp {fmtRp(item.pendapatan)}
										</TableCell>
										<TableCell className="text-right font-mono text-xs font-bold text-foreground">
											Rp {fmtRp(item.totalFund)}
										</TableCell>
										<TableCell className="text-center">
											<Badge
												variant={
													item.status === "LOCKED"
														? "destructive"
														: item.status === "FINAL"
															? "success"
															: "secondary"
												}
												className="text-[10px]"
											>
												{item.status}
											</Badge>
										</TableCell>
										<TableCell className="text-right">
											<div className="flex items-center justify-end gap-2">
												<Button
													variant="outline"
													size="sm"
													className="text-xs h-7"
													onClick={() => {
														setMonth(item.month);
														setYear(item.year);
														setActiveTab("simulation");
													}}
												>
													Buka Detail
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="h-7 w-7 text-destructive"
													disabled={deleteMutation.isPending}
													onClick={() => {
														if (
															window.confirm(
																`Hapus perhitungan Jaspel ${bulanNama(item.month)} ${item.year}?`,
															)
														) {
															deleteMutation.mutate({
																month: item.month,
																year: item.year,
															});
														}
													}}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}

function VariableRow({ employee }: { employee: JaspelVariable }) {
	const queryClient = useQueryClient();
	const [jenis, setJenis] = React.useState(employee.jenisKetenagaanPoin);
	const [masaKerja, setMasaKerja] = React.useState(employee.masaKerja);
	const [masaKerjaPoin, setMasaKerjaPoin] = React.useState(
		employee.masaKerjaPoin,
	);
	const [rangkap, setRangkap] = React.useState(employee.rangkapTugas);
	const [klaster, setKlaster] = React.useState(employee.tanggungJawabKlaster);
	const [isEditing, setIsEditing] = React.useState(false);

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
			toast.success(`Variabel ${employee.name} disimpan`);
		},
	});

	const total =
		Number(jenis) + Number(masaKerjaPoin) + Number(rangkap) + Number(klaster);

	const inputClass =
		"w-16 h-7 px-2 border border-border bg-card font-mono text-xs text-center focus:border-primary focus:outline-none";

	return (
		<TableRow>
			<TableCell>
				<div className="flex flex-col">
					<span className="font-bold text-foreground text-xs">
						{employee.name}
					</span>
					<span className="text-[11px] font-mono text-muted-foreground">
						{employee.employeeCode}
						{employee.position ? ` · ${employee.position}` : ""}
					</span>
				</div>
			</TableCell>
			<TableCell className="text-center font-mono text-xs">
				{isEditing ? (
					<input
						type="number"
						value={jenis}
						onChange={(e) => setJenis(Number(e.target.value))}
						className={inputClass}
					/>
				) : (
					employee.jenisKetenagaanPoin
				)}
			</TableCell>
			<TableCell className="text-center font-mono text-xs">
				{isEditing ? (
					<input
						type="number"
						value={masaKerja}
						onChange={(e) => setMasaKerja(Number(e.target.value))}
						className={inputClass}
					/>
				) : (
					employee.masaKerja
				)}
			</TableCell>
			<TableCell className="text-center font-mono text-xs">
				{isEditing ? (
					<input
						type="number"
						value={masaKerjaPoin}
						onChange={(e) => setMasaKerjaPoin(Number(e.target.value))}
						className={inputClass}
					/>
				) : (
					employee.masaKerjaPoin
				)}
			</TableCell>
			<TableCell className="text-center font-mono text-xs">
				{isEditing ? (
					<input
						type="number"
						value={rangkap}
						onChange={(e) => setRangkap(Number(e.target.value))}
						className={inputClass}
					/>
				) : (
					employee.rangkapTugas || "—"
				)}
			</TableCell>
			<TableCell className="text-center font-mono text-xs">
				{isEditing ? (
					<input
						type="number"
						value={klaster}
						onChange={(e) => setKlaster(Number(e.target.value))}
						className={inputClass}
					/>
				) : (
					employee.tanggungJawabKlaster || "—"
				)}
			</TableCell>
			<TableCell className="text-center font-mono text-xs font-bold text-primary">
				{total.toFixed(2)}
			</TableCell>
			<TableCell className="text-right">
				{isEditing ? (
					<div className="flex items-center justify-end gap-1.5">
						<Button
							variant="outline"
							size="sm"
							className="h-7 text-xs px-2"
							onClick={() => setIsEditing(false)}
						>
							Batal
						</Button>
						<Button
							variant="primary"
							size="sm"
							className="h-7 text-xs px-2 gap-1"
							onClick={() => updateMutation.mutate()}
							disabled={updateMutation.isPending}
						>
							<Save className="h-3 w-3" />
							Simpan
						</Button>
					</div>
				) : (
					<Button
						variant="ghost"
						size="sm"
						className="h-7 text-xs text-primary hover:underline"
						onClick={() => setIsEditing(true)}
					>
						Ubah
					</Button>
				)}
			</TableCell>
		</TableRow>
	);
}
