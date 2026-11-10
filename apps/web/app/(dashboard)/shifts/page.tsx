"use client";

import type { CreateShift, Shift, UpdateShift } from "@adms/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangle,
	CalendarDays,
	Edit2,
	Plus,
	Timer,
	Trash2,
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
import { cn } from "@/lib/utils";

function ShiftFormModal({
	open,
	onClose,
	onSubmit,
	initialData,
	isLoading,
}: {
	open: boolean;
	onClose: () => void;
	onSubmit: (data: CreateShift) => void;
	initialData?: Shift;
	isLoading: boolean;
}) {
	const [form, setForm] = React.useState<CreateShift>({
		name: initialData?.name || "",
		startTime: initialData?.startTime || "08:00",
		endTime: initialData?.endTime || "17:00",
		toleranceMinutes: initialData?.toleranceMinutes ?? 15,
		earlyOutTolerance: initialData?.earlyOutTolerance ?? 0,
		minInTime: initialData?.minInTime || "",
		maxLateTime: initialData?.maxLateTime || "",
		minOutTime: initialData?.minOutTime || "",
		maxOutTime: initialData?.maxOutTime || "",
		workDays: initialData?.workDays ?? [1, 2, 3, 4, 5],
		effectiveFrom: initialData?.effectiveFrom || "",
		effectiveTo: initialData?.effectiveTo || "",
		isActive: initialData?.isActive ?? true,
	});

	const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

	const toggleDay = (day: number) => {
		const days = form.workDays.includes(day)
			? form.workDays.filter((d) => d !== day)
			: [...form.workDays, day].sort();
		setForm({ ...form, workDays: days });
	};

	return (
		<Modal
			open={open}
			onOpenChange={(v) => !v && onClose()}
			title={initialData ? "Ubah Jadwal Shift" : "Tambah Jadwal Shift Baru"}
			description="Atur rentang jam kerja, batas toleransi keterlambatan, dan hari kerja aktif."
			maxWidth="4xl"
			footer={
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={onClose}
						disabled={isLoading}
					>
						Batal
					</Button>
					<Button
						variant="primary"
						size="sm"
						onClick={() => onSubmit(form)}
						disabled={isLoading || !form.name}
					>
						{isLoading
							? "Menyimpan..."
							: initialData
								? "Simpan Perubahan"
								: "Buat Shift"}
					</Button>
				</div>
			}
		>
			<div className="space-y-6">
				{/* 2-Column Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
					<div className="space-y-1.5 md:col-span-2">
						<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
							Nama Shift *
						</label>
						<Input
							placeholder="Contoh: Shift Pagi Pelayanan Medis"
							value={form.name}
							onChange={(e) => setForm({ ...form, name: e.target.value })}
						/>
					</div>

					<div className="space-y-1.5">
						<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
							Jam Masuk *
						</label>
						<Input
							type="time"
							value={form.startTime}
							onChange={(e) => setForm({ ...form, startTime: e.target.value })}
							className="font-mono text-xs"
						/>
					</div>

					<div className="space-y-1.5">
						<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
							Jam Pulang *
						</label>
						<Input
							type="time"
							value={form.endTime}
							onChange={(e) => setForm({ ...form, endTime: e.target.value })}
							className="font-mono text-xs"
						/>
					</div>

					<div className="space-y-1.5">
						<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
							Toleransi Telat (Menit)
						</label>
						<Input
							type="number"
							min={0}
							value={form.toleranceMinutes}
							onChange={(e) =>
								setForm({ ...form, toleranceMinutes: Number(e.target.value) })
							}
							className="font-mono text-xs"
						/>
					</div>

					<div className="space-y-1.5">
						<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
							Toleransi Pulang Awal (Menit)
						</label>
						<Input
							type="number"
							min={0}
							value={form.earlyOutTolerance}
							onChange={(e) =>
								setForm({ ...form, earlyOutTolerance: Number(e.target.value) })
							}
							className="font-mono text-xs"
						/>
					</div>
				</div>

				{/* Effective Date Range */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
					<div className="space-y-1.5">
						<label
							htmlFor="effectiveFrom"
							className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono"
						>
							Berlaku Mulai
						</label>
						<Input
							id="effectiveFrom"
							type="date"
							value={form.effectiveFrom || ""}
							max={form.effectiveTo || undefined}
							onChange={(e) =>
								setForm({ ...form, effectiveFrom: e.target.value })
							}
							className="font-mono text-xs"
						/>
					</div>

					<div className="space-y-1.5">
						<label
							htmlFor="effectiveTo"
							className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono"
						>
							Berlaku Sampai
						</label>
						<Input
							id="effectiveTo"
							type="date"
							value={form.effectiveTo || ""}
							min={form.effectiveFrom || undefined}
							onChange={(e) =>
								setForm({ ...form, effectiveTo: e.target.value })
							}
							className="font-mono text-xs"
						/>
					</div>
				</div>

				{/* Workdays Selector */}
				<div className="border-t border-border pt-4 space-y-2">
					<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
						Hari Kerja Berlaku
					</label>
					<div className="flex flex-wrap gap-2">
						{dayNames.map((name, index) => {
							const isSelected = form.workDays.includes(index);
							return (
								<button
									key={name}
									type="button"
									onClick={() => toggleDay(index)}
									className={cn(
										"h-9 px-4 text-xs font-mono font-bold border transition-colors",
										isSelected
											? "border-primary bg-primary text-primary-foreground"
											: "border-border bg-card text-muted-foreground hover:bg-muted",
									)}
								>
									{name}
								</button>
							);
						})}
					</div>
				</div>
			</div>
		</Modal>
	);
}

export default function ShiftsPage() {
	const queryClient = useQueryClient();
	const [page, setPage] = React.useState(1);
	const [isModalOpen, setIsModalOpen] = React.useState(false);
	const [selectedShift, setSelectedShift] = React.useState<Shift | null>(null);

	const { data: response, isLoading } = useQuery<{
		data: Shift[];
		meta: PageMeta;
	}>({
		queryKey: ["shifts", page],
		queryFn: async () => (await api.get(`/shifts?page=${page}&limit=10`)).data,
	});

	const shifts = response?.data || [];

	const createMutation = useMutation({
		mutationFn: (data: CreateShift) => api.post("/shifts", data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["shifts"] });
			setIsModalOpen(false);
			toast.success("Shift berhasil ditambahkan");
		},
		onError: (err: any) => {
			toast.error(err.response?.data?.message || "Gagal membuat shift");
		},
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, data }: { id: number; data: UpdateShift }) =>
			api.put(`/shifts/${id}`, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["shifts"] });
			setIsModalOpen(false);
			setSelectedShift(null);
			toast.success("Shift berhasil diperbarui");
		},
		onError: (err: any) => {
			toast.error(err.response?.data?.message || "Gagal memperbarui shift");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: number) => api.delete(`/shifts/${id}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["shifts"] });
			toast.success("Shift berhasil dihapus");
		},
		onError: (err: any) => {
			toast.error(err.response?.data?.message || "Gagal menghapus shift");
		},
	});

	const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

	return (
		<div className="page-shell space-y-6">
			{/* Level 1: Page Header */}
			<PageHeader
				title="Manajemen Shift Kerja"
				description="Konfigurasi pola kerja terjadwal, jam masuk/pulang, dan toleransi keterlambatan."
				action={
					<Button
						variant="primary"
						size="sm"
						onClick={() => {
							setSelectedShift(null);
							setIsModalOpen(true);
						}}
						className="gap-1.5"
					>
						<Plus className="h-4 w-4" />
						Tambah Shift
					</Button>
				}
			/>

			{/* KPI Stat Cards */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<StatCard
					title="Total Shift"
					value={shifts.length}
					icon={<Timer className="h-4 w-4" />}
					description="Pola jadwal kerja aktif"
				/>
				<StatCard
					title="Shift 5 Hari"
					value={shifts.filter((s) => s.workDays?.length === 5).length}
					icon={<CalendarDays className="h-4 w-4 text-primary" />}
					description="Jadwal Senin - Jumat"
				/>
				<StatCard
					title="Rata-rata Toleransi"
					value="15m"
					icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
					description="Toleransi default sistem"
				/>
			</div>

			{/* Table Container */}
			<div className="border border-border bg-card">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Nama Shift</TableHead>
							<TableHead>Jam Kerja</TableHead>
							<TableHead>Toleransi Masuk</TableHead>
							<TableHead>Toleransi Pulang</TableHead>
							<TableHead>Hari Kerja</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="text-right">Aksi</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							[1, 2, 3].map((k) => (
								<TableRow key={k} className="animate-pulse">
									<TableCell colSpan={7} className="h-12 bg-card" />
								</TableRow>
							))
						) : shifts.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={7}
									className="py-10 text-center text-xs text-muted-foreground"
								>
									Belum ada shift kerja yang dibuat.
								</TableCell>
							</TableRow>
						) : (
							shifts.map((shift) => (
								<TableRow key={shift.id}>
									<TableCell className="font-bold text-foreground">
										{shift.name}
									</TableCell>
									<TableCell className="font-mono text-xs text-muted-foreground">
										{shift.startTime} - {shift.endTime}
									</TableCell>
									<TableCell className="font-mono text-xs text-muted-foreground">
										{shift.toleranceMinutes} menit
									</TableCell>
									<TableCell className="font-mono text-xs text-muted-foreground">
										{shift.earlyOutTolerance} menit
									</TableCell>
									<TableCell>
										<div className="flex flex-wrap gap-1">
											{shift.workDays?.map((d) => (
												<span
													key={d}
													className="border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono"
												>
													{dayNames[d]}
												</span>
											))}
										</div>
									</TableCell>
									<TableCell>
										<Badge
											variant={shift.isActive ? "success" : "default"}
											className="text-[10px]"
										>
											{shift.isActive ? "AKTIF" : "NONAKTIF"}
										</Badge>
									</TableCell>
									<TableCell className="text-right">
										<div className="flex items-center justify-end gap-1">
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-muted-foreground hover:text-foreground"
												onClick={() => {
													setSelectedShift(shift);
													setIsModalOpen(true);
												}}
												title="Ubah"
											>
												<Edit2 className="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-muted-foreground hover:text-destructive"
												onClick={() => {
													if (confirm(`Hapus shift ${shift.name}?`)) {
														deleteMutation.mutate(shift.id);
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
						meta={response?.meta}
						onPageChange={setPage}
						disabled={isLoading}
					/>
				</div>
			</div>

			{/* Shift Form Modal */}
			{isModalOpen && (
				<ShiftFormModal
					open={isModalOpen}
					initialData={selectedShift || undefined}
					onSubmit={(data) => {
						if (selectedShift) {
							updateMutation.mutate({ id: selectedShift.id, data });
						} else {
							createMutation.mutate(data);
						}
					}}
					onClose={() => {
						setIsModalOpen(false);
						setSelectedShift(null);
					}}
					isLoading={createMutation.isPending || updateMutation.isPending}
				/>
			)}
		</div>
	);
}
