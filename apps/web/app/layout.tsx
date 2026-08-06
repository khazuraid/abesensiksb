import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { SocketProvider } from "@/providers/socket-provider";
import Providers from "./providers";

export const metadata: Metadata = {
	title: "ADMS | Sistem Absensi",
	description: "Sistem pengelolaan absensi, pegawai, perangkat, dan laporan.",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="id">
			<body>
				<Providers>
					<SocketProvider>{children}</SocketProvider>
					<Toaster
						position="top-right"
						richColors
						closeButton
						mobileOffset={12}
					/>
				</Providers>
			</body>
		</html>
	);
}
