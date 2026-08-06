"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus, Search, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import PaginationControls, {
	type PageMeta,
} from "@/components/pagination-controls";
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
	const client = useQueryClient();
	const [page, setPage] = useState(1),
		[search, setSearch] = useState(""),
		[form, setForm] = useState(empty),
		[showForm, setShowForm] = useState(false);
	const { data, isLoading, isError, refetch } = useQuery<{
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
	const create = useMutation({
		mutationFn: async () => api.post("/users", form),
		onSuccess: () => {
			setForm(empty);
			setShowForm(false);
			client.invalidateQueries({ queryKey: ["users"] });
			toast.success("Pengguna dibuat");
		},
	});
	const reset = useMutation({
		mutationFn: async (id: number) => {
			const password = window.prompt("Password sementara minimal 12 karakter");
			if (!password) return;
			await api.patch(`/users/${id}/reset-password`, { password });
		},
		onSuccess: () => toast.success("Password direset"),
	});

	return (
		<div className="mx-auto max-w-[1200px] space-y-5 md:space-y-6">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p className="mb-2 text-[11px] font-semibold uppercase tracking-[.14em] text-[#087066]">
						Administrasi sistem
					</p>
					<h1 className="text-3xl font-semibold">Pengguna</h1>
					<p className="mt-1 max-w-xl text-sm text-[#53635d]">
						Kelola akun dan tingkat akses ke sistem ADMS.
					</p>
				</div>
				<button
					type="button"
					className={showForm ? "adms-button-outline" : "adms-button"}
					onClick={() => setShowForm((value) => !value)}
				>
					<Plus size={17} /> {showForm ? "Tutup formulir" : "Tambah pengguna"}
				</button>
			</header>

			{showForm && (
				<form
					className="adms-card grid gap-5 p-5 lg:grid-cols-[1fr_1fr_180px_1fr_auto] lg:items-end"
					onSubmit={(event) => {
						event.preventDefault();
						create.mutate();
					}}
				>
					<label className="grid gap-2 text-xs font-semibold">
						Nama lengkap
						<input
							required
							placeholder="Nama pengguna"
							value={form.name}
							onChange={(e) => setForm({ ...form, name: e.target.value })}
							className="w-full px-3"
						/>
					</label>
					<label className="grid gap-2 text-xs font-semibold">
						Alamat email
						<input
							required
							type="email"
							placeholder="nama@instansi.go.id"
							value={form.email}
							onChange={(e) => setForm({ ...form, email: e.target.value })}
							className="w-full px-3"
						/>
					</label>
					<label className="grid gap-2 text-xs font-semibold">
						Tingkat akses
						<select
							value={form.role}
							onChange={(e) =>
								setForm({ ...form, role: e.target.value as typeof form.role })
							}
							className="w-full px-3"
						>
							<option value="ADMIN">Administrator</option>
							<option value="HRD">HRD</option>
							<option value="USER">Pengguna</option>
						</select>
					</label>
					<label className="grid gap-2 text-xs font-semibold">
						Password awal
						<input
							required
							minLength={12}
							type="password"
							placeholder="Minimal 12 karakter"
							value={form.password}
							onChange={(e) => setForm({ ...form, password: e.target.value })}
							className="w-full px-3"
						/>
					</label>
					<button
						type="submit"
						className="adms-button"
						disabled={create.isPending}
					>
						{create.isPending ? "Menyimpan..." : "Simpan"}
					</button>
				</form>
			)}

			<section
				className="adms-card overflow-hidden p-0"
				aria-labelledby="users-list-title"
			>
				<div className="flex flex-col gap-4 border-b border-[#d5ded9] bg-[#f8faf8] p-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 id="users-list-title" className="!text-base">
							Daftar pengguna
						</h2>
						<p className="mt-1 text-xs">
							{data?.meta.total ?? 0} akun terdaftar
						</p>
					</div>
					<label className="relative block w-full sm:w-72">
						<span className="sr-only">Cari pengguna</span>
						<Search
							size={16}
							className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#53635d]"
						/>
						<input
							placeholder="Cari nama atau email"
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setPage(1);
							}}
							className="w-full pl-9 pr-3"
						/>
					</label>
				</div>

				{isLoading ? (
					<div className="space-y-3 p-5" role="status">
						{[1, 2, 3].map((item) => (
							<div key={item} className="h-14 animate-pulse bg-[#eaf0ed]" />
						))}
					</div>
				) : isError ? (
					<div className="p-8 text-center" role="alert">
						<p className="font-semibold">Gagal memuat pengguna.</p>
						<button
							type="button"
							className="adms-button-outline mt-4"
							onClick={() => refetch()}
						>
							Coba lagi
						</button>
					</div>
				) : data?.data.length === 0 ? (
					<div className="grid justify-items-center px-5 py-14 text-center">
						<UserRound size={28} className="mb-3 text-[#087066]" />
						<p className="font-semibold text-[#14211d]">
							Pengguna tidak ditemukan
						</p>
						<p className="mt-1 text-sm">
							Ubah kata pencarian atau tambahkan akun baru.
						</p>
					</div>
				) : (
					<>
						<div className="grid divide-y divide-[#d5ded9] md:hidden">
							{data?.data.map((user) => (
								<article key={user.id} className="p-4">
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<h3 className="truncate text-sm font-semibold">
												{user.name}
											</h3>
											<p className="mt-1 truncate text-xs">{user.email}</p>
										</div>
										<span
											className={
												user.role === "ADMIN"
													? "adms-pill-success"
													: "adms-pill-neutral"
											}
										>
											{roleLabel[user.role]}
										</span>
									</div>
									<button
										type="button"
										className="adms-button-outline mt-4 w-full"
										onClick={() => reset.mutate(user.id)}
										disabled={reset.isPending}
									>
										<KeyRound size={15} /> Reset password
									</button>
								</article>
							))}
						</div>
						<div className="hidden overflow-x-auto md:block">
							<table>
								<thead>
									<tr>
										<th className="px-5 py-3 text-left">Pengguna</th>
										<th className="px-5 py-3 text-left">Tingkat akses</th>
										<th className="px-5 py-3 text-left">Dibuat</th>
										<th className="px-5 py-3 text-right">Aksi</th>
									</tr>
								</thead>
								<tbody>
									{data?.data.map((user) => (
										<tr key={user.id}>
											<td className="px-5 py-4">
												<div className="flex items-center gap-3">
													<div className="grid size-9 shrink-0 place-items-center bg-[#dceae5] text-[#087066]">
														<UserRound size={16} />
													</div>
													<div className="min-w-0">
														<p className="truncate font-semibold text-[#14211d]">
															{user.name}
														</p>
														<p className="truncate text-xs">{user.email}</p>
													</div>
												</div>
											</td>
											<td className="px-5 py-4">
												<span
													className={
														user.role === "ADMIN"
															? "adms-pill-success"
															: "adms-pill-neutral"
													}
												>
													<ShieldCheck size={11} /> {roleLabel[user.role]}
												</span>
											</td>
											<td className="px-5 py-4 text-[#53635d]">
												{new Date(user.createdAt).toLocaleDateString("id-ID", {
													day: "2-digit",
													month: "short",
													year: "numeric",
												})}
											</td>
											<td className="px-5 py-4 text-right">
												<button
													type="button"
													className="adms-button-outline min-h-9 px-3"
													onClick={() => reset.mutate(user.id)}
													disabled={reset.isPending}
												>
													<KeyRound size={15} /> Reset password
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</>
				)}
				{data?.meta && (
					<PaginationControls meta={data.meta} onPageChange={setPage} />
				)}
			</section>
		</div>
	);
}
