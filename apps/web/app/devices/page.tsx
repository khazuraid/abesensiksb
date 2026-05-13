"use client";

import type { CreateDevice, Device, UpdateDevice } from "@adms/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
	Monitor,
	Plus,
	RefreshCcw,
	Trash2,
	Wifi,
	WifiOff,
	X,
} from "lucide-react";
import { useState } from "react";
import api from "@/lib/api";

function DeviceForm({
	onClose,
	onSubmit,
	initialData,
	isLoading,
}: {
	onClose: () => void;
	onSubmit: (data: CreateDevice) => void;
	initialData?: Device;
	isLoading: boolean;
}) {
	const [form, setForm] = useState<CreateDevice>({
		serialNumber: initialData?.serialNumber || "",
		name: initialData?.name || "",
		location: initialData?.location || "",
		ipAddress: initialData?.ipAddress || "",
	});

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
			<div className="glass-card w-full max-w-md shadow-2xl">
				<div className="p-6 border-b border-white/5 flex items-center justify-between">
					<h3 className="text-xl font-bold">
						{initialData ? "Edit Perangkat" : "Tambah Perangkat"}
					</h3>
					<button type="button" onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg">
						<X size={20} />
					</button>
				</div>
				<form
					onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}
					className="p-6 space-y-4"
				>
					<div>
						<label htmlFor="sn" className="block text-sm font-medium text-foreground/70 mb-1">Serial Number</label>
						<input id="sn" required value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary" />
					</div>
					<div>
						<label htmlFor="dname" className="block text-sm font-medium text-foreground/70 mb-1">Nama Perangkat</label>
						<input id="dname" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary" />
					</div>
					<div>
						<label htmlFor="loc" className="block text-sm font-medium text-foreground/70 mb-1">Lokasi</label>
						<input id="loc" value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary" />
					</div>
					<div>
						<label htmlFor="ip" className="block text-sm font-medium text-foreground/70 mb-1">IP Address</label>
						<input id="ip" value={form.ipAddress || ""} onChange={(e) => setForm({ ...form, ipAddress: e.target.value })} placeholder="192.168.1.100" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary font-mono" />
					</div>
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

export default function DevicesPage() {
	const queryClient = useQueryClient();
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

	const { data: devices, isLoading } = useQuery<Device[]>({
		queryKey: ["devices"],
		queryFn: async () => (await api.get("/devices")).data,
	});

	const createMutation = useMutation({
		mutationFn: async (data: CreateDevice) => { await api.post("/devices", data); },
		onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["devices"] }); setIsFormOpen(false); },
	});

	const updateMutation = useMutation({
		mutationFn: async ({ id, data }: { id: number; data: UpdateDevice }) => { await api.patch(`/devices/${id}`, data); },
		onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["devices"] }); setIsFormOpen(false); setSelectedDevice(null); },
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: number) => { await api.delete(`/devices/${id}`); },
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["devices"] }),
	});

	const rebootMutation = useMutation({
		mutationFn: async (deviceId: number) => { await api.post("/devices/command", { deviceId, command: "REBOOT" }); },
	});

	const handleSubmit = (data: CreateDevice) => {
		if (selectedDevice) {
			updateMutation.mutate({ id: selectedDevice.id, data });
		} else {
			createMutation.mutate(data);
		}
	};

	return (
		<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">Manajemen Perangkat</h2>
					<p className="text-foreground/60">Kelola terminal absensi ADMS dan kontrol perintah remote.</p>
				</div>
				<button type="button" onClick={() => { setSelectedDevice(null); setIsFormOpen(true); }} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-all">
					<Plus size={20} />
					Tambah Perangkat
				</button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{isLoading ? (
					[1, 2, 3].map((k) => <div key={k} className="glass-card h-48 animate-pulse" />)
				) : devices?.length === 0 ? (
					<div className="lg:col-span-3 py-20 text-center glass-card">
						<Monitor size={48} className="mx-auto text-foreground/20 mb-4" />
						<p className="text-foreground/40">Belum ada perangkat terdaftar.</p>
					</div>
				) : (
					devices?.map((dev) => (
						<motion.div key={dev.id} whileHover={{ y: -4 }} className="glass-card p-6 flex flex-col justify-between">
							<div className="flex items-start justify-between">
								<div className="flex items-center gap-4">
									<div className={`p-3 rounded-xl ${dev.isOnline ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
										<Monitor size={24} />
									</div>
									<div>
										<h3 className="font-bold text-lg">{dev.name}</h3>
										<p className="text-xs text-foreground/40 font-mono">{dev.serialNumber}</p>
									</div>
								</div>
								<span className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${dev.isOnline ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
									{dev.isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
									{dev.isOnline ? "Online" : "Offline"}
								</span>
							</div>
							<div className="mt-4 space-y-1 text-xs">
								<div className="flex justify-between"><span className="text-foreground/40">Lokasi:</span><span>{dev.location || "-"}</span></div>
								<div className="flex justify-between"><span className="text-foreground/40">IP:</span><span className="font-mono">{dev.ipAddress || "-"}</span></div>
							</div>
							<div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
								<div className="flex gap-1">
									<button type="button" onClick={() => rebootMutation.mutate(dev.id)} title="Reboot" className="p-2 hover:bg-white/5 rounded-lg text-foreground/40 hover:text-foreground transition-all"><RefreshCcw size={14} /></button>
									<button type="button" onClick={() => { setSelectedDevice(dev); setIsFormOpen(true); }} title="Edit" className="p-2 hover:bg-white/5 rounded-lg text-foreground/40 hover:text-primary transition-all"><Monitor size={14} /></button>
								</div>
								<button type="button" onClick={() => { if (confirm("Hapus perangkat ini?")) deleteMutation.mutate(dev.id); }} className="p-2 hover:bg-destructive/10 rounded-lg text-foreground/40 hover:text-destructive transition-all"><Trash2 size={14} /></button>
							</div>
						</motion.div>
					))
				)}
			</div>

			{isFormOpen && (
				<DeviceForm
					onClose={() => { setIsFormOpen(false); setSelectedDevice(null); }}
					onSubmit={handleSubmit}
					initialData={selectedDevice || undefined}
					isLoading={createMutation.isPending || updateMutation.isPending}
				/>
			)}
		</motion.div>
	);
}
