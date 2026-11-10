"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, CalendarCheck, CloudSync, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import PaginationControls from "@/components/pagination-controls";
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

interface Holiday {
	id: number;
	date: string;
	name: string;
	description?: string | null;
}

export default function HolidaysPage() {
	const queryClient = useQueryClient();
	const [showForm, setShowForm] = React.useState(false);
	const [form, setForm] = React.useState({
		date: "",
		name: "",
		description: "",
	});
	const [page, setPage] = React.useState(1);

	const { data: response, isLoading } = useQuery({
		queryKey: ["holidays", page],
		queryFn: async () =>
			(await api.get(`/holidays?page=${page}&limit=10`)).data,
	});

	const holidays: Holiday[] = response?.data || [];
	const meta = response?.meta;
	const currentYear = new Date().getFullYear();

	const syncMutation = useMutation({
		mutationFn: async (year: number) => {
			return (await api.post(`/holidays/sync?year=${year}`)).data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["holidays"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
			toast.success("Berhasil sinkronisasi hari libur nasional");
		},
		onError: (err: any) => {
			toast.error(err.response?.data?.message || "Gagal sinkronisasi libur");
		},
	});

	const createMutation = useMutation({
		mutationFn: async (data: typeof form) => {
			return (
				await api.post("/holidays", {
					...data,
					description: data.description || null,
				})
			).data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["holidays"] });
			setShowForm(false);
			setForm({ date: "", name: "", description: "" });
			toast.success("Hari libur berhasil ditambahkan");
		},
		onError: (err: any) => {
			toast.error(err.response?.data?.message || "Gagal menambahkan libur");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: number) => {
			await api.delete(`/holidays/${id}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["holidays"] });
			toast.success("Hari libur berhasil dihapus");
		},
		onError: () => {
			toast.error("Gagal menghapus hari libur");
		},
	});

	return (
		<div className="page-shell space-y-6">
			{/* Level 1: Page Header */}
			<PageHeader
				title="Kalender Hari Libur"
				description="Daftar hari libur nasional dan cuti bersama instansi untuk pengecualian jam kerja."
				action={
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => syncMutation.mutate(currentYear)}
							disabled={syncMutation.isPending}
							className="gap-1.5"
						>
							<CloudSync className="h-4 w-4" />
							{syncMutation.isPending
								? "Sinkron..."
								: `Tarik Data ${currentYear}`}
						</Button>
						<Button
							variant="primary"
							size="sm"
							onClick={() => setShowForm(true)}
							className="gap-1.5"
						>
							<Plus className="h-4 w-4" />
							Tambah Libur
						</Button>
					</div>
				}
			/>

			{/* KPI Stat Cards */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<StatCard
					title="Total Libur Terdata"
					value={meta?.total ?? holidays.length}
					icon={<Calendar className="h-4 w-4" />}
					description="Libur nasional dan cuti bersama"
				/>
				<StatCard
					title="Tahun Berjalan"
					value={String(currentYear)}
					icon={<CalendarCheck className="h-4 w-4 text-primary" />}
					description="Kalender operasional aktif"
				/>
			</div>

			{/* Table Container */}
			<div className="border border-border bg-card">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Tanggal</TableHead>
							<TableHead>Nama Hari Libur</TableHead>
							<TableHead>Keterangan</TableHead>
							<TableHead className="text-right">Aksi</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							[1, 2, 3].map((k) => (
								<TableRow key={k} className="animate-pulse">
									<TableCell colSpan={4} className="h-12 bg-card" />
								</TableRow>
							))
						) : holidays.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={4}
									className="py-10 text-center text-xs text-muted-foreground"
								>
									Belum ada hari libur. Klik "Tarik Data" untuk sinkronisasi
									otomatis.
								</TableCell>
							</TableRow>
						) : (
							holidays.map((h) => (
								<TableRow key={h.id}>
									<TableCell className="font-mono text-xs font-semibold text-foreground">
										{h.date}
									</TableCell>
									<TableCell className="font-bold text-foreground">
										{h.name}
									</TableCell>
									<TableCell className="text-xs text-muted-foreground">
										{h.description || "—"}
									</TableCell>
									<TableCell className="text-right">
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-muted-foreground hover:text-destructive"
											onClick={() => {
												if (confirm(`Hapus libur ${h.name}?`)) {
													deleteMutation.mutate(h.id);
												}
											}}
											title="Hapus"
										>
											<Trash2 className="h-3.5 w-3.5" />
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

			{/* Form Modal */}
			{showForm && (
				<Modal
					open={showForm}
					onOpenChange={setShowForm}
					title="Tambah Hari Libur Manual"
					description="Tentukan tanggal dan keterangan hari libur khusus."
					maxWidth="md"
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
								disabled={createMutation.isPending || !form.date || !form.name}
							>
								{createMutation.isPending ? "Menyimpan..." : "Simpan Libur"}
							</Button>
						</div>
					}
				>
					<div className="space-y-4">
						<div className="space-y-1.5">
							<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
								Tanggal Libur *
							</label>
							<Input
								type="date"
								value={form.date}
								onChange={(e) => setForm({ ...form, date: e.target.value })}
								className="text-xs font-mono"
							/>
						</div>

						<div className="space-y-1.5">
							<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
								Nama Hari Libur *
							</label>
							<Input
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
								placeholder="Contoh: Hari Libur Internal Puskesmas"
							/>
						</div>

						<div className="space-y-1.5">
							<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
								Keterangan
							</label>
							<Input
								value={form.description}
								onChange={(e) =>
									setForm({ ...form, description: e.target.value })
								}
								placeholder="Catatan tambahan (opsional)"
							/>
						</div>
					</div>
				</Modal>
			)}
		</div>
	);
}
