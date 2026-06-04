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
	const queryClient = useQueryClient();
	const { socket, isConnected } = useSocket();

	const { data: stats } = useQuery<DashboardStats>({
		queryKey: ["dashboard-stats"],
		queryFn: async () => (await api.get("/attendance-logs/stats")).data,
		refetchInterval: 10000,
	});

	const { data: recentLogs } = useQuery<RecentLog[]>({
		queryKey: ["dashboard-feed"],
		queryFn: async () => (await api.get("/attendance-logs?limit=8")).data,
		refetchInterval: 5000,
	});

	const { data: devices } = useQuery<Device[]>({
		queryKey: ["dashboard-devices"],
		queryFn: async () => (await api.get("/devices")).data,
		refetchInterval: 15000,
	});

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

	const trendData = [
		{ name: "Mon", present: 42, late: 4, absent: 2 },
		{ name: "Tue", present: 45, late: 2, absent: 1 },
		{ name: "Wed", present: 43, late: 3, absent: 2 },
		{ name: "Thu", present: 46, late: 1, absent: 1 },
		{ name: "Fri", present: 44, late: 4, absent: 0 },
		{ name: "Sat", present: 12, late: 0, absent: 36 },
		{ name: "Sun", present: 10, late: 0, absent: 38 },
	];

	const donutData = [
		{ name: "On Time", value: stats?.presentToday || 40, color: "#006c49" },
		{ name: "Late", value: stats?.lateToday || 5, color: "#ba1a1a" },
		{ name: "Absent", value: 3, color: "#6e797e" },
	];

	const statItems = [
		{
			label: "TOTAL EMPLOYEES",
			value: stats?.totalEmployees ?? "—",
			icon: Users,
			color: "text-[#00647c]",
			highlight: "hover:border-[#00647c]/30",
			iconBg: "bg-[#00647c]/10",
		},
		{
			label: "PRESENT TODAY",
			value: stats?.presentToday ?? "—",
			icon: CheckCircle2,
			color: "text-[#006c49]",
			highlight: "hover:border-[#006c49]/30",
			iconBg: "bg-[#006c49]/10",
		},
		{
			label: "LATE ARRIVALS",
			value: stats?.lateToday ?? "—",
			icon: AlertTriangle,
			color: "text-[#ba1a1a]",
			highlight: "hover:border-[#ba1a1a]/30",
			iconBg: "bg-[#ba1a1a]/10",
		},
		{
			label: "DEVICES ONLINE",
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
			transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} // Custom spring-like easing
			className="space-y-8"
		>
			{/* Page Header */}
			<div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
				<div>
					<h1 className="font-display text-3xl font-bold text-[#111c2d] tracking-tight">
						System Overview
					</h1>
					<p className="font-sans text-sm text-[#6e797e] mt-1">
						Real-time attendance and terminal status.
					</p>
				</div>
				<div className="text-[#6e797e] font-mono text-xs bg-white px-3 py-1.5 rounded-md border border-black/5 flex items-center gap-2 shadow-sm">
					<span className="relative flex h-2 w-2">
						<span
							className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isConnected ? "bg-[#006c49]" : "bg-[#ba1a1a]"} opacity-75`}
						></span>
						<span
							className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? "bg-[#006c49]" : "bg-[#ba1a1a]"}`}
						></span>
					</span>
					{isConnected ? "LIVE UPDATES ACTIVE" : "DISCONNECTED"}
				</div>
			</div>

			{/* Stats Bento Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{statItems.map((stat, i) => (
					<motion.div
						key={stat.label}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: i * 0.05, duration: 0.5, ease: "easeOut" }}
						className={`adms-stat-card group ${stat.highlight}`}
					>
						{/* Ambient Glow */}
						<div
							className="absolute -top-10 -right-10 w-32 h-32 opacity-10 blur-[40px] rounded-full pointer-events-none transition-colors"
							style={{
								backgroundColor: "currentColor",
								color: stat.color.replace("text-[", "").replace("]", ""),
							}}
						></div>

						<div className="w-full flex justify-between items-start mb-6">
							<span className="font-mono text-[10px] tracking-widest text-[#6e797e]">
								{stat.label}
							</span>
							<div
								className={`p-2 rounded-lg border border-black/5 ${stat.iconBg} ${stat.color}`}
							>
								<stat.icon size={18} strokeWidth={2} />
							</div>
						</div>
						<div>
							<div className="font-display text-4xl font-bold text-[#111c2d] mb-1 tracking-tight">
								{stat.value}
							</div>
						</div>
					</motion.div>
				))}
			</div>

			{/* Analytics Section */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
				{/* 7-Day Trend Chart */}
				<div className="lg:col-span-8 adms-card flex flex-col p-0 overflow-hidden bg-white[#1a1f24]">
					<div className="p-6 border-b border-black/5 flex justify-between items-center bg-[#e7eeff]/30[#e7eeff]/5">
						<h2 className="font-display text-lg font-semibold text-[#111c2d][#f9f9ff] flex items-center gap-2">
							<BarChart3 size={18} className="text-[#00647c][#6bd2ff]" />
							Weekly Attendance Trend
						</h2>
					</div>
					<div className="p-6 h-[300px]">
						<ResponsiveContainer width="100%" height="100%">
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
				<div className="lg:col-span-4 adms-card flex flex-col p-0 overflow-hidden bg-white[#1a1f24]">
					<div className="p-6 border-b border-black/5 flex justify-between items-center bg-[#e7eeff]/30[#e7eeff]/5">
						<h2 className="font-display text-lg font-semibold text-[#111c2d][#f9f9ff] flex items-center gap-2">
							<PieChartIcon size={18} className="text-[#00647c][#6bd2ff]" />
							Today's Ratio
						</h2>
					</div>
					<div className="p-6 h-[300px] flex items-center justify-center relative">
						<ResponsiveContainer width="100%" height="100%">
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
									{donutData.map((entry, _index) => (
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
								{stats?.totalEmployees || 48}
							</span>
							<span className="text-xs text-[#6e797e]">Total</span>
						</div>
					</div>
				</div>
			</div>

			{/* Main Content Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
				{/* Activity Feed */}
				<div className="lg:col-span-8 adms-card flex flex-col p-0 overflow-hidden bg-white">
					<div className="p-6 border-b border-black/5 flex justify-between items-center bg-[#e7eeff]/30">
						<h2 className="font-display text-lg font-semibold text-[#111c2d] flex items-center gap-2">
							<Activity size={18} className="text-[#00647c]" />
							Live Attendance Feed
						</h2>
						<button
							type="button"
							className="adms-button-outline !py-1.5 !px-3 !text-xs"
						>
							Filter
						</button>
					</div>

					<div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-black/5 bg-[#e7eeff]/40 font-mono text-[10px] text-[#6e797e] uppercase tracking-wider">
						<div className="col-span-6 md:col-span-4">Employee</div>
						<div className="col-span-3 md:col-span-3 hidden sm:block">
							Timestamp
						</div>
						<div className="hidden md:block col-span-3">Terminal</div>
						<div className="col-span-6 md:col-span-2 text-right sm:text-left">
							Status
						</div>
					</div>

					<div className="flex-1 overflow-y-auto max-h-[420px]">
						{!recentLogs || recentLogs.length === 0 ? (
							<div className="py-12 text-center text-[#6e797e] font-mono text-sm">
								No activity recorded today.
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
												{log.employee?.name || "Unknown"}
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
											{log.device?.name || "Unknown"}
										</span>
									</div>
									<div className="col-span-6 md:col-span-2 flex justify-end sm:justify-start">
										{log.type === "IN" ? (
											<span className="adms-pill-success">
												<CheckCircle2 size={12} /> ON-TIME
											</span>
										) : (
											<span className="adms-pill-neutral">
												<LogOut size={12} /> OUT
											</span>
										)}
									</div>
								</div>
							))
						)}
					</div>
				</div>

				{/* Device Status */}
				<div className="lg:col-span-4 adms-card flex flex-col p-0 overflow-hidden bg-white">
					<div className="p-6 border-b border-black/5 flex justify-between items-center bg-[#e7eeff]/30">
						<h2 className="font-display text-lg font-semibold text-[#111c2d] flex items-center gap-2">
							<Router size={18} className="text-[#00647c]" />
							Device Status
						</h2>
					</div>

					<div className="flex-1 overflow-y-auto max-h-[420px] p-2">
						{!devices || devices.length === 0 ? (
							<div className="py-8 text-center text-[#6e797e] font-mono text-xs">
								No devices registered.
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

					<div className="p-3 border-t border-black/5 text-center bg-[#f9f9ff]">
						<a
							className="font-mono text-[10px] tracking-widest text-[#00647c] hover:text-[#007f9d] transition-colors uppercase font-bold"
							href="/devices"
						>
							View All Devices
						</a>
					</div>
				</div>
			</div>
		</motion.div>
	);
}
