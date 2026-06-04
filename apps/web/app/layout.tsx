import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { SocketProvider } from "@/providers/socket-provider";
import Providers from "./providers";

export const metadata: Metadata = {
	title: "ADMS OS | Quantum",
	description: "Next-Generation Enterprise Workflows",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className="light">
			<body>
				<Providers>
					<SocketProvider>{children}</SocketProvider>
					<Toaster position="top-right" richColors />
				</Providers>
			</body>
		</html>
	);
}
