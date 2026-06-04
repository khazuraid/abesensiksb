"use client";

import {
	Bell,
	Headset,
	HelpCircle,
	LogOut,
	Moon,
	Search,
	Settings,
	Sun,
	User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSocket } from "@/providers/socket-provider";

export function Topbar() {
	const router = useRouter();
	const { socket } = useSocket();
	const [searchQuery, setSearchQuery] = useState("");
	const [notifications, setNotifications] = useState<
		{ id: string; title: string; desc: string; time: string }[]
	>([]);
	const [showNotifMenu, setShowNotifMenu] = useState(false);
	const [showProfileMenu, setShowProfileMenu] = useState(false);
	const profileMenuRef = useRef<HTMLDivElement>(null);
	const notifMenuRef = useRef<HTMLDivElement>(null);
	const { theme, setTheme } = useTheme();

	useEffect(() => {
		if (!socket) return;

		/* biome-ignore lint/suspicious/noExplicitAny: generic ws payload */
		const handleNewLog = (data: any) => {
			const notif = {
				id: Math.random().toString(),
				title: `Absen Masuk: ${data.employee?.name || "Karyawan"}`,
				desc: `Telah melakukan absensi pada ${new Date(data.timestamp).toLocaleTimeString()}`,
				time: new Date().toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
				}),
			};
			setNotifications((prev) => [notif, ...prev]);
			toast.success(notif.title, { description: notif.desc });
		};

		const handleDeviceStatus = (data: {
			deviceId: string;
			isOnline: boolean;
		}) => {
			const title = data.isOnline ? "Perangkat Online" : "Perangkat Offline";
			const desc = data.isOnline
				? `Device ID: ${data.deviceId} terhubung kembali.`
				: `Device ID: ${data.deviceId} kehilangan koneksi.`;
			const notif = {
				id: Math.random().toString(),
				title,
				desc,
				time: new Date().toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
				}),
			};
			setNotifications((prev) => [notif, ...prev]);
			if (data.isOnline) {
				toast.success(title, { description: desc });
			} else {
				toast.error(title, { description: desc });
			}
		};

		socket.on("onNewLog", handleNewLog);
		socket.on("onDeviceStatusChange", handleDeviceStatus);

		return () => {
			socket.off("onNewLog", handleNewLog);
			socket.off("onDeviceStatusChange", handleDeviceStatus);
		};
	}, [socket]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				profileMenuRef.current &&
				!profileMenuRef.current.contains(event.target as Node)
			) {
				setShowProfileMenu(false);
			}
			if (
				notifMenuRef.current &&
				!notifMenuRef.current.contains(event.target as Node)
			) {
				setShowNotifMenu(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			router.push(`/employees?search=${encodeURIComponent(searchQuery)}`);
		}
	};

	return (
		<header className="hidden md:flex bg-white/80 text-[#00647c] font-sans text-[14px] fixed top-0 right-0 w-[calc(100%-260px)] h-16 z-40 backdrop-blur-[12px] border-b border-black/5 shadow-sm justify-between items-center px-8">
			{/* Left: Search Bar */}
			<form
				onSubmit={handleSearch}
				className="flex items-center bg-[#dee8ff]/30 border border-black/5 rounded-full px-4 py-1.5 w-[300px] focus-within:border-[#00647c]/50 focus-within:ring-1 focus-within:ring-[#00647c]/50 transition-all shadow-sm"
			>
				<Search size={18} className="text-[#6e797e] mr-2" />
				<input
					className="bg-transparent border-none outline-none text-[13px] text-[#111c2d] w-full placeholder-[#6e797e] focus:ring-0 p-0"
					placeholder="Search logs, employees..."
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
				/>
			</form>

			{/* Right: Actions */}
			<div className="flex items-center gap-2">
				<div className="relative" ref={notifMenuRef}>
					<button
						type="button"
						onClick={() => setShowNotifMenu(!showNotifMenu)}
						className="text-[#3e484d] hover:bg-[#3e484d]/10 transition-colors p-2 rounded-full relative cursor-pointer active:scale-95"
						title="Notifications"
					>
						<Bell size={20} strokeWidth={2} />
						{notifications.length > 0 && (
							<span className="absolute top-2 right-2 w-2 h-2 bg-[#00647c] dark:bg-[#6bd2ff] rounded-full animate-pulse"></span>
						)}
					</button>

					{showNotifMenu && (
						<div className="absolute right-0 mt-2 w-[320px] bg-white border border-black/10 rounded-xl shadow-lg py-1 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
							<div className="px-4 py-3 border-b border-black/5 bg-[#f9f9ff] flex justify-between items-center">
								<h3 className="font-semibold text-[13px] text-[#111c2d]">
									Notifikasi
								</h3>
								{notifications.length > 0 && (
									<button
										type="button"
										onClick={() => setNotifications([])}
										className="text-[11px] text-[#00647c] hover:underline font-medium"
									>
										Tandai sudah dibaca
									</button>
								)}
							</div>
							<div className="max-h-[300px] overflow-y-auto">
								{notifications.length === 0 ? (
									<div className="p-6 text-center text-[#6e797e] text-[13px]">
										Belum ada notifikasi baru
									</div>
								) : (
									notifications.map((notif) => (
										<div
											key={notif.id}
											className="p-3 border-b border-black/5 hover:bg-slate-50 transition-colors"
										>
											<p className="text-[13px] font-semibold text-[#111c2d] leading-tight">
												{notif.title}
											</p>
											<p className="text-[12px] text-[#6e797e] mt-1 line-clamp-2">
												{notif.desc}
											</p>
											<p className="text-[10px] text-[#bdc8ce] mt-1">
												{notif.time}
											</p>
										</div>
									))
								)}
							</div>
						</div>
					)}
				</div>
				<button
					type="button"
					onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
					className="text-[#3e484d] dark:text-[#bfc8cc] hover:bg-[#3e484d]/10 dark:hover:bg-white/10 transition-colors p-2 rounded-full cursor-pointer active:scale-95"
					title="Toggle Theme"
				>
					{theme === "dark" ? (
						<Sun size={20} strokeWidth={2} />
					) : (
						<Moon size={20} strokeWidth={2} />
					)}
				</button>
				<Link href="/settings">
					<button
						type="button"
						className="text-[#3e484d] hover:bg-[#3e484d]/10 transition-colors p-2 rounded-full cursor-pointer active:scale-95"
						title="Settings"
					>
						<Settings size={20} strokeWidth={2} />
					</button>
				</Link>
				<button
					type="button"
					onClick={() => toast.info("Pusat bantuan akan segera tersedia.")}
					className="text-[#3e484d] hover:bg-[#3e484d]/10 transition-colors p-2 rounded-full cursor-pointer active:scale-95"
					title="Help"
				>
					<HelpCircle size={20} strokeWidth={2} />
				</button>

				<div className="w-px h-6 bg-black/5 mx-2"></div>

				<button
					type="button"
					onClick={() =>
						toast.success("Support dihubungi. Silakan tinggalkan pesan.")
					}
					className="flex items-center gap-2 text-[#111c2d] hover:text-[#00647c] hover:bg-[#3e484d]/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer active:scale-95 font-semibold text-[12px]"
				>
					<Headset size={18} />
					Support
				</button>

				{/* Profile Image & Dropdown */}
				<div className="relative ml-2" ref={profileMenuRef}>
					<div
						onClick={() => setShowProfileMenu(!showProfileMenu)}
						className="h-8 w-8 rounded-full bg-[#dee8ff] border border-black/5 overflow-hidden cursor-pointer flex items-center justify-center text-[#00647c] font-bold text-[12px] hover:ring-2 hover:ring-[#00647c]/50 transition-all"
					>
						A
					</div>

					{showProfileMenu && (
						<div className="absolute right-0 mt-2 w-48 bg-white border border-black/10 rounded-xl shadow-lg py-1 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
							<div className="px-4 py-3 border-b border-black/5 mb-1 bg-[#dee8ff]/30">
								<p className="text-[13px] font-bold text-[#00647c]">
									Admin Dashboard
								</p>
								<p className="text-[11px] text-[#6e797e] mt-0.5">
									admin@adms.com
								</p>
							</div>
							<Link href="/profile">
								<button
									type="button"
									onClick={() => setShowProfileMenu(false)}
									className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-[#3e484d] hover:bg-[#dee8ff]/50 hover:text-[#00647c] flex items-center gap-2 transition-colors"
								>
									<User size={15} /> My Profile
								</button>
							</Link>
							<div className="h-px w-full bg-black/5 my-1"></div>
							<button
								type="button"
								onClick={() => {
									setShowProfileMenu(false);
									router.push("/login");
								}}
								className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
							>
								<LogOut size={15} /> Sign Out
							</button>
						</div>
					)}
				</div>
			</div>
		</header>
	);
}
