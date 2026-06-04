"use client";

import Cookies from "js-cookie";
import {
	Activity,
	CalendarDays,
	HeartPulse,
	LogOut,
	MonitorSmartphone,
	PieChart,
	Settings,
	Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
	{ icon: Activity, label: "Dashboard", href: "/" },
	{ icon: Users, label: "Pegawai", href: "/employees" },
	{ icon: HeartPulse, label: "Log Absensi", href: "/logs" },
	{ icon: MonitorSmartphone, label: "Mesin", href: "/devices" },
	{ icon: CalendarDays, label: "Harian", href: "/daily-recap" },
	{ icon: PieChart, label: "Bulanan", href: "/reports" },
];

export function Navbar() {
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
		<nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl bg-zinc-900/50 backdrop-blur-xl rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex items-center justify-between z-50 px-6 py-3 border border-white/10 ring-1 ring-white/5">
			{/* Brand Logo */}
			<Link href="/" className="flex items-center gap-3 group">
				<div className="w-10 h-10 rounded-2xl bg-zinc-950 flex items-center justify-center text-cyan-400 shadow-inner shadow-white/5 border border-white/10 group-hover:border-cyan-500/30 transition-colors">
					<HeartPulse size={20} strokeWidth={2.5} />
				</div>
				<div className="hidden lg:block">
					<h1 className="font-display text-[18px] font-bold text-zinc-50 leading-none tracking-tight">
						ADMS
					</h1>
					<p className="text-[10px] font-mono text-zinc-500 mt-0.5 tracking-widest uppercase">
						Enterprise
					</p>
				</div>
			</Link>

			{/* Center Navigation Links */}
			<div className="hidden md:flex items-center gap-1.5 p-1.5 rounded-full bg-zinc-950/50 border border-white/5">
				{navItems.map((item) => {
					const isActive =
						pathname === item.href ||
						(item.href !== "/" && pathname.startsWith(item.href));

					return (
						<Link
							key={item.href}
							href={item.href}
							className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 group ${
								isActive
									? "bg-zinc-800 border border-white/10 text-cyan-400 shadow-sm"
									: "text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/50 border border-transparent"
							}`}
						>
							<item.icon
								size={16}
								strokeWidth={isActive ? 2.5 : 1.5}
								className={`transition-transform duration-300 ${isActive ? "scale-110 text-cyan-400" : "group-hover:scale-110"}`}
							/>
							<span
								className={`text-[13px] font-sans tracking-wide ${isActive ? "font-semibold" : "font-medium"}`}
							>
								{item.label}
							</span>
						</Link>
					);
				})}
			</div>

			{/* Right Profile / Actions */}
			<div className="flex items-center gap-2">
				<Link
					href="/settings"
					className="w-10 h-10 rounded-full bg-zinc-950/50 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-zinc-900 transition-all shadow-sm"
				>
					<Settings size={18} strokeWidth={1.5} />
				</Link>
				<div className="w-px h-6 bg-white/10 mx-2"></div>
				<button
					type="button"
					onClick={handleLogout}
					className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-rose-500/10 hover:text-rose-400 text-zinc-400 border border-transparent hover:border-rose-500/20 transition-all font-mono tracking-wider text-[11px] uppercase"
				>
					<LogOut size={16} strokeWidth={1.5} />
					<span className="hidden lg:inline">Logout</span>
				</button>
			</div>
		</nav>
	);
}
