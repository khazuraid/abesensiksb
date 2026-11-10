"use client";

import { Bell, Menu, Search, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import api from "@/lib/api";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";
import { useSocket } from "@/providers/socket-provider";

const routeNames: Record<string, string> = {
	"": "Ringkasan Eksekutif",
	employees: "Data Pegawai",
	logs: "Log Absensi Mesin",
	devices: "Perangkat ADMS",
	shifts: "Jadwal & Shift",
	leaves: "Pengajuan Cuti",
	holidays: "Kalender Hari Libur",
	reports: "Laporan & Ekspor",
	"daily-recap": "Rekap Presensi Harian",
	jaspel: "Kalkulasi Jasa Pelayanan",
	"audit-logs": "Audit Trail Log",
	users: "Manajemen Pengguna",
	settings: "Konfigurasi Sistem",
	profile: "Profil Pengguna",
};

export function DesktopHeader() {
	const pathname = usePathname();
	const router = useRouter();
	const { setMobileNavOpen } = useUiStore();
	const { socket, isConnected } = useSocket();

	const [searchQuery, setSearchQuery] = React.useState("");
	const [notifications, setNotifications] = React.useState<
		{ id: string; title: string; description: string; time: string }[]
	>([]);
	const [user, setUser] = React.useState<{
		name?: string;
		role?: string;
	} | null>(null);

	React.useEffect(() => {
		api
			.get("/auth/me")
			.then(({ data }) => setUser(data))
			.catch(() => undefined);
	}, []);

	React.useEffect(() => {
		if (!socket) return;
		const onNewLog = (data: {
			employee?: { name?: string };
			timestamp: string | Date;
		}) => {
			const item = {
				id: crypto.randomUUID(),
				title: `Absensi: ${data.employee?.name ?? "Pegawai"}`,
				description: `Tercatat pukul ${new Date(data.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`,
				time: new Date().toLocaleTimeString("id-ID", {
					hour: "2-digit",
					minute: "2-digit",
				}),
			};
			setNotifications((prev) => [item, ...prev.slice(0, 19)]);
			toast.success(item.title, { description: item.description });
		};

		const onDeviceStatus = (data: { deviceId: string; isOnline: boolean }) => {
			const item = {
				id: crypto.randomUUID(),
				title: data.isOnline
					? "Perangkat Kembali Online"
					: "Perangkat Terputus",
				description: `Perangkat SN: ${data.deviceId}`,
				time: new Date().toLocaleTimeString("id-ID", {
					hour: "2-digit",
					minute: "2-digit",
				}),
			};
			setNotifications((prev) => [item, ...prev.slice(0, 19)]);
			if (data.isOnline) {
				toast.info(item.title, { description: item.description });
			} else {
				toast.error(item.title, { description: item.description });
			}
		};

		socket.on("attendance:new", onNewLog);
		socket.on("device:status", onDeviceStatus);

		return () => {
			socket.off("attendance:new", onNewLog);
			socket.off("device:status", onDeviceStatus);
		};
	}, [socket]);

	const currentSegment = pathname.split("/").filter(Boolean)[0] || "";
	const pageTitle = routeNames[currentSegment] || "Dashboard";

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (!searchQuery.trim()) return;
		router.push(`/employees?search=${encodeURIComponent(searchQuery.trim())}`);
	};

	return (
		<header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border bg-card px-4 sm:px-6">
			{/* Left: Mobile hamburger + Contextual Breadcrumbs */}
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={() => setMobileNavOpen(true)}
					className="flex md:hidden p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
					aria-label="Buka navigasi"
				>
					<Menu className="h-4 w-4" />
				</button>

				<nav aria-label="Breadcrumb" className="flex items-center gap-2">
					<span className="hidden sm:inline text-xs font-semibold text-muted-foreground">
						ADMS
					</span>
					<span className="hidden sm:inline text-xs text-muted-foreground">
						/
					</span>
					<span className="text-xs font-bold text-foreground tracking-tight">
						{pageTitle}
					</span>
				</nav>
			</div>

			{/* Center / Right: Quick Search + Socket Status + Notifications + User */}
			<div className="flex items-center gap-2.5 sm:gap-4">
				{/* Quick Search */}
				<form onSubmit={handleSearch} className="relative hidden md:block">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
					<input
						type="search"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Cari pegawai... (Enter)"
						className="h-8 w-48 lg:w-64 border border-border bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
					/>
				</form>

				{/* Real-time Socket Status Pill */}
				<div
					className={cn(
						"flex items-center gap-1.5 border px-2 py-1 text-[11px] font-mono font-semibold uppercase tracking-wider",
						isConnected
							? "border-emerald-200 bg-emerald-50 text-emerald-700"
							: "border-red-200 bg-red-50 text-red-700",
					)}
					title={isConnected ? "Terhubung ke server ADMS" : "Koneksi terputus"}
				>
					<span
						className={cn(
							"h-1.5 w-1.5 status-pill-round",
							isConnected ? "bg-emerald-600 animate-pulse" : "bg-red-600",
						)}
					/>
					<span className="hidden sm:inline">
						{isConnected ? "LIVE" : "DISCONNECT"}
					</span>
				</div>

				{/* Notification Dropdown */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className="relative p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground border border-border transition-colors"
							aria-label="Notifikasi"
						>
							<Bell className="h-4 w-4" />
							{notifications.length > 0 && (
								<span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold font-mono">
									{notifications.length}
								</span>
							)}
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-80 p-0">
						<div className="flex items-center justify-between border-b border-border px-3.5 py-2.5 bg-muted/30">
							<span className="text-xs font-bold text-foreground">
								Notifikasi Real-time
							</span>
							{notifications.length > 0 && (
								<button
									type="button"
									onClick={() => setNotifications([])}
									className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
								>
									Bersihkan
								</button>
							)}
						</div>
						<div className="max-h-64 overflow-y-auto divide-y divide-border/60">
							{notifications.length === 0 ? (
								<div className="p-4 text-center text-xs text-muted-foreground">
									Belum ada notifikasi baru
								</div>
							) : (
								notifications.map((n) => (
									<div
										key={n.id}
										className="p-3 hover:bg-muted/30 transition-colors"
									>
										<div className="flex items-center justify-between gap-2">
											<span className="text-xs font-semibold text-foreground truncate">
												{n.title}
											</span>
											<span className="text-[10px] font-mono text-muted-foreground shrink-0">
												{n.time}
											</span>
										</div>
										<p className="mt-0.5 text-xs text-muted-foreground">
											{n.description}
										</p>
									</div>
								))
							)}
						</div>
					</DropdownMenuContent>
				</DropdownMenu>

				{/* User Profile */}
				<Link
					href="/profile"
					className="flex items-center gap-2 border border-border px-2.5 py-1 hover:bg-muted transition-colors"
				>
					<div className="flex h-6 w-6 items-center justify-center bg-muted text-muted-foreground text-xs font-semibold">
						<User className="h-3.5 w-3.5" />
					</div>
					<div className="hidden sm:flex flex-col text-left">
						<span className="text-xs font-bold leading-tight text-foreground truncate max-w-[120px]">
							{user?.name || "Pegawai"}
						</span>
						<span className="text-[10px] font-mono text-muted-foreground leading-tight">
							{user?.role || "USER"}
						</span>
					</div>
				</Link>
			</div>
		</header>
	);
}
