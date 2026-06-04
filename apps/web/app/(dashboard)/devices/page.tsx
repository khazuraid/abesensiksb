"use client";

import type { Device, DeviceCommandType } from "@adms/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
	Clock,
	Cpu,
	Download,
	Filter,
	MoreVertical,
	Plus,
	Power,
	Search,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import api from "@/lib/api";

export default function DevicesPage() {
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

	const { data: devices, isLoading } = useQuery<Device[]>({
		queryKey: ["devices"],
		queryFn: async () => {
			const res = await api.get("/devices");
			return res.data;
		},
		refetchInterval: 10000,
	});

	const sendCommand = useMutation({
		mutationFn: async ({
			id,
			command,
			payload,
		}: {
			id: number;
			command: DeviceCommandType;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			payload?: any;
		}) => {
			const res = await api.post(`/devices/${id}/command`, {
				command,
				payload,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["devices"] });
			alert("Command sent successfully!");
		},
	});

	const filteredDevices = devices?.filter(
		(d) =>
			d.name.toLowerCase().includes(search.toLowerCase()) ||
			d.serialNumber.toLowerCase().includes(search.toLowerCase()),
	);

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
						Perangkat Terminal
					</h2>
					<p className="font-sans text-sm text-[#6e797e] mt-1">
						Manajemen seluruh mesin absensi ADMS.
					</p>
				</div>
				<button className="flex items-center gap-2 px-4 py-2 bg-[#00647c] text-white rounded-lg hover:bg-[#007f9d] transition-all font-semibold text-[13px] shadow-sm active:scale-95">
					<Plus size={18} /> Tambah Mesin
				</button>
			</div>

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
									onChange={(e) => setSearch(e.target.value)}
								/>
							</div>
							<button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#bdc8ce] text-[#3e484d] hover:text-[#111c2d] hover:bg-[#f9f9ff] transition-all font-semibold text-[13px] whitespace-nowrap">
								<Filter size={16} /> Filter Tipe
							</button>
						</div>
					</div>

					{/* Table */}
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
												Date.now() - 2 * 60 * 1000
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
													{dev.name || "Unknown"}
												</td>
												<td className="py-2 px-4 font-mono text-[13px] text-[#6e797e]">
													{dev.ipAddress || "-"}
												</td>
												<td className="py-2 px-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
													<button className="p-1.5 text-[#6e797e] hover:text-[#00647c] transition-colors">
														<MoreVertical size={16} />
													</button>
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
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
							<label className="font-sans text-[12px] font-semibold text-[#6e797e] block mb-1">
								Target Perangkat
							</label>
							<select
								className="w-full bg-transparent border-none text-[13px] font-sans text-[#111c2d] focus:ring-0 p-0 cursor-pointer"
								value={selectedDevice?.id || ""}
								onChange={(e) => {
									const id = parseInt(e.target.value);
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
								Sync Time
							</button>
							<button
								disabled={!selectedDevice}
								onClick={() => {
									if (selectedDevice)
										sendCommand.mutate({
											id: selectedDevice.id,
											command: "attendance.download",
										});
								}}
								className="py-2 px-3 border border-[#bdc8ce] rounded-lg hover:bg-[#dee8ff]/50 hover:border-[#00647c]/50 transition-all font-semibold text-[13px] text-[#111c2d] flex flex-col items-center gap-1 group col-span-2 bg-[#f9f9ff] disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<Download
									size={18}
									className="text-[#6e797e] group-hover:text-[#00647c] transition-colors"
								/>
								Tarik Data Absensi
							</button>
							<button
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

					{/* Real-time Handshake Log */}
					<div className="bg-[#263143] rounded-xl flex flex-col flex-1 min-h-[250px] shadow-sm border border-black/5 transition-all duration-300 overflow-hidden">
						<div className="p-3 border-b border-white/10 flex justify-between items-center bg-[#111c2d]">
							<h3 className="font-semibold text-[13px] text-white flex items-center gap-2">
								<span className="w-2 h-2 rounded-full bg-[#006c49] animate-pulse"></span>
								Log Protokol
							</h3>
							<button className="text-white/50 hover:text-white">
								<MoreVertical size={16} />
							</button>
						</div>
						<div className="p-3 flex-1 overflow-y-auto custom-scrollbar font-mono text-[12px] leading-relaxed text-[#ecf1ff]">
							<div className="text-white/50 mb-2">
								# ADMS Real-time Handshake Listener (Simulated)
							</div>
							{selectedDevice ? (
								<>
									<div className="text-[#6ffbbe] mb-1">
										&gt; [{new Date().toLocaleTimeString()}] REQ:{" "}
										{selectedDevice.serialNumber} /iclock/cdata?SN=
										{selectedDevice.serialNumber} HTTP/1.1
									</div>
									<div className="text-white/80 mb-3 pl-4">Body: null</div>
									<div className="text-[#b7eaff] mb-1">
										&lt; [{new Date().toLocaleTimeString()}] RES: 200 OK
									</div>
									<div className="text-white/80 mb-3 pl-4">
										Server: ADMS/1.0
										<br />
										Content-Type: text/plain
									</div>
								</>
							) : (
								<div className="text-white/50 italic">
									Pilih perangkat untuk melihat log...
								</div>
							)}
							<span className="inline-block w-2 h-4 bg-[#b7eaff] animate-pulse ml-1 align-middle mt-2"></span>
						</div>
					</div>
				</div>
			</div>
		</motion.div>
	);
}
