"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, CloudSync, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import api from "@/lib/api";

interface Holiday {
	id: number;
	date: string;
	name: string;
	description?: string | null;
}

export default function HolidaysPage() {
	const queryClient = useQueryClient();
	const [showForm, setShowForm] = useState(false);
	const [form, setForm] = useState({ date: "", name: "", description: "" });

	const [page, setPage] = useState(1);

	const { data: response, isLoading } = useQuery({
		queryKey: ["holidays", page],
		queryFn: async () => {
			return (await api.get(`/holidays?page=${page}&limit=10`)).data;
		},
	});

	const holidays: Holiday[] = response?.data || [];
	const meta = response?.meta;

	const syncMutation = useMutation({
		mutationFn: async (year: number) => {
			return (await api.post(`/holidays/sync?year=${year}`)).data;
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["holidays"] }),
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
		},
		onError: (err: unknown) => {
			const error = err as {
				response?: { data?: { message?: string } };
				message?: string;
			};
			alert(
				"Gagal simpan: " +
					(error?.response?.data?.message || error?.message || "Unknown error"),
			);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: number) => {
			await api.delete(`/holidays/${id}`);
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["holidays"] }),
	});

	const currentYear = new Date().getFullYear();

	return (
		<motion.div
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className="w-full space-y-8 mx-auto min-h-[calc(100vh-6rem)]"
		>
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h2 className="font-display text-3xl font-semibold text-[#111c2d]">
						Hari Libur
					</h2>
					<p className="font-sans text-sm text-[#6e797e] mt-1">
						Kelola hari libur nasional dan cuti bersama.
					</p>
				</div>
				<div className="flex gap-3">
					<button
						type="button"
						onClick={() => syncMutation.mutate(currentYear)}
						disabled={syncMutation.isPending}
						className="adms-button-outline disabled:opacity-50"
					>
						<CloudSync size={18} />
						{syncMutation.isPending ? "Syncing..." : `Sync ${currentYear}`}
					</button>
					<button
						type="button"
						onClick={() => setShowForm(!showForm)}
						className="adms-button !bg-[#00647c] !text-white hover:!bg-[#007f9d]"
					>
						<Plus size={18} />
						Tambah
					</button>
				</div>
			</div>

			{showForm && (
				<div className="adms-card">
					<h3 className="font-semibold text-[#111c2d] mb-4">
						Tambah Hari Libur Manual
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<input
							type="date"
							value={form.date}
							onChange={(e) => setForm({ ...form, date: e.target.value })}
							className="w-full bg-white border border-[#bdc8ce] rounded-lg px-4 py-2 text-[13px] text-[#111c2d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c]"
						/>
						<input
							type="text"
							placeholder="Nama hari libur"
							value={form.name}
							onChange={(e) => setForm({ ...form, name: e.target.value })}
							className="w-full bg-white border border-[#bdc8ce] rounded-lg px-4 py-2 text-[13px] text-[#111c2d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c]"
						/>
						<button
							type="button"
							onClick={() => createMutation.mutate(form)}
							disabled={!form.date || !form.name || createMutation.isPending}
							className="bg-[#00647c] text-white rounded-lg px-4 py-2 font-semibold text-[13px] disabled:opacity-50 hover:bg-[#007f9d] transition-colors"
						>
							{createMutation.isPending ? "Menyimpan..." : "Simpan"}
						</button>
					</div>
				</div>
			)}

			{syncMutation.isSuccess && (
				<div className="bg-[#6cf8bb]/10 border border-[#6cf8bb]/30 p-4 rounded-xl">
					<p className="text-[#00714d] text-[13px] font-medium flex items-center gap-2">
						<span className="material-symbols-outlined text-[18px]">
							check_circle
						</span>
						Berhasil sync {(syncMutation.data as { synced: number })?.synced}{" "}
						hari libur dari API nasional.
					</p>
				</div>
			)}

			<div className="adms-card p-0 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse">
						<thead>
							<tr className="bg-[#f0f3ff] border-b border-black/5">
								<th className="px-6 py-4 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider w-[20%]">
									Tanggal
								</th>
								<th className="px-6 py-4 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider w-[40%]">
									Nama
								</th>
								<th className="px-6 py-4 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider w-[30%]">
									Keterangan
								</th>
								<th className="px-6 py-4 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider w-[10%] text-right">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-black/5 font-sans text-[14px]">
							{isLoading ? (
								[1, 2, 3].map((i) => (
									<tr key={i} className="border-b border-black/5">
										<td colSpan={4} className="p-4">
											<div className="h-4 bg-gray-100 rounded animate-pulse" />
										</td>
									</tr>
								))
							) : holidays?.length === 0 ? (
								<tr>
									<td colSpan={4} className="p-12 text-center">
										<Calendar
											size={48}
											className="mx-auto text-[#bdc8ce] mb-4"
										/>
										<p className="text-[#6e797e] text-sm">
											Belum ada data hari libur. Klik &quot;Sync&quot; untuk
											mengambil dari API nasional.
										</p>
									</td>
								</tr>
							) : (
								holidays?.map((h) => (
									<tr
										key={h.id}
										className="hover:bg-[#f0f3ff]/50 transition-colors group"
									>
										<td className="px-6 py-4 font-mono text-[13px] text-[#111c2d]">
											{h.date}
										</td>
										<td className="px-6 py-4 font-medium text-[#111c2d]">
											{h.name}
										</td>
										<td className="px-6 py-4 text-[#3e484d]">
											{h.description || "-"}
										</td>
										<td className="px-6 py-4 text-right">
											<button
												type="button"
												onClick={() => {
													if (confirm("Hapus hari libur ini?"))
														deleteMutation.mutate(h.id);
												}}
												className="p-2 text-[#6e797e] hover:bg-[#ba1a1a]/10 hover:text-[#ba1a1a] rounded-lg transition-all opacity-0 group-hover:opacity-100"
											>
												<Trash2 size={18} />
											</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination Controls */}
				{meta && meta.totalPages > 1 && (
					<div className="p-4 border-t border-black/5 flex items-center justify-between bg-[#f9f9ff]">
						<div className="text-[12px] text-[#6e797e] font-medium">
							Menampilkan Halaman {meta.page} dari {meta.totalPages}
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={page === 1}
								className="px-3 py-1.5 bg-white border border-black/10 rounded-lg text-[12px] font-semibold text-[#111c2d] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#dee8ff]/50 transition-colors"
							>
								Sebelumnya
							</button>
							<div className="flex gap-1">
								{Array.from({ length: meta.totalPages }, (_, i) => i + 1).map(
									(pageNum) => (
										<button
											key={pageNum}
											type="button"
											onClick={() => setPage(pageNum)}
											className={`w-8 h-8 rounded-lg text-[12px] font-bold transition-colors ${page === pageNum ? "bg-[#00647c] text-white" : "bg-white border border-black/10 text-[#3e484d] hover:bg-[#dee8ff]/50"}`}
										>
											{pageNum}
										</button>
									),
								)}
							</div>
							<button
								type="button"
								onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
								disabled={page === meta.totalPages}
								className="px-3 py-1.5 bg-white border border-black/10 rounded-lg text-[12px] font-semibold text-[#111c2d] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#dee8ff]/50 transition-colors"
							>
								Selanjutnya
							</button>
						</div>
					</div>
				)}
			</div>
		</motion.div>
	);
}
