"use client";

import type {
	CreateEmployee,
	Employee,
	Shift,
	UpdateEmployee,
} from "@adms/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
	BadgeCheck,
	BriefcaseBusiness,
	Clock,
	Edit2,
	Search,
	Trash2,
	UserPlus,
	Users,
	X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import EmployeeForm from "@/components/employee-form";
import PaginationControls, {
	type PageMeta,
} from "@/components/pagination-controls";
import api from "@/lib/api";
import { useModalAccessibility } from "@/lib/use-modal-accessibility";

export default function EmployeesPage() {
	const queryClient = useQueryClient();
	const [search, setSearch] = useState(() =>
		typeof window === "undefined"
			? ""
			: (new URLSearchParams(window.location.search).get("search") ?? ""),
	);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
		null,
	);
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [page, setPage] = useState(1);
	const [isBulkShiftOpen, setIsBulkShiftOpen] = useState(false);
	const [bulkShiftIds, setBulkShiftIds] = useState<number[]>([]);
	const [bulkShiftStartDate, setBulkShiftStartDate] = useState("");
	const [bulkShiftEndDate, setBulkShiftEndDate] = useState("");
	const [bulkShiftError, setBulkShiftError] = useState("");
	const [bulkShiftAll, setBulkShiftAll] = useState(false);
	const bulkShiftDialogRef = useRef<HTMLDivElement>(null);
	const closeBulkShift = useCallback(() => setIsBulkShiftOpen(false), []);
	useModalAccessibility(bulkShiftDialogRef, closeBulkShift, isBulkShiftOpen);

	const {
		data: response,
		isLoading,
		isFetching,
	} = useQuery<{ data: Employee[]; meta: PageMeta }>({
		queryKey: ["employees", page, search],
		queryFn: async () => {
			const res = await api.get(
				`/employees?page=${page}&limit=10&search=${encodeURIComponent(search)}`,
			);
			return res.data;
		},
	});
	const employees = response?.data ?? [];

	const { data: shiftsResponse } = useQuery<{ data: Shift[] }>({
		queryKey: ["shifts"],
		queryFn: async () => {
			const res = await api.get("/shifts?page=1&limit=100");
			return res.data;
		},
	});
	const shifts = shiftsResponse?.data;

	const createMutation = useMutation({
		mutationFn: async (data: CreateEmployee) => {
			await api.post("/employees", data);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["employees"] });
			setIsFormOpen(false);
		},
	});

	const updateMutation = useMutation({
		mutationFn: async ({ id, data }: { id: number; data: UpdateEmployee }) => {
			await api.patch(`/employees/${id}`, data);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["employees"] });
			setIsFormOpen(false);
			setSelectedEmployee(null);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: number) => {
			await api.delete(`/employees/${id}`);
		},
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: ["employees"] });
			setSelectedIds((prev) => prev.filter((prevId) => prevId !== id));
		},
	});

	const bulkShiftMutation = useMutation({
		mutationFn: async () => {
			await api.patch("/employees/bulk/shift", {
				employeeIds: bulkShiftAll ? undefined : selectedIds,
				allEmployees: bulkShiftAll || undefined,
				shiftIds: bulkShiftIds,
				startDate: bulkShiftStartDate,
				endDate: bulkShiftEndDate,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["employees"] });
			setIsBulkShiftOpen(false);
			setSelectedIds([]);
			setBulkShiftIds([]);
			setBulkShiftStartDate("");
			setBulkShiftEndDate("");
			setBulkShiftError("");
			setBulkShiftAll(false);
			alert("Berhasil memperbarui shift pegawai terpilih.");
		},
		onError: (err: {
			response?: {
				data?: {
					message?: string;
					details?: {
						conflicts?: Array<{
							employeeName: string;
							startDate: string;
							endDate: string | null;
						}>;
					};
				};
			};
			message?: string;
		}) => {
			const conflicts = err.response?.data?.details?.conflicts;
			setBulkShiftError(
				conflicts?.length
					? `${err.response?.data?.message}: ${conflicts
							.slice(0, 3)
							.map(
								(item) =>
									`${item.employeeName} (${item.startDate}–${item.endDate ?? "seterusnya"})`,
							)
							.join(", ")}`
					: err.response?.data?.message || err.message || "Gagal update shift",
			);
		},
	});

	const handleSubmit = (data: CreateEmployee) => {
		if (selectedEmployee) {
			updateMutation.mutate({ id: selectedEmployee.id, data });
		} else {
			createMutation.mutate(data);
		}
	};

	const handleEdit = (employee: Employee) => {
		setSelectedEmployee(employee);
		setIsFormOpen(true);
	};

	const filteredEmployees = employees;
	const activeEmployees = employees.filter(
		(employee) => employee.isActive,
	).length;
	const departments = new Set(
		employees.map((employee) => employee.department).filter(Boolean),
	).size;

	return (
		<motion.div
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.35 }}
			className="mx-auto flex min-h-0 max-w-[1440px] flex-col gap-5 md:min-h-[calc(100vh-6rem)] md:gap-6"
		>
			<header className="flex shrink-0 flex-col gap-5 border-b border-[#d5ded9] pb-5 sm:flex-row sm:items-end sm:justify-between md:pb-6">
				<div className="max-w-2xl">
					<div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#087066]">
						<span className="h-px w-6 bg-[#087066]" />
						Direktori SDM
					</div>
					<h2 className="text-[28px] leading-tight md:text-[34px]">
						Manajemen pegawai
					</h2>
					<p className="mt-2 max-w-xl text-sm leading-6">
						Kelola identitas, unit kerja, jabatan, dan penempatan shift dalam
						satu direktori.
					</p>
				</div>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => {
							setBulkShiftAll(true);
							setIsBulkShiftOpen(true);
						}}
						className="adms-button w-full sm:w-auto"
					>
						<Clock size={17} /> Atur Shift Semua
					</button>
					<button
						type="button"
						onClick={() => setIsFormOpen(true)}
						className="adms-button w-full sm:w-auto"
					>
						<UserPlus size={17} /> Tambah pegawai
					</button>
				</div>
			</header>

			<section
				aria-label="Ringkasan pegawai"
				className="grid overflow-hidden border border-[#d5ded9] bg-white sm:grid-cols-3"
			>
				<div className="flex items-center gap-4 p-4 sm:border-r sm:border-[#d5ded9] md:p-5">
					<div className="flex h-10 w-10 items-center justify-center bg-[#dceae5] text-[#087066]">
						<Users size={19} />
					</div>
					<div>
						<p className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em]">
							Total pegawai
						</p>
						<strong className="block text-2xl tabular-nums text-[#14211d]">
							{response?.meta.total ?? 0}
						</strong>
					</div>
				</div>
				<div className="flex items-center gap-4 border-t border-[#d5ded9] p-4 sm:border-r sm:border-t-0 md:p-5">
					<div className="flex h-10 w-10 items-center justify-center bg-[#e8f3ec] text-[#23734b]">
						<BadgeCheck size={19} />
					</div>
					<div>
						<p className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em]">
							Aktif di halaman
						</p>
						<strong className="block text-2xl tabular-nums text-[#14211d]">
							{activeEmployees}
						</strong>
					</div>
				</div>
				<div className="flex items-center gap-4 border-t border-[#d5ded9] p-4 sm:border-t-0 md:p-5">
					<div className="flex h-10 w-10 items-center justify-center bg-[#eaf0ed] text-[#53635d]">
						<BriefcaseBusiness size={19} />
					</div>
					<div>
						<p className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em]">
							Unit di halaman
						</p>
						<strong className="block text-2xl tabular-nums text-[#14211d]">
							{departments}
						</strong>
					</div>
				</div>
			</section>

			{/* Bulk Actions Bar */}
			{selectedIds.length > 0 && (
				<div className="flex flex-col items-stretch gap-3 border border-[#087066] bg-[#14211d] px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-2 text-[14px] font-semibold">
						<span className="border border-white/20 px-2 py-0.5 font-mono">
							{selectedIds.length}
						</span>
						Pegawai Terpilih
					</div>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => setIsBulkShiftOpen(true)}
							className="min-h-10 border border-white bg-white px-3 text-[13px] font-bold text-[#14211d] hover:bg-[#eaf0ed]"
						>
							Atur Shift
						</button>
						<button
							type="button"
							onClick={() => setSelectedIds([])}
							className="min-h-10 border border-white/30 px-3 text-[13px] font-medium text-white hover:bg-white/10"
						>
							Batal
						</button>
					</div>
				</div>
			)}

			{/* Data Table Container */}
			<section className="flex flex-1 flex-col overflow-hidden border border-[#d5ded9] bg-white">
				{/* Toolbar */}
				<header className="flex flex-col items-start justify-between gap-4 border-b border-[#d5ded9] bg-[#eaf0ed] p-4 sm:flex-row sm:items-center">
					<div className="flex items-center gap-3 w-full sm:w-auto">
						<div className="relative w-full sm:w-64">
							<Search
								className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#53635d]"
								size={16}
							/>
							<input
								className="w-full py-2 pl-9 pr-3 text-sm"
								placeholder="Cari NIP atau nama..."
								type="search"
								value={search}
								onChange={(e) => {
									setSearch(e.target.value);
									setPage(1);
								}}
							/>
						</div>
					</div>
					<div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#53635d]">
						<span>
							{isFetching ? "Memperbarui" : `${response?.meta.total || 0} data`}
						</span>
					</div>
				</header>

				{/* Table */}
				<div className="mobile-scroll-hint">
					Geser tabel untuk melihat kolom lainnya
				</div>
				<div className="flex-1 overflow-auto custom-scrollbar">
					<table className="w-full text-left border-collapse min-w-[800px]">
						<thead className="sticky top-0 bg-[#f9f9ff] shadow-sm z-10 border-b border-black/5">
							<tr>
								<th className="py-3 px-4 font-sans text-[12px] font-semibold text-[#6e797e] whitespace-nowrap w-12">
									<input
										type="checkbox"
										checked={
											filteredEmployees.length > 0 &&
											selectedIds.length === filteredEmployees.length
										}
										onChange={(e) => {
											if (e.target.checked) {
												setSelectedIds(filteredEmployees.map((e) => e.id));
											} else {
												setSelectedIds([]);
											}
										}}
										className="w-4 h-4 rounded border-[#bdc8ce] text-[#00647c] focus:ring-[#00647c]/50 cursor-pointer"
									/>
								</th>
								<th className="py-3 px-4 font-sans text-[12px] font-semibold text-[#6e797e] whitespace-nowrap">
									NIP
								</th>
								<th className="py-3 px-4 font-sans text-[12px] font-semibold text-[#6e797e] whitespace-nowrap">
									Nama Pegawai
								</th>
								<th className="py-3 px-4 font-sans text-[12px] font-semibold text-[#6e797e] whitespace-nowrap">
									Departemen
								</th>
								<th className="py-3 px-4 font-sans text-[12px] font-semibold text-[#6e797e] whitespace-nowrap">
									Jabatan
								</th>
								<th className="py-3 px-4 font-sans text-[12px] font-semibold text-[#6e797e] whitespace-nowrap text-center">
									Biometrik
								</th>
								<th className="py-3 px-4 font-sans text-[12px] font-semibold text-[#6e797e] whitespace-nowrap text-right">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-black/5">
							{isLoading ? (
								[1, 2, 3].map((k) => (
									<tr key={k} className="animate-pulse">
										<td colSpan={7} className="px-4 py-4 h-12 bg-white" />
									</tr>
								))
							) : filteredEmployees?.length === 0 ? (
								<tr>
									<td
										colSpan={7}
										className="py-16 text-center text-[#6e797e] text-sm"
									>
										Tidak ada data pegawai yang ditemukan.
									</td>
								</tr>
							) : (
								filteredEmployees?.map((emp, index) => (
									<tr
										key={emp.id}
										className={`group hover:bg-[#dee8ff]/30 transition-colors h-12 ${
											selectedIds.includes(emp.id)
												? "bg-[#dee8ff]/50"
												: index % 2 === 1
													? "bg-[#f0f3ff]/30"
													: ""
										}`}
									>
										<td className="py-2 px-4">
											<input
												type="checkbox"
												checked={selectedIds.includes(emp.id)}
												onChange={(e) => {
													if (e.target.checked) {
														setSelectedIds([...selectedIds, emp.id]);
													} else {
														setSelectedIds(
															selectedIds.filter((id) => id !== emp.id),
														);
													}
												}}
												className="w-4 h-4 rounded border-[#bdc8ce] text-[#00647c] focus:ring-[#00647c]/50 cursor-pointer"
											/>
										</td>
										<td className="py-2 px-4 font-mono text-[13px] text-[#3e484d]">
											{emp.employeeCode}
										</td>
										<td className="py-2 px-4 font-medium text-[14px] text-[#111c2d]">
											{emp.name}
										</td>
										<td className="py-2 px-4 text-[14px] text-[#3e484d]">
											{emp.department || "-"}
										</td>
										<td className="py-2 px-4 text-[14px] text-[#3e484d]">
											{emp.position || "-"}
										</td>
										<td className="py-2 px-4 text-center">
											<span className="adms-pill-neutral">Belum tersedia</span>
										</td>
										<td className="py-2 px-4 text-right opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
											<button
												type="button"
												onClick={() => handleEdit(emp)}
												className="p-1.5 text-[#6e797e] hover:text-[#00647c] transition-colors"
											>
												<Edit2 size={16} />
											</button>
											<button
												type="button"
												onClick={() => {
													if (confirm("Yakin ingin menghapus pegawai ini?")) {
														deleteMutation.mutate(emp.id);
													}
												}}
												className="p-1.5 text-[#6e797e] hover:text-[#ba1a1a] transition-colors"
											>
												<Trash2 size={16} />
											</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
				<PaginationControls
					meta={response?.meta}
					onPageChange={(next) => {
						setSelectedIds([]);
						setPage(next);
					}}
					disabled={isFetching}
				/>
			</section>

			{isFormOpen && (
				<EmployeeForm
					onClose={() => {
						setIsFormOpen(false);
						setSelectedEmployee(null);
					}}
					onSubmit={handleSubmit}
					initialData={selectedEmployee || undefined}
				/>
			)}

			{isBulkShiftOpen && (
				<div
					ref={bulkShiftDialogRef}
					className="fixed inset-0 z-[100] flex items-end justify-center bg-[#111c2d]/40 p-0 sm:items-center sm:p-4"
					role="dialog"
					aria-modal="true"
					aria-labelledby="bulk-shift-title"
				>
					<div className="max-h-[calc(100dvh-env(safe-area-inset-top))] w-full max-w-md overflow-y-auto rounded-t-xl bg-white shadow-xl animate-in fade-in zoom-in duration-200 sm:max-h-[90dvh] sm:rounded-md">
						<div className="px-6 py-5 border-b border-black/5 flex items-center justify-between bg-[#f9f9ff]">
							<h3
								id="bulk-shift-title"
								className="text-xl font-bold text-[#111c2d] font-display"
							>
								Atur Shift Pegawai
							</h3>
							<button
								type="button"
								onClick={() => setIsBulkShiftOpen(false)}
								className="p-2 hover:bg-black/5 rounded-full text-[#6e797e] hover:text-[#111c2d] transition-all"
							>
								<X size={20} />
							</button>
						</div>

						<div className="p-6 space-y-4">
							<p className="text-[14px] text-[#3e484d]">
								Atur shift dan periode berlaku untuk{" "}
								<strong>{bulkShiftAll ? "semua" : selectedIds.length}</strong>{" "}
								pegawai.
							</p>
							<label className="flex items-center gap-3 cursor-pointer">
								<input
									type="checkbox"
									checked={bulkShiftAll}
									onChange={(e) => setBulkShiftAll(e.target.checked)}
									className="w-4 h-4 rounded border-[#bdc8ce] text-[#00647c] focus:ring-[#00647c]/50 cursor-pointer"
								/>
								<span className="text-[13px] font-semibold text-[#3e484d]">
									Terapkan ke semua pegawai
								</span>
							</label>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<label className="text-[13px] font-semibold text-[#3e484d]">
									Tanggal mulai
									<input
										type="date"
										value={bulkShiftStartDate}
										max={bulkShiftEndDate || undefined}
										onChange={(event) => {
											setBulkShiftStartDate(event.target.value);
											setBulkShiftError("");
										}}
										className="mt-1 w-full border border-[#bdc8ce] px-3 py-2 text-[14px]"
									/>
								</label>
								<label className="text-[13px] font-semibold text-[#3e484d]">
									Tanggal selesai
									<input
										type="date"
										value={bulkShiftEndDate}
										min={bulkShiftStartDate || undefined}
										onChange={(event) => {
											setBulkShiftEndDate(event.target.value);
											setBulkShiftError("");
										}}
										className="mt-1 w-full border border-[#bdc8ce] px-3 py-2 text-[14px]"
									/>
								</label>
							</div>
							<div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar border rounded-xl p-2 border-black/5">
								{shifts?.map((shift) => (
									<label
										key={shift.id}
										className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
											bulkShiftIds.includes(shift.id)
												? "border-[#00647c] bg-[#f0f3ff]"
												: "border-transparent hover:border-[#bdc8ce] hover:bg-black/5"
										}`}
									>
										<input
											type="checkbox"
											checked={bulkShiftIds.includes(shift.id)}
											onChange={(event) => {
												setBulkShiftError("");
												setBulkShiftIds(
													event.target.checked
														? [...bulkShiftIds, shift.id]
														: bulkShiftIds.filter((id) => id !== shift.id),
												);
											}}
											className="mt-0.5 w-4 h-4 rounded border-[#bdc8ce] text-[#00647c] focus:ring-[#00647c]/50 cursor-pointer"
										/>
										<div className="flex flex-col">
											<span className="text-[13px] font-semibold text-[#111c2d]">
												{shift.name}
											</span>
											<span className="text-[12px] text-[#6e797e]">
												{shift.startTime} - {shift.endTime}
											</span>
										</div>
									</label>
								))}
							</div>
							{bulkShiftError && (
								<p
									role="alert"
									className="border border-[#ba1a1a]/30 bg-[#ba1a1a]/5 p-3 text-[13px] text-[#8f1616]"
								>
									{bulkShiftError}
								</p>
							)}
							<div className="pt-4 flex gap-3">
								<button
									type="button"
									onClick={() => setIsBulkShiftOpen(false)}
									className="flex-1 px-6 py-2.5 rounded-xl font-semibold border border-[#bdc8ce] bg-white text-[#3e484d] hover:bg-[#f9f9ff] transition-all text-[14px]"
								>
									Batal
								</button>
								<button
									type="button"
									onClick={() => bulkShiftMutation.mutate()}
									disabled={
										bulkShiftMutation.isPending ||
										bulkShiftIds.length === 0 ||
										!bulkShiftStartDate ||
										!bulkShiftEndDate ||
										bulkShiftEndDate < bulkShiftStartDate ||
										(!bulkShiftAll && selectedIds.length === 0)
									}
									className="flex-1 bg-[#00647c] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#007f9d] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-[14px] disabled:opacity-50"
								>
									{bulkShiftMutation.isPending
										? "Menyimpan..."
										: "Terapkan Shift"}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</motion.div>
	);
}
