"use client";

import type {
	CreateEmployee,
	Employee,
	Shift,
	UpdateEmployee,
} from "@adms/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
	ChevronLeft,
	ChevronRight,
	Download,
	Edit2,
	Filter,
	Fingerprint,
	Search,
	Trash2,
	UploadCloud,
	UserPlus,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import EmployeeForm from "@/components/employee-form";
import api from "@/lib/api";

export default function EmployeesPage() {
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
		null,
	);
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [isBulkShiftOpen, setIsBulkShiftOpen] = useState(false);
	const [bulkShiftIds, setBulkShiftIds] = useState<number[]>([]);

	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const searchQuery = urlParams.get("search");
		if (searchQuery) setSearch(searchQuery);
	}, []);

	const { data: employees, isLoading } = useQuery<Employee[]>({
		queryKey: ["employees"],
		queryFn: async () => {
			const res = await api.get("/employees");
			return res.data;
		},
	});

	const { data: shifts } = useQuery<Shift[]>({
		queryKey: ["shifts"],
		queryFn: async () => {
			const res = await api.get("/shifts");
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
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: ["employees"] });
			setSelectedIds((prev) => prev.filter((prevId) => prevId !== id));
		},
	});

	const bulkShiftMutation = useMutation({
		mutationFn: async () => {
			await api.patch("/employees/bulk/shift", {
				employeeIds: selectedIds,
				shiftIds: bulkShiftIds,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["employees"] });
			setIsBulkShiftOpen(false);
			setSelectedIds([]);
			setBulkShiftIds([]);
			alert("Berhasil memperbarui shift pegawai terpilih.");
		},
		onError: (err: any) => {
			alert(
				"Gagal update shift: " + (err?.response?.data?.message || err?.message),
			);
		},
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

	const filteredEmployees =
		employees?.filter(
			(emp) =>
				emp.name.toLowerCase().includes(search.toLowerCase()) ||
				emp.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
				emp.department?.toLowerCase().includes(search.toLowerCase()),
		) || [];

	return (
		<motion.div
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className="space-y-6 max-w-[1440px] mx-auto h-[calc(100vh-6rem)] flex flex-col"
		>
			{/* Page Header & Actions */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
				<div>
					<h2 className="font-display text-3xl font-semibold text-[#111c2d]">
						Manajemen Pegawai
					</h2>
					<p className="font-sans text-sm text-[#6e797e] mt-1">
						Registrasi pusat seluruh pengguna ADMS.
					</p>
				</div>
				<div className="flex flex-wrap gap-3">
					<button
						type="button"
						className="flex items-center gap-2 px-4 py-2 bg-white border border-black/5 rounded-lg text-[#111c2d] hover:bg-[#f9f9ff] transition-all font-semibold text-[13px] shadow-sm active:scale-95"
					>
						<UploadCloud size={18} /> Push ke Perangkat
					</button>
					<button
						type="button"
						onClick={() => setIsFormOpen(true)}
						className="flex items-center gap-2 px-4 py-2 bg-[#00647c] text-white rounded-lg hover:bg-[#007f9d] transition-all font-semibold text-[13px] shadow-sm active:scale-95"
					>
						<UserPlus size={18} /> Tambah Pegawai
					</button>
				</div>
			</div>

			{/* Bulk Actions Bar */}
			{selectedIds.length > 0 && (
				<div className="bg-[#00647c] text-white px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
					<div className="flex items-center gap-2 text-[14px] font-semibold">
						<span className="bg-white/20 px-2 py-0.5 rounded-md">
							{selectedIds.length}
						</span>
						Pegawai Terpilih
					</div>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => setIsBulkShiftOpen(true)}
							className="px-3 py-1.5 bg-white text-[#00647c] rounded-lg text-[13px] font-bold hover:bg-[#f9f9ff] active:scale-95 transition-all"
						>
							Atur Shift
						</button>
						<button
							type="button"
							onClick={() => setSelectedIds([])}
							className="px-3 py-1.5 border border-white/20 text-white rounded-lg text-[13px] font-medium hover:bg-white/10 active:scale-95 transition-all"
						>
							Batal
						</button>
					</div>
				</div>
			)}

			{/* Data Table Container */}
			<div className="bg-white border border-black/5 rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
				{/* Toolbar */}
				<div className="p-4 border-b border-black/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#f9f9ff]/50">
					<div className="flex items-center gap-3 w-full sm:w-auto">
						<div className="relative w-full sm:w-64">
							<Search
								className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e797e]"
								size={16}
							/>
							<input
								className="w-full bg-white border border-[#bdc8ce] rounded-md py-1.5 pl-9 pr-3 text-[13px] font-sans text-[#111c2d] focus:outline-none focus:border-[#00647c] focus:ring-1 focus:ring-[#00647c]/50 transition-all placeholder:text-[#6e797e]"
								placeholder="Cari NIP atau Nama..."
								type="text"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</div>
						<button
							type="button"
							className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#bdc8ce] text-[#3e484d] hover:text-[#111c2d] hover:bg-[#f9f9ff] transition-all font-semibold text-[13px] whitespace-nowrap"
						>
							<Filter size={16} /> Filter Dept
						</button>
					</div>
					<div className="flex items-center gap-4 text-[#3e484d] font-semibold text-[13px]">
						<span>Total: {filteredEmployees?.length || 0}</span>
						<div className="flex items-center gap-1">
							<button
								type="button"
								className="p-1 rounded hover:bg-[#f9f9ff] transition-colors"
							>
								<ChevronLeft size={16} />
							</button>
							<span className="px-2">1 / 1</span>
							<button
								type="button"
								className="p-1 rounded hover:bg-[#f9f9ff] transition-colors"
							>
								<ChevronRight size={16} />
							</button>
						</div>
					</div>
				</div>

				{/* Table */}
				<div className="flex-1 overflow-auto custom-scrollbar">
					<table className="w-full text-left border-collapse min-w-[800px]">
						<thead className="sticky top-0 bg-[#f9f9ff] shadow-sm z-10 border-b border-black/5">
							<tr>
								<th className="py-3 px-4 font-sans text-[12px] font-semibold text-[#6e797e] whitespace-nowrap w-12">
									<input
										type="checkbox"
										checked={
											filteredEmployees.length > 0 &&
											selectedIds.length === filteredEmployees.length
										}
										onChange={(e) => {
											if (e.target.checked) {
												setSelectedIds(filteredEmployees.map((e) => e.id));
											} else {
												setSelectedIds([]);
											}
										}}
										className="w-4 h-4 rounded border-[#bdc8ce] text-[#00647c] focus:ring-[#00647c]/50 cursor-pointer"
									/>
								</th>
								<th className="py-3 px-4 font-sans text-[12px] font-semibold text-[#6e797e] whitespace-nowrap">
									NIP
								</th>
								<th className="py-3 px-4 font-sans text-[12px] font-semibold text-[#6e797e] whitespace-nowrap">
									Nama Pegawai
								</th>
								<th className="py-3 px-4 font-sans text-[12px] font-semibold text-[#6e797e] whitespace-nowrap">
									Departemen
								</th>
								<th className="py-3 px-4 font-sans text-[12px] font-semibold text-[#6e797e] whitespace-nowrap">
									Jabatan
								</th>
								<th className="py-3 px-4 font-sans text-[12px] font-semibold text-[#6e797e] whitespace-nowrap text-center">
									Status Biometrik
								</th>
								<th className="py-3 px-4 font-sans text-[12px] font-semibold text-[#6e797e] whitespace-nowrap text-right">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-black/5">
							{isLoading ? (
								[1, 2, 3].map((k) => (
									<tr key={k} className="animate-pulse">
										<td colSpan={7} className="px-4 py-4 h-12 bg-white" />
									</tr>
								))
							) : filteredEmployees?.length === 0 ? (
								<tr>
									<td
										colSpan={7}
										className="py-16 text-center text-[#6e797e] text-sm"
									>
										Tidak ada data pegawai yang ditemukan.
									</td>
								</tr>
							) : (
								filteredEmployees?.map((emp, index) => (
									<tr
										key={emp.id}
										className={`group hover:bg-[#dee8ff]/30 transition-colors h-12 ${
											selectedIds.includes(emp.id)
												? "bg-[#dee8ff]/50"
												: index % 2 === 1
													? "bg-[#f0f3ff]/30"
													: ""
										}`}
									>
										<td className="py-2 px-4">
											<input
												type="checkbox"
												checked={selectedIds.includes(emp.id)}
												onChange={(e) => {
													if (e.target.checked) {
														setSelectedIds([...selectedIds, emp.id]);
													} else {
														setSelectedIds(
															selectedIds.filter((id) => id !== emp.id),
														);
													}
												}}
												className="w-4 h-4 rounded border-[#bdc8ce] text-[#00647c] focus:ring-[#00647c]/50 cursor-pointer"
											/>
										</td>
										<td className="py-2 px-4 font-mono text-[13px] text-[#3e484d]">
											{emp.employeeCode}
										</td>
										<td className="py-2 px-4 font-medium text-[14px] text-[#111c2d]">
											{emp.name}
										</td>
										<td className="py-2 px-4 text-[14px] text-[#3e484d]">
											{emp.department || "-"}
										</td>
										<td className="py-2 px-4 text-[14px] text-[#3e484d]">
											{emp.position || "-"}
										</td>
										<td className="py-2 px-4 text-center">
											<div className="flex items-center justify-center gap-2">
												{/* Fake Biometric Statuses based on template */}
												<div
													className="flex items-center gap-1 bg-[#e7eeff] rounded-full px-2 py-0.5 border border-[#bdc8ce]"
													title="Face Enrolled"
												>
													<div className="text-[14px] font-bold text-[#006c49]">
														F
													</div>
													<div className="w-1.5 h-1.5 rounded-full bg-[#006c49] animate-pulse"></div>
												</div>
												<div
													className="flex items-center gap-1 bg-[#e7eeff] rounded-full px-2 py-0.5 border border-[#bdc8ce]"
													title="Fingerprint Enrolled"
												>
													<div className="text-[14px] font-bold text-[#006c49]">
														FP
													</div>
													<div className="w-1.5 h-1.5 rounded-full bg-[#006c49] animate-pulse"></div>
												</div>
											</div>
										</td>
										<td className="py-2 px-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
											<button
												type="button"
												onClick={() => handleEdit(emp)}
												className="p-1.5 text-[#6e797e] hover:text-[#00647c] transition-colors"
											>
												<Edit2 size={16} />
											</button>
											<button
												type="button"
												onClick={() => {
													if (confirm("Yakin ingin menghapus pegawai ini?")) {
														deleteMutation.mutate(emp.id);
													}
												}}
												className="p-1.5 text-[#6e797e] hover:text-[#ba1a1a] transition-colors"
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
			</div>

			{isFormOpen && (
				<EmployeeForm
					onClose={() => {
						setIsFormOpen(false);
						setSelectedEmployee(null);
					}}
					onSubmit={handleSubmit}
					initialData={selectedEmployee || undefined}
				/>
			)}

			{isBulkShiftOpen && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#111c2d]/20 backdrop-blur-sm">
					<div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
						<div className="px-6 py-5 border-b border-black/5 flex items-center justify-between bg-[#f9f9ff]">
							<h3 className="text-xl font-bold text-[#111c2d] font-display">
								Atur Shift Pegawai
							</h3>
							<button
								type="button"
								onClick={() => setIsBulkShiftOpen(false)}
								className="p-2 hover:bg-black/5 rounded-full text-[#6e797e] hover:text-[#111c2d] transition-all"
							>
								<X size={20} />
							</button>
						</div>

						<div className="p-6 space-y-4">
							<p className="text-[14px] text-[#3e484d]">
								Anda akan mengubah shift untuk{" "}
								<strong>{selectedIds.length}</strong> pegawai. Pilih shift yang
								baru:
							</p>

							<div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar border rounded-xl p-2 border-black/5">
								{shifts?.map((shift) => (
									<label
										key={shift.id}
										className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
											bulkShiftIds.includes(shift.id)
												? "border-[#00647c] bg-[#f0f3ff]"
												: "border-transparent hover:border-[#bdc8ce] hover:bg-black/5"
										}`}
									>
										<input
											type="checkbox"
											checked={bulkShiftIds.includes(shift.id)}
											onChange={(e) => {
												if (e.target.checked) {
													setBulkShiftIds([...bulkShiftIds, shift.id]);
												} else {
													setBulkShiftIds(
														bulkShiftIds.filter((id) => id !== shift.id),
													);
												}
											}}
											className="mt-0.5 w-4 h-4 rounded border-[#bdc8ce] text-[#00647c] focus:ring-[#00647c]/50 cursor-pointer"
										/>
										<div className="flex flex-col">
											<span className="text-[13px] font-semibold text-[#111c2d]">
												{shift.name}
											</span>
											<span className="text-[12px] text-[#6e797e]">
												{shift.startTime} - {shift.endTime}
											</span>
										</div>
									</label>
								))}
							</div>

							<div className="pt-4 flex gap-3">
								<button
									type="button"
									onClick={() => setIsBulkShiftOpen(false)}
									className="flex-1 px-6 py-2.5 rounded-xl font-semibold border border-[#bdc8ce] bg-white text-[#3e484d] hover:bg-[#f9f9ff] transition-all text-[14px]"
								>
									Batal
								</button>
								<button
									type="button"
									onClick={() => bulkShiftMutation.mutate()}
									disabled={bulkShiftMutation.isPending}
									className="flex-1 bg-[#00647c] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#007f9d] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-[14px] disabled:opacity-50"
								>
									{bulkShiftMutation.isPending
										? "Menyimpan..."
										: "Terapkan Shift"}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</motion.div>
	);
}
