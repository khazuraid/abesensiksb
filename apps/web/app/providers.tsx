"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: { retry: 1, refetchOnWindowFocus: false },
					mutations: {
						onError: (error) => {
							const candidate = error as {
								response?: { data?: { message?: string } };
								message?: string;
							};
							toast.error(
								candidate.response?.data?.message ||
									candidate.message ||
									"Operasi gagal",
							);
						},
					},
				},
			}),
	);

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
