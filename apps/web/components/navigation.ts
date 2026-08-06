import type { Role } from "@adms/shared-types";
import {
	Calculator,
	CalendarDays,
	CalendarOff,
	ClipboardList,
	Clock3,
	FileSearch,
	FileText,
	LayoutDashboard,
	type LucideIcon,
	Monitor,
	Settings,
	Timer,
	User,
	UserCog,
	Users,
} from "lucide-react";

export type NavigationItem = {
	icon: LucideIcon;
	label: string;
	href: string;
	roles: Role[];
};

export type NavigationGroup = {
	label: string;
	items: NavigationItem[];
};

const allGroups: NavigationGroup[] = [
	{
		label: "Operasional",
		items: [
			{
				icon: LayoutDashboard,
				label: "Ringkasan",
				href: "/",
				roles: ["ADMIN", "HRD"],
			},
			{
				icon: Users,
				label: "Pegawai",
				href: "/employees",
				roles: ["ADMIN", "HRD"],
			},
			{
				icon: Clock3,
				label: "Log Absensi",
				href: "/logs",
				roles: ["ADMIN", "HRD"],
			},
			{
				icon: Monitor,
				label: "Perangkat",
				href: "/devices",
				roles: ["ADMIN", "HRD"],
			},
		],
	},
	{
		label: "Perencanaan",
		items: [
			{ icon: Timer, label: "Shift", href: "/shifts", roles: ["ADMIN", "HRD"] },
			{
				icon: CalendarOff,
				label: "Cuti",
				href: "/leaves",
				roles: ["ADMIN", "HRD"],
			},
			{
				icon: CalendarDays,
				label: "Hari Libur",
				href: "/holidays",
				roles: ["ADMIN", "HRD"],
			},
		],
	},
	{
		label: "Pelaporan",
		items: [
			{
				icon: FileText,
				label: "Laporan",
				href: "/reports",
				roles: ["ADMIN", "HRD"],
			},
			{
				icon: ClipboardList,
				label: "Rekap Harian",
				href: "/daily-recap",
				roles: ["ADMIN", "HRD"],
			},
			{
				icon: Calculator,
				label: "Jasa Pelayanan",
				href: "/jaspel",
				roles: ["ADMIN", "HRD"],
			},
		],
	},
	{
		label: "Administrasi",
		items: [
			{ icon: UserCog, label: "Pengguna", href: "/users", roles: ["ADMIN"] },
			{
				icon: FileSearch,
				label: "Audit Log",
				href: "/audit-logs",
				roles: ["ADMIN"],
			},
			{
				icon: Settings,
				label: "Pengaturan",
				href: "/settings",
				roles: ["ADMIN"],
			},
		],
	},
	{
		label: "Akun",
		items: [
			{
				icon: User,
				label: "Profil",
				href: "/profile",
				roles: ["ADMIN", "HRD", "USER"],
			},
		],
	},
];

export function navigationForRole(role: Role): NavigationGroup[] {
	return allGroups
		.map((group) => ({
			...group,
			items: group.items.filter((item) => item.roles.includes(role)),
		}))
		.filter((group) => group.items.length > 0);
}
