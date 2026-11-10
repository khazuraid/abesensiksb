"use client";

import {
	type CreateEmployee,
	CreateEmployeeSchema,
	type Shift,
} from "@adms/shared-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { type Resolver, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

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
		<Modal
			open={true}
			onOpenChange={(open) => !open && onClose()}
			title={initialData ? "Ubah Data Pegawai" : "Tambah Pegawai Baru"}
			description="Lengkapi identitas, penempatan kerja, dan alokasi shift pegawai."
			maxWidth="4xl"
			footer={
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={onClose}
						disabled={isLoading}
					>
						Batal
					</Button>
					<Button
						type="submit"
						form="employee-form"
						variant="primary"
						size="sm"
						disabled={isLoading}
						className="gap-2"
					>
						{isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
						{initialData ? "Simpan Perubahan" : "Tambah Pegawai"}
					</Button>
				</div>
			}
		>
			<form
				id="employee-form"
				onSubmit={handleSubmit(onSubmit)}
				className="space-y-6"
			>
				{/* 2-Column Roomy Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
					{/* Name */}
					<div className="space-y-1.5">
						<label
							htmlFor="name"
							className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono"
						>
							Nama Lengkap *
						</label>
						<Input
							{...register("name")}
							id="name"
							aria-invalid={Boolean(errors.name)}
							placeholder="Contoh: Budi Santoso"
						/>
						{errors.name && (
							<p className="text-xs font-medium text-destructive">
								{errors.name.message}
							</p>
						)}
					</div>

					{/* Employee Code / NIP */}
					<div className="space-y-1.5">
						<label
							htmlFor="employeeCode"
							className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono"
						>
							NIP / Kode Pegawai *
						</label>
						<Input
							{...register("employeeCode")}
							id="employeeCode"
							aria-invalid={Boolean(errors.employeeCode)}
							placeholder="Contoh: 198501012010011001"
						/>
						{errors.employeeCode && (
							<p className="text-xs font-medium text-destructive">
								{errors.employeeCode.message}
							</p>
						)}
					</div>

					{/* Department */}
					<div className="space-y-1.5">
						<label
							htmlFor="department"
							className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono"
						>
							Divisi / Bagian
						</label>
						<Input
							{...register("department")}
							id="department"
							placeholder="Contoh: Pelayanan Medis"
						/>
					</div>

					{/* Position */}
					<div className="space-y-1.5">
						<label
							htmlFor="position"
							className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono"
						>
							Jabatan
						</label>
						<Input
							{...register("position")}
							id="position"
							placeholder="Contoh: Staf Rekam Medis"
						/>
					</div>

					{/* Biometric ID / PIN */}
					<div className="space-y-1.5">
						<label
							htmlFor="biometricId"
							className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono"
						>
							ID Biometrik / PIN Mesin ADMS
						</label>
						<Input
							{...register("biometricId")}
							id="biometricId"
							placeholder="Contoh: 1001"
						/>
					</div>

					{/* Golongan */}
					<div className="space-y-1.5">
						<label
							htmlFor="golongan"
							className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono"
						>
							Golongan / Pangkat
						</label>
						<Input
							{...register("golongan")}
							id="golongan"
							placeholder="Contoh: III/b"
						/>
					</div>
				</div>

				{/* Shift Selection: Roomy Flat Checkbox Group */}
				<div className="border-t border-border pt-5 space-y-2">
					<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
						Alokasi Shift Kerja
					</label>
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
						{shifts?.map((shift) => {
							const isSelected = currentShiftIds.includes(shift.id);
							return (
								<button
									key={shift.id}
									type="button"
									onClick={() => {
										const next = isSelected
											? currentShiftIds.filter((id) => id !== shift.id)
											: [...currentShiftIds, shift.id];
										setValue("shiftIds", next);
									}}
									className={cn(
										"flex flex-col text-left p-3 border transition-colors",
										isSelected
											? "border-primary bg-primary-subtle text-foreground"
											: "border-border bg-card text-muted-foreground hover:bg-muted/50",
									)}
								>
									<span className="text-xs font-bold text-foreground">
										{shift.name}
									</span>
									<span className="text-[11px] font-mono text-muted-foreground">
										{shift.startTime} - {shift.endTime}
									</span>
								</button>
							);
						})}
					</div>
				</div>
			</form>
		</Modal>
	);
}
