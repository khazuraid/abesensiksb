"use client";

import type { CreateShift, Shift, UpdateShift } from "@adms/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CalendarDays, Clock, Edit2, Plus, Timer, Trash2, X } from "lucide-react";
import { useState } from "react";
import api from "@/lib/api";

function ShiftForm({
	onClose,
	onSubmit,
	initialData,
	isLoading,
}: {
	onClose: () => void;
	onSubmit: (data: CreateShift) => void;
	initialData?: Shift;
	isLoading: boolean;
}) {
	const [form, setForm] = useState<CreateShift>({
		name: initialData?.name || "",
		startTime: initialData?.startTime || "08:00",
		endTime: initialData?.endTime || "17:00",
		toleranceMinutes: initialData?.toleranceMinutes ?? 15,
		earlyOutTolerance: initialData?.earlyOutTolerance ?? 0,
		maxLateTime: initialData?.maxLateTime || "",
		minOutTime: initialData?.minOutTime || "",
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
		<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
			<div className="glass-card w-full max-w-md shadow-2xl">
				<div className="p-6 border-b border-white/5 flex items-center justify-between">
					<h3 className="text-xl font-bold">{initialData ? "Edit Shift" : "Tambah Shift"}</h3>
					<button type="button" onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg"><X size={20} /></button>
				</div>
				<form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="p-6 space-y-4">
					<div>
						<label htmlFor="sname" className="block text-sm font-medium text-foreground/70 mb-1">Nama Shift</label>
						<input id="sname" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Shift Pagi" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary" />
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label htmlFor="start" className="block text-sm font-medium text-foreground/70 mb-1">Jam Masuk</label>
							<input id="start" type="time" required value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary" />
						</div>
						<div>
							<label htmlFor="end" className="block text-sm font-medium text-foreground/70 mb-1">Jam Pulang</label>
							<input id="end" type="time" required value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary" />
						</div>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label htmlFor="tol" className="block text-sm font-medium text-foreground/70 mb-1">Toleransi Terlambat (menit)</label>
							<input id="tol" type="number" min={0} value={form.toleranceMinutes} onChange={(e) => setForm({ ...form, toleranceMinutes: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary" />
						</div>
						<div>
							<label htmlFor="early" className="block text-sm font-medium text-foreground/70 mb-1">Toleransi Pulang Awal (menit)</label>
							<input id="early" type="number" min={0} value={form.earlyOutTolerance} onChange={(e) => setForm({ ...form, earlyOutTolerance: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary" />
						</div>
					</div>
					<div>
						<label htmlFor="maxlate" className="block text-sm font-medium text-foreground/70 mb-1">Maks. Jam Masuk (lewat = ABSENT)</label>
						<input id="maxlate" type="time" value={form.maxLateTime || ""} onChange={(e) => setForm({ ...form, maxLateTime: e.target.value || null })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary" />
						<p className="text-xs text-foreground/40 mt-1">Kosongkan jika tidak ada batas</p>
					</div>
					<div>
						<label htmlFor="minout" className="block text-sm font-medium text-foreground/70 mb-1">Min. Jam Pulang (sebelum = ABSENT)</label>
						<input id="minout" type="time" value={form.minOutTime || ""} onChange={(e) => setForm({ ...form, minOutTime: e.target.value || null })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary" />
						<p className="text-xs text-foreground/40 mt-1">Kosongkan jika tidak ada batas</p>
					</div>
					<div>
						<label className="block text-sm font-medium text-foreground/70 mb-2">Hari Kerja</label>
						<div className="flex gap-2">
							{dayNames.map((name, idx) => (
								<button key={name} type="button" onClick={() => toggleDay(idx)} className={`w-10 h-10 rounded-lg text-xs font-bold transition-all ${form.workDays.includes(idx) ? "bg-primary text-primary-foreground" : "bg-white/5 border border-white/10 text-foreground/40 hover:bg-white/10"}`}>
									{name}
								</button>
							))}
						</div>
					</div>
					<label htmlFor="active" className="flex items-center gap-3 cursor-pointer">
						<input id="active" type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 rounded accent-primary" />
						<span className="text-sm">Aktif</span>
					</label>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label htmlFor="effFrom" className="block text-sm font-medium text-foreground/70 mb-1">Berlaku Dari</label>
							<input id="effFrom" type="date" value={form.effectiveFrom || ""} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value || null })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary" />
						</div>
						<div>
							<label htmlFor="effTo" className="block text-sm font-medium text-foreground/70 mb-1">Berlaku Sampai</label>
							<input id="effTo" type="date" value={form.effectiveTo || ""} onChange={(e) => setForm({ ...form, effectiveTo: e.target.value || null })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary" />
						</div>
					</div>
					<p className="text-xs text-foreground/40">Kosongkan jika berlaku selamanya</p>
					<div className="flex gap-3 pt-4">
						<button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-white/10 hover:bg-white/5">Batal</button>
						<button type="submit" disabled={isLoading} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50">
							{isLoading ? "Menyimpan..." : "Simpan"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

export default function ShiftsPage() {
	const queryClient = useQueryClient();
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

	const { data: shifts, isLoading } = useQuery<Shift[]>({
		queryKey: ["shifts"],
		queryFn: async () => (await api.get("/shifts")).data,
	});

	const createMutation = useMutation({
		mutationFn: async (data: CreateShift) => { await api.post("/shifts", data); },
		onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shifts"] }); setIsFormOpen(false); },
	});

	const updateMutation = useMutation({
		mutationFn: async ({ id, data }: { id: number; data: UpdateShift }) => { await api.patch(`/shifts/${id}`, data); },
		onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shifts"] }); setIsFormOpen(false); setSelectedShift(null); },
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: number) => { await api.delete(`/shifts/${id}`); },
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shifts"] }),
	});

	const handleSubmit = (data: CreateShift) => {
		if (selectedShift) {
			updateMutation.mutate({ id: selectedShift.id, data });
		} else {
			createMutation.mutate(data);
		}
	};

	return (
		<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">Manajemen Shift</h2>
					<p className="text-foreground/60">Atur jam kerja, toleransi keterlambatan, dan jadwal operasional.</p>
				</div>
				<button type="button" onClick={() => { setSelectedShift(null); setIsFormOpen(true); }} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-all">
					<Plus size={20} />
					Tambah Shift
				</button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{isLoading ? (
					[1, 2, 3].map((k) => <div key={k} className="glass-card h-48 animate-pulse" />)
				) : shifts?.length === 0 ? (
					<div className="lg:col-span-3 py-20 text-center glass-card">
						<Clock size={48} className="mx-auto text-foreground/20 mb-4" />
						<p className="text-foreground/40">Belum ada shift yang dikonfigurasi.</p>
					</div>
				) : (
					shifts?.map((shift) => (
						<div key={shift.id} className="glass-card p-6 flex flex-col justify-between group hover:border-primary/30 transition-all">
							<div className="flex items-start justify-between">
								<div className="flex items-center gap-4">
									<div className="p-3 rounded-xl bg-primary/10 text-primary"><Timer size={24} /></div>
									<div>
										<h3 className="font-bold text-lg">{shift.name}</h3>
										<span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${shift.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
											{shift.isActive ? "Aktif" : "Nonaktif"}
										</span>
									</div>
								</div>
							</div>
							<div className="mt-6 grid grid-cols-2 gap-4">
								<div className="p-3 rounded-lg bg-white/5 border border-white/5">
									<div className="text-[10px] text-foreground/40 font-bold uppercase mb-1">Masuk</div>
									<div className="text-lg font-mono font-bold text-primary">{shift.startTime}</div>
								</div>
								<div className="p-3 rounded-lg bg-white/5 border border-white/5">
									<div className="text-[10px] text-foreground/40 font-bold uppercase mb-1">Pulang</div>
									<div className="text-lg font-mono font-bold text-foreground/80">{shift.endTime}</div>
								</div>
							</div>
							<div className="mt-4 flex items-center gap-2 text-xs text-foreground/60">
								<CalendarDays size={14} />
								<span>Toleransi Telat: <span className="text-primary font-bold">{shift.toleranceMinutes}m</span></span>
								{shift.earlyOutTolerance > 0 && <span>• Pulang Awal: <span className="text-amber-400 font-bold">{shift.earlyOutTolerance}m</span></span>}
								{shift.maxLateTime && <span>• Maks: <span className="text-destructive font-bold">{shift.maxLateTime}</span></span>}
							</div>
							<div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-end gap-2">
								<button type="button" onClick={() => { setSelectedShift(shift); setIsFormOpen(true); }} className="p-2 hover:bg-white/5 rounded-lg text-foreground/40 hover:text-foreground transition-all"><Edit2 size={16} /></button>
								<button type="button" onClick={() => { if (confirm("Hapus shift ini?")) deleteMutation.mutate(shift.id); }} className="p-2 hover:bg-destructive/10 rounded-lg text-foreground/40 hover:text-destructive transition-all"><Trash2 size={16} /></button>
							</div>
						</div>
					))
				)}
			</div>

			{isFormOpen && (
				<ShiftForm
					onClose={() => { setIsFormOpen(false); setSelectedShift(null); }}
					onSubmit={handleSubmit}
					initialData={selectedShift || undefined}
					isLoading={createMutation.isPending || updateMutation.isPending}
				/>
			)}
		</motion.div>
	);
}
