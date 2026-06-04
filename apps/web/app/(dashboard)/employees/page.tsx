"use client";

import type {
	CreateEmployee,
	Employee,
	UpdateEmployee,
} from "@adms/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
	ChevronLeft,
	ChevronRight,
	Edit2,
	Filter,
	Search,
	Trash2,
	UploadCloud,
	UserPlus,
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
					<button className="flex items-center gap-2 px-4 py-2 bg-white border border-black/5 rounded-lg text-[#111c2d] hover:bg-[#f9f9ff] transition-all font-semibold text-[13px] shadow-sm active:scale-95">
						<UploadCloud size={18} /> Push ke Perangkat
					</button>
					<button
						onClick={() => setIsFormOpen(true)}
						className="flex items-center gap-2 px-4 py-2 bg-[#00647c] text-white rounded-lg hover:bg-[#007f9d] transition-all font-semibold text-[13px] shadow-sm active:scale-95"
					>
						<UserPlus size={18} /> Tambah Pegawai
					</button>
				</div>
			</div>

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
						<button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#bdc8ce] text-[#3e484d] hover:text-[#111c2d] hover:bg-[#f9f9ff] transition-all font-semibold text-[13px] whitespace-nowrap">
							<Filter size={16} /> Filter Dept
						</button>
					</div>
					<div className="flex items-center gap-4 text-[#3e484d] font-semibold text-[13px]">
						<span>Total: {filteredEmployees?.length || 0}</span>
						<div className="flex items-center gap-1">
							<button className="p-1 rounded hover:bg-[#f9f9ff] transition-colors">
								<ChevronLeft size={16} />
							</button>
							<span className="px-2">1 / 1</span>
							<button className="p-1 rounded hover:bg-[#f9f9ff] transition-colors">
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
										<td colSpan={6} className="px-4 py-4 h-12 bg-white" />
									</tr>
								))
							) : filteredEmployees?.length === 0 ? (
								<tr>
									<td
										colSpan={6}
										className="py-16 text-center text-[#6e797e] text-sm"
									>
										Tidak ada data pegawai yang ditemukan.
									</td>
								</tr>
							) : (
								filteredEmployees?.map((emp, index) => (
									<tr
										key={emp.id}
										className={`group hover:bg-[#dee8ff]/30 transition-colors h-12 ${index % 2 === 1 ? "bg-[#f0f3ff]/30" : ""}`}
									>
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
												onClick={() => handleEdit(emp)}
												className="p-1.5 text-[#6e797e] hover:text-[#00647c] transition-colors"
											>
												<Edit2 size={16} />
											</button>
											<button
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
		</motion.div>
	);
}
