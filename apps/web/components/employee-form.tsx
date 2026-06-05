"use client";

import {
	type CreateEmployee,
	CreateEmployeeSchema,
	type Shift,
} from "@adms/shared-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { useForm } from "react-hook-form";
import api from "@/lib/api";

interface EmployeeFormProps {
	onSubmit: (data: CreateEmployee) => void;
	onClose: () => void;
	initialData?: Partial<CreateEmployee>;
	isLoading?: boolean;
}

export default function EmployeeForm({
	onSubmit,
	onClose,
	initialData,
	isLoading,
}: EmployeeFormProps) {
	const { data: shifts } = useQuery<Shift[]>({
		queryKey: ["shifts"],
		queryFn: async () => {
			const res = await api.get("/shifts");
			return res.data;
		},
	});

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = useForm<CreateEmployee>({
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		/* biome-ignore lint/suspicious/noExplicitAny: zod resolver type mismatch */
		resolver: zodResolver(CreateEmployeeSchema) as any,
		defaultValues: {
			...initialData,
			isActive: initialData?.isActive ?? true,
			shiftIds: initialData?.shiftIds || [],
		},
	});

	const currentShiftIds = watch("shiftIds") || [];

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#111c2d]/20 backdrop-blur-sm">
			<div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
				<div className="px-6 py-5 border-b border-black/5 flex items-center justify-between bg-[#f9f9ff]">
					<h3 className="text-xl font-bold text-[#111c2d] font-display">
						{initialData ? "Edit" : "Tambah"} Pegawai
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="p-2 hover:bg-black/5 rounded-full text-[#6e797e] hover:text-[#111c2d] transition-all"
					>
						<X size={20} />
					</button>
				</div>

				<form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
						<div className="space-y-2">
							<label
								htmlFor="name"
								className="text-[13px] font-semibold text-[#111c2d]"
							>
								Nama Lengkap
							</label>
							<input
								{...register("name")}
								id="name"
								className="w-full bg-white border border-[#bdc8ce] rounded-xl py-2.5 px-4 text-[14px] text-[#111c2d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c] transition-all"
								placeholder="Contoh: Budi Santoso"
							/>
							{errors.name && (
								<p className="text-xs text-[#ba1a1a]">{errors.name.message}</p>
							)}
						</div>

						<div className="space-y-2">
							<label
								htmlFor="employeeCode"
								className="text-[13px] font-semibold text-[#111c2d]"
							>
								NIP / Kode Pegawai
							</label>
							<input
								{...register("employeeCode")}
								id="employeeCode"
								className="w-full bg-white border border-[#bdc8ce] rounded-xl py-2.5 px-4 text-[14px] text-[#111c2d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c] transition-all"
								placeholder="Contoh: 19850101..."
							/>
							{errors.employeeCode && (
								<p className="text-xs text-[#ba1a1a]">
									{errors.employeeCode.message}
								</p>
							)}
						</div>
					</div>

					<div className="space-y-3">
						<div className="text-[13px] font-semibold text-[#111c2d] block border-b border-black/5 pb-2">
							Shift Kerja{" "}
							<span className="text-[#6e797e] font-normal">
								(Bisa pilih lebih dari 1)
							</span>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[160px] overflow-y-auto custom-scrollbar pr-2">
							{shifts?.map((shift) => (
								<label
									key={shift.id}
									className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
										currentShiftIds.includes(shift.id)
											? "border-[#00647c] bg-[#f0f3ff]"
											: "border-[#bdc8ce] bg-white hover:border-[#00647c]/50"
									}`}
								>
									<input
										type="checkbox"
										value={shift.id}
										checked={currentShiftIds.includes(shift.id)}
										onChange={(e) => {
											const checked = e.target.checked;
											const updated = checked
												? [...currentShiftIds, shift.id]
												: currentShiftIds.filter((id) => id !== shift.id);
											setValue("shiftIds", updated, { shouldDirty: true });
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
							{shifts?.length === 0 && (
								<p className="text-[13px] text-[#6e797e]">
									Belum ada data shift.
								</p>
							)}
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
						<div className="space-y-2">
							<label
								htmlFor="department"
								className="text-[13px] font-semibold text-[#111c2d]"
							>
								Departemen
							</label>
							<input
								{...register("department")}
								id="department"
								className="w-full bg-white border border-[#bdc8ce] rounded-xl py-2.5 px-4 text-[14px] text-[#111c2d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c] transition-all"
								placeholder="Contoh: IT"
							/>
						</div>
						<div className="space-y-2">
							<label
								htmlFor="position"
								className="text-[13px] font-semibold text-[#111c2d]"
							>
								Jabatan
							</label>
							<input
								{...register("position")}
								id="position"
								className="w-full bg-white border border-[#bdc8ce] rounded-xl py-2.5 px-4 text-[14px] text-[#111c2d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c] transition-all"
								placeholder="Contoh: Manager"
							/>
						</div>
					</div>

					<div className="flex items-center gap-3 pt-2">
						<input
							type="checkbox"
							{...register("isActive")}
							id="isActive"
							className="w-5 h-5 rounded border-[#bdc8ce] bg-white text-[#00647c] focus:ring-[#00647c]/50 cursor-pointer"
						/>
						<label
							htmlFor="isActive"
							className="text-[13px] font-semibold text-[#111c2d] cursor-pointer"
						>
							Pegawai Aktif
						</label>
					</div>

					<div className="pt-6 flex gap-3 border-t border-black/5">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 px-6 py-2.5 rounded-xl font-semibold border border-[#bdc8ce] bg-white text-[#3e484d] hover:bg-[#f9f9ff] transition-all text-[14px]"
						>
							Batal
						</button>
						<button
							type="submit"
							disabled={isLoading}
							className="flex-1 bg-[#00647c] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#007f9d] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-[14px]"
						>
							{isLoading && <Loader2 size={16} className="animate-spin" />}
							Simpan Data
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
