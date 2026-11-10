"use client";

import { type Login, LoginSchema } from "@adms/shared-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Clock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

export default function LoginPage() {
	const router = useRouter();
	const [error, setError] = React.useState("");
	const [isLoading, setIsLoading] = React.useState(false);
	const [showPassword, setShowPassword] = React.useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<Login>({ resolver: zodResolver(LoginSchema) });

	const onSubmit = async (data: Login) => {
		setIsLoading(true);
		setError("");
		try {
			const response = await api.post("/auth/login", data);
			try {
				localStorage.setItem("user", JSON.stringify(response.data.user));
			} catch {}
			router.push("/");
			router.refresh();
		} catch (exception: unknown) {
			const failure = exception as {
				response?: { data?: { message?: string } };
			};
			setError(
				failure.response?.data?.message ??
					"Alamat email atau kata sandi tidak valid.",
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<main className="grid min-h-dvh bg-background text-foreground lg:grid-cols-[minmax(400px,1fr)_minmax(480px,1.2fr)]">
			{/* Left Branding Panel */}
			<section className="relative hidden flex-col justify-between border-r border-border bg-primary p-12 text-primary-foreground lg:flex xl:p-16">
				<div className="text-xs font-mono font-bold uppercase tracking-widest text-primary-foreground/80">
					Sistem Operasional ADMS
				</div>

				<div className="space-y-6">
					<div className="inline-block border border-primary-foreground/30 bg-primary-foreground/10 px-3 py-1 text-xs font-mono font-semibold uppercase tracking-wider text-primary-foreground">
						Portal Presensi Terpadu
					</div>
					<h1 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
						Pusat kendali kehadiran pegawai yang akurat, tertib, dan
						terintegrasi.
					</h1>
					<p className="text-sm leading-relaxed text-primary-foreground/85 max-w-lg">
						Otomasi pencatatan log mesin sidik jari/RFID, verifikasi jadwal
						kerja shift, pengelolaan cuti, dan laporan kehadiran instansi.
					</p>
				</div>

				<div className="text-xs font-mono text-primary-foreground/70">
					ADMS v2.4 · Puskesmas & Layanan Kesehatan
				</div>
			</section>

			{/* Right Login Form Panel */}
			<section className="flex items-center justify-center p-6 md:p-12">
				<div className="w-full max-w-md border border-border bg-card p-8 md:p-10 space-y-6">
					<div>
						<div className="flex h-10 w-10 items-center justify-center border border-primary/30 bg-primary-subtle text-primary mb-4 font-bold">
							<Clock className="h-5 w-5" />
						</div>
						<h2 className="text-2xl font-bold tracking-tight text-foreground">
							Masuk ke Sistem
						</h2>
						<p className="mt-1 text-xs text-muted-foreground">
							Masukkan kredensial akun operator atau staf Anda.
						</p>
					</div>

					{error && (
						<div
							role="alert"
							className="border border-red-200 bg-red-50 p-3 text-xs font-medium text-destructive"
						>
							{error}
						</div>
					)}

					<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
						<div className="space-y-1.5">
							<label
								htmlFor="email"
								className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono"
							>
								Alamat Email
							</label>
							<Input
								{...register("email")}
								id="email"
								type="email"
								autoComplete="email"
								aria-invalid={Boolean(errors.email)}
								placeholder="admin@puskesmas.go.id"
							/>
							{errors.email && (
								<p className="text-xs font-medium text-destructive">
									{errors.email.message}
								</p>
							)}
						</div>

						<div className="space-y-1.5">
							<label
								htmlFor="password"
								className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono"
							>
								Kata Sandi
							</label>
							<div className="relative">
								<Input
									{...register("password")}
									id="password"
									type={showPassword ? "text" : "password"}
									autoComplete="current-password"
									aria-invalid={Boolean(errors.password)}
									placeholder="Masukkan kata sandi"
									className="pr-10"
								/>
								<button
									type="button"
									onClick={() => setShowPassword((prev) => !prev)}
									className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
									aria-label={showPassword ? "Sembunyikan" : "Tampilkan"}
								>
									{showPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</button>
							</div>
							{errors.password && (
								<p className="text-xs font-medium text-destructive">
									{errors.password.message}
								</p>
							)}
						</div>

						<Button
							type="submit"
							variant="primary"
							disabled={isLoading}
							className="w-full h-10 text-sm font-bold gap-2 mt-2"
						>
							{isLoading ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									Memverifikasi...
								</>
							) : (
								<>
									Masuk ke Dashboard
									<ArrowRight className="h-4 w-4" />
								</>
							)}
						</Button>
					</form>
				</div>
			</section>
		</main>
	);
}
