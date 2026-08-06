import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

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
			<div className="flex min-h-dvh min-w-0 w-full flex-1 flex-col md:ml-[252px] md:pt-16">
				<Topbar />
				<main
					id="main-content"
					tabIndex={-1}
					className="app-main min-w-0 flex-1 w-full p-4 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:p-5 md:p-7 md:pb-12"
				>
					{children}
				</main>
			</div>
		</div>
	);
}
