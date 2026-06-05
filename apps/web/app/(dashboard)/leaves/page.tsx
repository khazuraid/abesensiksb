"use client";

import type { Employee } from "@adms/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, Plus, Trash2, X as XIcon } from "lucide-react";
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

export default function LeavesPage() {
	const queryClient = useQueryClient();
	const [showForm, setShowForm] = useState(false);
	const [form, setForm] = useState({
		employeeId: "",
		type: "ANNUAL",
		startDate: "",
		endDate: "",
		reason: "",
	});

	const [page, setPage] = useState(1);

	const { data: response, isLoading } = useQuery({
		queryKey: ["leaves", page],
		queryFn: async () => {
			return (await api.get(`/leaves?page=${page}&limit=10`)).data;
		},
	});

	const leaves: Leave[] = response?.data || [];
	const meta = response?.meta;

	const { data: employees } = useQuery<Employee[]>({
		queryKey: ["employees-list"],
		queryFn: async () => (await api.get("/employees")).data,
	});

	const createMutation = useMutation({
		mutationFn: async (data: typeof form) => {
			await api.post("/leaves", {
				...data,
				employeeId: Number(data.employeeId),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["leaves"] });
			setShowForm(false);
			setForm({
				employeeId: "",
				type: "ANNUAL",
				startDate: "",
				endDate: "",
				reason: "",
			});
		},
	});

	const approveMutation = useMutation({
		mutationFn: async (id: number) => {
			await api.patch(`/leaves/${id}/approve`);
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leaves"] }),
	});

	const rejectMutation = useMutation({
		mutationFn: async (id: number) => {
			await api.patch(`/leaves/${id}/reject`);
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leaves"] }),
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: number) => {
			await api.delete(`/leaves/${id}`);
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leaves"] }),
	});

	return (
		<motion.div
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className="space-y-8 max-w-[1440px] mx-auto min-h-[calc(100vh-6rem)]"
		>
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h2 className="font-display text-3xl font-semibold text-[#111c2d]">
						Manajemen Cuti
					</h2>
					<p className="font-sans text-sm text-[#6e797e] mt-1">
						Pengajuan dan persetujuan cuti pegawai.
					</p>
				</div>
				<button
					type="button"
					onClick={() => setShowForm(!showForm)}
					className="bg-[#00647c] text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-semibold text-[13px] hover:bg-[#007f9d] transition-colors shadow-sm active:scale-95"
				>
					<Plus size={18} /> Ajukan Cuti
				</button>
			</div>

			{showForm && (
				<div className="bg-white rounded-xl border border-black/5 shadow-sm p-6 relative">
					<button
						type="button"
						onClick={() => setShowForm(false)}
						className="absolute top-4 right-4 p-2 text-[#6e797e] hover:bg-[#f9f9ff] hover:text-[#111c2d] rounded-lg transition-colors"
					>
						<XIcon size={20} />
					</button>
					<h3 className="font-semibold text-[#111c2d] mb-4">
						Form Pengajuan Cuti
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						<select
							value={form.employeeId}
							onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
							className="w-full bg-white border border-[#bdc8ce] rounded-lg px-4 py-2 text-[13px] text-[#111c2d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c]"
						>
							<option value="">Pilih Pegawai</option>
							{employees?.map((e) => (
								<option key={e.id} value={e.id}>
									{e.name}
								</option>
							))}
						</select>
						<select
							value={form.type}
							onChange={(e) => setForm({ ...form, type: e.target.value })}
							className="w-full bg-white border border-[#bdc8ce] rounded-lg px-4 py-2 text-[13px] text-[#111c2d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c]"
						>
							<option value="ANNUAL">Cuti Tahunan</option>
							<option value="SICK">Sakit</option>
							<option value="PERMISSION">Izin</option>
							<option value="MATERNITY">Cuti Melahirkan</option>
							<option value="OTHER">Lainnya</option>
						</select>
						<input
							type="date"
							value={form.startDate}
							onChange={(e) => setForm({ ...form, startDate: e.target.value })}
							placeholder="Tanggal Mulai"
							className="w-full bg-white border border-[#bdc8ce] rounded-lg px-4 py-2 text-[13px] text-[#111c2d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c]"
						/>
						<input
							type="date"
							value={form.endDate}
							onChange={(e) => setForm({ ...form, endDate: e.target.value })}
							placeholder="Tanggal Selesai"
							className="w-full bg-white border border-[#bdc8ce] rounded-lg px-4 py-2 text-[13px] text-[#111c2d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c]"
						/>
						<input
							type="text"
							value={form.reason}
							onChange={(e) => setForm({ ...form, reason: e.target.value })}
							placeholder="Alasan (opsional)"
							className="w-full bg-white border border-[#bdc8ce] rounded-lg px-4 py-2 text-[13px] text-[#111c2d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c] lg:col-span-2"
						/>
						<button
							type="button"
							onClick={() => createMutation.mutate(form)}
							disabled={
								!form.employeeId ||
								!form.startDate ||
								!form.endDate ||
								createMutation.isPending
							}
							className="bg-[#00647c] text-white rounded-lg px-4 py-2 font-semibold text-[13px] disabled:opacity-50 hover:bg-[#007f9d] transition-colors"
						>
							{createMutation.isPending ? "Menyimpan..." : "Simpan Pengajuan"}
						</button>
					</div>
				</div>
			)}

			<div className="bg-white rounded-xl border border-black/5 overflow-hidden shadow-sm">
				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse min-w-[800px]">
						<thead>
							<tr className="bg-[#f0f3ff] border-b border-black/5">
								<th className="py-4 px-6 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider">
									Pegawai
								</th>
								<th className="py-4 px-6 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider">
									Jenis
								</th>
								<th className="py-4 px-6 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider">
									Tanggal
								</th>
								<th className="py-4 px-6 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider">
									Alasan
								</th>
								<th className="py-4 px-6 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider">
									Status
								</th>
								<th className="py-4 px-6 font-sans text-[11px] font-semibold text-[#6e797e] uppercase tracking-wider text-right">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody className="font-sans text-[14px] divide-y divide-black/5">
							{isLoading ? (
								[1, 2, 3].map((k) => (
									<tr key={k} className="animate-pulse">
										<td colSpan={6} className="px-6 py-4 h-16 bg-white" />
									</tr>
								))
							) : leaves?.length === 0 ? (
								<tr>
									<td
										colSpan={6}
										className="py-16 text-center text-[#6e797e] text-sm"
									>
										Tidak ada data cuti.
									</td>
								</tr>
							) : (
								leaves?.map((leave) => (
									<tr
										key={leave.id}
										className="hover:bg-[#f0f3ff]/50 transition-colors group"
									>
										<td className="py-4 px-6 font-medium text-[#111c2d]">
											{leave.employee?.name}
										</td>
										<td className="py-4 px-6 text-[#3e484d]">
											{typeLabels[leave.type] || leave.type}
										</td>
										<td className="py-4 px-6 text-[#3e484d]">
											{new Date(leave.startDate).toISOString().split("T")[0]}{" "}
											&rarr;{" "}
											{new Date(leave.endDate).toISOString().split("T")[0]}
										</td>
										<td className="py-4 px-6 text-[#3e484d]">
											{leave.reason || "-"}
										</td>
										<td className="py-4 px-6">
											{leave.status === "PENDING" && (
												<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ffeebb] text-[#894e00]">
													MENUNGGU
												</span>
											)}
											{leave.status === "APPROVED" && (
												<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#6cf8bb] text-[#00714d]">
													DISETUJUI
												</span>
											)}
											{leave.status === "REJECTED" && (
												<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ffdad6] text-[#93000a]">
													DITOLAK
												</span>
											)}
										</td>
										<td className="py-4 px-6 text-right">
											<div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
												{leave.status === "PENDING" && (
													<>
														<button
															type="button"
															onClick={() => approveMutation.mutate(leave.id)}
															title="Setujui"
															className="p-1.5 text-[#006c49] hover:bg-[#6cf8bb]/30 rounded-lg transition-colors"
														>
															<Check size={18} />
														</button>
														<button
															type="button"
															onClick={() => rejectMutation.mutate(leave.id)}
															title="Tolak"
															className="p-1.5 text-[#ba1a1a] hover:bg-[#ffdad6]/50 rounded-lg transition-colors"
														>
															<XIcon size={18} />
														</button>
													</>
												)}
												<button
													type="button"
													onClick={() => {
														if (confirm("Hapus cuti ini?")) {
															deleteMutation.mutate(leave.id);
														}
													}}
													title="Hapus"
													className="p-1.5 text-[#6e797e] hover:text-[#ba1a1a] transition-colors ml-2"
												>
													<Trash2 size={18} />
												</button>
											</div>
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
