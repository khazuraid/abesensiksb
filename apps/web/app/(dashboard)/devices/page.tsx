"use client";

import type {
	AttendanceLog,
	CreateDevice,
	Device,
	DeviceCommandType,
} from "@adms/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowDownToLine,
	ArrowUpFromLine,
	Clock,
	Download,
	MapPin,
	Plus,
	Power,
	RefreshCw,
	Search,
	Server,
	Wifi,
	WifiOff,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import PaginationControls, {
	type PageMeta,
} from "@/components/pagination-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

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

const isDeviceOnline = (device: Device, referenceTime: number) =>
	Boolean(
		device.lastSeen &&
			new Date(device.lastSeen).getTime() >
				(referenceTime || Date.now()) - 180000,
	);

const commandStatusLabel: Record<DeviceCommand["status"], string> = {
	PENDING: "Menunggu",
	SENT: "Terkirim",
	COMPLETED: "Selesai",
	ERROR: "Gagal",
};

export default function DevicesPage() {
	const queryClient = useQueryClient();
	const [search, setSearch] = React.useState("");
	const [page, setPage] = React.useState(1);
	const [selectedDevice, setSelectedDevice] = React.useState<Device | null>(
		null,
	);
	const selectedDeviceId = selectedDevice?.id;
	const today = new Date().toLocaleDateString("en-CA");
	const [pullStartDate, setPullStartDate] = React.useState(today);
	const [pullEndDate, setPullEndDate] = React.useState(today);
	const [showForm, setShowForm] = React.useState(false);
	const [form, setForm] = React.useState<CreateDevice>({
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
	const meta = response?.meta;
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
			toast.success("Perangkat berhasil ditambahkan");
		},
	});

	const selectedOnline = selectedDevice
		? isDeviceOnline(selectedDevice, dataUpdatedAt)
		: false;

	return (
		<div className="page-shell space-y-6">
			{/* Level 1: Page Header */}
			<PageHeader
				title="Manajemen Mesin Presensi (ADMS)"
				description="Pantau konektivitas terminal sidik jari/RFID ZKTeco, tarik data pegawai/log, dan kontrol perintah jarak jauh."
				action={
					<Button
						variant="primary"
						size="sm"
						onClick={() => setShowForm(true)}
						className="gap-1.5"
					>
						<Plus className="h-4 w-4" />
						Registrasi Mesin
					</Button>
				}
			/>

			{/* KPI Stat Cards */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<StatCard
					title="Total Perangkat"
					value={meta?.total ?? devices.length}
					icon={<Server className="h-4 w-4" />}
					description="Terminal terdaftar di sistem"
				/>
				<StatCard
					title="Status Online"
					value={onlineDevices}
					icon={<Wifi className="h-4 w-4 text-emerald-600" />}
					description="Heartbeat aktif < 3 menit"
				/>
				<StatCard
					title="Status Offline"
					value={Math.max(0, devices.length - onlineDevices)}
					icon={<WifiOff className="h-4 w-4 text-red-600" />}
					description={
						isFetching ? "Menyinkronkan data..." : "Otomatis tiap 10 detik"
					}
				/>
			</div>

			{/* SN-less Claims Alert Banner */}
			{claims.length > 0 && (
				<section className="border border-amber-300 bg-amber-50">
					<header className="border-b border-amber-200 px-4 py-3">
						<h3 className="text-xs font-bold uppercase tracking-wider font-mono text-amber-900">
							Permintaan mesin tanpa SN ({claims.length})
						</h3>
						<p className="mt-0.5 text-xs text-amber-800">
							Daftarkan mesin ini; sistem langsung meminta daftar pegawai.
						</p>
					</header>
					<ul className="divide-y divide-amber-200">
						{claims.map((claim) => (
							<li
								key={claim.id}
								className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="min-w-0">
									<p className="font-mono text-xs font-bold text-foreground">
										{claim.sourceIp}
									</p>
									<p className="mt-0.5 text-xs text-muted-foreground font-mono">
										/{claim.endpoint} · terakhir{" "}
										{formatHistoryTime(claim.lastSeen)}
									</p>
								</div>
								<Button
									variant="outline"
									size="sm"
									disabled={registerClaim.isPending}
									onClick={() => registerClaim.mutate(claim.id)}
									className="text-xs"
								>
									Daftarkan & tarik pegawai
								</Button>
							</li>
						))}
					</ul>
				</section>
			)}

			{/* Main Content Grid: Table + Selected Device Control Panel */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
				{/* Left 7 Cols: Devices Table */}
				<div className="lg:col-span-7 border border-border bg-card flex flex-col">
					<div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-3">
						<div className="relative w-full sm:w-64">
							<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
							<Input
								placeholder="Cari nama, SN, atau lokasi..."
								value={search}
								onChange={(e) => {
									setSearch(e.target.value);
									setPage(1);
								}}
								className="pl-8 text-xs h-8"
							/>
						</div>
						<span className="text-xs font-mono text-muted-foreground">
							Pilih baris untuk kontrol perangkat
						</span>
					</div>

					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Nama & Lokasi</TableHead>
								<TableHead>Serial Number</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Terakhir Aktif</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								[1, 2, 3].map((k) => (
									<TableRow key={k} className="animate-pulse">
										<TableCell colSpan={4} className="h-12 bg-card" />
									</TableRow>
								))
							) : devices.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={4}
										className="py-12 text-center text-xs text-muted-foreground"
									>
										Belum ada perangkat terdaftar.
									</TableCell>
								</TableRow>
							) : (
								devices.map((device) => {
									const online = isDeviceOnline(device, dataUpdatedAt);
									const isSelected = selectedDevice?.id === device.id;
									return (
										<TableRow
											key={device.id}
											onClick={() => setSelectedDevice(device)}
											className={cn(
												"cursor-pointer",
												isSelected && "bg-primary-subtle/70",
											)}
										>
											<TableCell>
												<div className="flex flex-col">
													<span className="font-bold text-foreground text-xs">
														{device.name}
													</span>
													<span className="text-[11px] text-muted-foreground flex items-center gap-1">
														<MapPin className="h-3 w-3" />
														{device.location || "Lokasi belum diatur"}
													</span>
												</div>
											</TableCell>
											<TableCell className="font-mono text-xs text-foreground">
												{device.serialNumber}
											</TableCell>
											<TableCell>
												<Badge
													variant={online ? "success" : "destructive"}
													className="text-[10px]"
												>
													{online ? "ONLINE" : "OFFLINE"}
												</Badge>
											</TableCell>
											<TableCell className="font-mono text-xs text-muted-foreground">
												{device.lastSeen
													? formatHistoryTime(device.lastSeen)
													: "Belum terhubung"}
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>

					<PaginationControls
						meta={meta}
						onPageChange={setPage}
						disabled={isLoading}
					/>
				</div>

				{/* Right 5 Cols: Device Inspector & Command Console */}
				<div className="lg:col-span-5 border border-border bg-card flex flex-col">
					{!selectedDevice ? (
						<div className="flex flex-col items-center justify-center p-10 text-center h-full min-h-[360px]">
							<Server className="h-8 w-8 text-muted-foreground/40 mb-3" />
							<h3 className="text-sm font-bold text-foreground">
								Pilih Perangkat Terminal
							</h3>
							<p className="text-xs text-muted-foreground mt-1 max-w-xs">
								Klik salah satu baris terminal pada tabel untuk mengirim
								perintah X609 dan melihat riwayat komunikasi.
							</p>
						</div>
					) : (
						<div className="divide-y divide-border">
							{/* Selected Device Header */}
							<div className="p-4 bg-muted/30 flex items-start justify-between gap-3">
								<div>
									<div className="flex items-center gap-2">
										<h3 className="text-sm font-bold text-foreground">
											{selectedDevice.name}
										</h3>
										<Badge
											variant={selectedOnline ? "success" : "destructive"}
											className="text-[10px]"
										>
											{selectedOnline ? "ONLINE" : "OFFLINE"}
										</Badge>
									</div>
									<p className="text-xs font-mono text-muted-foreground mt-1">
										SN: {selectedDevice.serialNumber} · IP:{" "}
										{selectedDevice.ipAddress || "Dinamis"}
									</p>
								</div>
							</div>

							{/* Quick Commands */}
							<div className="p-4 space-y-3">
								<h4 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
									Perintah Cepat
								</h4>
								<div className="grid grid-cols-3 gap-2">
									<Button
										variant="outline"
										size="sm"
										disabled={sendCommand.isPending}
										onClick={() =>
											sendCommand.mutate({
												id: selectedDevice.id,
												command: "reboot",
											})
										}
										className="text-xs gap-1.5"
									>
										<Power className="h-3.5 w-3.5 text-destructive" />
										Reboot
									</Button>
									<Button
										variant="outline"
										size="sm"
										disabled={sendCommand.isPending}
										onClick={() =>
											sendCommand.mutate({
												id: selectedDevice.id,
												command: "set.time",
											})
										}
										className="text-xs gap-1.5"
									>
										<Clock className="h-3.5 w-3.5 text-primary" />
										Sinkron Waktu
									</Button>
									<Button
										variant="outline"
										size="sm"
										disabled={sendCommand.isPending}
										onClick={() =>
											sendCommand.mutate({
												id: selectedDevice.id,
												command: "reset",
											})
										}
										className="text-xs gap-1.5"
									>
										<RefreshCw className="h-3.5 w-3.5 text-primary" />
										Reset Stamp
									</Button>
								</div>
							</div>

							{/* Pull Employees (X609 user.sync) */}
							<div className="p-4 space-y-2.5">
								<h4 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
									Sinkronisasi Pegawai (X609)
								</h4>
								<p className="text-xs text-muted-foreground">
									Solution X609 akan mengirim USERINFO pada polling berikutnya.
								</p>
								<Button
									variant="primary"
									size="sm"
									disabled={sendCommand.isPending}
									onClick={() =>
										sendCommand.mutate({
											id: selectedDevice.id,
											command: "user.sync",
										})
									}
									className="w-full gap-1.5 text-xs"
								>
									<Download className="h-3.5 w-3.5" />
									Tarik pegawai dari mesin
								</Button>
							</div>

							{/* Pull Attendance Logs by Date Range */}
							<div className="p-4 space-y-3">
								<h4 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
									Tarik Data Absensi
								</h4>
								<div className="grid grid-cols-2 gap-2.5">
									<div className="space-y-1">
										<label className="text-[10px] font-mono uppercase text-muted-foreground">
											Dari Tanggal
										</label>
										<Input
											type="date"
											value={pullStartDate}
											onChange={(e) => setPullStartDate(e.target.value)}
											className="h-8 text-xs font-mono"
										/>
									</div>
									<div className="space-y-1">
										<label className="text-[10px] font-mono uppercase text-muted-foreground">
											Sampai Tanggal
										</label>
										<Input
											type="date"
											value={pullEndDate}
											onChange={(e) => setPullEndDate(e.target.value)}
											className="h-8 text-xs font-mono"
										/>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
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
										className="flex-1 text-xs gap-1.5"
									>
										<Download className="h-3.5 w-3.5" />
										Tarik Periode Ini
									</Button>
									<Button
										variant="secondary"
										size="sm"
										disabled={sendCommand.isPending}
										onClick={() =>
											sendCommand.mutate({
												id: selectedDevice.id,
												command: "log",
											})
										}
										className="text-xs gap-1.5"
									>
										Tarik Semua Log
									</Button>
								</div>
							</div>

							{/* Device History */}
							<div className="p-4 space-y-3">
								<div className="flex items-center justify-between">
									<div>
										<h4 className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
											Riwayat Perangkat
										</h4>
										<p className="text-[11px] text-muted-foreground">
											Riwayat mengambil dan menerima data
										</p>
									</div>
									<Badge variant="outline" className="text-[10px] font-mono">
										LIVE · 5D
									</Badge>
								</div>

								<div className="max-h-64 overflow-y-auto divide-y divide-border border border-border">
									{commandsLoading || attendanceLoading ? (
										<div className="p-6 text-center text-xs text-muted-foreground">
											Memuat riwayat perangkat...
										</div>
									) : history.length === 0 ? (
										<div className="p-6 text-center text-xs text-muted-foreground">
											Belum ada aktivitas perangkat.
										</div>
									) : (
										history.map((item) => (
											<div
												key={item.id}
												className="p-2.5 flex items-start gap-2.5 text-xs bg-card hover:bg-muted/30"
											>
												<div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border border-border bg-muted/40">
													{item.direction === "sent" ? (
														<ArrowUpFromLine className="h-3 w-3 text-primary" />
													) : (
														<ArrowDownToLine className="h-3 w-3 text-emerald-600" />
													)}
												</div>
												<div className="min-w-0 flex-1">
													<div className="flex items-center justify-between gap-2">
														<span className="font-semibold text-foreground">
															{item.title}
														</span>
														{item.status && (
															<span className="font-mono text-[10px] text-muted-foreground">
																{commandStatusLabel[item.status]}
															</span>
														)}
													</div>
													<p className="font-mono text-[11px] text-muted-foreground truncate mt-0.5">
														{item.detail}
													</p>
													<p className="font-mono text-[10px] text-muted-foreground/80 mt-0.5">
														{formatHistoryTime(item.timestamp)}
													</p>
												</div>
											</div>
										))
									)}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Register Device Modal */}
			{showForm && (
				<Modal
					open={showForm}
					onOpenChange={setShowForm}
					title="Registrasi Mesin Presensi ADMS"
					description="Masukkan Serial Number (SN) ZKTeco yang sesuai dengan pengaturan ADMS di mesin fisik."
					maxWidth="lg"
					footer={
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setShowForm(false)}
								disabled={createDevice.isPending}
							>
								Batal
							</Button>
							<Button
								variant="primary"
								size="sm"
								onClick={() => createDevice.mutate(form)}
								disabled={
									createDevice.isPending || !form.serialNumber || !form.name
								}
							>
								{createDevice.isPending ? "Menyimpan..." : "Simpan Perangkat"}
							</Button>
						</div>
					}
				>
					<div className="space-y-4">
						<div className="space-y-1.5">
							<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
								Serial Number (SN) *
							</label>
							<Input
								placeholder="Contoh: CJKV23456001"
								value={form.serialNumber}
								onChange={(e) =>
									setForm({ ...form, serialNumber: e.target.value })
								}
							/>
						</div>
						<div className="space-y-1.5">
							<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
								Nama Terminal *
							</label>
							<Input
								placeholder="Contoh: Mesin Lobby Utama"
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
							/>
						</div>
						<div className="space-y-1.5">
							<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
								Lokasi Penempatan
							</label>
							<Input
								placeholder="Contoh: Gedung Pelayanan Lt. 1"
								value={form.location ?? ""}
								onChange={(e) => setForm({ ...form, location: e.target.value })}
							/>
						</div>
						<div className="space-y-1.5">
							<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
								Alamat IP Lokal (Opsional)
							</label>
							<Input
								placeholder="Contoh: 192.168.1.201"
								value={form.ipAddress ?? ""}
								onChange={(e) =>
									setForm({ ...form, ipAddress: e.target.value })
								}
							/>
						</div>
					</div>
				</Modal>
			)}
		</div>
	);
}
