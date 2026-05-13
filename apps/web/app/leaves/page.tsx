"use client";

import type { Employee } from "@adms/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CalendarOff, Check, Plus, Trash2, X as XIcon } from "lucide-react";
import { useState } from "react";
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

const statusColors: Record<string, string> = {
	PENDING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
	APPROVED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
	REJECTED: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function LeavesPage() {
	const queryClient = useQueryClient();
	const [showForm, setShowForm] = useState(false);
	const [form, setForm] = useState({ employeeId: "", type: "ANNUAL", startDate: "", endDate: "", reason: "" });

	const { data: leaves, isLoading } = useQuery<Leave[]>({
		queryKey: ["leaves"],
		queryFn: async () => (await api.get("/leaves")).data,
	});

	const { data: employees } = useQuery<Employee[]>({
		queryKey: ["employees-list"],
		queryFn: async () => (await api.get("/employees")).data,
	});

	const createMutation = useMutation({
		mutationFn: async (data: typeof form) => {
			await api.post("/leaves", { ...data, employeeId: Number(data.employeeId) });
		},
		onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["leaves"] }); setShowForm(false); setForm({ employeeId: "", type: "ANNUAL", startDate: "", endDate: "", reason: "" }); },
	});

	const approveMutation = useMutation({
		mutationFn: async (id: number) => { await api.patch(`/leaves/${id}/approve`); },
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leaves"] }),
	});

	const rejectMutation = useMutation({
		mutationFn: async (id: number) => { await api.patch(`/leaves/${id}/reject`); },
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leaves"] }),
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: number) => { await api.delete(`/leaves/${id}`); },
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leaves"] }),
	});

	return (
		<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">Manajemen Cuti</h2>
					<p className="text-foreground/60">Pengajuan dan persetujuan cuti pegawai.</p>
				</div>
				<button type="button" onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-all">
					<Plus size={18} /> Ajukan Cuti
				</button>
			</div>

			{showForm && (
				<div className="glass-card p-6">
					<h3 className="font-bold mb-4">Form Pengajuan Cuti</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						<select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary">
							<option value="">Pilih Pegawai</option>
							{employees?.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
						</select>
						<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary">
							<option value="ANNUAL">Cuti Tahunan</option>
							<option value="SICK">Sakit</option>
							<option value="PERMISSION">Izin</option>
							<option value="MATERNITY">Cuti Melahirkan</option>
							<option value="OTHER">Lainnya</option>
						</select>
						<input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} placeholder="Tanggal Mulai" className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary" />
						<input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} placeholder="Tanggal Selesai" className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary" />
						<input type="text" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Alasan (opsional)" className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary" />
						<button type="button" onClick={() => createMutation.mutate(form)} disabled={!form.employeeId || !form.startDate || !form.endDate} className="bg-primary text-primary-foreground rounded-lg px-4 py-2.5 font-semibold disabled:opacity-50">
							{createMutation.isPending ? "Menyimpan..." : "Simpan"}
						</button>
					</div>
				</div>
			)}

			<div className="glass-card overflow-hidden">
				<table className="w-full">
					<thead>
						<tr className="border-b border-white/5 bg-white/5">
							<th className="text-left p-4 text-xs uppercase text-foreground/40 font-bold">Pegawai</th>
							<th className="text-left p-4 text-xs uppercase text-foreground/40 font-bold">Jenis</th>
							<th className="text-left p-4 text-xs uppercase text-foreground/40 font-bold">Tanggal</th>
							<th className="text-left p-4 text-xs uppercase text-foreground/40 font-bold">Alasan</th>
							<th className="text-left p-4 text-xs uppercase text-foreground/40 font-bold">Status</th>
							<th className="text-right p-4 text-xs uppercase text-foreground/40 font-bold">Aksi</th>
						</tr>
					</thead>
					<tbody>
						{isLoading ? (
							[1, 2, 3].map((i) => <tr key={i} className="border-b border-white/5"><td colSpan={6} className="p-4"><div className="h-4 bg-white/5 rounded animate-pulse" /></td></tr>)
						) : leaves?.length === 0 ? (
							<tr><td colSpan={6} className="p-12 text-center">
								<CalendarOff size={48} className="mx-auto text-foreground/20 mb-4" />
								<p className="text-foreground/40">Belum ada pengajuan cuti.</p>
							</td></tr>
						) : (
							leaves?.map((leave) => (
								<tr key={leave.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
									<td className="p-4 font-semibold">{leave.employee?.name || "-"}</td>
									<td className="p-4 text-sm">{typeLabels[leave.type] || leave.type}</td>
									<td className="p-4 text-sm font-mono">{leave.startDate} → {leave.endDate}</td>
									<td className="p-4 text-sm text-foreground/60">{leave.reason || "-"}</td>
									<td className="p-4">
										<span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold border ${statusColors[leave.status]}`}>
											{leave.status === "PENDING" ? "Menunggu" : leave.status === "APPROVED" ? "Disetujui" : "Ditolak"}
										</span>
									</td>
									<td className="p-4 text-right">
										<div className="flex items-center justify-end gap-1">
											{leave.status === "PENDING" && (
												<>
													<button type="button" onClick={() => approveMutation.mutate(leave.id)} title="Setujui" className="p-2 hover:bg-emerald-500/10 rounded-lg text-foreground/40 hover:text-emerald-500 transition-all"><Check size={16} /></button>
													<button type="button" onClick={() => rejectMutation.mutate(leave.id)} title="Tolak" className="p-2 hover:bg-destructive/10 rounded-lg text-foreground/40 hover:text-destructive transition-all"><XIcon size={16} /></button>
												</>
											)}
											<button type="button" onClick={() => { if (confirm("Hapus pengajuan cuti ini?")) deleteMutation.mutate(leave.id); }} className="p-2 hover:bg-destructive/10 rounded-lg text-foreground/40 hover:text-destructive transition-all"><Trash2 size={14} /></button>
										</div>
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
