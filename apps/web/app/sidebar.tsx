"use client";

import Cookies from "js-cookie";
import {
	Calendar,
	CalendarOff,
	Clock,
	FileText,
	LayoutDashboard,
	LogOut,
	Monitor,
	Settings,
	Timer,
	User,
	Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
	{ icon: LayoutDashboard, label: "Dashboard", href: "/" },
	{ icon: Users, label: "Pegawai", href: "/employees" },
	{ icon: Clock, label: "Log Absensi", href: "/logs" },
	{ icon: Monitor, label: "Perangkat", href: "/devices" },
	{ icon: Timer, label: "Shift", href: "/shifts" },
	{ icon: CalendarOff, label: "Cuti", href: "/leaves" },
	{ icon: Calendar, label: "Hari Libur", href: "/holidays" },
	{ icon: FileText, label: "Laporan", href: "/reports" },
	{ icon: Settings, label: "Pengaturan", href: "/settings" },
];

export function Sidebar() {
	const pathname = usePathname();
	const router = useRouter();

	if (pathname === "/login") return null;

	const handleLogout = () => {
		Cookies.remove("token");
		localStorage.removeItem("user");
		router.push("/login");
		router.refresh();
	};

	return (
		<aside className="glass-sidebar p-4 flex flex-col">
			<div className="mb-8 px-3 pt-2 flex items-center gap-3">
				<div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
					<Clock className="text-primary-foreground" size={20} />
				</div>
				<h1 className="text-lg font-bold tracking-tight">
					ADMS <span className="text-primary">PRO</span>
				</h1>
			</div>

			<nav className="flex-1 space-y-1">
				{navItems.map((item) => {
					const isActive =
						pathname === item.href ||
						(item.href !== "/" && pathname.startsWith(item.href));
					return (
						<Link
							key={item.href}
							href={item.href}
							className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
								isActive
									? "bg-primary/10 text-primary font-semibold shadow-sm shadow-primary/5"
									: "text-foreground/60 hover:bg-white/5 hover:text-foreground"
							}`}
						>
							{isActive && (
								<span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
							)}
							<item.icon
								size={18}
								className={`transition-colors duration-200 ${
									isActive ? "text-primary" : "text-foreground/50 group-hover:text-primary"
								}`}
							/>
							<span className="text-sm">{item.label}</span>
						</Link>
					);
				})}
			</nav>

			<div className="mt-auto border-t border-white/5 pt-4 space-y-1">
				<Link
					href="/profile"
					className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
						pathname === "/profile"
							? "bg-primary/10 text-primary font-semibold"
							: "text-foreground/60 hover:bg-white/5 hover:text-foreground"
					}`}
				>
					{pathname === "/profile" && (
						<span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
					)}
					<User
						size={18}
						className={pathname === "/profile" ? "text-primary" : "text-foreground/50 group-hover:text-primary transition-colors duration-200"}
					/>
					<span className="text-sm">Profil</span>
				</Link>
				<button
					type="button"
					onClick={handleLogout}
					className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl transition-all duration-200 text-foreground/60 hover:bg-destructive/10 hover:text-destructive group"
				>
					<LogOut size={18} className="text-foreground/50 group-hover:text-destructive transition-colors duration-200" />
					<span className="text-sm">Keluar</span>
				</button>
			</div>
		</aside>
	);
}
