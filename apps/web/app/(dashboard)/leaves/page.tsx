"use client";

import type { Employee } from "@adms/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	CalendarOff,
	Check,
	Clock,
	Plus,
	Trash2,
	UserCheck,
	X as XIcon,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import PaginationControls from "@/components/pagination-controls";
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

interface Leave {
	id: number;
	type: string;
	startDate: string;
	endDate: string;
	reason: string | null;
	status: "PENDING" | "APPROVED" | "REJECTED";
	createdAt: string;
	employee: { name: string; employeeCode: string } | null;
}

const typeLabels: Record<string, string> = {
	ANNUAL: "Cuti Tahunan",
	SICK: "Sakit",
	PERMISSION: "Izin",
	MATERNITY: "Cuti Melahirkan",
	OTHER: "Lainnya",
};

export default function LeavesPage() {
	const queryClient = useQueryClient();
	const [showForm, setShowForm] = React.useState(false);
	const [form, setForm] = React.useState({
		employeeId: "",
		type: "ANNUAL",
		startDate: "",
		endDate: "",
		reason: "",
	});

	const [page, setPage] = React.useState(1);

	const { data: response, isLoading } = useQuery({
		queryKey: ["leaves", page],
		queryFn: async () => (await api.get(`/leaves?page=${page}&limit=10`)).data,
	});

	const leaves: Leave[] = response?.data || [];
	const meta = response?.meta;

	const { data: employeeResponse } = useQuery<{ data: Employee[] }>({
		queryKey: ["employees-list"],
		queryFn: async () => (await api.get("/employees?page=1&limit=100")).data,
	});
	const employees = employeeResponse?.data || [];

	const createMutation = useMutation({
		mutationFn: async (data: typeof form) => {
			await api.post("/leaves", {
				...data,
				employeeId: Number(data.employeeId),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["leaves"] });
			setShowForm(false);
			setForm({
				employeeId: "",
				type: "ANNUAL",
				startDate: "",
				endDate: "",
				reason: "",
			});
			toast.success("Pengajuan cuti berhasil dibuat");
		},
		onError: (err: any) => {
			toast.error(
				err.response?.data?.message || "Gagal membuat pengajuan cuti",
			);
		},
	});

	const approveMutation = useMutation({
		mutationFn: async (id: number) => {
			await api.patch(`/leaves/${id}/approve`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["leaves"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
			toast.success("Pengajuan cuti disetujui");
		},
	});

	const rejectMutation = useMutation({
		mutationFn: async (id: number) => {
			await api.patch(`/leaves/${id}/reject`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["leaves"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
			toast.info("Pengajuan cuti ditolak");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: number) => {
			await api.delete(`/leaves/${id}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["leaves"] });
			toast.success("Data cuti dihapus");
		},
	});

	const pendingCount = leaves.filter((l) => l.status === "PENDING").length;
	const approvedCount = leaves.filter((l) => l.status === "APPROVED").length;

	return (
		<div className="page-shell space-y-6">
			{/* Level 1: Page Header */}
			<PageHeader
				title="Manajemen Cuti & Izin"
				description="Verifikasi permohonan cuti tahunan, izin sakit, dan ketidakhadiran pegawai."
				action={
					<Button
						variant="primary"
						size="sm"
						onClick={() => setShowForm(true)}
						className="gap-1.5"
					>
						<Plus className="h-4 w-4" />
						Ajukan Cuti
					</Button>
				}
			/>

			{/* KPI Stat Cards */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<StatCard
					title="Total Pengajuan"
					value={meta?.total ?? leaves.length}
					icon={<CalendarOff className="h-4 w-4" />}
					description="Riwayat permohonan tercatat"
				/>
				<StatCard
					title="Menunggu Persetujuan"
					value={pendingCount}
					icon={<Clock className="h-4 w-4 text-amber-600" />}
					description="Perlu tindakan verifikasi"
				/>
				<StatCard
					title="Telah Disetujui"
					value={approvedCount}
					icon={<UserCheck className="h-4 w-4 text-emerald-600" />}
					description="Cuti berstatus aktif"
				/>
			</div>

			{/* Table Container */}
			<div className="border border-border bg-card">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>NIP</TableHead>
							<TableHead>Nama Pegawai</TableHead>
							<TableHead>Jenis Cuti</TableHead>
							<TableHead>Mulai</TableHead>
							<TableHead>Selesai</TableHead>
							<TableHead>Keterangan</TableHead>
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
						) : leaves.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={8}
									className="py-10 text-center text-xs text-muted-foreground"
								>
									Tidak ada permohonan cuti.
								</TableCell>
							</TableRow>
						) : (
							leaves.map((leave) => (
								<TableRow key={leave.id}>
									<TableCell className="font-mono text-xs text-muted-foreground">
										{leave.employee?.employeeCode ?? "—"}
									</TableCell>
									<TableCell className="font-bold text-foreground">
										{leave.employee?.name ?? "Tidak Diketahui"}
									</TableCell>
									<TableCell className="text-xs">
										{typeLabels[leave.type] || leave.type}
									</TableCell>
									<TableCell className="font-mono text-xs text-muted-foreground">
										{leave.startDate}
									</TableCell>
									<TableCell className="font-mono text-xs text-muted-foreground">
										{leave.endDate}
									</TableCell>
									<TableCell className="text-xs text-muted-foreground max-w-xs truncate">
										{leave.reason || "—"}
									</TableCell>
									<TableCell>
										<Badge
											variant={
												leave.status === "APPROVED"
													? "success"
													: leave.status === "PENDING"
														? "warning"
														: "destructive"
											}
											className="text-[10px]"
										>
											{leave.status === "APPROVED"
												? "DISETUJUI"
												: leave.status === "PENDING"
													? "MENUNGGU"
													: "DITOLAK"}
										</Badge>
									</TableCell>
									<TableCell className="text-right">
										<div className="flex items-center justify-end gap-1">
											{leave.status === "PENDING" && (
												<>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
														onClick={() => approveMutation.mutate(leave.id)}
														title="Setujui"
													>
														<Check className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 text-amber-600 hover:bg-amber-50"
														onClick={() => rejectMutation.mutate(leave.id)}
														title="Tolak"
													>
														<XIcon className="h-4 w-4" />
													</Button>
												</>
											)}
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-muted-foreground hover:text-destructive"
												onClick={() => {
													if (confirm("Hapus permohonan cuti ini?")) {
														deleteMutation.mutate(leave.id);
													}
												}}
												title="Hapus"
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

				<div className="p-3 border-t border-border bg-card">
					<PaginationControls
						meta={meta}
						onPageChange={setPage}
						disabled={isLoading}
					/>
				</div>
			</div>

			{/* Form Modal (Data Dasar Pattern) */}
			{showForm && (
				<Modal
					open={showForm}
					onOpenChange={setShowForm}
					title="Form Pengajuan Cuti Pegawai"
					description="Pilih pegawai dan tentukan rentang tanggal izin/cuti yang dimohonkan."
					maxWidth="2xl"
					footer={
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setShowForm(false)}
								disabled={createMutation.isPending}
							>
								Batal
							</Button>
							<Button
								variant="primary"
								size="sm"
								onClick={() => createMutation.mutate(form)}
								disabled={
									createMutation.isPending ||
									!form.employeeId ||
									!form.startDate ||
									!form.endDate
								}
							>
								{createMutation.isPending ? "Menyimpan..." : "Ajukan"}
							</Button>
						</div>
					}
				>
					<div className="space-y-4">
						<div className="space-y-1.5">
							<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
								Pilih Pegawai *
							</label>
							<select
								value={form.employeeId}
								onChange={(e) =>
									setForm({ ...form, employeeId: e.target.value })
								}
								className="flex h-9 w-full border border-border bg-card px-3 text-xs text-foreground focus:border-primary focus:outline-none"
							>
								<option value="">Pilih pegawai...</option>
								{employees.map((emp) => (
									<option key={emp.id} value={emp.id}>
										{emp.name} ({emp.employeeCode})
									</option>
								))}
							</select>
						</div>

						<div className="space-y-1.5">
							<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
								Jenis Cuti *
							</label>
							<select
								value={form.type}
								onChange={(e) => setForm({ ...form, type: e.target.value })}
								className="flex h-9 w-full border border-border bg-card px-3 text-xs text-foreground focus:border-primary focus:outline-none"
							>
								{Object.entries(typeLabels).map(([key, label]) => (
									<option key={key} value={key}>
										{label}
									</option>
								))}
							</select>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
									Tanggal Mulai *
								</label>
								<Input
									type="date"
									value={form.startDate}
									onChange={(e) =>
										setForm({ ...form, startDate: e.target.value })
									}
									className="text-xs font-mono"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
									Tanggal Selesai *
								</label>
								<Input
									type="date"
									value={form.endDate}
									onChange={(e) =>
										setForm({ ...form, endDate: e.target.value })
									}
									className="text-xs font-mono"
								/>
							</div>
						</div>

						<div className="space-y-1.5">
							<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
								Alasan / Keterangan
							</label>
							<Input
								value={form.reason}
								onChange={(e) => setForm({ ...form, reason: e.target.value })}
								placeholder="Contoh: Keperluan keluarga mendesak"
							/>
						</div>
					</div>
				</Modal>
			)}
		</div>
	);
}
