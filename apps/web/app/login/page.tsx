"use client";

import { type Login, LoginSchema } from "@adms/shared-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import Cookies from "js-cookie";
import { ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import api from "@/lib/api";

export default function LoginPage() {
	const router = useRouter();
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<Login>({
		resolver: zodResolver(LoginSchema),
	});

	const onSubmit = async (data: Login) => {
		setIsLoading(true);
		setError("");
		try {
			const res = await api.post("/auth/login", data);

			// Simpan token di Cookie agar bisa dibaca Middleware
			Cookies.set("token", res.data.access_token, { expires: 1 });
			localStorage.setItem("user", JSON.stringify(res.data.user));

			router.push("/");
			router.refresh(); // Refresh untuk trigger middleware
		} catch (err: unknown) {
			const errorData = err as { response?: { data?: { message?: string } } };
			setError(
				errorData.response?.data?.message ||
					"Gagal login. Periksa kembali email dan password.",
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
			{/* Background Decorative Circles */}
			<div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
			<div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-700"></div>

			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				className="w-full max-w-md px-4 relative z-10"
			>
				<div className="glass-card p-10 shadow-2xl">
					<div className="text-center mb-10">
						<div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
							<Lock className="text-primary" size={32} />
						</div>
						<h1 className="text-3xl font-bold tracking-tight">ADMS Portal</h1>
						<p className="text-foreground/60 mt-2">
							Silakan masuk untuk mengelola absensi.
						</p>
					</div>

					{error && (
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-xl mb-6 text-center"
						>
							{error}
						</motion.div>
					)}

					<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
						<div className="space-y-2">
							<label
								htmlFor="email"
								className="text-sm font-medium text-foreground/60 flex items-center gap-2"
							>
								<Mail size={14} /> Email Address
							</label>
							<input
								{...register("email")}
								id="email"
								type="email"
								placeholder="nama@perusahaan.com"
								className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
							/>
							{errors.email && (
								<p className="text-xs text-destructive">
									{errors.email.message}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<label
								htmlFor="password"
								className="text-sm font-medium text-foreground/60 flex items-center gap-2"
							>
								<Lock size={14} /> Password
							</label>
							<input
								{...register("password")}
								id="password"
								type="password"
								placeholder="••••••••"
								className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
							/>
							{errors.password && (
								<p className="text-xs text-destructive">
									{errors.password.message}
								</p>
							)}
						</div>

						<button
							type="submit"
							disabled={isLoading}
							className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
						>
							{isLoading ? (
								<Loader2 size={20} className="animate-spin" />
							) : (
								<>
									Masuk ke Dashboard
									<ArrowRight size={18} />
								</>
							)}
						</button>
					</form>

					<div className="mt-10 text-center">
						<p className="text-xs text-foreground/40 font-medium">
							&copy; 2026 ADMS Attendance Management. <br />
							v1.2.0-stable
						</p>
					</div>
				</div>
			</motion.div>
		</div>
	);
}
