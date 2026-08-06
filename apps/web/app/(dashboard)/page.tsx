"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
	Activity,
	AlertTriangle,
	BarChart3,
	CheckCircle2,
	LogIn,
	LogOut,
	PieChart as PieChartIcon,
	Router,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import api from "@/lib/api";
import { useSocket } from "@/providers/socket-provider";

interface DashboardStats {
	totalEmployees: number;
	presentToday: number;
	lateToday: number;
	devicesOnline: number;
	devicesTotal: number;
	weeklyTrend?: {
		name: string;
		present: number;
		late: number;
		absent: number;
	}[];
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
	const router = useRouter();
	const queryClient = useQueryClient();
	const { socket, isConnected } = useSocket();

	const { data: stats } = useQuery<DashboardStats>({
		queryKey: ["dashboard-stats"],
		queryFn: async () => (await api.get("/attendance-logs/stats")).data,
		refetchInterval: 10000,
	});

	const { data: recentLogResponse } = useQuery<{ data: RecentLog[] }>({
		queryKey: ["dashboard-feed"],
		queryFn: async () =>
			(await api.get("/attendance-logs?page=1&limit=8")).data,
		refetchInterval: 5000,
	});
	const recentLogs = recentLogResponse?.data;

	const { data: deviceResponse } = useQuery<{ data: Device[] }>({
		queryKey: ["dashboard-devices"],
		queryFn: async () => (await api.get("/devices?page=1&limit=10")).data,
		refetchInterval: 15000,
	});
	const devices = deviceResponse?.data;

	useEffect(() => {
		if (!socket) return;

		const handleNewLog = () => {
			queryClient.invalidateQueries({ queryKey: ["dashboard-feed"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
		};

		socket.on("onNewLog", handleNewLog);
		return () => {
			socket.off("onNewLog", handleNewLog);
		};
	}, [socket, queryClient]);

	const trendData = stats?.weeklyTrend || [
		{ name: "Sen", present: 0, late: 0, absent: 0 },
		{ name: "Sel", present: 0, late: 0, absent: 0 },
		{ name: "Rab", present: 0, late: 0, absent: 0 },
		{ name: "Kam", present: 0, late: 0, absent: 0 },
		{ name: "Jum", present: 0, late: 0, absent: 0 },
		{ name: "Sab", present: 0, late: 0, absent: 0 },
		{ name: "Min", present: 0, late: 0, absent: 0 },
	];

	const present = stats?.presentToday ?? 0;
	const late = stats?.lateToday ?? 0;
	const absent = Math.max((stats?.totalEmployees ?? 0) - present - late, 0);
	const donutData = [
		{ name: "Tepat waktu", value: present, color: "#1e6a45" },
		{ name: "Terlambat", value: late, color: "#a63d37" },
		{ name: "Belum hadir", value: absent, color: "#87938e" },
	];

	const statItems = [
		{
			label: "TOTAL PEGAWAI",
			value: stats?.totalEmployees ?? "—",
			icon: Users,
			color: "text-[#00647c]",
			highlight: "hover:border-[#00647c]/30",
			iconBg: "bg-[#00647c]/10",
		},
		{
			label: "HADIR HARI INI",
			value: stats?.presentToday ?? "—",
			icon: CheckCircle2,
			color: "text-[#006c49]",
			highlight: "hover:border-[#006c49]/30",
			iconBg: "bg-[#006c49]/10",
		},
		{
			label: "TERLAMBAT",
			value: stats?.lateToday ?? "—",
			icon: AlertTriangle,
			color: "text-[#ba1a1a]",
			highlight: "hover:border-[#ba1a1a]/30",
			iconBg: "bg-[#ba1a1a]/10",
		},
		{
			label: "PERANGKAT AKTIF",
			value: stats ? `${stats.devicesOnline}/${stats.devicesTotal}` : "—",
			icon: Router,
			color: "text-[#00647c]",
			highlight: "hover:border-[#00647c]/30",
			iconBg: "bg-[#00647c]/10",
		},
	];

	return (
		<motion.div
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.25, ease: "easeOut" }}
			className="page-shell"
		>
			{/* Page Header */}
			<div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
				<div>
					<h1 className="font-display text-3xl font-bold text-[#111c2d] tracking-tight">
						Ringkasan Operasional
					</h1>
					<p className="font-sans text-sm text-[#6e797e] mt-1">
						Pantau kehadiran dan status perangkat hari ini.
					</p>
				</div>
				<div
					className={`flex min-h-11 items-center gap-2 rounded border px-3 text-xs font-semibold ${isConnected ? "border-[#a8c9ba] bg-[#e8f3ec] text-[#1e6a45]" : "border-[#e1b4b0] bg-[#f8eae8] text-[#a63d37]"}`}
				>
					<span className="relative flex h-2 w-2">
						<span
							className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isConnected ? "bg-[#006c49]" : "bg-[#ba1a1a]"} opacity-75`}
						></span>
						<span
							className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? "bg-[#006c49]" : "bg-[#ba1a1a]"}`}
						></span>
					</span>
					{isConnected
						? "Pembaruan langsung aktif"
						: "Pembaruan langsung terputus"}
				</div>
			</div>

			{/* Stats Bento Grid */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{statItems.map((stat, i) => (
					<motion.div
						key={stat.label}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: i * 0.05, duration: 0.5, ease: "easeOut" }}
						className={`adms-stat-card group relative overflow-hidden ${stat.highlight}`}
					>
						<div className="mb-4 flex w-full items-start justify-between">
							<span className="text-[10px] font-bold tracking-[.1em] text-[#53605b]">
								{stat.label}
							</span>
							<div
								className={`rounded border border-[#d8deda] p-2 ${stat.iconBg} ${stat.color}`}
							>
								<stat.icon size={18} strokeWidth={2} />
							</div>
						</div>
						<div>
							<div className="font-display text-4xl font-bold text-[#17211e] tracking-tight tabular-nums">
								{stat.value}
							</div>
						</div>
					</motion.div>
				))}
			</div>

			{/* Analytics Section */}
			<div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-12">
				{/* 7-Day Trend Chart */}
				<div className="adms-card flex min-w-0 flex-col overflow-hidden p-0 xl:col-span-8">
					<div className="flex items-center border-b border-[#d8deda] bg-[#eef1ee] px-5 py-4">
						<h2 className="flex items-center gap-2 !text-base">
							<BarChart3 size={18} className="text-[#086a60]" />
							Tren Kehadiran Mingguan
						</h2>
					</div>
					<div className="p-6 h-[300px]">
						<ResponsiveContainer width="100%" height={252}>
							<AreaChart
								data={trendData}
								margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
							>
								<defs>
									<linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#006c49" stopOpacity={0.3} />
										<stop offset="95%" stopColor="#006c49" stopOpacity={0} />
									</linearGradient>
								</defs>
								<CartesianGrid
									strokeDasharray="3 3"
									vertical={false}
									stroke="#e2e8f0"
								/>
								<XAxis
									dataKey="name"
									axisLine={false}
									tickLine={false}
									tick={{ fontSize: 12, fill: "#6e797e" }}
									dy={10}
								/>
								<YAxis
									axisLine={false}
									tickLine={false}
									tick={{ fontSize: 12, fill: "#6e797e" }}
								/>
								<Tooltip
									contentStyle={{
										borderRadius: "12px",
										border: "1px solid rgba(0,0,0,0.05)",
										boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
									}}
								/>
								<Area
									type="monotone"
									dataKey="present"
									stroke="#006c49"
									strokeWidth={3}
									fillOpacity={1}
									fill="url(#colorPresent)"
								/>
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</div>

				{/* Today's Ratio Donut */}
				<div className="adms-card flex min-w-0 flex-col overflow-hidden p-0 xl:col-span-4">
					<div className="flex items-center border-b border-[#d8deda] bg-[#eef1ee] px-5 py-4">
						<h2 className="flex items-center gap-2 !text-base">
							<PieChartIcon size={18} className="text-[#086a60]" />
							Komposisi Kehadiran
						</h2>
					</div>
					<div className="p-6 h-[300px] flex items-center justify-center relative">
						<ResponsiveContainer width="100%" height={252}>
							<PieChart>
								<Pie
									data={donutData}
									cx="50%"
									cy="50%"
									innerRadius={70}
									outerRadius={100}
									paddingAngle={5}
									dataKey="value"
									stroke="none"
								>
									{donutData.map((entry) => (
										<Cell key={`cell-${entry.name}`} fill={entry.color} />
									))}
								</Pie>
								<Tooltip
									contentStyle={{
										borderRadius: "12px",
										border: "1px solid rgba(0,0,0,0.05)",
										boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
									}}
								/>
							</PieChart>
						</ResponsiveContainer>
						<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
							<span className="text-3xl font-bold text-[#111c2d]">
								{stats?.totalEmployees ?? 0}
							</span>
							<span className="text-xs text-[#64716c]">Pegawai</span>
						</div>
					</div>
				</div>
			</div>

			{/* Main Content Grid */}
			<div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-12">
				{/* Activity Feed */}
				<div className="adms-card flex min-w-0 flex-col overflow-hidden p-0 xl:col-span-8">
					<div className="flex items-center justify-between border-b border-[#d8deda] bg-[#eef1ee] px-5 py-4">
						<h2 className="flex items-center gap-2 !text-base">
							<Activity size={18} className="text-[#00647c]" />
							Aktivitas Kehadiran Terbaru
						</h2>
						<button
							type="button"
							onClick={() => router.push("/logs")}
							className="adms-button-outline !py-1.5 !px-3 !text-xs"
						>
							Lihat log
						</button>
					</div>

					<div className="grid grid-cols-12 gap-4 border-b border-[#d8deda] bg-[#f4f5f2] px-5 py-3 text-[10px] font-bold uppercase tracking-[.08em] text-[#53605b]">
						<div className="col-span-6 md:col-span-4">Pegawai</div>
						<div className="col-span-3 md:col-span-3 hidden sm:block">
							Waktu
						</div>
						<div className="hidden md:block col-span-3">Perangkat</div>
						<div className="col-span-6 md:col-span-2 text-right sm:text-left">
							Jenis
						</div>
					</div>

					<div className="flex-1 overflow-y-auto max-h-[420px]">
						{!recentLogs || recentLogs.length === 0 ? (
							<div className="py-12 text-center text-sm text-[#64716c]">
								Belum ada aktivitas hari ini.
							</div>
						) : (
							recentLogs.map((log) => (
								<div
									key={log.id}
									className="grid grid-cols-12 gap-4 px-6 py-3.5 border-b border-black/5 hover:bg-[#e7eeff]/50 transition-colors items-center group cursor-pointer"
								>
									<div className="col-span-6 md:col-span-4 flex items-center gap-3">
										<div className="w-8 h-8 rounded-full bg-[#f9f9ff] border border-black/5 flex items-center justify-center text-xs text-[#3e484d] font-bold shrink-0 shadow-sm">
											{log.employee?.name?.[0] || "?"}
										</div>
										<div className="truncate">
											<div className="font-sans text-sm font-medium text-[#111c2d] truncate">
												{log.employee?.name || "Tidak diketahui"}
											</div>
											<div className="font-mono text-[10px] text-[#6e797e]">
												{log.employee?.employeeCode || "N/A"}
											</div>
										</div>
									</div>
									<div className="col-span-3 md:col-span-3 hidden sm:flex font-mono text-xs text-[#111c2d] items-center gap-2">
										{new Date(log.timestamp).toLocaleTimeString("en-US", {
											hour: "2-digit",
											minute: "2-digit",
											second: "2-digit",
											hour12: false,
										})}
									</div>
									<div className="hidden md:flex col-span-3 items-center gap-2 text-[#6e797e] font-sans text-xs">
										{log.type === "IN" ? (
											<LogIn size={14} />
										) : (
											<LogOut size={14} />
										)}
										<span className="truncate">
											{log.device?.name || "Tidak diketahui"}
										</span>
									</div>
									<div className="col-span-6 md:col-span-2 flex justify-end sm:justify-start">
										{log.type === "IN" ? (
											<span className="adms-pill-success">
												<CheckCircle2 size={12} /> MASUK
											</span>
										) : (
											<span className="adms-pill-neutral">
												<LogOut size={12} /> KELUAR
											</span>
										)}
									</div>
								</div>
							))
						)}
					</div>
				</div>

				{/* Device Status */}
				<div className="adms-card flex min-w-0 flex-col overflow-hidden p-0 xl:col-span-4">
					<div className="flex items-center border-b border-[#d8deda] bg-[#eef1ee] px-5 py-4">
						<h2 className="flex items-center gap-2 !text-base">
							<Router size={18} className="text-[#00647c]" />
							Status Perangkat
						</h2>
					</div>

					<div className="flex-1 overflow-y-auto max-h-[420px] p-2">
						{!devices || devices.length === 0 ? (
							<div className="py-8 text-center text-xs text-[#64716c]">
								Belum ada perangkat terdaftar.
							</div>
						) : (
							devices.map((d) => (
								<div
									key={d.id}
									className={`flex items-center justify-between p-3 rounded-lg mb-1 transition-colors border border-transparent ${d.isOnline ? "hover:bg-[#e7eeff]/50 hover:border-black/5" : "bg-[#ba1a1a]/5 hover:bg-[#ba1a1a]/10 border-[#ba1a1a]/10"}`}
								>
									<div className="flex items-center gap-3">
										<div
											className={`p-2 rounded border ${d.isOnline ? "bg-[#e7eeff] border-black/5 text-[#00647c]" : "bg-white border-[#ba1a1a]/30 text-[#ba1a1a]"}`}
										>
											<Router size={16} />
										</div>
										<div>
											<div
												className={`font-sans text-sm font-semibold ${d.isOnline ? "text-[#111c2d]" : "text-[#ba1a1a]"}`}
											>
												{d.name}
											</div>
											<div className="font-mono text-[10px] text-[#6e797e]">
												SN: {d.serialNumber}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<span className="relative flex h-2 w-2">
											<span
												className={`animate-ping absolute inline-flex h-full w-full rounded-full ${d.isOnline ? "bg-[#006c49]" : "hidden"} opacity-75`}
											></span>
											<span
												className={`relative inline-flex rounded-full h-2 w-2 ${d.isOnline ? "bg-[#006c49]" : "bg-[#ba1a1a]"}`}
											></span>
										</span>
										<span
											className={`font-mono text-[10px] font-bold ${d.isOnline ? "text-[#006c49]" : "text-[#ba1a1a]"}`}
										>
											{d.isOnline ? "ONLINE" : "OFFLINE"}
										</span>
									</div>
								</div>
							))
						)}
					</div>

					<div className="border-t border-[#d8deda] bg-[#f4f5f2] p-3 text-center">
						<Link
							className="text-[10px] font-bold uppercase tracking-[.1em] text-[#086a60] hover:text-[#04534b]"
							href="/devices"
						>
							Lihat semua perangkat
						</Link>
					</div>
				</div>
			</div>
		</motion.div>
	);
}
