"use client";

import type { CreateShift, Shift, UpdateShift } from "@adms/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
	AlertTriangle,
	Clock,
	Edit2,
	Plus,
	Timer,
	Trash2,
	UserCheck,
	X,
} from "lucide-react";
import { useRef, useState } from "react";
import PaginationControls, {
	type PageMeta,
} from "@/components/pagination-controls";
import api from "@/lib/api";
import { useModalAccessibility } from "@/lib/use-modal-accessibility";

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
	const dialogRef = useRef<HTMLDivElement>(null);
	useModalAccessibility(dialogRef, onClose);
	const [form, setForm] = useState<CreateShift>({
		name: initialData?.name || "",
		startTime: initialData?.startTime || "08:00",
		endTime: initialData?.endTime || "17:00",
		toleranceMinutes: initialData?.toleranceMinutes ?? 15,
		earlyOutTolerance: initialData?.earlyOutTolerance ?? 0,
		minInTime: initialData?.minInTime || "",
		maxLateTime: initialData?.maxLateTime || "",
		minOutTime: initialData?.minOutTime || "",
		maxOutTime: initialData?.maxOutTime || "",
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
		<div
			ref={dialogRef}
			className="fixed inset-0 z-[100] flex items-end justify-center bg-[#111c2d]/80 p-0 sm:items-center sm:p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="shift-form-title"
		>
			<div className="bg-white w-full max-w-md shadow-2xl rounded-t-xl sm:rounded-md border border-black/10 max-h-[calc(100dvh-env(safe-area-inset-top))] sm:max-h-[90dvh] flex flex-col">
				<div className="p-4 sm:p-6 border-b border-black/5 flex items-center justify-between shrink-0">
					<h3
						id="shift-form-title"
						className="text-[20px] font-display font-semibold text-[#111c2d]"
					>
						{initialData ? "Edit Shift" : "Tambah Shift"}
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="p-2 hover:bg-[#f9f9ff] text-[#6e797e] hover:text-[#111c2d] rounded-lg transition-colors"
					>
						<X size={20} />
					</button>
				</div>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						onSubmit({
							...form,
							maxLateTime: form.maxLateTime || null,
							minOutTime: form.minOutTime || null,
							effectiveFrom: form.effectiveFrom || null,
							effectiveTo: form.effectiveTo || null,
						});
					}}
					className="flex-1 space-y-4 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] custom-scrollbar sm:p-6"
				>
					<div>
						<label
							htmlFor="sname"
							className="block text-[13px] font-semibold text-[#3e484d] mb-1"
						>
							Nama Shift
						</label>
						<input
							id="sname"
							required
							value={form.name}
							onChange={(e) => setForm({ ...form, name: e.target.value })}
							placeholder="Shift Pagi"
							className="w-full bg-white border border-[#bdc8ce] rounded-lg px-4 py-2 text-[14px] text-[#111c2d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c]"
						/>
					</div>
					<div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2">
						<div>
							<label
								htmlFor="start"
								className="block text-[13px] font-semibold text-[#3e484d] mb-1"
							>
								Jam Masuk
							</label>
							<input
								id="start"
								type="time"
								required
								value={form.startTime}
								onChange={(e) =>
									setForm({ ...form, startTime: e.target.value })
								}
								className="w-full bg-white border border-[#bdc8ce] rounded-lg px-4 py-2 text-[14px] text-[#111c2d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c]"
							/>
						</div>
						<div>
							<label
								htmlFor="end"
								className="block text-[13px] font-semibold text-[#3e484d] mb-1"
							>
								Jam Pulang
							</label>
							<input
								id="end"
								type="time"
								required
								value={form.endTime}
								onChange={(e) => setForm({ ...form, endTime: e.target.value })}
								className="w-full bg-white border border-[#bdc8ce] rounded-lg px-4 py-2 text-[14px] text-[#111c2d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c]"
							/>
						</div>
					</div>
					<div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2">
						<div>
							<label
								htmlFor="tol"
								className="block text-[13px] font-semibold text-[#3e484d] mb-1"
							>
								Toleransi Telat (m)
							</label>
							<input
								id="tol"
								type="number"
								min={0}
								value={form.toleranceMinutes}
								onChange={(e) =>
									setForm({ ...form, toleranceMinutes: Number(e.target.value) })
								}
								className="w-full bg-white border border-[#bdc8ce] rounded-lg px-4 py-2 text-[14px] text-[#111c2d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c]"
							/>
						</div>
						<div>
							<label
								htmlFor="early"
								className="block text-[13px] font-semibold text-[#3e484d] mb-1"
							>
								Toleransi Pulang Awal (m)
							</label>
							<input
								id="early"
								type="number"
								min={0}
								value={form.earlyOutTolerance}
								onChange={(e) =>
									setForm({
										...form,
										earlyOutTolerance: Number(e.target.value),
									})
								}
								className="w-full bg-white border border-[#bdc8ce] rounded-lg px-4 py-2 text-[14px] text-[#111c2d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c]"
							/>
						</div>
					</div>
					<div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2">
						<div>
							<label
								htmlFor="minin"
								className="block text-[13px] font-semibold text-[#3e484d] mb-1"
							>
								Min. Jam Masuk
							</label>
							<input
								id="minin"
								type="time"
								value={form.minInTime || ""}
								onChange={(e) =>
									setForm({ ...form, minInTime: e.target.value || null })
								}
								className="w-full bg-white border border-[#bdc8ce] rounded-lg px-4 py-2 text-[14px] text-[#111c2d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c]"
							/>
						</div>
						<div>
							<label
								htmlFor="maxlate"
								className="block text-[13px] font-semibold text-[#3e484d] mb-1"
							>
								Maks. Jam Masuk
							</label>
							<input
								id="maxlate"
								type="time"
								value={form.maxLateTime || ""}
								onChange={(e) =>
									setForm({ ...form, maxLateTime: e.target.value || null })
								}
								className="w-full bg-white border border-[#bdc8ce] rounded-lg px-4 py-2 text-[14px] text-[#111c2d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c]"
							/>
						</div>
					</div>
					<div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2">
						<div>
							<label
								htmlFor="minout"
								className="block text-[13px] font-semibold text-[#3e484d] mb-1"
							>
								Min. Jam Pulang
							</label>
							<input
								id="minout"
								type="time"
								value={form.minOutTime || ""}
								onChange={(e) =>
									setForm({ ...form, minOutTime: e.target.value || null })
								}
								className="w-full bg-white border border-[#bdc8ce] rounded-lg px-4 py-2 text-[14px] text-[#111c2d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c]"
							/>
						</div>
						<div>
							<label
								htmlFor="maxout"
								className="block text-[13px] font-semibold text-[#3e484d] mb-1"
							>
								Maks. Jam Pulang
							</label>
							<input
								id="maxout"
								type="time"
								value={form.maxOutTime || ""}
								onChange={(e) =>
									setForm({ ...form, maxOutTime: e.target.value || null })
								}
								className="w-full bg-white border border-[#bdc8ce] rounded-lg px-4 py-2 text-[14px] text-[#111c2d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c]"
							/>
						</div>
					</div>
					<div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2">
						<div>
							<label
								htmlFor="effectiveFrom"
								className="block text-[13px] font-semibold text-[#3e484d] mb-1"
							>
								Berlaku mulai
							</label>
							<input
								id="effectiveFrom"
								type="date"
								value={form.effectiveFrom || ""}
								max={form.effectiveTo || undefined}
								onChange={(e) =>
									setForm({ ...form, effectiveFrom: e.target.value || null })
								}
								className="w-full bg-white border border-[#bdc8ce] rounded-lg px-4 py-2 text-[14px] text-[#111c2d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c]"
							/>
						</div>
						<div>
							<label
								htmlFor="effectiveTo"
								className="block text-[13px] font-semibold text-[#3e484d] mb-1"
							>
								Berlaku sampai
							</label>
							<input
								id="effectiveTo"
								type="date"
								value={form.effectiveTo || ""}
								min={form.effectiveFrom || undefined}
								onChange={(e) =>
									setForm({ ...form, effectiveTo: e.target.value || null })
								}
								className="w-full bg-white border border-[#bdc8ce] rounded-lg px-4 py-2 text-[14px] text-[#111c2d] focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c]"
							/>
						</div>
					</div>
					<div>
						<div className="block text-[13px] font-semibold text-[#3e484d] mb-2">
							Hari Kerja
						</div>
						<div className="flex gap-2 flex-wrap">
							{dayNames.map((name, idx) => (
								<button
									key={name}
									type="button"
									onClick={() => toggleDay(idx)}
									className={`w-10 h-10 rounded-lg text-xs font-bold transition-all ${form.workDays.includes(idx) ? "bg-[#00647c] text-white shadow-sm" : "bg-white border border-[#bdc8ce] text-[#6e797e] hover:bg-[#f9f9ff]"}`}
								>
									{name}
								</button>
							))}
						</div>
					</div>
					<label
						htmlFor="active"
						className="flex items-center gap-3 cursor-pointer py-2"
					>
						<input
							id="active"
							type="checkbox"
							checked={form.isActive}
							onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
							className="w-4 h-4 rounded accent-[#00647c]"
						/>
						<span className="text-[14px] font-medium text-[#111c2d]">
							Aktif
						</span>
					</label>

					<div className="pt-4 border-t border-black/5">
						<button
							type="submit"
							disabled={isLoading}
							className="w-full py-3 bg-[#00647c] text-white rounded-lg font-semibold text-[14px] shadow-sm hover:bg-[#007f9d] active:scale-95 transition-all disabled:opacity-50"
						>
							{isLoading ? "Menyimpan..." : "Simpan Shift"}
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
	const [page, setPage] = useState(1);
	const [assignShift, setAssignShift] = useState<Shift | null>(null);
	const [assignError, setAssignError] = useState("");
	const assignDialogRef = useRef<HTMLDivElement>(null);
	const closeAssign = () => setAssignShift(null);
	useModalAccessibility(assignDialogRef, closeAssign, !!assignShift);

	const {
		data: response,
		isLoading,
		isFetching,
	} = useQuery<{ data: Shift[]; meta: PageMeta }>({
		queryKey: ["shifts", page],
		queryFn: async () => (await api.get(`/shifts?page=${page}&limit=10`)).data,
	});
	const shifts = response?.data;

	const createMutation = useMutation({
		mutationFn: async (data: CreateShift) => await api.post("/shifts", data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["shifts"] });
			setIsFormOpen(false);
		},
	});

	const updateMutation = useMutation({
		mutationFn: async ({ id, data }: { id: number; data: UpdateShift }) =>
			await api.patch(`/shifts/${id}`, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["shifts"] });
			setIsFormOpen(false);
			setSelectedShift(null);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: number) => await api.delete(`/shifts/${id}`),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shifts"] }),
	});

	const assignAllMutation = useMutation({
		mutationFn: async () => {
			await api.patch("/employees/bulk/shift", {
				allEmployees: true,
				shiftIds: [assignShift!.id],
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["employees"] });
			setAssignShift(null);
			setAssignError("");
			alert(`Shift "${assignShift?.name}" diterapkan ke semua pegawai.`);
		},
		onError: (err: {
			response?: {
				data?: { message?: string; details?: { conflicts?: unknown[] } };
			};
			message?: string;
		}) => {
			const conflicts = err.response?.data?.details?.conflicts;
			setAssignError(
				conflicts?.length
					? `${err.response?.data?.message}: ${conflicts.length} pegawai bentrok`
					: err.response?.data?.message ||
							err.message ||
							"Gagal menerapkan shift",
			);
		},
	});

	const handleSubmit = (data: CreateShift) => {
		if (selectedShift) {
			updateMutation.mutate({ id: selectedShift.id, data });
		} else {
			createMutation.mutate(data);
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className="space-y-6 max-w-[1440px] mx-auto min-h-[calc(100vh-6rem)]"
		>
			{/* Page Header & Actions */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h2 className="font-display text-3xl font-semibold text-[#111c2d]">
						Manajemen Shift
					</h2>
					<p className="font-sans text-sm text-[#6e797e] mt-1">
						Atur jam kerja, toleransi keterlambatan, dan jadwal operasional.
					</p>
				</div>
				<button
					type="button"
					onClick={() => {
						setSelectedShift(null);
						setIsFormOpen(true);
					}}
					className="flex w-full items-center justify-center gap-2 px-6 py-3 bg-[#00647c] text-white rounded-lg hover:bg-[#007f9d] transition-all font-semibold text-[14px] shadow-sm active:scale-95 sm:w-auto"
				>
					<Plus size={18} /> Tambah Shift
				</button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{isLoading ? (
					[1, 2, 3].map((k) => (
						<div
							key={k}
							className="h-48 bg-white border border-black/5 rounded-xl animate-pulse"
						></div>
					))
				) : shifts?.length === 0 ? (
					<div className="col-span-full py-16 text-center text-[#6e797e] font-sans">
						Belum ada shift kerja yang ditambahkan.
					</div>
				) : (
					shifts?.map((shift) => (
						<div
							key={shift.id}
							className="bg-white/70 backdrop-blur-md rounded-xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative group border border-[#e2e8f0]"
						>
							{/* Header */}
							<div className="flex items-start justify-between mb-6">
								<div className="flex items-center gap-4">
									<div className="w-12 h-12 rounded-full bg-[#6cf8bb]/30 flex items-center justify-center text-[#006c49]">
										<Clock size={24} />
									</div>
									<div>
										<h3 className="font-display text-[20px] font-semibold text-[#111c2d] capitalize">
											{shift.name}
										</h3>
										{shift.isActive ? (
											<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#6cf8bb]/50 text-[#00714d] mt-1">
												AKTIF
											</span>
										) : (
											<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-600 mt-1">
												TIDAK AKTIF
											</span>
										)}
									</div>
								</div>
								<div className="flex gap-2 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
									<button
										type="button"
										title="Assign ke semua pegawai"
										onClick={() => {
											setAssignShift(shift);
											setAssignError("");
										}}
										className="w-8 h-8 rounded-full hover:bg-[#f9f9ff] flex items-center justify-center text-[#6e797e] hover:text-[#00647c] transition-colors"
									>
										<UserCheck size={16} />
									</button>
									<button
										type="button"
										onClick={() => {
											setSelectedShift(shift);
											setIsFormOpen(true);
										}}
										className="w-8 h-8 rounded-full hover:bg-[#f9f9ff] flex items-center justify-center text-[#6e797e] hover:text-[#00647c] transition-colors"
									>
										<Edit2 size={16} />
									</button>
									<button
										type="button"
										onClick={() => {
											if (confirm("Yakin ingin menghapus shift ini?")) {
												deleteMutation.mutate(shift.id);
											}
										}}
										className="w-8 h-8 rounded-full hover:bg-[#ba1a1a]/10 flex items-center justify-center text-[#ba1a1a] transition-colors"
									>
										<Trash2 size={16} />
									</button>
								</div>
							</div>

							{/* Time Blocks */}
							<div className="grid grid-cols-2 gap-4 mb-6">
								<div className="bg-[#f0f3ff] rounded-lg p-4 border border-[#bdc8ce]/30">
									<p className="font-sans text-[11px] font-semibold text-[#6e797e] mb-1 uppercase tracking-wider">
										MASUK
									</p>
									<p className="font-display text-[24px] font-semibold text-[#006c49] leading-none">
										{shift.startTime.slice(0, 5)}
									</p>
								</div>
								<div className="bg-[#f0f3ff] rounded-lg p-4 border border-[#bdc8ce]/30">
									<p className="font-sans text-[11px] font-semibold text-[#6e797e] mb-1 uppercase tracking-wider">
										PULANG
									</p>
									<p className="font-display text-[24px] font-semibold text-[#111c2d] leading-none">
										{shift.endTime.slice(0, 5)}
									</p>
								</div>
							</div>

							{/* Details */}
							<div className="border-t border-[#bdc8ce]/30 pt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
								<div className="flex items-center gap-1.5 text-[#3e484d]">
									<Timer size={16} />
									Toleransi Telat:{" "}
									<span className="font-semibold text-[#006c49]">
										{shift.toleranceMinutes}m
									</span>
								</div>
								<div className="flex items-center gap-1.5 text-[#3e484d]">
									<Timer size={16} />
									Pulang Awal:{" "}
									<span className="font-semibold text-[#006c49]">
										{shift.earlyOutTolerance}m
									</span>
								</div>
								{shift.maxLateTime && (
									<div className="flex items-center gap-1.5 text-[#3e484d] w-full mt-1">
										<AlertTriangle size={16} className="text-[#ba1a1a]" />
										Maks Masuk:{" "}
										<span className="font-semibold text-[#ba1a1a]">
											{shift.maxLateTime.slice(0, 5)}
										</span>
									</div>
								)}
							</div>
						</div>
					))
				)}
			</div>
			<PaginationControls
				meta={response?.meta}
				onPageChange={setPage}
				disabled={isFetching}
			/>

			{isFormOpen && (
				<ShiftForm
					onClose={() => {
						setIsFormOpen(false);
						setSelectedShift(null);
					}}
					onSubmit={handleSubmit}
					initialData={selectedShift || undefined}
					isLoading={createMutation.isPending || updateMutation.isPending}
				/>
			)}

			{assignShift && (
				<div
					ref={assignDialogRef}
					className="fixed inset-0 z-[100] flex items-end justify-center bg-[#111c2d]/40 p-0 sm:items-center sm:p-4"
					role="dialog"
					aria-modal="true"
					aria-labelledby="assign-shift-title"
				>
					<div className="w-full max-w-md rounded-t-xl bg-white shadow-xl sm:rounded-md">
						<div className="flex items-center justify-between border-b border-black/5 px-6 py-4">
							<h3
								id="assign-shift-title"
								className="text-[16px] font-semibold text-[#111c2d]"
							>
								Assign ke semua pegawai
							</h3>
							<button
								type="button"
								onClick={closeAssign}
								className="p-2 text-[#6e797e] hover:text-[#111c2d]"
							>
								<X size={18} />
							</button>
						</div>
						<div className="space-y-4 p-6">
							<p className="text-[14px] text-[#3e484d]">
								Terapkan shift{" "}
								<strong className="capitalize">{assignShift.name}</strong> (
								{assignShift.startTime.slice(0, 5)}–
								{assignShift.endTime.slice(0, 5)}) ke{" "}
								<strong>semua pegawai</strong>. Periode berlaku mengikuti
								pengaturan shift.
							</p>
							{assignError && (
								<p
									role="alert"
									className="border border-[#ba1a1a]/30 bg-[#ba1a1a]/5 p-3 text-[13px] text-[#8f1616]"
								>
									{assignError}
								</p>
							)}
							<div className="flex gap-3 pt-2">
								<button
									type="button"
									onClick={closeAssign}
									className="flex-1 px-6 py-2.5 rounded-xl font-semibold border border-[#bdc8ce] bg-white text-[#3e484d] hover:bg-[#f9f9ff] text-[14px]"
								>
									Batal
								</button>
								<button
									type="button"
									onClick={() => assignAllMutation.mutate()}
									disabled={assignAllMutation.isPending}
									className="flex-1 bg-[#00647c] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#007f9d] active:scale-[0.98] text-[14px] disabled:opacity-50"
								>
									{assignAllMutation.isPending
										? "Menyimpan..."
										: "Terapkan ke Semua"}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</motion.div>
	);
}
