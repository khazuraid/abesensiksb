import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import { Sidebar } from "./sidebar";

export const metadata: Metadata = {
	title: "ADMS Attendance System",
	description: "Premium Attendance Management System",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className="dark">
			<body className="font-sans bg-background text-foreground antialiased">
				<Providers>
					<div className="flex min-h-screen">
						<Sidebar />
						<main className="flex-1 md:ml-64 p-8">{children}</main>
					</div>
				</Providers>
			</body>
		</html>
	);
}
