"use client";

import Cookies from "js-cookie";
import {
	CalendarDays,
	CalendarOff,
	ClipboardList,
	Clock,
	FileText,
	LayoutDashboard,
	LogOut,
	Menu,
	Monitor,
	Settings,
	Timer,
	User,
	Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
	{ icon: LayoutDashboard, label: "Dashboard", href: "/" },
	{ icon: Users, label: "Pegawai", href: "/employees" },
	{ icon: Clock, label: "Log Absensi", href: "/logs" },
	{ icon: Monitor, label: "Perangkat", href: "/devices" },
	{ icon: Timer, label: "Shift", href: "/shifts" },
	{ icon: CalendarOff, label: "Cuti", href: "/leaves" },
	{ icon: CalendarDays, label: "Hari Libur", href: "/holidays" },
	{ icon: FileText, label: "Laporan", href: "/reports" },
	{ icon: ClipboardList, label: "Rekap Harian", href: "/daily-recap" },
	{ icon: Settings, label: "Pengaturan", href: "/settings" },
];

export function Sidebar() {
	const pathname = usePathname();
	const router = useRouter();
	const [isOpen, setIsOpen] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: close sidebar on route change
	useEffect(() => {
		setIsOpen(false);
	}, [pathname]);

	if (pathname === "/login") return null;

	const handleLogout = () => {
		Cookies.remove("token");
		localStorage.removeItem("user");
		router.push("/login");
		router.refresh();
	};

	return (
		<>
			{/* Mobile Backdrop */}
			{isOpen && (
				<div
					className="md:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
					onClick={() => setIsOpen(false)}
				/>
			)}

			{/* SideNavBar Component */}
			<nav
				className={`fixed left-0 top-0 h-full w-[260px] bg-white/95 text-[#00647c] font-semibold text-[12px] backdrop-blur-[12px] border-r border-black/5 shadow-2xl md:shadow-lg flex flex-col py-6 z-50 transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
			>
				{/* Header */}
				<div className="px-6 mb-8 flex items-center gap-2">
					<div className="w-8 h-8 rounded-full bg-[#00647c] flex items-center justify-center text-white">
						<Clock size={18} strokeWidth={2.5} />
					</div>
					<div className="font-display text-[20px] font-black text-[#111c2d] leading-tight">
						ADMS <span className="text-[#006c49]">PRO</span>
					</div>
				</div>

				{/* Navigation Tabs */}
				<div className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
					{navItems.map((item) => {
						const isActive =
							pathname === item.href ||
							(item.href !== "/" && pathname.startsWith(item.href));

						return (
							<Link
								key={item.href}
								href={item.href}
								className={`group flex items-center px-4 py-3 rounded-lg transition-all duration-200 border-l-4 ${
									isActive
										? "bg-[#00647c]/10 text-[#00647c] border-[#00647c] font-bold"
										: "text-[#3e484d] hover:text-[#111c2d] hover:bg-[#dee8ff]/50 border-transparent font-medium"
								}`}
							>
								<item.icon
									size={18}
									strokeWidth={isActive ? 2.5 : 2}
									className={`mr-3 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`}
								/>
								<span className="text-[14px]">{item.label}</span>
							</Link>
						);
					})}
				</div>

				{/* Footer Tabs */}
				<div className="px-4 space-y-1 border-t border-black/5 pt-4 mx-4 mt-4">
					<Link
						href="/profile"
						className="group flex items-center px-4 py-3 rounded-lg text-[#3e484d] hover:text-[#111c2d] hover:bg-[#dee8ff]/50 transition-all duration-200 font-medium"
					>
						<User size={18} strokeWidth={2} className="mr-3" />
						<span className="text-[14px]">Profil</span>
					</Link>

					<button
						type="button"
						onClick={handleLogout}
						className="w-full group flex items-center px-4 py-3 rounded-lg text-[#ba1a1a] hover:bg-[#ba1a1a]/10 transition-all duration-200 font-medium"
					>
						<LogOut size={18} strokeWidth={2} className="mr-3" />
						<span className="text-[14px]">Keluar</span>
					</button>
				</div>
			</nav>

			{/* Mobile Menu Trigger (Visible only on mobile) */}
			<div className="md:hidden fixed top-0 w-full bg-white/95 backdrop-blur-md border-b border-black/5 z-40 px-4 py-3 flex items-center justify-between shadow-sm">
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={() => setIsOpen(true)}
						className="text-[#3e484d] hover:bg-[#3e484d]/10 p-2 rounded-full transition-colors active:scale-95"
					>
						<Menu size={24} />
					</button>
					<div className="font-display text-[18px] font-bold flex items-center gap-2">
						<div className="w-6 h-6 rounded-full bg-[#00647c] flex items-center justify-center text-white">
							<Clock size={14} strokeWidth={2.5} />
						</div>
						<span className="text-[#111c2d]">ADMS</span>{" "}
						<span className="text-[#006c49]">PRO</span>
					</div>
				</div>
			</div>
		</>
	);
}
