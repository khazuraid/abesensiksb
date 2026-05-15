"use client";

import type {
	CreateEmployee,
	Device,
	Employee,
	UpdateEmployee,
} from "@adms/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Edit2, Search, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import EmployeeForm from "@/components/employee-form";
import api from "@/lib/api";

export default function EmployeesPage() {
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
		null,
	);

	const { data: employees, isLoading } = useQuery<Employee[]>({
		queryKey: ["employees"],
		queryFn: async () => {
			const res = await api.get("/employees");
			return res.data;
		},
	});

	const createMutation = useMutation({
		mutationFn: async (data: CreateEmployee) => {
			await api.post("/employees", data);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["employees"] });
			setIsFormOpen(false);
		},
	});

	const updateMutation = useMutation({
		mutationFn: async ({ id, data }: { id: number; data: UpdateEmployee }) => {
			await api.patch(`/employees/${id}`, data);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["employees"] });
			setIsFormOpen(false);
			setSelectedEmployee(null);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: number) => {
			await api.delete(`/employees/${id}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["employees"] });
		},
	});

	const syncMutation = useMutation({
		mutationFn: async (deviceId: number) => {
			return (await api.post("/employees/sync-device", { deviceId })).data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["employees"] });
		},
	});

	const { data: devices } = useQuery<Device[]>({
		queryKey: ["devices-list"],
		queryFn: async () => (await api.get("/devices")).data,
	});

	const handleSubmit = (data: CreateEmployee) => {
		if (selectedEmployee) {
			updateMutation.mutate({ id: selectedEmployee.id, data });
		} else {
			createMutation.mutate(data);
		}
	};

	const handleEdit = (employee: Employee) => {
		setSelectedEmployee(employee);
		setIsFormOpen(true);
	};

	const filteredEmployees = employees?.filter(
		(emp) =>
			emp.name.toLowerCase().includes(search.toLowerCase()) ||
			emp.employeeCode.toLowerCase().includes(search.toLowerCase()),
	);

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="space-y-8"
		>
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">Data Pegawai</h2>
					<p className="text-foreground/60">
						Kelola informasi detail dan status biometrik pegawai.
					</p>
				</div>
			<div className="flex items-center gap-3">
					{devices && devices.length > 0 && (
						<select
							onChange={(e) => { if (e.target.value) syncMutation.mutate(Number(e.target.value)); e.target.value = ""; }}
							className="bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
							defaultValue=""
						>
							<option value="" disabled>
								{syncMutation.isPending ? "Syncing..." : "⬇ Sync dari Mesin"}
							</option>
							{devices.map((d) => (
								<option key={d.id} value={d.id}>{d.name}</option>
							))}
						</select>
					)}
				<button
					type="button"
					onClick={() => {
						setSelectedEmployee(null);
						setIsFormOpen(true);
					}}
					className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
				>
					<UserPlus size={20} />
					Tambah Pegawai
				</button>
				</div>
			</div>

			<div className="glass-card">
				<div className="p-6 border-b border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
					<div className="relative w-full md:w-96">
						<Search
							className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40"
							size={18}
						/>
						<input
							type="text"
							placeholder="Cari nama atau NIP..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
						/>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-sm text-foreground/60">
							Total: {filteredEmployees?.length || 0} Pegawai
						</span>
					</div>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse">
						<thead>
							<tr className="bg-white/5 text-foreground/60 text-sm">
								<th className="px-6 py-4 font-medium">Pegawai</th>
								<th className="px-6 py-4 font-medium">NIP / Kode</th>
								<th className="px-6 py-4 font-medium">Departemen</th>
								<th className="px-6 py-4 font-medium">Sidik Jari</th>
								<th className="px-6 py-4 font-medium">Status</th>
								<th className="px-6 py-4 font-medium text-right">Aksi</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-white/5">
							{isLoading ? (
								["s1", "s2", "s3", "s4", "s5"].map((key) => (
									<tr key={key} className="animate-pulse">
										<td colSpan={6} className="px-6 py-6 h-16 bg-white/5"></td>
									</tr>
								))
							) : filteredEmployees?.length === 0 ? (
								<tr>
									<td
										colSpan={6}
										className="px-6 py-20 text-center text-foreground/40"
									>
										Tidak ada data pegawai ditemukan.
									</td>
								</tr>
							) : (
								filteredEmployees?.map((emp) => (
									<tr
										key={emp.id}
										className="hover:bg-white/5 transition-colors group"
									>
										<td className="px-6 py-4">
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold">
													{emp.name[0]}
												</div>
												<div className="font-semibold">{emp.name}</div>
											</div>
										</td>
										<td className="px-6 py-4 font-mono text-sm">
											{emp.employeeCode}
										</td>
										<td className="px-6 py-4 text-foreground/80">
											{emp.department || "-"}
										</td>
										<td className="px-6 py-4">
											<span
												className={`px-3 py-1 rounded-full text-xs font-medium ${
													emp.biometricId
														? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
														: "bg-amber-500/10 text-amber-500 border border-amber-500/20"
												}`}
											>
												{emp.biometricId ? "Terdaftar" : "Belum"}
											</span>
										</td>
										<td className="px-6 py-4">
											<span
												className={`px-3 py-1 rounded-full text-xs font-medium ${
													emp.isActive
														? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
														: "bg-destructive/10 text-destructive border border-destructive/20"
												}`}
											>
												{emp.isActive ? "Aktif" : "Nonaktif"}
											</span>
										</td>
										<td className="px-6 py-4 text-right">
											<div className="flex items-center justify-end gap-2">
												<button
													type="button"
													onClick={() => handleEdit(emp)}
													className="p-2 hover:bg-white/10 rounded-lg text-foreground/60 hover:text-foreground transition-all"
												>
													<Edit2 size={16} />
												</button>
												<button
													type="button"
													onClick={() => { if (confirm("Hapus pegawai ini?")) deleteMutation.mutate(emp.id); }}
													disabled={deleteMutation.isPending}
													className="p-2 hover:bg-destructive/10 rounded-lg text-foreground/60 hover:text-destructive transition-all disabled:opacity-50"
												>
													<Trash2 size={16} />
												</button>
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			<AnimatePresence>
				{isFormOpen && (
					<EmployeeForm
						onSubmit={handleSubmit}
						onClose={() => {
							setIsFormOpen(false);
							setSelectedEmployee(null);
						}}
						initialData={selectedEmployee || undefined}
						isLoading={createMutation.isPending || updateMutation.isPending}
					/>
				)}
			</AnimatePresence>
		</motion.div>
	);
}
