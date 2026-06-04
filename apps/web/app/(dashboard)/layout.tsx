import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-h-screen relative selection:bg-[#00647c]/30 selection:text-[#00647c] bg-[#f9f9ff]">
			<Sidebar />
			{/* Content Wrapper aligned to right of sidebar */}
			<div className="flex-1 flex flex-col min-h-screen md:ml-[260px] w-full pt-16">
				<Topbar />
				<main className="flex-1 w-full max-w-[1440px] mx-auto p-4 md:p-6 pb-12 relative z-10">
					{children}
				</main>
			</div>
		</div>
	);
}
