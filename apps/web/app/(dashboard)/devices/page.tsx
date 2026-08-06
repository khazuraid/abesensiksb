"use client";

import type {
	AttendanceLog,
	CreateDevice,
	Device,
	DeviceCommandType,
} from "@adms/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
	ArrowDownToLine,
	ArrowUpFromLine,
	Clock,
	Cpu,
	Download,
	Plus,
	Power,
	Search,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import PaginationControls, {
	type PageMeta,
} from "@/components/pagination-controls";
import api from "@/lib/api";

type DeviceCommand = {
	id: number;
	command: string;
	status: "PENDING" | "SENT" | "COMPLETED" | "ERROR";
	createdAt: string | Date;
	updatedAt: string | Date;
};

type ReceivedAttendance = Pick<AttendanceLog, "id" | "timestamp" | "type"> & {
	employee?: { name?: string; employeeCode?: string };
};

type DeviceHistory = {
	id: string;
	direction: "sent" | "received";
	title: string;
	detail: string;
	status?: DeviceCommand["status"];
	timestamp: string | Date;
};

const formatHistoryTime = (value: string | Date) =>
	new Intl.DateTimeFormat("id-ID", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));

export default function DevicesPage() {
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
	const selectedDeviceId = selectedDevice?.id;
	const today = new Date().toLocaleDateString("en-CA");
	const [pullStartDate, setPullStartDate] = useState(today);
	const [pullEndDate, setPullEndDate] = useState(today);
	const [showForm, setShowForm] = useState(false);
	const [form, setForm] = useState<CreateDevice>({
		serialNumber: "",
		name: "",
		location: "",
		ipAddress: "",
	});

	const {
		data: response,
		dataUpdatedAt,
		isLoading,
		isFetching,
	} = useQuery<{ data: Device[]; meta: PageMeta }>({
		queryKey: ["devices", page, search],
		queryFn: async () => {
			const res = await api.get(
				`/devices?page=${page}&limit=10&search=${encodeURIComponent(search)}`,
			);
			return res.data;
		},
		refetchInterval: 10000,
	});
	const devices = response?.data ?? [];

	const { data: commandResponse, isLoading: commandsLoading } = useQuery<{
		data: DeviceCommand[];
	}>({
		queryKey: ["device-commands", selectedDeviceId],
		queryFn: async () =>
			(await api.get(`/devices/${selectedDeviceId}/commands?page=1&limit=20`))
				.data,
		enabled: Boolean(selectedDeviceId),
		refetchInterval: 5000,
	});

	const { data: attendanceResponse, isLoading: attendanceLoading } = useQuery<{
		data: ReceivedAttendance[];
	}>({
		queryKey: ["device-attendance", selectedDeviceId],
		queryFn: async () => {
			const params = new URLSearchParams({
				deviceId: String(selectedDeviceId),
				page: "1",
				limit: "20",
			});
			return (await api.get(`/attendance-logs?${params}`)).data;
		},
		enabled: Boolean(selectedDeviceId),
		refetchInterval: 5000,
	});

	const history: DeviceHistory[] = [
		...(commandResponse?.data ?? []).map((command) => ({
			id: `sent-${command.id}`,
			direction: "sent" as const,
			title: "Mengambil data dari perangkat",
			detail: command.command,
			status: command.status,
			timestamp:
				command.status === "PENDING" ? command.createdAt : command.updatedAt,
		})),
		...(attendanceResponse?.data ?? []).map((log) => ({
			id: `received-${log.id}`,
			direction: "received" as const,
			title: "Menerima data absensi",
			detail: `${log.employee?.name ?? "Pegawai"} (${log.employee?.employeeCode ?? "-"}) · ${log.type === "IN" ? "Masuk" : "Pulang"}`,
			timestamp: log.timestamp,
		})),
	].sort(
		(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
	);

	const sendCommand = useMutation({
		mutationFn: async ({
			id,
			command,
			payload,
		}: {
			id: number;
			command: DeviceCommandType;
			payload?: Record<string, unknown>;
		}) => {
			const res = await api.post(`/devices/${id}/command`, {
				type: command,
				...payload,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["devices"] });
			queryClient.invalidateQueries({
				queryKey: ["device-commands", selectedDeviceId],
			});
			alert("Perintah berhasil dikirim");
		},
	});

	const createDevice = useMutation({
		mutationFn: async (data: CreateDevice) =>
			(await api.post("/devices", data)).data,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["devices"] });
			setShowForm(false);
			setForm({ serialNumber: "", name: "", location: "", ipAddress: "" });
		},
	});

	const filteredDevices = devices;

	return (
		<motion.div
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className="space-y-5 max-w-[1440px] mx-auto flex min-h-0 flex-col md:h-[calc(100vh-6rem)] md:space-y-6"
		>
			{/* Page Header & Actions */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
				<div>
					<h2 className="font-display text-3xl font-semibold text-[#111c2d]">
						Perangkat Terminal
					</h2>
					<p className="font-sans text-sm text-[#6e797e] mt-1">
						Manajemen seluruh mesin absensi ADMS.
					</p>
				</div>
				<button
					type="button"
					onClick={() => setShowForm((open) => !open)}
					className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-[#00647c] text-white rounded-lg hover:bg-[#007f9d] transition-all font-semibold text-[13px] shadow-sm active:scale-95 sm:w-auto"
				>
					<Plus size={18} /> Tambah Mesin
				</button>
			</div>

			{showForm && (
				<form
					onSubmit={(event) => {
						event.preventDefault();
						createDevice.mutate(form);
					}}
					className="grid grid-cols-1 gap-3 rounded-xl border border-black/5 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"
				>
					<input
						required
						aria-label="Serial number"
						placeholder="Serial number"
						value={form.serialNumber}
						onChange={(event) =>
							setForm({ ...form, serialNumber: event.target.value })
						}
					/>
					<input
						required
						aria-label="Nama perangkat"
						placeholder="Nama perangkat"
						value={form.name}
						onChange={(event) => setForm({ ...form, name: event.target.value })}
					/>
					<input
						aria-label="Lokasi perangkat"
						placeholder="Lokasi"
						value={form.location ?? ""}
						onChange={(event) =>
							setForm({ ...form, location: event.target.value })
						}
					/>
					<input
						aria-label="Alamat IP"
						placeholder="Alamat IP"
						value={form.ipAddress ?? ""}
						onChange={(event) =>
							setForm({ ...form, ipAddress: event.target.value })
						}
					/>
					<button
						type="submit"
						disabled={createDevice.isPending}
						className="adms-button w-full lg:w-auto"
					>
						{createDevice.isPending ? "Menyimpan..." : "Simpan Mesin"}
					</button>
				</form>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
				{/* Left Column: Device List */}
				<div className="lg:col-span-8 bg-white border border-black/5 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
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
									placeholder="Cari Serial Number atau Nama..."
									type="text"
									value={search}
									onChange={(e) => {
										setSearch(e.target.value);
										setPage(1);
									}}
								/>
							</div>
						</div>
					</div>

					{/* Table */}
					<div className="mobile-scroll-hint">
						Geser tabel untuk melihat kolom lainnya
					</div>
					<div className="flex-1 overflow-auto custom-scrollbar">
						<table className="w-full text-left border-collapse min-w-[600px]">
							<thead className="sticky top-0 bg-[#f9f9ff] shadow-sm z-10 border-b border-black/5">
								<tr>
									<th className="py-3 px-4 w-12 text-center"></th>
									<th className="py-3 px-4 font-sans text-[12px] font-semibold text-[#6e797e] whitespace-nowrap">
										Serial Number
									</th>
									<th className="py-3 px-4 font-sans text-[12px] font-semibold text-[#6e797e] whitespace-nowrap">
										Model / Nama
									</th>
									<th className="py-3 px-4 font-sans text-[12px] font-semibold text-[#6e797e] whitespace-nowrap">
										IP Address
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
											<td colSpan={5} className="px-4 py-4 h-12 bg-white" />
										</tr>
									))
								) : filteredDevices?.length === 0 ? (
									<tr>
										<td
											colSpan={5}
											className="py-16 text-center text-[#6e797e] text-sm"
										>
											Tidak ada mesin yang terdaftar.
										</td>
									</tr>
								) : (
									filteredDevices?.map((dev, index) => {
										const isOnline = dev.lastSeen
											? new Date(dev.lastSeen).getTime() >
												dataUpdatedAt - 2 * 60 * 1000
											: false;

										return (
											<tr
												key={dev.id}
												onClick={() => setSelectedDevice(dev)}
												className={`group hover:bg-[#dee8ff]/30 transition-colors h-12 cursor-pointer ${selectedDevice?.id === dev.id ? "bg-[#00647c]/5 border-l-4 border-l-[#00647c]" : index % 2 === 1 ? "bg-[#f0f3ff]/30 border-l-4 border-l-transparent" : "border-l-4 border-l-transparent"}`}
											>
												<td className="py-2 px-4 text-center">
													{isOnline ? (
														<span className="relative flex h-2.5 w-2.5 mx-auto">
															<span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-[#006c49]"></span>
															<span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#006c49]"></span>
														</span>
													) : (
														<div className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a] opacity-50 mx-auto"></div>
													)}
												</td>
												<td className="py-2 px-4 font-mono text-[13px] text-[#111c2d]">
													{dev.serialNumber}
												</td>
												<td className="py-2 px-4 text-[14px] text-[#3e484d]">
													{dev.name || "Tidak diketahui"}
												</td>
												<td className="py-2 px-4 font-mono text-[13px] text-[#6e797e]">
													{dev.ipAddress || "-"}
												</td>
												<td className="py-2 px-4 text-right text-[12px] text-[#6e797e]">
													Pilih baris
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
					<PaginationControls
						meta={response?.meta}
						onPageChange={setPage}
						disabled={isFetching}
					/>
				</div>

				{/* Right Column: Command Center & Terminal */}
				<div className="lg:col-span-4 flex flex-col gap-6">
					{/* Command Center */}
					<div className="bg-white rounded-xl p-4 flex flex-col gap-4 shadow-sm border border-black/5 transition-all duration-300">
						<h3 className="font-semibold text-[16px] text-[#111c2d] flex items-center gap-2">
							<Cpu className="text-[#00647c]" size={20} />
							Pusat Komando
						</h3>

						<div className="bg-[#f9f9ff] p-3 rounded-lg border border-[#bdc8ce]">
							<label
								htmlFor="protocol-logs"
								className="font-sans text-[12px] font-semibold text-[#6e797e] block mb-1"
							>
								Target Perangkat
							</label>
							<select
								className="w-full bg-transparent border-none text-[13px] font-sans text-[#111c2d] focus:ring-0 p-0 cursor-pointer"
								value={selectedDevice?.id || ""}
								onChange={(e) => {
									const id = parseInt(e.target.value, 10);
									const dev = devices?.find((d) => d.id === id);
									setSelectedDevice(dev || null);
								}}
							>
								<option value="" disabled>
									Pilih Perangkat...
								</option>
								{devices?.map((d) => (
									<option key={d.id} value={d.id}>
										{d.serialNumber} ({d.name})
									</option>
								))}
							</select>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<button
								type="button"
								disabled={!selectedDevice}
								onClick={() => {
									if (selectedDevice)
										sendCommand.mutate({
											id: selectedDevice.id,
											command: "reboot",
										});
								}}
								className="py-2 px-3 border border-[#bdc8ce] rounded-lg hover:bg-[#dee8ff]/50 hover:border-[#00647c]/50 transition-all font-semibold text-[13px] text-[#111c2d] flex flex-col items-center gap-1 group bg-[#f9f9ff] disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<Power
									size={18}
									className="text-[#6e797e] group-hover:text-[#ba1a1a] transition-colors"
								/>
								Reboot
							</button>
							<button
								type="button"
								disabled={!selectedDevice}
								onClick={() => {
									if (selectedDevice)
										sendCommand.mutate({
											id: selectedDevice.id,
											command: "set.time",
										});
								}}
								className="py-2 px-3 border border-[#bdc8ce] rounded-lg hover:bg-[#dee8ff]/50 hover:border-[#00647c]/50 transition-all font-semibold text-[13px] text-[#111c2d] flex flex-col items-center gap-1 group bg-[#f9f9ff] disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<Clock
									size={18}
									className="text-[#6e797e] group-hover:text-[#00647c] transition-colors"
								/>
								Sinkronkan Waktu
							</button>
							<div className="col-span-2 grid grid-cols-2 gap-2">
								<label className="text-[11px] text-[#6e797e]">
									Dari tanggal
									<input
										type="date"
										value={pullStartDate}
										onChange={(event) => setPullStartDate(event.target.value)}
										className="mt-1 w-full rounded-md border border-[#bdc8ce] bg-white px-2 py-1.5 text-[12px] text-[#111c2d]"
									/>
								</label>
								<label className="text-[11px] text-[#6e797e]">
									Sampai tanggal
									<input
										type="date"
										value={pullEndDate}
										onChange={(event) => setPullEndDate(event.target.value)}
										className="mt-1 w-full rounded-md border border-[#bdc8ce] bg-white px-2 py-1.5 text-[12px] text-[#111c2d]"
									/>
								</label>
							</div>
							<button
								type="button"
								disabled={
									!selectedDevice ||
									!pullStartDate ||
									!pullEndDate ||
									pullStartDate > pullEndDate ||
									sendCommand.isPending
								}
								onClick={() => {
									if (selectedDevice)
										sendCommand.mutate({
											id: selectedDevice.id,
											command: "attendance.download",
											payload: {
												start_date: pullStartDate,
												end_date: pullEndDate,
											},
										});
								}}
								className="py-2 px-3 border border-[#bdc8ce] rounded-lg hover:bg-[#dee8ff]/50 hover:border-[#00647c]/50 transition-all font-semibold text-[13px] text-[#111c2d] flex flex-col items-center gap-1 group col-span-2 bg-[#f9f9ff] disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<Download
									size={18}
									className="text-[#6e797e] group-hover:text-[#00647c] transition-colors"
								/>
								{sendCommand.isPending
									? "Mengirim perintah..."
									: "Tarik Data Absensi"}
							</button>
							<button
								type="button"
								disabled={!selectedDevice}
								onClick={() => {
									if (
										confirm(
											"AWAS: Semua data pada perangkat akan dihapus! Lanjutkan?",
										)
									) {
										if (selectedDevice)
											sendCommand.mutate({
												id: selectedDevice.id,
												command: "attendance.clear",
											});
									}
								}}
								className="py-2 px-3 border border-[#ba1a1a]/30 rounded-lg hover:bg-[#ba1a1a]/10 hover:border-[#ba1a1a] transition-all font-semibold text-[13px] text-[#ba1a1a] flex flex-col items-center gap-1 group col-span-2 bg-[#f9f9ff] disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<Trash2
									size={18}
									className="text-[#ba1a1a]/70 group-hover:text-[#ba1a1a] transition-colors"
								/>
								Hapus Semua Data
							</button>
						</div>
					</div>

					{/* Real device activity */}
					<section className="flex min-h-[250px] flex-1 flex-col overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm">
						<header className="border-b border-black/5 bg-[#f9f9ff] px-4 py-3">
							<h3 className="flex items-center gap-2 text-[13px] font-semibold text-[#111c2d]">
								<Clock size={16} className="text-[#00647c]" />
								Riwayat perangkat
							</h3>
							<p className="mt-1 text-[11px] text-[#6e797e]">
								Riwayat mengambil dan menerima data
							</p>
						</header>
						<div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
							{!selectedDevice ? (
								<p className="py-8 text-center text-[12px] text-[#6e797e]">
									Pilih perangkat untuk melihat riwayat.
								</p>
							) : commandsLoading || attendanceLoading ? (
								<div
									className="space-y-2"
									role="status"
									aria-label="Memuat riwayat perangkat"
								>
									{[1, 2, 3].map((item) => (
										<div
											key={item}
											className="h-16 animate-pulse rounded-lg bg-[#f0f3ff]"
										/>
									))}
								</div>
							) : history.length === 0 ? (
								<p className="py-8 text-center text-[12px] text-[#6e797e]">
									Belum ada aktivitas mengambil atau menerima data.
								</p>
							) : (
								<ol className="space-y-2">
									{history.map((item) => (
										<li
											key={item.id}
											className="flex gap-3 rounded-lg bg-[#f9f9ff] p-3"
										>
											<div
												className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${item.direction === "sent" ? "bg-[#00647c]/10 text-[#00647c]" : "bg-[#006c49]/10 text-[#006c49]"}`}
											>
												{item.direction === "sent" ? (
													<ArrowUpFromLine size={15} />
												) : (
													<ArrowDownToLine size={15} />
												)}
											</div>
											<div className="min-w-0 flex-1">
												<div className="flex items-start justify-between gap-2">
													<p className="text-[12px] font-semibold text-[#111c2d]">
														{item.title}
													</p>
													{item.status && (
														<span className="shrink-0 text-[10px] font-semibold text-[#6e797e]">
															{item.status}
														</span>
													)}
												</div>
												<p
													className="truncate font-mono text-[10px] text-[#3e484d]"
													title={item.detail}
												>
													{item.detail}
												</p>
												<time className="mt-1 block text-[10px] text-[#6e797e]">
													{formatHistoryTime(item.timestamp)}
												</time>
											</div>
										</li>
									))}
								</ol>
							)}
						</div>
					</section>
				</div>
			</div>
		</motion.div>
	);
}
