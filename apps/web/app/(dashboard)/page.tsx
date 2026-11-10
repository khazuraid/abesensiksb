"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangle,
	ArrowUpRight,
	BarChart3,
	CheckCircle2,
	Clock,
	LogIn,
	LogOut,
	PieChart as PieChartIcon,
	RefreshCw,
	Router,
	Users,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
	const queryClient = useQueryClient();
	const { socket } = useSocket();

	const { data: stats, refetch: refetchStats } = useQuery<DashboardStats>({
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

	const { data: devicesResponse } = useQuery<{ data: Device[] }>({
		queryKey: ["dashboard-devices"],
		queryFn: async () => (await api.get("/devices?page=1&limit=4")).data,
		refetchInterval: 10000,
	});
	const devices = devicesResponse?.data;

	React.useEffect(() => {
		if (!socket) return;
		const handleRefresh = () => {
			queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard-feed"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard-devices"] });
		};
		socket.on("attendance:new", handleRefresh);
		socket.on("device:status", handleRefresh);
		return () => {
			socket.off("attendance:new", handleRefresh);
			socket.off("device:status", handleRefresh);
		};
	}, [socket, queryClient]);

	const trendData =
		stats?.weeklyTrend && stats.weeklyTrend.length > 0
			? stats.weeklyTrend
			: [
					{ name: "Sen", present: 45, late: 2, absent: 3 },
					{ name: "Sel", present: 48, late: 1, absent: 1 },
					{ name: "Rab", present: 47, late: 3, absent: 0 },
					{ name: "Kam", present: 49, late: 0, absent: 1 },
					{ name: "Jum", present: 46, late: 4, absent: 0 },
					{ name: "Sab", present: 20, late: 1, absent: 0 },
				];

	const present = stats?.presentToday ?? 0;
	const late = stats?.lateToday ?? 0;
	const absent = Math.max(0, (stats?.totalEmployees ?? 0) - present);

	const pieData = [
		{
			name: "Tepat Waktu",
			value: Math.max(0, present - late),
			color: "#047857",
		},
		{ name: "Terlambat", value: late, color: "#b45309" },
		{ name: "Belum Hadir", value: absent, color: "#94a3b8" },
	];

	return (
		<div className="page-shell space-y-6">
			{/* Level 1: Page Header with Status & Refresh */}
			<PageHeader
				title="Ringkasan Eksekutif"
				description="Pemantauan presensi real-time dan status perangkat ADMS hari ini."
				action={
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => refetchStats()}
							className="gap-1.5 text-xs font-mono"
						>
							<RefreshCw className="h-3.5 w-3.5" />
							Perbarui
						</Button>
						<Link href="/reports">
							<Button variant="primary" size="sm" className="gap-1.5 text-xs">
								Lihat Laporan
								<ArrowUpRight className="h-3.5 w-3.5" />
							</Button>
						</Link>
					</div>
				}
			/>

			{/* KPI Stat Cards (Independent Flat Cards, Zero Divide Strips) */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					title="Total Pegawai"
					value={stats?.totalEmployees ?? 0}
					icon={<Users className="h-4 w-4" />}
					description="Pegawai terdaftar aktif"
				/>
				<StatCard
					title="Hadir Hari Ini"
					value={stats?.presentToday ?? 0}
					icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
					description="Check-in tercatat pada sistem"
				/>
				<StatCard
					title="Terlambat"
					value={stats?.lateToday ?? 0}
					icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
					description="Melewati toleransi jam kerja"
				/>
				<StatCard
					title="Perangkat Aktif"
					value={
						stats ? `${stats.devicesOnline} / ${stats.devicesTotal}` : "0 / 0"
					}
					icon={<Router className="h-4 w-4 text-primary" />}
					description="Mesin online dari total terdaftar"
				/>
			</div>

			{/* Charts Section: Strict Flat Aesthetics, Hairline Grids, No Gradients */}
			<div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
				{/* 7-Day Trend Chart */}
				<div className="border border-border bg-card p-5 xl:col-span-8">
					<div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
						<div className="flex items-center gap-2">
							<BarChart3 className="h-4 w-4 text-primary" />
							<h2 className="text-sm font-bold text-foreground">
								Tren Kehadiran Mingguan
							</h2>
						</div>
						<div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
							<span className="flex items-center gap-1.5">
								<span className="h-2 w-2 bg-emerald-600" /> Hadir
							</span>
							<span className="flex items-center gap-1.5">
								<span className="h-2 w-2 bg-amber-600" /> Terlambat
							</span>
						</div>
					</div>

					<div className="h-[260px] w-full">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart
								data={trendData}
								margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
							>
								<CartesianGrid
									strokeDasharray="0"
									vertical={false}
									stroke="#dce3ec"
								/>
								<XAxis
									dataKey="name"
									axisLine={false}
									tickLine={false}
									tick={{
										fontSize: 11,
										fill: "#475569",
										fontFamily: "monospace",
									}}
									dy={8}
								/>
								<YAxis
									axisLine={false}
									tickLine={false}
									tick={{
										fontSize: 11,
										fill: "#475569",
										fontFamily: "monospace",
									}}
								/>
								<Tooltip
									contentStyle={{
										borderRadius: 0,
										border: "1px solid #dce3ec",
										backgroundColor: "#ffffff",
										boxShadow: "none",
										fontSize: "12px",
										fontFamily: "monospace",
									}}
								/>
								<Area
									type="linear"
									dataKey="present"
									name="Hadir"
									stroke="#047857"
									strokeWidth={1.5}
									fill="#ecfdf5"
									fillOpacity={1}
								/>
								<Area
									type="linear"
									dataKey="late"
									name="Terlambat"
									stroke="#b45309"
									strokeWidth={1.5}
									fill="#fffbeb"
									fillOpacity={0.6}
								/>
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</div>

				{/* Distribution Pie Chart */}
				<div className="border border-border bg-card p-5 xl:col-span-4">
					<div className="flex items-center gap-2 border-b border-border/50 pb-3 mb-4">
						<PieChartIcon className="h-4 w-4 text-primary" />
						<h2 className="text-sm font-bold text-foreground">
							Distribusi Kehadiran Hari Ini
						</h2>
					</div>

					<div className="h-[180px] w-full flex items-center justify-center">
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie
									data={pieData}
									cx="50%"
									cy="50%"
									innerRadius={45}
									outerRadius={70}
									paddingAngle={2}
									dataKey="value"
									stroke="#ffffff"
									strokeWidth={2}
								>
									{pieData.map((entry) => (
										<Cell key={entry.name} fill={entry.color} />
									))}
								</Pie>
								<Tooltip
									contentStyle={{
										borderRadius: 0,
										border: "1px solid #dce3ec",
										backgroundColor: "#ffffff",
										boxShadow: "none",
										fontSize: "12px",
										fontFamily: "monospace",
									}}
								/>
							</PieChart>
						</ResponsiveContainer>
					</div>

					<div className="mt-4 space-y-2 border-t border-border/50 pt-3">
						{pieData.map((item) => (
							<div
								key={item.name}
								className="flex items-center justify-between text-xs font-mono"
							>
								<span className="flex items-center gap-2 text-muted-foreground">
									<span
										className="h-2 w-2"
										style={{ backgroundColor: item.color }}
									/>
									{item.name}
								</span>
								<span className="font-bold text-foreground tabular-nums">
									{item.value}
								</span>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Operational Feeds: Live Punch Logs & Devices */}
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
				{/* Recent Attendance Logs Table */}
				<div className="border border-border bg-card p-5 lg:col-span-8">
					<div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
						<div className="flex items-center gap-2">
							<Clock className="h-4 w-4 text-primary" />
							<h2 className="text-sm font-bold text-foreground">
								Feed Presensi Real-Time
							</h2>
						</div>
						<Link
							href="/logs"
							className="text-xs font-semibold text-primary hover:underline"
						>
							Lihat Semua Log →
						</Link>
					</div>

					{recentLogs && recentLogs.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Pegawai</TableHead>
									<TableHead>Waktu</TableHead>
									<TableHead>Tipe</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Perangkat</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{recentLogs.map((log) => {
									const isLate = log.status === "LATE";
									const isIn = log.type === "IN";
									return (
										<TableRow key={log.id}>
											<TableCell>
												<div className="flex flex-col">
													<span className="font-medium text-foreground">
														{log.employee?.name ?? "Pegawai"}
													</span>
													<span className="text-[11px] font-mono text-muted-foreground">
														{log.employee?.employeeCode ?? "—"}
													</span>
												</div>
											</TableCell>
											<TableCell className="font-mono text-xs text-muted-foreground">
												{new Date(log.timestamp).toLocaleTimeString("id-ID", {
													hour: "2-digit",
													minute: "2-digit",
													second: "2-digit",
												})}
											</TableCell>
											<TableCell>
												<Badge
													variant={isIn ? "success" : "secondary"}
													className="gap-1 font-mono text-[10px]"
												>
													{isIn ? (
														<LogIn className="h-3 w-3" />
													) : (
														<LogOut className="h-3 w-3" />
													)}
													{isIn ? "MASUK" : "KELUAR"}
												</Badge>
											</TableCell>
											<TableCell>
												<Badge
													variant={isLate ? "warning" : "success"}
													className="font-mono text-[10px]"
												>
													{isLate ? "TERLAMBAT" : "TEPAT"}
												</Badge>
											</TableCell>
											<TableCell className="text-xs text-muted-foreground font-mono">
												{log.device?.name ?? "Mesin ADMS"}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					) : (
						<div className="py-8 text-center text-xs text-muted-foreground">
							Belum ada riwayat presensi hari ini.
						</div>
					)}
				</div>

				{/* Device Health Status */}
				<div className="border border-border bg-card p-5 lg:col-span-4">
					<div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
						<div className="flex items-center gap-2">
							<Router className="h-4 w-4 text-primary" />
							<h2 className="text-sm font-bold text-foreground">
								Status Mesin ADMS
							</h2>
						</div>
						<Link
							href="/devices"
							className="text-xs font-semibold text-primary hover:underline"
						>
							Kelola →
						</Link>
					</div>

					<div className="space-y-3">
						{devices && devices.length > 0 ? (
							devices.map((device) => (
								<div
									key={device.id}
									className="flex items-center justify-between border border-border p-3 transition-colors hover:bg-muted/40"
								>
									<div className="flex flex-col">
										<span className="text-xs font-bold text-foreground">
											{device.name}
										</span>
										<span className="text-[10px] font-mono text-muted-foreground">
											SN: {device.serialNumber}
										</span>
									</div>
									<Badge
										variant={device.isOnline ? "success" : "destructive"}
										className="text-[10px] font-mono"
									>
										{device.isOnline ? "ONLINE" : "OFFLINE"}
									</Badge>
								</div>
							))
						) : (
							<div className="py-6 text-center text-xs text-muted-foreground">
								Tidak ada data perangkat.
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
