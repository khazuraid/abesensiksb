"use client";

import { Bell, Search, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useSocket } from "@/providers/socket-provider";

export function Topbar() {
	const router = useRouter();
	const { socket, isConnected } = useSocket();
	const [searchQuery, setSearchQuery] = useState("");
	const [notifications, setNotifications] = useState<
		{ id: string; title: string; description: string; time: string }[]
	>([]);
	const [showNotifications, setShowNotifications] = useState(false);
	const [user, setUser] = useState<{ name?: string; role?: string } | null>(
		null,
	);

	useEffect(() => {
		api
			.get("/auth/me")
			.then(({ data }) => setUser(data))
			.catch(() => undefined);
	}, []);

	useEffect(() => {
		if (!socket) return;
		const onNewLog = (data: {
			employee?: { name?: string };
			timestamp: string | Date;
		}) => {
			const notification = {
				id: crypto.randomUUID(),
				title: `Absensi: ${data.employee?.name ?? "Pegawai"}`,
				description: `Tercatat pukul ${new Date(data.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`,
				time: new Date().toLocaleTimeString("id-ID", {
					hour: "2-digit",
					minute: "2-digit",
				}),
			};
			setNotifications((previous) => [notification, ...previous]);
			toast.success(notification.title, {
				description: notification.description,
			});
		};
		const onDeviceStatus = (data: { deviceId: string; isOnline: boolean }) => {
			const title = data.isOnline
				? "Perangkat kembali online"
				: "Perangkat offline";
			const notification = {
				id: crypto.randomUUID(),
				title,
				description: `Perangkat ${data.deviceId}`,
				time: new Date().toLocaleTimeString("id-ID", {
					hour: "2-digit",
					minute: "2-digit",
				}),
			};
			setNotifications((previous) => [notification, ...previous]);
			(data.isOnline ? toast.success : toast.error)(title, {
				description: notification.description,
			});
		};
		socket.on("onNewLog", onNewLog);
		socket.on("onDeviceStatusChange", onDeviceStatus);
		return () => {
			socket.off("onNewLog", onNewLog);
			socket.off("onDeviceStatusChange", onDeviceStatus);
		};
	}, [socket]);

	return (
		<header className="fixed left-[252px] right-0 top-0 z-30 hidden h-16 items-center justify-between border-b border-border bg-white/95 px-7 backdrop-blur-sm md:flex">
			<form
				onSubmit={(event) => {
					event.preventDefault();
					if (searchQuery.trim()) {
						router.push(
							`/employees?search=${encodeURIComponent(searchQuery.trim())}`,
						);
					}
				}}
				className="flex w-[360px] items-center gap-2 rounded-md border border-border bg-[#f3f6f4] px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10"
			>
				<Search size={16} className="text-[#7b8782]" />
				<input
					aria-label="Cari pegawai"
					className="h-10 w-full border-0 bg-transparent px-1 text-[13px] text-[#14211d] outline-none placeholder:text-[#75827d]"
					placeholder="Cari pegawai..."
					value={searchQuery}
					onChange={(event) => setSearchQuery(event.target.value)}
				/>
			</form>

			<div className="flex items-center gap-2">
				<div
					className={`flex items-center gap-2 border-r border-border pr-4 text-[11px] font-semibold ${isConnected ? "text-[#23734b]" : "text-[#a9433d]"}`}
				>
					<span
						className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-[#1e6a45]" : "bg-[#a63d37]"}`}
					/>
					{isConnected ? "Realtime aktif" : "Realtime terputus"}
				</div>
				<div className="relative">
					<button
						type="button"
						aria-label="Notifikasi"
						aria-expanded={showNotifications}
						onClick={() => setShowNotifications((visible) => !visible)}
						className="relative flex h-9 w-9 items-center justify-center rounded text-[#53605b] hover:bg-[#eef1ee]"
					>
						<Bell size={17} />
						{notifications.length > 0 && (
							<span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#a63d37]" />
						)}
					</button>
					{showNotifications && (
						<div className="absolute right-0 top-11 w-[360px] overflow-hidden rounded-lg border border-border bg-white shadow-[0_20px_54px_rgba(20,33,29,.14)]">
							<div className="flex items-center justify-between border-b border-[#d8deda] px-4 py-3">
								<strong className="text-xs">Notifikasi</strong>
								<button
									type="button"
									onClick={() => setNotifications([])}
									className="text-[10px] font-semibold text-[#086a60]"
								>
									Bersihkan
								</button>
							</div>
							<div className="max-h-80 overflow-y-auto" aria-live="polite">
								{notifications.length === 0 ? (
									<p className="p-6 text-center text-xs text-[#64716c]">
										Belum ada notifikasi.
									</p>
								) : (
									notifications.map((notification) => (
										<div
											key={notification.id}
											className="border-b border-[#e7ebe8] px-4 py-3 last:border-0"
										>
											<p className="text-xs font-semibold">
												{notification.title}
											</p>
											<p className="mt-1 text-[11px] text-[#64716c]">
												{notification.description} · {notification.time}
											</p>
										</div>
									))
								)}
							</div>
						</div>
					)}
				</div>
				<Link
					href="/profile"
					aria-label="Profil"
					className="flex h-9 items-center gap-2 rounded px-2 text-xs font-medium text-[#315c54] hover:bg-[#eef1ee]"
				>
					<span className="flex h-7 w-7 items-center justify-center rounded bg-[#e1eeea] text-[#086a60]">
						<User size={15} />
					</span>
					{user?.name || user?.role || "Profil"}
				</Link>
			</div>
		</header>
	);
}
