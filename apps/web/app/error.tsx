"use client";

import { useEffect } from "react";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error(error);
	}, [error]);
	return (
		<main className="flex min-h-dvh items-center justify-center bg-background p-6">
			<section className="adms-card max-w-lg p-8 text-center" role="alert">
				<h1 className="text-2xl font-semibold text-[#14211d]">
					Halaman gagal dimuat
				</h1>
				<p className="mt-3 text-sm text-[#64716c]">
					Terjadi kesalahan yang tidak terduga. Data Anda tidak diubah.
				</p>
				<button type="button" onClick={reset} className="adms-button mt-6">
					Coba lagi
				</button>
			</section>
		</main>
	);
}
