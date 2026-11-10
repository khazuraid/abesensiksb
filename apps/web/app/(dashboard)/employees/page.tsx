"use client";

import type {
	CreateEmployee,
	Employee,
	Shift,
	UpdateEmployee,
} from "@adms/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Briefcase,
	ChevronDown,
	ChevronRight,
	Edit2,
	Plus,
	Search,
	Trash2,
	UserCheck,
	Users,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import EmployeeForm from "@/components/employee-form";
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
import { cn } from "@/lib/utils";

export default function EmployeesPage() {
	const queryClient = useQueryClient();
	const [search, setSearch] = React.useState(() =>
		typeof window === "undefined"
			? ""
			: (new URLSearchParams(window.location.search).get("search") ?? ""),
	);
	const [isFormOpen, setIsFormOpen] = React.useState(false);
	const [selectedEmployee, setSelectedEmployee] =
		React.useState<Employee | null>(null);
	const [expandedRowId, setExpandedRowId] = React.useState<number | null>(null);
	const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
	const [page, setPage] = React.useState(1);

	// Bulk shift state
	const [isBulkShiftOpen, setIsBulkShiftOpen] = React.useState(false);
	const [bulkShiftIds, setBulkShiftIds] = React.useState<number[]>([]);
	const [bulkShiftError, setBulkShiftError] = React.useState("");
	const [bulkShiftAll, setBulkShiftAll] = React.useState(false);

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

	const { data: shiftsResponse } = useQuery<{ data: Shift[] }>({
		queryKey: ["shifts", "list"],
		queryFn: async () => {
			const res = await api.get("/shifts?page=1&limit=100");
			return res.data;
		},
	});
	const shifts = shiftsResponse?.data || [];

	const createMutation = useMutation({
		mutationFn: (data: CreateEmployee) => api.post("/employees", data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["employees"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
			setIsFormOpen(false);
			toast.success("Pegawai berhasil ditambahkan");
		},
		onError: (err: any) => {
			toast.error(err.response?.data?.message || "Gagal menambahkan pegawai");
		},
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, data }: { id: number; data: UpdateEmployee }) =>
			api.put(`/employees/${id}`, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["employees"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
			setIsFormOpen(false);
			setSelectedEmployee(null);
			toast.success("Data pegawai berhasil diperbarui");
		},
		onError: (err: any) => {
			toast.error(err.response?.data?.message || "Gagal memperbarui pegawai");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: number) => api.delete(`/employees/${id}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["employees"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
			toast.success("Pegawai berhasil dihapus");
		},
		onError: (err: any) => {
			toast.error(err.response?.data?.message || "Gagal menghapus pegawai");
		},
	});

	const bulkShiftMutation = useMutation({
		mutationFn: async () => {
			if (bulkShiftIds.length === 0) {
				throw new Error("Pilih minimal satu shift");
			}
			const payload = {
				employeeIds: bulkShiftAll ? [] : selectedIds,
				allFiltered: bulkShiftAll,
				search: bulkShiftAll ? search : undefined,
				shiftIds: bulkShiftIds,
			};
			return (await api.post("/employees/bulk-shifts", payload)).data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["employees"] });
			setIsBulkShiftOpen(false);
			setSelectedIds([]);
			setBulkShiftIds([]);
			setBulkShiftAll(false);
			toast.success("Berhasil memperbarui shift pegawai terpilih");
		},
		onError: (err: any) => {
			setBulkShiftError(
				err.response?.data?.message || err.message || "Gagal memperbarui shift",
			);
		},
	});

	const employees = response?.data || [];
	const activeCount = employees.filter((e) => e.isActive).length;
	const departmentsCount = new Set(
		employees.map((e) => e.department).filter(Boolean),
	).size;

	const handleRowToggle = (id: number) => {
		setExpandedRowId((prev) => (prev === id ? null : id));
	};

	return (
		<div className="page-shell space-y-6">
			{/* Level 1: Page Header */}
			<PageHeader
				title="Manajemen Pegawai"
				description="Kelola data induk pegawai, penempatan divisi, alokasi shift, dan kredensial mesin ADMS."
				action={
					<Button
						variant="primary"
						size="sm"
						onClick={() => {
							setSelectedEmployee(null);
							setIsFormOpen(true);
						}}
						className="gap-1.5"
					>
						<Plus className="h-4 w-4" />
						Tambah Pegawai
					</Button>
				}
			/>

			{/* KPI Stat Cards */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<StatCard
					title="Total Terdaftar"
					value={response?.meta?.total ?? employees.length}
					icon={<Users className="h-4 w-4" />}
					description="Jumlah pegawai di sistem"
				/>
				<StatCard
					title="Pegawai Aktif"
					value={activeCount}
					icon={<UserCheck className="h-4 w-4 text-emerald-600" />}
					description="Status kepegawaian aktif"
				/>
				<StatCard
					title="Unit / Divisi"
					value={departmentsCount}
					icon={<Briefcase className="h-4 w-4 text-primary" />}
					description="Divisi kerja terdata"
				/>
			</div>

			{/* Bulk Actions Alert Bar */}
			{selectedIds.length > 0 && (
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border border-primary bg-primary-subtle p-3.5 text-foreground">
					<div className="flex items-center gap-2 text-xs font-semibold font-mono">
						<span className="border border-primary/30 bg-card px-2 py-0.5">
							{selectedIds.length}
						</span>
						Pegawai Terpilih
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="primary"
							size="sm"
							onClick={() => {
								setBulkShiftError("");
								setIsBulkShiftOpen(true);
							}}
							className="text-xs"
						>
							Atur Shift Bersama
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setSelectedIds([])}
							className="text-xs"
						>
							Batal Pilihan
						</Button>
					</div>
				</div>
			)}

			{/* Data Table Section */}
			<div className="border border-border bg-card">
				{/* Level 2: Toolbar Row */}
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border bg-muted/30 p-3.5">
					<div className="relative w-full sm:w-72">
						<Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
						<Input
							placeholder="Cari NIP atau nama pegawai..."
							type="search"
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setPage(1);
							}}
							className="pl-8 text-xs h-8 bg-card"
						/>
					</div>
					<div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
						<span>
							{isFetching
								? "Memperbarui..."
								: `${response?.meta?.total || 0} Data Terdaftar`}
						</span>
					</div>
				</div>

				{/* Table with Containment and Inline Expandable Rows */}
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-10 text-center">
								<input
									type="checkbox"
									checked={
										employees.length > 0 &&
										selectedIds.length === employees.length
									}
									onChange={(e) => {
										if (e.target.checked) {
											setSelectedIds(employees.map((emp) => emp.id));
										} else {
											setSelectedIds([]);
										}
									}}
									className="h-4 w-4 cursor-pointer accent-emerald-600 rounded-none"
									aria-label="Pilih semua"
								/>
							</TableHead>
							<TableHead className="w-8" />
							<TableHead>NIP</TableHead>
							<TableHead>Nama Pegawai</TableHead>
							<TableHead>Departemen</TableHead>
							<TableHead>Jabatan</TableHead>
							<TableHead>Status</TableHead>
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
						) : employees.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={8}
									className="py-12 text-center text-xs text-muted-foreground"
								>
									Tidak ada pegawai yang ditemukan.
								</TableCell>
							</TableRow>
						) : (
							employees.map((emp) => {
								const isExpanded = expandedRowId === emp.id;
								const isSelected = selectedIds.includes(emp.id);

								return (
									<React.Fragment key={emp.id}>
										<TableRow
											onClick={() => handleRowToggle(emp.id)}
											className={cn(
												"cursor-pointer select-none",
												isSelected && "bg-primary-subtle/50",
												isExpanded && "bg-muted/40",
											)}
										>
											<TableCell
												className="text-center"
												onClick={(e) => e.stopPropagation()}
											>
												<input
													type="checkbox"
													checked={isSelected}
													onChange={(e) => {
														if (e.target.checked) {
															setSelectedIds([...selectedIds, emp.id]);
														} else {
															setSelectedIds(
																selectedIds.filter((id) => id !== emp.id),
															);
														}
													}}
													className="h-4 w-4 cursor-pointer accent-emerald-600 rounded-none"
												/>
											</TableCell>
											<TableCell className="p-0 text-center text-muted-foreground">
												{isExpanded ? (
													<ChevronDown className="h-4 w-4 inline" />
												) : (
													<ChevronRight className="h-4 w-4 inline" />
												)}
											</TableCell>
											<TableCell className="font-mono text-xs text-muted-foreground">
												{emp.employeeCode}
											</TableCell>
											<TableCell className="font-medium text-foreground">
												{emp.name}
											</TableCell>
											<TableCell className="text-xs text-muted-foreground">
												{emp.department || "—"}
											</TableCell>
											<TableCell className="text-xs text-muted-foreground">
												{emp.position || "—"}
											</TableCell>
											<TableCell>
												<Badge
													variant={emp.isActive ? "success" : "default"}
													className="text-[10px]"
												>
													{emp.isActive ? "AKTIF" : "NONAKTIF"}
												</Badge>
											</TableCell>
											<TableCell
												className="text-right"
												onClick={(e) => e.stopPropagation()}
											>
												<div className="flex items-center justify-end gap-1">
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 text-muted-foreground hover:text-foreground"
														onClick={() => {
															setSelectedEmployee(emp);
															setIsFormOpen(true);
														}}
														title="Ubah data"
													>
														<Edit2 className="h-3.5 w-3.5" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 text-muted-foreground hover:text-destructive"
														onClick={() => {
															if (
																confirm(
																	`Yakin ingin menghapus pegawai ${emp.name}?`,
																)
															) {
																deleteMutation.mutate(emp.id);
															}
														}}
														title="Hapus"
													>
														<Trash2 className="h-3.5 w-3.5" />
													</Button>
												</div>
											</TableCell>
										</TableRow>

										{/* Inline Expandable Row Details */}
										{isExpanded && (
											<TableRow className="bg-muted/30 border-b border-border/80">
												<TableCell colSpan={8} className="p-5">
													<div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-border bg-card p-4">
														<div className="space-y-1">
															<span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
																Identitas Kepegawaian & ADMS
															</span>
															<p className="text-xs font-mono text-foreground">
																ID Biometrik:{" "}
																{emp.biometricId || "Otomatis NIP"}
															</p>
															<p className="text-xs font-mono text-foreground">
																Golongan: {emp.golongan || "—"} · Pendidikan:{" "}
																{emp.pendidikan || "—"}
															</p>
														</div>

														<div className="space-y-1 md:col-span-2">
															<span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
																Shift Kerja Terdaftar
															</span>
															<div className="flex flex-wrap gap-1.5 pt-1">
																{emp.shiftAssignments &&
																emp.shiftAssignments.length > 0 ? (
																	emp.shiftAssignments.map((s) => (
																		<span
																			key={s.id}
																			className="border border-border bg-muted px-2 py-0.5 text-xs font-mono"
																		>
																			{s.shiftName} ({s.startTime} - {s.endTime}
																			)
																		</span>
																	))
																) : (
																	<span className="text-xs text-muted-foreground">
																		Belum ada shift yang dialokasikan
																	</span>
																)}
															</div>
														</div>
													</div>
												</TableCell>
											</TableRow>
										)}
									</React.Fragment>
								);
							})
						)}
					</TableBody>
				</Table>

				{/* Pagination */}
				<div className="p-3 border-t border-border bg-card">
					<PaginationControls
						meta={response?.meta}
						onPageChange={(next) => {
							setSelectedIds([]);
							setPage(next);
						}}
						disabled={isFetching}
					/>
				</div>
			</div>

			{/* Employee Form Modal */}
			{isFormOpen && (
				<EmployeeForm
					initialData={selectedEmployee || undefined}
					onSubmit={(data) => {
						if (selectedEmployee) {
							updateMutation.mutate({ id: selectedEmployee.id, data });
						} else {
							createMutation.mutate(data);
						}
					}}
					onClose={() => {
						setIsFormOpen(false);
						setSelectedEmployee(null);
					}}
					isLoading={createMutation.isPending || updateMutation.isPending}
				/>
			)}

			{/* Bulk Shift Assignment Modal (Data Dasar Pattern) */}
			{isBulkShiftOpen && (
				<Modal
					open={isBulkShiftOpen}
					onOpenChange={setIsBulkShiftOpen}
					title="Atur Shift Pegawai Terpilih"
					description="Pilih shift yang akan diterapkan ke pegawai yang Anda pilih."
					maxWidth="2xl"
					footer={
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setIsBulkShiftOpen(false)}
								disabled={bulkShiftMutation.isPending}
							>
								Batal
							</Button>
							<Button
								variant="primary"
								size="sm"
								onClick={() => bulkShiftMutation.mutate()}
								disabled={
									bulkShiftMutation.isPending || bulkShiftIds.length === 0
								}
							>
								{bulkShiftMutation.isPending
									? "Menyimpan..."
									: "Terapkan Shift"}
							</Button>
						</div>
					}
				>
					<div className="space-y-4">
						{bulkShiftError && (
							<div className="p-3 border border-red-200 bg-red-50 text-xs font-medium text-destructive">
								{bulkShiftError}
							</div>
						)}

						<div className="space-y-2">
							<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
								Pilih Shift Kerja:
							</span>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								{shifts.map((shift) => {
									const isSelected = bulkShiftIds.includes(shift.id);
									return (
										<button
											key={shift.id}
											type="button"
											onClick={() => {
												setBulkShiftIds((prev) =>
													prev.includes(shift.id)
														? prev.filter((id) => id !== shift.id)
														: [...prev, shift.id],
												);
											}}
											className={cn(
												"flex flex-col text-left p-3 border transition-colors",
												isSelected
													? "border-primary bg-primary-subtle text-foreground"
													: "border-border bg-card text-muted-foreground hover:bg-muted/50",
											)}
										>
											<span className="text-xs font-bold text-foreground">
												{shift.name}
											</span>
											<span className="text-[11px] font-mono text-muted-foreground">
												{shift.startTime} - {shift.endTime}
											</span>
										</button>
									);
								})}
							</div>
						</div>
					</div>
				</Modal>
			)}
		</div>
	);
}
