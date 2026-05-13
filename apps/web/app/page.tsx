"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
	Activity,
	AlertCircle,
	Monitor,
	TrendingUp,
	UserCheck,
	Users,
} from "lucide-react";
import api from "@/lib/api";

interface DashboardStats {
	totalEmployees: number;
	presentToday: number;
	lateToday: number;
	devicesOnline: number;
	devicesTotal: number;
}

interface RecentLog {
	id: number;
	timestamp: string;
	type: "IN" | "OUT";
	status: string;
	employee?: { name: string; employeeCode: string };
	device?: { name: string; serialNumber: string };
}

interface Device {
	id: number;
	name: string;
	serialNumber: string;
	isOnline: boolean;
	lastSeen: string | null;
}

export default function Dashboard() {
	const { data: stats } = useQuery<DashboardStats>({
		queryKey: ["dashboard-stats"],
		queryFn: async () => (await api.get("/attendance-logs/stats")).data,
		refetchInterval: 10000,
	});

	const { data: recentLogs } = useQuery<RecentLog[]>({
		queryKey: ["dashboard-feed"],
		queryFn: async () => (await api.get("/attendance-logs?limit=5")).data,
		refetchInterval: 5000,
	});

	const { data: devices } = useQuery<Device[]>({
		queryKey: ["dashboard-devices"],
		queryFn: async () => (await api.get("/devices")).data,
		refetchInterval: 15000,
	});

	const statCards = [
		{
			label: "Total Pegawai",
			value: stats?.totalEmployees ?? "-",
			icon: Users,
			color: "text-blue-500",
			bg: "bg-blue-500/10",
		},
		{
			label: "Hadir Hari Ini",
			value: stats?.presentToday ?? "-",
			icon: UserCheck,
			color: "text-emerald-500",
			bg: "bg-emerald-500/10",
		},
		{
			label: "Terlambat",
			value: stats?.lateToday ?? "-",
			icon: AlertCircle,
			color: "text-amber-500",
			bg: "bg-amber-500/10",
		},
		{
			label: "Mesin Online",
			value: stats ? `${stats.devicesOnline}/${stats.devicesTotal}` : "-",
			icon: Monitor,
			color: "text-purple-500",
			bg: "bg-purple-500/10",
		},
	];

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="space-y-10"
		>
			<div>
				<h2 className="text-4xl font-bold tracking-tight">
					Dashboard Overview
				</h2>
				<p className="text-foreground/60 mt-2">
					Selamat datang di panel manajemen ADMS. Data diperbarui otomatis.
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{statCards.map((stat, i) => (
					<motion.div
						key={stat.label}
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: i * 0.1 }}
						className="glass-card p-6 group hover:border-primary/30 transition-all"
					>
						<div className="flex items-center justify-between mb-4">
							<div className={`p-3 rounded-xl ${stat.bg}`}>
								<stat.icon className={stat.color} size={24} />
							</div>
							<TrendingUp size={16} className="text-emerald-500" />
						</div>
						<div className="text-3xl font-bold">{stat.value}</div>
						<div className="text-foreground/60 text-sm font-medium">
							{stat.label}
						</div>
					</motion.div>
				))}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Live Feed */}
				<div className="lg:col-span-2 glass-card">
					<div className="p-6 border-b border-white/5 flex items-center justify-between">
						<h3 className="font-bold flex items-center gap-2">
							<Activity size={18} className="text-primary" />
							Live Attendance Feed
							<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
						</h3>
						<span className="text-xs text-foreground/40">Auto-refresh 5s</span>
					</div>
					<div className="p-6 space-y-6">
						{!recentLogs || recentLogs.length === 0 ? (
							<p className="text-foreground/40 text-center py-8">
								Belum ada log hari ini.
							</p>
						) : (
							recentLogs.map((log) => (
								<div
									key={log.id}
									className="flex items-center justify-between group"
								>
									<div className="flex items-center gap-4">
										<div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-primary text-sm">
											{log.employee?.name?.charAt(0) || "?"}
										</div>
										<div>
											<div className="font-semibold group-hover:text-primary transition-colors">
												{log.employee?.name || "Unknown"}
											</div>
											<div className="text-xs text-foreground/40 font-mono">
												{log.device?.name || log.device?.serialNumber || "-"}
											</div>
										</div>
									</div>
									<div className="text-right">
										<div className="font-bold text-sm">
											{new Date(log.timestamp).toLocaleTimeString("id-ID", {
												hour: "2-digit",
												minute: "2-digit",
											})}
										</div>
										<div
											className={`text-[10px] uppercase tracking-wider font-bold ${log.type === "IN" ? "text-emerald-500" : "text-blue-400"}`}
										>
											{log.type === "IN" ? "Check-In" : "Check-Out"}
										</div>
										{log.status === "LATE" && (
											<div className="text-[10px] text-amber-500 font-bold">
												TERLAMBAT
											</div>
										)}
									</div>
								</div>
							))
						)}
					</div>
				</div>

				{/* Device Status */}
				<div className="space-y-8">
					<div className="glass-card p-6 bg-primary/5 border-primary/20">
						<h3 className="font-bold mb-4 flex items-center gap-2">
							<Monitor size={18} />
							Status Perangkat
						</h3>
						<div className="space-y-4">
							{!devices || devices.length === 0 ? (
								<p className="text-foreground/40 text-sm">
									Belum ada perangkat.
								</p>
							) : (
								devices.map((d) => (
									<div
										key={d.id}
										className="flex items-center justify-between text-sm"
									>
										<span className="text-foreground/60">{d.name}</span>
										<span
											className={`w-2 h-2 rounded-full ${d.isOnline ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-destructive animate-pulse"}`}
										/>
									</div>
								))
							)}
						</div>
					</div>

					<div className="glass-card p-6">
						<h3 className="font-bold mb-4">Shortcut</h3>
						<div className="grid grid-cols-2 gap-3">
							<a
								href="/employees"
								className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all text-center"
							>
								Pegawai
							</a>
							<a
								href="/reports"
								className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all text-center"
							>
								Laporan
							</a>
						</div>
					</div>
				</div>
			</div>
		</motion.div>
	);
}
