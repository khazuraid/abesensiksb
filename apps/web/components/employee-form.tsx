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
		formState: { errors },
	} = useForm<CreateEmployee>({
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		resolver: zodResolver(CreateEmployeeSchema) as any,
		defaultValues: initialData || {
			isActive: true,
		},
	});

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
			<div className="glass-card w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
				<div className="p-6 border-b border-white/5 flex items-center justify-between">
					<h3 className="text-xl font-bold">
						{initialData ? "Edit" : "Tambah"} Pegawai
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="p-2 hover:bg-white/5 rounded-lg text-foreground/40 hover:text-foreground transition-all"
					>
						<X size={20} />
					</button>
				</div>

				<form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
					<div className="space-y-2">
						<label
							htmlFor="name"
							className="text-sm font-medium text-foreground/60"
						>
							Nama Lengkap
						</label>
						<input
							{...register("name")}
							id="name"
							className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
							placeholder="Contoh: Budi Santoso"
						/>
						{errors.name && (
							<p className="text-xs text-destructive">{errors.name.message}</p>
						)}
					</div>

					<div className="space-y-2">
						<label
							htmlFor="employeeCode"
							className="text-sm font-medium text-foreground/60"
						>
							NIP / Kode Pegawai
						</label>
						<input
							{...register("employeeCode")}
							id="employeeCode"
							className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
							placeholder="Contoh: 19850101..."
						/>
						{errors.employeeCode && (
							<p className="text-xs text-destructive">
								{errors.employeeCode.message}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<label
							htmlFor="shiftId"
							className="text-sm font-medium text-foreground/60"
						>
							Shift Kerja
						</label>
						<select
							{...register("shiftId", { valueAsNumber: true })}
							id="shiftId"
							className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
						>
							<option value="">Pilih Shift</option>
							{shifts?.map((shift) => (
								<option key={shift.id} value={shift.id}>
									{shift.name} ({shift.startTime} - {shift.endTime})
								</option>
							))}
						</select>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<label
								htmlFor="department"
								className="text-sm font-medium text-foreground/60"
							>
								Departemen
							</label>
							<input
								{...register("department")}
								id="department"
								className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
								placeholder="Contoh: IT"
							/>
						</div>
						<div className="space-y-2">
							<label
								htmlFor="position"
								className="text-sm font-medium text-foreground/60"
							>
								Jabatan
							</label>
							<input
								{...register("position")}
								id="position"
								className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
								placeholder="Contoh: Manager"
							/>
						</div>
					</div>

					<div className="flex items-center gap-3 py-2">
						<input
							type="checkbox"
							{...register("isActive")}
							id="isActive"
							className="w-5 h-5 rounded-lg border-white/10 bg-white/5 text-primary focus:ring-primary/50"
						/>
						<label htmlFor="isActive" className="text-sm font-medium">
							Pegawai Aktif
						</label>
					</div>

					<div className="pt-4 flex gap-3">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 px-6 py-3 rounded-xl font-semibold border border-white/10 hover:bg-white/5 transition-all"
						>
							Batal
						</button>
						<button
							type="submit"
							disabled={isLoading}
							className="flex-1 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
						>
							{isLoading && <Loader2 size={18} className="animate-spin" />}
							Simpan Data
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
