"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	KeyRound,
	Plus,
	Search,
	ShieldCheck,
	UserCheck,
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

type User = {
	id: number;
	email: string;
	name: string;
	role: "ADMIN" | "HRD" | "USER";
	createdAt: string;
};

const empty = { email: "", name: "", role: "USER" as const, password: "" };
const roleLabel = { ADMIN: "Administrator", HRD: "HRD", USER: "Pengguna" };

export default function UsersPage() {
	const queryClient = useQueryClient();
	const [page, setPage] = React.useState(1);
	const [search, setSearch] = React.useState("");
	const [form, setForm] = React.useState(empty);
	const [showForm, setShowForm] = React.useState(false);

	const { data, isLoading } = useQuery<{
		data: User[];
		meta: PageMeta;
	}>({
		queryKey: ["users", page, search],
		queryFn: async () =>
			(
				await api.get(
					`/users?page=${page}&limit=10&search=${encodeURIComponent(search)}`,
				)
			).data,
	});

	const users = data?.data || [];
	const meta = data?.meta;

	const createMutation = useMutation({
		mutationFn: async () => api.post("/users", form),
		onSuccess: () => {
			setForm(empty);
			setShowForm(false);
			queryClient.invalidateQueries({ queryKey: ["users"] });
			toast.success("Pengguna baru berhasil dibuat");
		},
		onError: (err: any) => {
			toast.error(err.response?.data?.message || "Gagal membuat pengguna");
		},
	});

	const resetMutation = useMutation({
		mutationFn: async (id: number) => {
			const password = window.prompt("Password baru minimal 12 karakter");
			if (!password || password.length < 12) {
				throw new Error("Password minimal 12 karakter");
			}
			await api.patch(`/users/${id}/reset-password`, { password });
		},
		onSuccess: () => toast.success("Password pengguna berhasil direset"),
		onError: (err: any) => toast.error(err.message || "Gagal mereset password"),
	});

	const adminCount = users.filter((u) => u.role === "ADMIN").length;
	const hrdCount = users.filter((u) => u.role === "HRD").length;

	return (
		<div className="page-shell space-y-6">
			{/* Level 1: Page Header */}
			<PageHeader
				title="Manajemen Pengguna Sistem"
				description="Kelola akun operator, hak akses hierarkis (Admin, HRD, User), dan pemulihan kredensial."
				action={
					<Button
						variant="primary"
						size="sm"
						onClick={() => setShowForm(true)}
						className="gap-1.5"
					>
						<Plus className="h-4 w-4" />
						Tambah Pengguna
					</Button>
				}
			/>

			{/* KPI Stat Cards */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<StatCard
					title="Total Akun"
					value={meta?.total ?? users.length}
					icon={<Users className="h-4 w-4" />}
					description="Pengguna dengan akses sistem"
				/>
				<StatCard
					title="Administrator"
					value={adminCount}
					icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
					description="Akses konfigurasi penuh"
				/>
				<StatCard
					title="Petugas HRD"
					value={hrdCount}
					icon={<UserCheck className="h-4 w-4 text-primary" />}
					description="Akses operasional & rekap"
				/>
			</div>

			{/* Table Container */}
			<div className="border border-border bg-card">
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border bg-muted/30 p-3.5">
					<div className="relative w-full sm:w-64">
						<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
						<Input
							placeholder="Cari nama atau email..."
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setPage(1);
							}}
							className="pl-8 text-xs h-8"
						/>
					</div>
					<span className="text-xs font-mono text-muted-foreground">
						{users.length} Akun Terdaftar
					</span>
				</div>

				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Nama Pengguna</TableHead>
							<TableHead>Alamat Email</TableHead>
							<TableHead>Tingkat Akses (Role)</TableHead>
							<TableHead>Dibuat Pada</TableHead>
							<TableHead className="text-right">Aksi</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							[1, 2, 3].map((k) => (
								<TableRow key={k} className="animate-pulse">
									<TableCell colSpan={5} className="h-12 bg-card" />
								</TableRow>
							))
						) : users.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={5}
									className="py-10 text-center text-xs text-muted-foreground"
								>
									Tidak ada akun pengguna yang sesuai pencarian.
								</TableCell>
							</TableRow>
						) : (
							users.map((u) => (
								<TableRow key={u.id}>
									<TableCell className="font-bold text-foreground">
										{u.name}
									</TableCell>
									<TableCell className="font-mono text-xs text-muted-foreground">
										{u.email}
									</TableCell>
									<TableCell>
										<Badge
											variant={
												u.role === "ADMIN"
													? "success"
													: u.role === "HRD"
														? "info"
														: "secondary"
											}
											className="text-[10px]"
										>
											{roleLabel[u.role] || u.role}
										</Badge>
									</TableCell>
									<TableCell className="font-mono text-xs text-muted-foreground">
										{new Date(u.createdAt).toLocaleDateString("id-ID", {
											day: "2-digit",
											month: "short",
											year: "numeric",
										})}
									</TableCell>
									<TableCell className="text-right">
										<Button
											variant="outline"
											size="sm"
											className="text-xs gap-1.5"
											onClick={() => resetMutation.mutate(u.id)}
											title="Reset Password"
										>
											<KeyRound className="h-3.5 w-3.5" />
											Reset Password
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

			{/* Create User Modal (Data Dasar Pattern) */}
			{showForm && (
				<Modal
					open={showForm}
					onOpenChange={setShowForm}
					title="Tambah Akun Pengguna Baru"
					description="Buat akun untuk staf atau operator dengan tingkat akses yang sesuai."
					maxWidth="lg"
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
								onClick={() => createMutation.mutate()}
								disabled={
									createMutation.isPending ||
									!form.name ||
									!form.email ||
									!form.password
								}
							>
								{createMutation.isPending ? "Menyimpan..." : "Buat Akun"}
							</Button>
						</div>
					}
				>
					<div className="space-y-4">
						<div className="space-y-1.5">
							<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
								Nama Lengkap *
							</label>
							<Input
								required
								placeholder="Nama pengguna"
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
							/>
						</div>

						<div className="space-y-1.5">
							<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
								Alamat Email *
							</label>
							<Input
								required
								type="email"
								placeholder="user@puskesmas.go.id"
								value={form.email}
								onChange={(e) => setForm({ ...form, email: e.target.value })}
							/>
						</div>

						<div className="space-y-1.5">
							<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
								Tingkat Akses (Role) *
							</label>
							<select
								value={form.role}
								onChange={(e) =>
									setForm({ ...form, role: e.target.value as typeof form.role })
								}
								className="flex h-9 w-full border border-border bg-card px-3 text-xs text-foreground focus:border-primary focus:outline-none"
							>
								<option value="ADMIN">Administrator (Akses Penuh)</option>
								<option value="HRD">HRD (Presensi & Laporan)</option>
								<option value="USER">Pengguna Biasa (Mandiri)</option>
							</select>
						</div>

						<div className="space-y-1.5">
							<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
								Password Baru *
							</label>
							<Input
								required
								type="password"
								placeholder="Minimal 12 karakter"
								value={form.password}
								onChange={(e) => setForm({ ...form, password: e.target.value })}
							/>
						</div>
					</div>
				</Modal>
			)}
		</div>
	);
}
