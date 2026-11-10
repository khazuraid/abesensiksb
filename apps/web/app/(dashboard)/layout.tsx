import { DesktopHeader } from "@/components/layout/desktop-header";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarOffset } from "@/components/layout/sidebar-offset";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-h-dvh bg-background text-foreground">
			<a href="#main-content" className="skip-link">
				Lewati ke konten
			</a>
			<Sidebar />
			<SidebarOffset>
				<DesktopHeader />
				<main
					id="main-content"
					tabIndex={-1}
					className="app-main min-w-0 flex-1 w-full p-4 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:p-5 md:p-6 md:pb-12"
				>
					{children}
				</main>
			</SidebarOffset>
		</div>
	);
}
