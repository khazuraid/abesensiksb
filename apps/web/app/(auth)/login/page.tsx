"use client";

import { type Login, LoginSchema } from "@adms/shared-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Clock3, Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import api from "@/lib/api";

export default function LoginPage() {
	const router = useRouter();
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
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
			localStorage.setItem("user", JSON.stringify(response.data.user));
			router.push("/");
			router.refresh();
		} catch (exception: unknown) {
			const failure = exception as {
				response?: { data?: { message?: string } };
			};
			setError(
				failure.response?.data?.message ??
					"Email atau kata sandi tidak sesuai.",
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<main className="grid min-h-dvh bg-[#f3f6f4] text-[#14211d] lg:grid-cols-[minmax(380px,.9fr)_minmax(480px,1.1fr)]">
			<section className="relative hidden flex-col justify-between overflow-hidden bg-[#164740] p-12 text-white lg:flex xl:p-16">
				<div
					aria-hidden="true"
					className="absolute inset-x-0 bottom-0 h-px bg-white/20"
				/>
				<div className="text-xs font-semibold uppercase tracking-[.18em] text-white/70">
					Administrasi Kehadiran
				</div>
				<div>
					<p className="mb-4 text-xs font-semibold uppercase tracking-[.16em] text-[#acd8cf]">
						Dinas Kesehatan
					</p>
					<h1 className="max-w-xl text-5xl font-semibold leading-[1.04] tracking-[-.045em] xl:text-6xl">
						Satu pusat kendali untuk absensi yang tertib dan terukur.
					</h1>
					<p className="mt-6 max-w-lg text-base leading-7 text-white/70">
						Pantau pegawai, perangkat, shift, cuti, dan laporan operasional
						dalam satu ruang kerja.
					</p>
				</div>
				<p className="text-xs text-white/70">ADMS · Sistem Absensi Terpadu</p>
			</section>

			<section className="flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:p-6 md:p-12">
				<div className="w-full max-w-[440px] bg-transparent p-2 sm:rounded-lg sm:border sm:border-[#d5ded9] sm:bg-white sm:p-8 md:p-10">
					<div className="mb-9">
						<div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-[#087066] text-white">
							<Clock3 size={22} />
						</div>
						<p className="mb-2 text-[11px] font-semibold uppercase tracking-[.16em] text-[#086a60]">
							Portal operator
						</p>
						<h2 className="text-3xl font-semibold tracking-[-.03em]">
							Masuk ke ADMS
						</h2>
						<p className="mt-2 text-sm text-[#64716c]">
							Gunakan akun yang telah terdaftar.
						</p>
					</div>

					{error && (
						<div
							role="alert"
							className="mb-6 border-l-2 border-[#a63d37] bg-[#f8eae8] px-4 py-3 text-sm text-[#842e29]"
						>
							{error}
						</div>
					)}

					<form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
						<div>
							<label
								htmlFor="email"
								className="mb-2 block text-xs font-semibold"
							>
								Alamat email
							</label>
							<input
								{...register("email")}
								id="email"
								type="email"
								autoComplete="email"
								aria-invalid={Boolean(errors.email)}
								aria-describedby={errors.email ? "email-error" : undefined}
								className="min-h-11 w-full rounded border border-[#b7c1bc] bg-white px-3 text-sm outline-none focus:border-[#086a60] focus:ring-2 focus:ring-[#086a60]/10"
								placeholder="nama@instansi.go.id"
							/>
							{errors.email && (
								<p id="email-error" className="mt-1.5 text-xs text-[#a63d37]">
									{errors.email.message}
								</p>
							)}
						</div>

						<div>
							<label
								htmlFor="password"
								className="mb-2 block text-xs font-semibold"
							>
								Kata sandi
							</label>
							<div className="relative">
								<input
									{...register("password")}
									id="password"
									type={showPassword ? "text" : "password"}
									autoComplete="current-password"
									aria-invalid={Boolean(errors.password)}
									aria-describedby={
										errors.password ? "password-error" : undefined
									}
									className="min-h-11 w-full rounded border border-[#b7c1bc] bg-white py-2 pl-3 pr-12 text-sm outline-none focus:border-[#086a60] focus:ring-2 focus:ring-[#086a60]/10"
									placeholder="Masukkan kata sandi"
								/>
								<button
									type="button"
									onClick={() => setShowPassword((visible) => !visible)}
									aria-label={
										showPassword
											? "Sembunyikan kata sandi"
											: "Tampilkan kata sandi"
									}
									aria-pressed={showPassword}
									className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded text-[#64716c] hover:bg-[#eef1ee] hover:text-[#17211e]"
								>
									{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
								</button>
							</div>
							{errors.password && (
								<p
									id="password-error"
									className="mt-1.5 text-xs text-[#a63d37]"
								>
									{errors.password.message}
								</p>
							)}
						</div>

						<button
							type="submit"
							disabled={isLoading}
							className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded bg-[#087066] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#05584f] active:translate-y-px disabled:opacity-50"
						>
							{isLoading ? (
								<>
									<Loader2 size={17} className="animate-spin" /> Memproses...
								</>
							) : (
								<>
									Masuk <ArrowRight size={17} />
								</>
							)}
						</button>
					</form>
				</div>
			</section>
		</main>
	);
}
