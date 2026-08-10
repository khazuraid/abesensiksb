"use client";

import {
	type CreateEmployee,
	CreateEmployeeSchema,
	type Shift,
} from "@adms/shared-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { useRef } from "react";
import { type Resolver, useForm, useWatch } from "react-hook-form";
import api from "@/lib/api";
import { useModalAccessibility } from "@/lib/use-modal-accessibility";

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
	const dialogRef = useRef<HTMLDivElement>(null);
	useModalAccessibility(dialogRef, onClose);
	const { data: shiftsResponse } = useQuery<{ data: Shift[] }>({
		queryKey: ["shifts", "form"],
		queryFn: async () => {
			const res = await api.get("/shifts?page=1&limit=100");
			return res.data;
		},
	});
	const shifts = shiftsResponse?.data;

	const {
		register,
		handleSubmit,
		setValue,
		control,
		formState: { errors },
	} = useForm<CreateEmployee>({
		resolver: zodResolver(CreateEmployeeSchema) as Resolver<CreateEmployee>,
		defaultValues: {
			...initialData,
			isActive: initialData?.isActive ?? true,
			shiftIds: initialData?.shiftIds || [],
		},
	});

	const currentShiftIds = useWatch({ control, name: "shiftIds" }) || [];

	return (
		<div
			ref={dialogRef}
			className="fixed inset-0 z-[100] flex items-end justify-center bg-[#14211d]/50 p-0 sm:items-center sm:p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="employee-form-title"
		>
			<div className="flex max-h-[calc(100dvh-env(safe-area-inset-top))] w-full max-w-xl flex-col overflow-hidden border border-border bg-white shadow-[0_20px_54px_rgba(20,33,29,.14)] sm:max-h-[90dvh]">
				<div className="flex shrink-0 items-center justify-between border-b border-[#d5ded9] bg-[#14211d] px-4 py-4 text-white sm:px-6">
					<h3 className="text-lg font-bold !text-white">
						<span id="employee-form-title">
							{initialData ? "Edit" : "Tambah"} Pegawai
						</span>
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="flex h-9 w-9 items-center justify-center border border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
						aria-label="Tutup formulir pegawai"
					>
						<X size={20} />
					</button>
				</div>

				<form
					onSubmit={handleSubmit(onSubmit)}
					className="flex-1 space-y-5 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6"
				>
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
								aria-invalid={Boolean(errors.name)}
								aria-describedby={errors.name ? "name-error" : undefined}
								className="w-full bg-white border border-[#aebdb6]  py-2.5 px-4 text-[14px] text-[#14211d] focus:outline-none focus:ring-1 focus:ring-[#087066] focus:border-[#087066] transition-all"
								placeholder="Contoh: Budi Santoso"
							/>
							{errors.name && (
								<p
									id="name-error"
									role="alert"
									className="text-xs text-[#a9433d]"
								>
									{errors.name.message}
								</p>
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
								aria-invalid={Boolean(errors.employeeCode)}
								aria-describedby={
									errors.employeeCode ? "employee-code-error" : undefined
								}
								className="w-full bg-white border border-[#bdc8ce]  py-2.5 px-4 text-[14px] text-[#111c2d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c] transition-all"
								placeholder="Contoh: 19850101..."
							/>
							{errors.employeeCode && (
								<p
									id="employee-code-error"
									role="alert"
									className="text-xs text-[#ba1a1a]"
								>
									{errors.employeeCode.message}
								</p>
							)}
						</div>
						<div className="space-y-2">
							<label
								htmlFor="biometricId"
								className="text-[13px] font-semibold text-[#111c2d]"
							>
								ID Mesin (PIN)
							</label>
							<input
								{...register("biometricId")}
								id="biometricId"
								className="w-full bg-white border border-[#bdc8ce] py-2.5 px-4 text-[14px] text-[#111c2d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c] transition-all"
								placeholder="Contoh: 12"
							/>
							<p className="text-[11px] text-[#6e797e]">
								Samakan dengan PIN yang tampil pada mesin X609.
							</p>
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
									className={`flex items-start gap-3 p-3 border  cursor-pointer transition-all ${
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
								className="w-full bg-white border border-[#bdc8ce]  py-2.5 px-4 text-[14px] text-[#14211d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c] transition-all"
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
								className="w-full bg-white border border-[#bdc8ce]  py-2.5 px-4 text-[14px] text-[#14211d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c] transition-all"
								placeholder="Contoh: Manager"
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-5">
						<div className="space-y-2">
							<label
								htmlFor="golongan"
								className="text-[13px] font-semibold text-[#111c2d]"
							>
								Golongan
							</label>
							<input
								{...register("golongan")}
								id="golongan"
								className="w-full bg-white border border-[#bdc8ce]  py-2.5 px-4 text-[14px] text-[#14211d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c] transition-all"
								placeholder="Contoh: III, IV, 9"
							/>
						</div>
						<div className="space-y-2">
							<label
								htmlFor="pendidikan"
								className="text-[13px] font-semibold text-[#111c2d]"
							>
								Pendidikan
							</label>
							<select
								{...register("pendidikan")}
								id="pendidikan"
								className="w-full bg-white border border-[#bdc8ce]  py-2.5 px-4 text-[14px] text-[#14211d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c] transition-all"
							>
								<option value="">- Pilih -</option>
								<option value="SMA">SMA</option>
								<option value="D3">D3</option>
								<option value="S1">S1</option>
								<option value="S2">S2</option>
								<option value="S3">S3</option>
							</select>
						</div>
						<div className="space-y-2">
							<label
								htmlFor="joinDate"
								className="text-[13px] font-semibold text-[#111c2d]"
							>
								Tanggal Masuk
							</label>
							<input
								{...register("joinDate")}
								id="joinDate"
								type="date"
								className="w-full bg-white border border-[#bdc8ce]  py-2.5 px-4 text-[14px] text-[#14211d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c] transition-all"
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

					<div className="sticky bottom-0 -mx-4 -mb-4 flex gap-3 border-t border-[#d8deda] bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:static sm:m-0 sm:p-0 sm:pt-6">
						<button
							type="button"
							onClick={onClose}
							className="adms-button-outline flex-1"
						>
							Batal
						</button>
						<button
							type="submit"
							disabled={isLoading}
							aria-busy={isLoading}
							className="adms-button flex-1"
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
