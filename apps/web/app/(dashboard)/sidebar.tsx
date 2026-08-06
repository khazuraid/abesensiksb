"use client";

import { LogOut, Menu, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fallbackRole } from "@/components/app-shell";
import { navigationForRole } from "@/components/navigation";
import api from "@/lib/api";

export function Sidebar() {
	const pathname = usePathname();
	const router = useRouter();
	const [isOpen, setIsOpen] = useState(false);
	const [role, setRole] = useState<"ADMIN" | "HRD" | "USER" | null>(null);

	useEffect(() => {
		api
			.get("/auth/me")
			.then(({ data }) => setRole(fallbackRole(data?.role)))
			.catch(() => router.replace("/login"));
	}, [router]);

	useEffect(() => {
		document.body.style.overflow = isOpen ? "hidden" : "";
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") setIsOpen(false);
		};
		window.addEventListener("keydown", closeOnEscape);
		return () => {
			document.body.style.overflow = "";
			window.removeEventListener("keydown", closeOnEscape);
		};
	}, [isOpen]);

	const handleLogout = async () => {
		await api.post("/auth/logout");
		localStorage.removeItem("user");
		router.push("/login");
		router.refresh();
	};
	const groups = role ? navigationForRole(role) : [];

	return (
		<>
			{isOpen && (
				<button
					type="button"
					aria-label="Tutup navigasi"
					className="fixed inset-0 z-40 bg-black/30 md:hidden"
					onClick={() => setIsOpen(false)}
				/>
			)}
			<aside
				id="primary-navigation"
				className={`fixed inset-y-0 left-0 z-50 flex w-[min(88vw,320px)] flex-col border-r border-border bg-white transition-transform duration-200 md:w-[252px] ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
			>
				<div className="flex h-16 items-center justify-between border-b border-border px-4">
					<Link
						href={role === "USER" ? "/profile" : "/"}
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3"
					>
						<span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-white">
							<User size={19} />
						</span>
						<span>
							<strong className="block text-sm tracking-[-.02em]">ADMS</strong>
							<span className="block text-[11px] font-medium text-[#53635d]">
								Operasi kehadiran
							</span>
						</span>
					</Link>
					<button
						type="button"
						aria-label="Tutup navigasi"
						className="flex h-11 w-11 items-center justify-center rounded text-[#64716c] hover:bg-[#eef1ee] md:hidden"
						onClick={() => setIsOpen(false)}
					>
						<X size={19} />
					</button>
				</div>
				<nav
					className="min-h-0 flex-1 overflow-y-auto px-3 py-5"
					aria-label="Navigasi utama"
				>
					{groups.map((group) => (
						<div key={group.label} className="mb-4">
							<p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[.12em] text-[#53635d]">
								{group.label}
							</p>
							<div className="space-y-1">
								{group.items.map((item) => {
									const active =
										pathname === item.href ||
										(item.href !== "/" && pathname.startsWith(item.href));
									return (
										<Link
											key={item.href}
											href={item.href}
											onClick={() => setIsOpen(false)}
											aria-current={active ? "page" : undefined}
											className={`flex min-h-11 items-center gap-3 rounded-md border-l-2 px-3 text-[13px] font-medium transition-colors ${active ? "border-primary bg-[#dceae5] text-[#05584f]" : "border-transparent text-[#53635d] hover:bg-[#f2f7f4] hover:text-[#14211d]"}`}
										>
											<item.icon size={17} strokeWidth={active ? 2.2 : 1.8} />
											{item.label}
										</Link>
									);
								})}
							</div>
						</div>
					))}
				</nav>
				<div className="border-t border-border p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
					<button
						type="button"
						onClick={handleLogout}
						className="flex min-h-11 w-full items-center gap-3 rounded px-3 text-xs font-medium text-[#a63d37] hover:bg-[#f8eae8]"
					>
						<LogOut size={17} /> Keluar
					</button>
				</div>
			</aside>
			<div className="fixed left-0 right-0 top-0 z-30 flex h-[calc(60px+env(safe-area-inset-top))] items-end justify-between border-b border-border bg-white/95 px-3 pb-2 backdrop-blur-sm md:hidden">
				<button
					type="button"
					aria-label="Buka navigasi"
					aria-controls="primary-navigation"
					aria-expanded={isOpen}
					onClick={() => setIsOpen(true)}
					className="flex h-11 w-11 items-center justify-center rounded border border-[#d8deda] text-[#315c54]"
				>
					<Menu size={19} />
				</button>
				<div className="min-w-0 text-center">
					<strong className="block truncate text-sm">ADMS</strong>
					<span className="block text-[9px] uppercase tracking-[.12em] text-[#64716c]">
						Absensi terpadu
					</span>
				</div>
				<Link
					href="/profile"
					aria-label="Buka profil"
					className="flex h-11 w-11 items-center justify-center rounded border border-[#d8deda] text-[#315c54]"
				>
					<User size={18} />
				</Link>
			</div>
		</>
	);
}
