"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, Download, Plus, Trash2 } from "lucide-react";
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

	const { data: holidays, isLoading } = useQuery<Holiday[]>({
		queryKey: ["holidays"],
		queryFn: async () => (await api.get("/holidays")).data,
	});

	const syncMutation = useMutation({
		mutationFn: async (year: number) => {
			return (await api.post(`/holidays/sync?year=${year}`)).data;
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["holidays"] }),
	});

	const createMutation = useMutation({
		mutationFn: async (data: typeof form) => {
			return (await api.post("/holidays", data)).data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["holidays"] });
			setShowForm(false);
			setForm({ date: "", name: "", description: "" });
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
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="space-y-8"
		>
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">Hari Libur</h2>
					<p className="text-foreground/60">
						Kelola hari libur nasional dan cuti bersama.
					</p>
				</div>
				<div className="flex gap-3">
					<button
						type="button"
						onClick={() => syncMutation.mutate(currentYear)}
						disabled={syncMutation.isPending}
						className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-600/20 hover:scale-105 transition-all disabled:opacity-50"
					>
						<Download size={18} />
						{syncMutation.isPending ? "Syncing..." : `Sync ${currentYear}`}
					</button>
					<button
						type="button"
						onClick={() => setShowForm(!showForm)}
						className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
					>
						<Plus size={18} />
						Tambah
					</button>
				</div>
			</div>

			{showForm && (
				<div className="glass-card p-6">
					<h3 className="font-bold mb-4">Tambah Hari Libur Manual</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<input
							type="date"
							value={form.date}
							onChange={(e) => setForm({ ...form, date: e.target.value })}
							className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
						/>
						<input
							type="text"
							placeholder="Nama hari libur"
							value={form.name}
							onChange={(e) => setForm({ ...form, name: e.target.value })}
							className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
						/>
						<button
							type="button"
							onClick={() => createMutation.mutate(form)}
							disabled={!form.date || !form.name}
							className="bg-primary text-primary-foreground rounded-lg px-4 py-2 font-semibold disabled:opacity-50"
						>
							Simpan
						</button>
					</div>
				</div>
			)}

			{syncMutation.isSuccess && (
				<div className="glass-card p-4 border-emerald-500/30 bg-emerald-500/5">
					<p className="text-emerald-400 text-sm">
						✅ Berhasil sync {(syncMutation.data as { synced: number })?.synced}{" "}
						hari libur dari API nasional.
					</p>
				</div>
			)}

			<div className="glass-card overflow-hidden">
				<table className="w-full">
					<thead>
						<tr className="border-b border-white/5">
							<th className="text-left p-4 text-xs uppercase text-foreground/40 font-bold">
								Tanggal
							</th>
							<th className="text-left p-4 text-xs uppercase text-foreground/40 font-bold">
								Nama
							</th>
							<th className="text-left p-4 text-xs uppercase text-foreground/40 font-bold">
								Keterangan
							</th>
							<th className="text-right p-4 text-xs uppercase text-foreground/40 font-bold">
								Aksi
							</th>
						</tr>
					</thead>
					<tbody>
						{isLoading ? (
							[1, 2, 3].map((i) => (
								<tr key={i} className="border-b border-white/5">
									<td colSpan={4} className="p-4">
										<div className="h-4 bg-white/5 rounded animate-pulse" />
									</td>
								</tr>
							))
						) : holidays?.length === 0 ? (
							<tr>
								<td colSpan={4} className="p-12 text-center">
									<Calendar
										size={48}
										className="mx-auto text-foreground/20 mb-4"
									/>
									<p className="text-foreground/40">
										Belum ada data hari libur. Klik &quot;Sync&quot; untuk
										mengambil dari API nasional.
									</p>
								</td>
							</tr>
						) : (
							holidays?.map((h) => (
								<tr
									key={h.id}
									className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
								>
									<td className="p-4 font-mono text-sm">{h.date}</td>
									<td className="p-4 font-semibold">{h.name}</td>
									<td className="p-4 text-foreground/60 text-sm">
										{h.description || "-"}
									</td>
									<td className="p-4 text-right">
										<button
											type="button"
											onClick={() => { if (confirm("Hapus hari libur ini?")) deleteMutation.mutate(h.id); }}
											className="p-2 hover:bg-destructive/10 rounded-lg text-foreground/40 hover:text-destructive transition-all"
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
		</motion.div>
	);
}
