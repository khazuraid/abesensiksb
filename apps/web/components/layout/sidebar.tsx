"use client";

import { LogOut, PanelLeft, PanelLeftClose, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { fallbackRole } from "@/components/app-shell";
import { navigationForRole } from "@/components/navigation";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import api from "@/lib/api";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

export function Sidebar() {
	const pathname = usePathname();
	const router = useRouter();
	const {
		isSidebarCollapsed,
		toggleSidebar,
		setSidebarCollapsed,
		isMobileNavOpen,
		setMobileNavOpen,
	} = useUiStore();
	const [role, setRole] = React.useState<"ADMIN" | "HRD" | "USER" | null>(null);
	const [userName, setUserName] = React.useState<string>("");

	React.useEffect(() => {
		try {
			const saved = localStorage.getItem("adms_sidebar_collapsed");
			if (saved !== null) {
				setSidebarCollapsed(saved === "true");
			}
		} catch {}

		api
			.get("/auth/me")
			.then(({ data }) => {
				setRole(fallbackRole(data?.role));
				setUserName(data?.name ?? "");
			})
			.catch(() => router.replace("/login"));
	}, [router, setSidebarCollapsed]);

	React.useEffect(() => {
		if (isMobileNavOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setMobileNavOpen(false);
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			document.body.style.overflow = "";
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isMobileNavOpen, setMobileNavOpen]);

	const handleLogout = async () => {
		try {
			await api.post("/auth/logout");
		} catch {}
		try {
			localStorage.removeItem("user");
		} catch {}
		router.push("/login");
		router.refresh();
	};

	const groups = role ? navigationForRole(role) : [];

	return (
		<TooltipProvider delayDuration={150}>
			{/* Mobile backdrop */}
			{isMobileNavOpen && (
				<button
					type="button"
					aria-label="Tutup navigasi"
					className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden"
					onClick={() => setMobileNavOpen(false)}
				/>
			)}

			<aside
				id="primary-navigation"
				className={cn(
					"fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-all duration-200 select-none",
					isSidebarCollapsed ? "md:w-16" : "md:w-60",
					isMobileNavOpen
						? "w-[min(85vw,300px)] translate-x-0"
						: "-translate-x-full md:translate-x-0",
				)}
			>
				{/* Header */}
				<div className="flex h-14 items-center justify-between border-b border-border px-3.5">
					<div className="flex items-center gap-2.5 overflow-hidden">
						<div className="flex h-8 w-8 shrink-0 items-center justify-center border border-primary/30 bg-primary-subtle text-primary font-bold text-sm">
							A
						</div>
						{!isSidebarCollapsed && (
							<div className="flex flex-col truncate">
								<span className="text-xs font-bold tracking-tight text-foreground">
									ADMS Absensi
								</span>
								<span className="text-[10px] font-mono text-muted-foreground uppercase">
									{role ?? "Sistem"}
								</span>
							</div>
						)}
					</div>

					{/* Desktop collapse toggle */}
					<button
						type="button"
						onClick={toggleSidebar}
						className="hidden md:flex p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent hover:border-border transition-colors"
						title={isSidebarCollapsed ? "Perluas menu" : "Ciutkan menu"}
					>
						{isSidebarCollapsed ? (
							<PanelLeft className="h-4 w-4" />
						) : (
							<PanelLeftClose className="h-4 w-4" />
						)}
					</button>

					{/* Mobile close */}
					<button
						type="button"
						onClick={() => setMobileNavOpen(false)}
						className="flex md:hidden p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
						aria-label="Tutup"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* Navigation Links */}
				<nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
					{groups.map((group) => (
						<div key={group.label} className="space-y-1">
							{!isSidebarCollapsed ? (
								<p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
									{group.label}
								</p>
							) : (
								<div className="mx-2 my-1 border-t border-border/50" />
							)}

							<div className="space-y-0.5">
								{group.items.map((item) => {
									const Icon = item.icon;
									const isActive =
										item.href === "/"
											? pathname === "/"
											: pathname.startsWith(item.href);

									const linkElement = (
										<Link
											key={item.href}
											href={item.href}
											onClick={() => setMobileNavOpen(false)}
											className={cn(
												"flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium transition-colors border",
												isActive
													? "bg-primary text-primary-foreground border-primary font-semibold"
													: "text-foreground border-transparent hover:bg-muted/80 hover:text-foreground hover:border-border/60",
												isSidebarCollapsed && "justify-center px-0 py-2.5",
											)}
										>
											<Icon className="h-4 w-4 shrink-0" />
											{!isSidebarCollapsed && (
												<span className="truncate">{item.label}</span>
											)}
										</Link>
									);

									if (isSidebarCollapsed) {
										return (
											<Tooltip key={item.href}>
												<TooltipTrigger asChild>{linkElement}</TooltipTrigger>
												<TooltipContent side="right">
													{item.label}
												</TooltipContent>
											</Tooltip>
										);
									}

									return linkElement;
								})}
							</div>
						</div>
					))}
				</nav>

				{/* Footer: User profile & Logout */}
				<div className="border-t border-border p-2 space-y-1">
					{!isSidebarCollapsed && userName && (
						<div className="flex items-center gap-2 px-2.5 py-2">
							<div className="flex h-7 w-7 shrink-0 items-center justify-center border border-border bg-muted text-muted-foreground text-xs font-semibold">
								<User className="h-3.5 w-3.5" />
							</div>
							<div className="flex flex-col truncate">
								<span className="text-xs font-semibold text-foreground truncate">
									{userName}
								</span>
								<span className="text-[10px] font-mono text-muted-foreground">
									Aktif
								</span>
							</div>
						</div>
					)}

					<button
						type="button"
						onClick={handleLogout}
						className={cn(
							"flex w-full items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-destructive transition-colors border border-transparent hover:bg-red-50 hover:border-red-200",
							isSidebarCollapsed && "justify-center px-0 py-2.5",
						)}
					>
						<LogOut className="h-4 w-4 shrink-0" />
						{!isSidebarCollapsed && <span>Keluar</span>}
					</button>
				</div>
			</aside>
		</TooltipProvider>
	);
}
