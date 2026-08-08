"use client";

import type {
	AttendanceLog,
	CreateDevice,
	Device,
	DeviceCommandType,
} from "@adms/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Activity,
	ArrowDownToLine,
	ArrowUpFromLine,
	ChevronRight,
	Clock,
	Cpu,
	Download,
	MapPin,
	Plus,
	Power,
	RefreshCw,
	Search,
	Server,
	Trash2,
	Wifi,
	WifiOff,
	X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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

type DeviceClaim = {
	id: number;
	sourceIp: string;
	endpoint: string;
	userAgent: string | null;
	firstSeen: string | Date;
	lastSeen: string | Date;
};

const formatHistoryTime = (value: string | Date) =>
	new Intl.DateTimeFormat("id-ID", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));

const formatLastSeen = (value: string | Date | null | undefined) => {
	if (!value) return "Belum pernah terhubung";
	return `Terakhir aktif ${new Intl.DateTimeFormat("id-ID", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value))}`;
};

const isDeviceOnline = (device: Device, referenceTime: number) =>
	Boolean(
		device.lastSeen &&
			new Date(device.lastSeen).getTime() >
				(referenceTime || Date.now()) - 2 * 60 * 1000,
	);

const historyStatusLabel: Record<DeviceCommand["status"], string> = {
	PENDING: "Menunggu",
	SENT: "Terkirim",
	COMPLETED: "Selesai",
	ERROR: "Gagal",
};

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
		isError,
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
	const onlineDevices = devices.filter((device) =>
		isDeviceOnline(device, dataUpdatedAt),
	).length;
	const { data: claimResponse } = useQuery<{
		data: DeviceClaim[];
		meta: PageMeta;
	}>({
		queryKey: ["device-claims"],
		queryFn: async () =>
			(await api.get("/devices/claims?page=1&limit=10")).data,
		refetchInterval: 10000,
	});
	const claims = claimResponse?.data ?? [];
	const registerClaim = useMutation({
		mutationFn: async (claimId: number) =>
			(await api.post(`/devices/claims/${claimId}/register`)).data,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["device-claims"] });
			queryClient.invalidateQueries({ queryKey: ["devices"] });
			toast.success("Terminal didaftarkan. Perintah tarik pegawai dikirim");
		},
	});

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
			toast.success("Perintah dikirim ke perangkat");
		},
	});

	const createDevice = useMutation({
		mutationFn: async (data: CreateDevice) =>
			(await api.post("/devices", data)).data,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["devices"] });
			setShowForm(false);
			setForm({ serialNumber: "", name: "", location: "", ipAddress: "" });
			toast.success("Perangkat ditambahkan");
		},
	});

	const selectedOnline = selectedDevice
		? isDeviceOnline(selectedDevice, dataUpdatedAt)
		: false;

	return (
		<div className="mx-auto flex w-full max-w-[1360px] flex-col gap-5 md:gap-6">
			<header className="flex flex-col gap-5 border-b border-[#d5ded9] pb-5 md:flex-row md:items-end md:justify-between md:pb-6">
				<div className="max-w-2xl">
					<div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#087066]">
						<span className="h-px w-6 bg-[#087066]" />
						Operasional terminal
					</div>
					<h2 className="text-[28px] leading-tight md:text-[34px]">
						Kendali perangkat absensi
					</h2>
					<p className="mt-2 max-w-xl text-sm leading-6">
						Pantau koneksi, tarik rekaman, dan kelola setiap terminal dari satu
						ruang kerja.
					</p>
				</div>
				<button
					type="button"
					onClick={() => setShowForm((open) => !open)}
					aria-expanded={showForm}
					className="adms-button w-full md:w-auto"
				>
					{showForm ? <X size={17} /> : <Plus size={17} />}
					{showForm ? "Tutup formulir" : "Tambah perangkat"}
				</button>
			</header>

			<section
				aria-label="Ringkasan perangkat"
				className="grid overflow-hidden border border-[#d5ded9] bg-white sm:grid-cols-3"
			>
				<div className="flex items-center gap-4 p-4 sm:border-r sm:border-[#d5ded9] md:p-5">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#dceae5] text-[#087066]">
						<Server size={19} />
					</div>
					<div>
						<p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em]">
							Total terminal
						</p>
						<strong className="mt-0.5 block text-2xl tabular-nums text-[#14211d]">
							{response?.meta.total ?? 0}
						</strong>
					</div>
				</div>
				<div className="flex items-center gap-4 border-y border-[#d5ded9] p-4 sm:border-y-0 sm:border-r md:p-5">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#e8f3ec] text-[#23734b]">
						<Wifi size={19} />
					</div>
					<div>
						<p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em]">
							Aktif di halaman
						</p>
						<strong className="mt-0.5 block text-2xl tabular-nums text-[#14211d]">
							{onlineDevices}
						</strong>
					</div>
				</div>
				<div className="flex items-center gap-4 p-4 md:p-5">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#eaf0ed] text-[#53635d]">
						<RefreshCw
							size={18}
							className={isFetching ? "animate-spin" : undefined}
						/>
					</div>
					<div>
						<p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em]">
							Pembaruan
						</p>
						<strong className="mt-1 block text-sm text-[#14211d]">
							{isFetching ? "Menyinkronkan data" : "Otomatis tiap 10 detik"}
						</strong>
					</div>
				</div>
			</section>

			{claims.length > 0 && (
				<section className="border border-[#d8bc7a] bg-[#fffaf0]">
					<header className="border-b border-[#ead9ac] px-4 py-3 md:px-5">
						<h3 className="text-sm font-semibold">Permintaan mesin tanpa SN</h3>
						<p className="mt-1 text-xs">
							Daftarkan mesin ini; sistem langsung meminta daftar pegawai.
						</p>
					</header>
					<ul className="divide-y divide-[#ead9ac]">
						{claims.map((claim) => (
							<li
								key={claim.id}
								className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between md:px-5"
							>
								<div className="min-w-0">
									<p className="font-mono text-xs font-semibold">
										{claim.sourceIp}
									</p>
									<p className="mt-1 text-xs">
										/{claim.endpoint} · terakhir{" "}
										{formatHistoryTime(claim.lastSeen)}
									</p>
									{claim.userAgent && (
										<p className="mt-1 truncate font-mono text-[10px] text-[#53635d]">
											{claim.userAgent}
										</p>
									)}
								</div>
								<button
									type="button"
									disabled={registerClaim.isPending}
									onClick={() => registerClaim.mutate(claim.id)}
									className="adms-button-outline min-h-10 text-xs"
								>
									Daftarkan & tarik pegawai
								</button>
							</li>
						))}
					</ul>
				</section>
			)}

			{showForm && (
				<section className="border border-[#aebdb6] bg-white">
					<div className="flex items-start justify-between gap-4 border-b border-[#d5ded9] bg-[#eaf0ed] px-4 py-3 md:px-5">
						<div>
							<h3 className="text-sm font-semibold">Daftarkan terminal baru</h3>
							<p className="mt-1 text-xs">
								SN adalah identitas koneksi ADMS. Samakan persis dengan SN di
								mesin.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setShowForm(false)}
							aria-label="Tutup formulir tambah perangkat"
							className="flex h-9 w-9 items-center justify-center border border-[#aebdb6] bg-white text-[#53635d] hover:bg-[#f3f6f4]"
						>
							<X size={16} />
						</button>
					</div>
					<form
						onSubmit={(event) => {
							event.preventDefault();
							createDevice.mutate(form);
						}}
						className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4 md:p-5"
					>
						<label className="text-xs font-semibold text-[#53635d]">
							Serial number
							<input
								required
								placeholder="Contoh: ADMS-001"
								value={form.serialNumber}
								onChange={(event) =>
									setForm({ ...form, serialNumber: event.target.value })
								}
								className="mt-1.5 w-full px-3"
							/>
						</label>
						<label className="text-xs font-semibold text-[#53635d]">
							Nama perangkat
							<input
								required
								placeholder="Contoh: Terminal lobi"
								value={form.name}
								onChange={(event) =>
									setForm({ ...form, name: event.target.value })
								}
								className="mt-1.5 w-full px-3"
							/>
						</label>
						<label className="text-xs font-semibold text-[#53635d]">
							Lokasi
							<input
								placeholder="Contoh: Gedung utama"
								value={form.location ?? ""}
								onChange={(event) =>
									setForm({ ...form, location: event.target.value })
								}
								className="mt-1.5 w-full px-3"
							/>
						</label>
						<label className="text-xs font-semibold text-[#53635d]">
							Alamat IP
							<input
								placeholder="Contoh: 192.168.1.10"
								value={form.ipAddress ?? ""}
								onChange={(event) =>
									setForm({ ...form, ipAddress: event.target.value })
								}
								className="mt-1.5 w-full px-3 font-mono"
							/>
						</label>
						<div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end lg:col-span-4">
							<button
								type="button"
								onClick={() => setShowForm(false)}
								className="adms-button-outline"
							>
								Batal
							</button>
							<button
								type="submit"
								disabled={createDevice.isPending}
								aria-busy={createDevice.isPending}
								className="adms-button"
							>
								{createDevice.isPending ? "Menyimpan..." : "Simpan perangkat"}
							</button>
						</div>
					</form>
				</section>
			)}

			<div className="grid min-h-0 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.85fr)] xl:items-start">
				<section className="min-w-0 border border-[#d5ded9] bg-white">
					<header className="flex flex-col gap-3 border-b border-[#d5ded9] p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
						<div>
							<h3 className="flex items-center gap-2 text-[15px] font-semibold">
								<Server size={17} className="text-[#087066]" />
								Daftar terminal
							</h3>
							<p className="mt-1 text-xs">
								Pilih satu terminal untuk membuka kontrol.
							</p>
						</div>
						<div className="relative w-full sm:w-72">
							<Search
								className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#53635d]"
								size={16}
							/>
							<input
								className="w-full py-2 pl-9 pr-3 text-sm"
								placeholder="Cari nama atau serial..."
								type="search"
								value={search}
								onChange={(event) => {
									setSearch(event.target.value);
									setPage(1);
								}}
							/>
						</div>
					</header>

					<div className="min-h-[280px]">
						{isLoading ? (
							<div
								className="divide-y divide-[#d5ded9]"
								role="status"
								aria-label="Memuat daftar perangkat"
							>
								{[1, 2, 3, 4].map((item) => (
									<div
										key={item}
										className="flex animate-pulse gap-4 p-4 md:p-5"
									>
										<div className="h-11 w-11 bg-[#eaf0ed]" />
										<div className="flex-1 space-y-2">
											<div className="h-3 w-1/3 bg-[#eaf0ed]" />
											<div className="h-3 w-2/3 bg-[#eaf0ed]" />
										</div>
									</div>
								))}
							</div>
						) : isError ? (
							<div
								role="alert"
								className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center"
							>
								<WifiOff size={28} className="mb-3 text-[#a9433d]" />
								<h4 className="text-sm font-semibold">
									Daftar terminal tidak dapat dimuat
								</h4>
								<p className="mt-1 max-w-sm text-xs">
									Periksa koneksi, lalu muat ulang halaman.
								</p>
							</div>
						) : devices.length === 0 ? (
							<div className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
								<div className="mb-4 flex h-12 w-12 items-center justify-center bg-[#eaf0ed] text-[#53635d]">
									<Server size={22} />
								</div>
								<h4 className="text-sm font-semibold">
									{search ? "Terminal tidak ditemukan" : "Belum ada terminal"}
								</h4>
								<p className="mt-1 max-w-sm text-xs">
									{search
										? "Coba kata kunci lain atau hapus pencarian."
										: "Tambahkan perangkat pertama untuk mulai menerima data absensi."}
								</p>
								{!search && (
									<button
										type="button"
										onClick={() => setShowForm(true)}
										className="adms-button mt-4"
									>
										<Plus size={16} /> Tambah perangkat
									</button>
								)}
							</div>
						) : (
							<ul className="divide-y divide-[#d5ded9]">
								{devices.map((device) => {
									const online = isDeviceOnline(device, dataUpdatedAt);
									const selected = selectedDevice?.id === device.id;
									return (
										<li key={device.id}>
											<button
												type="button"
												onClick={() => setSelectedDevice(device)}
												aria-pressed={selected}
												className={`group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-l-[3px] px-3 py-4 text-left transition-colors sm:gap-4 sm:px-4 md:px-5 ${selected ? "border-l-[#087066] bg-[#eef5f2]" : "border-l-transparent hover:bg-[#f2f7f4]"}`}
											>
												<div
													className={`flex h-11 w-11 items-center justify-center ${online ? "bg-[#e8f3ec] text-[#23734b]" : "bg-[#f8eae8] text-[#a9433d]"}`}
												>
													{online ? <Wifi size={19} /> : <WifiOff size={19} />}
												</div>
												<div className="min-w-0">
													<div className="flex flex-wrap items-center gap-2">
														<strong className="truncate text-sm text-[#14211d]">
															{device.name || "Perangkat tanpa nama"}
														</strong>
														<span
															className={
																online ? "adms-pill-success" : "adms-pill-alert"
															}
														>
															{online ? "Online" : "Offline"}
														</span>
													</div>
													<p className="mt-1 truncate font-mono text-[11px] text-[#53635d]">
														{device.serialNumber}
														<span className="mx-2 text-[#aebdb6]">/</span>
														{device.ipAddress || "IP belum tercatat"}
													</p>
													<div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#53635d]">
														<span className="flex items-center gap-1">
															<MapPin size={12} />{" "}
															{device.location || "Lokasi belum diatur"}
														</span>
														<span>{formatLastSeen(device.lastSeen)}</span>
													</div>
												</div>
												<ChevronRight
													size={18}
													className={`transition-transform ${selected ? "translate-x-0 text-[#087066]" : "-translate-x-1 text-[#aebdb6] group-hover:translate-x-0"}`}
												/>
											</button>
										</li>
									);
								})}
							</ul>
						)}
					</div>
					<PaginationControls
						meta={response?.meta}
						onPageChange={setPage}
						disabled={isFetching}
					/>
				</section>

				<aside id="device-control" className="min-w-0 xl:sticky xl:top-6">
					{!selectedDevice ? (
						<div className="flex min-h-[420px] flex-col items-center justify-center border border-dashed border-[#aebdb6] bg-[#eef3f0] p-8 text-center">
							<div className="mb-4 flex h-14 w-14 items-center justify-center border border-[#d5ded9] bg-white text-[#087066]">
								<Cpu size={24} />
							</div>
							<p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#087066]">
								Pusat kendali
							</p>
							<h3 className="mt-2 text-lg font-semibold">
								Pilih satu terminal
							</h3>
							<p className="mt-2 max-w-[280px] text-xs leading-5">
								Status, perintah jarak jauh, dan riwayat aktivitas akan tampil
								di sini.
							</p>
						</div>
					) : (
						<div className="border border-[#d5ded9] bg-white">
							<header className="border-b border-[#d5ded9] bg-[#14211d] p-5 text-white">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<div className="mb-2 flex items-center gap-2">
											<span
												className={`h-2 w-2 ${selectedOnline ? "bg-[#70c69b]" : "bg-[#e49a94]"}`}
											/>
											<span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-white/65">
												{selectedOnline
													? "Terminal online"
													: "Terminal offline"}
											</span>
										</div>
										<h3 className="truncate text-lg font-semibold !text-white">
											{selectedDevice.name || "Perangkat tanpa nama"}
										</h3>
										<p className="mt-1 font-mono text-[11px] !text-white/65">
											{selectedDevice.serialNumber}
										</p>
									</div>
									<div className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/15 bg-white/5">
										<Cpu size={19} />
									</div>
								</div>
								<div className="mt-4 grid grid-cols-2 gap-px bg-white/15 border border-white/15">
									<div className="bg-[#14211d] p-3">
										<p className="font-mono text-[9px] uppercase tracking-[0.12em] !text-white/50">
											Alamat IP
										</p>
										<p className="mt-1 truncate font-mono text-xs !text-white">
											{selectedDevice.ipAddress || "—"}
										</p>
									</div>
									<div className="bg-[#14211d] p-3">
										<p className="font-mono text-[9px] uppercase tracking-[0.12em] !text-white/50">
											Lokasi
										</p>
										<p className="mt-1 truncate text-xs !text-white">
											{selectedDevice.location || "Belum diatur"}
										</p>
									</div>
								</div>
							</header>

							<section className="border-b border-[#d5ded9] p-4 md:p-5">
								<div className="mb-4 flex items-center justify-between gap-3">
									<div>
										<h4 className="text-sm font-semibold">Perintah cepat</h4>
										<p className="mt-0.5 text-[11px]">
											Aksi dikirim ke terminal terpilih.
										</p>
									</div>
									<Activity size={17} className="text-[#087066]" />
								</div>
								<div className="grid grid-cols-2 gap-2">
									<button
										type="button"
										disabled={sendCommand.isPending}
										onClick={() =>
											sendCommand.mutate({
												id: selectedDevice.id,
												command: "reboot",
											})
										}
										className="flex min-h-16 flex-col items-start justify-between border border-[#d5ded9] bg-[#f7faf8] p-3 text-left hover:border-[#087066] hover:bg-[#eef5f2]"
									>
										<Power size={17} className="text-[#a9433d]" />
										<span className="text-xs font-semibold">
											Reboot terminal
										</span>
									</button>
									<button
										type="button"
										disabled={sendCommand.isPending}
										onClick={() =>
											sendCommand.mutate({
												id: selectedDevice.id,
												command: "set.time",
											})
										}
										className="flex min-h-16 flex-col items-start justify-between border border-[#d5ded9] bg-[#f7faf8] p-3 text-left hover:border-[#087066] hover:bg-[#eef5f2]"
									>
										<Clock size={17} className="text-[#087066]" />
										<span className="text-xs font-semibold">
											Sinkronkan waktu
										</span>
									</button>
								</div>
							</section>

							<section className="border-b border-[#d5ded9] p-4 md:p-5">
								<div className="mb-3 flex items-center gap-2">
									<Download size={16} className="text-[#087066]" />
									<h4 className="text-sm font-semibold">
										Tarik daftar pegawai
									</h4>
								</div>
								<p className="text-[11px] leading-5 text-[#53635d]">
									Solution X609 akan mengirim USERINFO pada polling berikutnya.
								</p>
								<button
									type="button"
									disabled={sendCommand.isPending}
									onClick={() =>
										sendCommand.mutate({
											id: selectedDevice.id,
											command: "user.sync",
										})
									}
									aria-busy={sendCommand.isPending}
									className="adms-button mt-3 w-full"
								>
									<Download size={16} />
									{sendCommand.isPending
										? "Mengirim perintah..."
										: "Tarik pegawai dari mesin"}
								</button>
							</section>

							<section className="border-b border-[#d5ded9] p-4 md:p-5">
								<div className="mb-3 flex items-center gap-2">
									<Download size={16} className="text-[#087066]" />
									<h4 className="text-sm font-semibold">Tarik data absensi</h4>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<label className="text-[11px] font-semibold text-[#53635d]">
										Dari tanggal
										<input
											type="date"
											value={pullStartDate}
											onChange={(event) => setPullStartDate(event.target.value)}
											className="mt-1.5 w-full px-2 text-xs"
										/>
									</label>
									<label className="text-[11px] font-semibold text-[#53635d]">
										Sampai tanggal
										<input
											type="date"
											value={pullEndDate}
											onChange={(event) => setPullEndDate(event.target.value)}
											className="mt-1.5 w-full px-2 text-xs"
										/>
									</label>
								</div>
								<button
									type="button"
									disabled={
										!pullStartDate ||
										!pullEndDate ||
										pullStartDate > pullEndDate ||
										sendCommand.isPending
									}
									onClick={() =>
										sendCommand.mutate({
											id: selectedDevice.id,
											command: "attendance.download",
											payload: {
												start_date: pullStartDate,
												end_date: pullEndDate,
											},
										})
									}
									aria-busy={sendCommand.isPending}
									className="adms-button mt-3 w-full"
								>
									<Download size={16} />
									{sendCommand.isPending
										? "Mengirim perintah..."
										: "Tarik data periode ini"}
								</button>
							</section>

							<section className="border-b border-[#d5ded9]">
								<header className="flex items-start justify-between gap-3 bg-[#eaf0ed] px-4 py-3 md:px-5">
									<div>
										<h4 className="flex items-center gap-2 text-xs font-semibold">
											<Clock size={14} className="text-[#087066]" /> Riwayat
											perangkat
										</h4>
										<p className="mt-1 text-[10px]">
											Riwayat mengambil dan menerima data
										</p>
									</div>
									<span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#53635d]">
										Live · 5d
									</span>
								</header>
								<div className="max-h-[330px] overflow-y-auto p-3 custom-scrollbar">
									{commandsLoading || attendanceLoading ? (
										<div
											className="space-y-2"
											role="status"
											aria-label="Memuat riwayat perangkat"
										>
											{[1, 2, 3].map((item) => (
												<div
													key={item}
													className="h-16 animate-pulse bg-[#eaf0ed]"
												/>
											))}
										</div>
									) : history.length === 0 ? (
										<p className="py-8 text-center text-xs text-[#53635d]">
											Belum ada aktivitas perangkat.
										</p>
									) : (
										<ol className="relative space-y-0 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-[#d5ded9]">
											{history.map((item) => (
												<li
													key={item.id}
													className="relative flex gap-3 px-1 py-2.5"
												>
													<div
														className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center border bg-white ${item.direction === "sent" ? "border-[#8db9b2] text-[#087066]" : "border-[#9dc7ad] text-[#23734b]"}`}
													>
														{item.direction === "sent" ? (
															<ArrowUpFromLine size={13} />
														) : (
															<ArrowDownToLine size={13} />
														)}
													</div>
													<div className="min-w-0 flex-1">
														<div className="flex items-start justify-between gap-2">
															<p className="text-[11px] font-semibold text-[#14211d]">
																{item.title}
															</p>
															{item.status && (
																<span
																	className={`shrink-0 font-mono text-[9px] font-semibold uppercase ${item.status === "ERROR" ? "text-[#a9433d]" : item.status === "COMPLETED" ? "text-[#23734b]" : "text-[#946617]"}`}
																>
																	{historyStatusLabel[item.status]}
																</span>
															)}
														</div>
														<p
															className="mt-0.5 truncate font-mono text-[9px] text-[#53635d]"
															title={item.detail}
														>
															{item.detail}
														</p>
														<time className="mt-1 block text-[9px] text-[#75827d]">
															{formatHistoryTime(item.timestamp)}
														</time>
													</div>
												</li>
											))}
										</ol>
									)}
								</div>
							</section>

							<div className="p-4 md:p-5">
								<button
									type="button"
									disabled={sendCommand.isPending}
									onClick={() => {
										if (
											confirm(
												"AWAS: Semua data pada perangkat akan dihapus. Lanjutkan?",
											)
										) {
											sendCommand.mutate({
												id: selectedDevice.id,
												command: "attendance.clear",
											});
										}
									}}
									className="flex min-h-11 w-full items-center justify-center gap-2 border border-[#d9aba7] bg-white px-3 text-xs font-semibold text-[#a9433d] hover:bg-[#f8eae8]"
								>
									<Trash2 size={15} /> Hapus seluruh data terminal
								</button>
							</div>
						</div>
					)}
				</aside>
			</div>
		</div>
	);
}
