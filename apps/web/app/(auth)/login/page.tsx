"use client";

import { type Login, LoginSchema } from "@adms/shared-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import Cookies from "js-cookie";
import { ArrowRight, HeartPulse, Loader2 } from "lucide-react";
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
			Cookies.set("token", res.data.access_token, { expires: 1 });
			localStorage.setItem("user", JSON.stringify(res.data.user));
			router.push("/");
			router.refresh();
		} catch (err: unknown) {
			const errorData = err as { response?: { data?: { message?: string } } };
			setError(
				errorData.response?.data?.message ||
					"Invalid credentials. Please try again.",
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen w-full bg-slate-50 text-slate-900 flex items-center justify-center font-sans p-6 relative overflow-hidden">
			{/* Decorative soft blobs */}
			<div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-slate-200/50 blur-3xl opacity-60 mix-blend-multiply" />
			<div className="absolute bottom-[-10%] right-[-10%] w-[35vw] h-[35vw] rounded-full bg-cyan-200 blur-3xl opacity-20 mix-blend-multiply" />

			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.6, ease: "easeOut" }}
				className="w-full max-w-[420px] bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-100 relative z-10"
			>
				{/* Brand */}
				<div className="text-center mb-10">
					<div className="w-16 h-16 rounded-[1.5rem] bg-[#00647c] mx-auto mb-6 flex items-center justify-center shadow-lg shadow-[#00647c]/30 text-white transform -rotate-6">
						<HeartPulse size={36} strokeWidth={2.5} />
					</div>
					<h1 className="font-display text-[32px] font-bold text-slate-900 mb-2">
						ADMS Login
					</h1>
					<p className="text-[15px] font-medium text-slate-500">
						Sistem Manajemen Absensi & Mesin
					</p>
				</div>

				{error && (
					<div className="bg-red-50 text-red-600 text-[14px] px-4 py-3 rounded-2xl mb-8 font-bold flex items-center gap-2">
						<div className="w-2 h-2 rounded-full bg-red-600" />
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
					<div>
						<label className="block text-[14px] font-bold text-slate-900 mb-2 pl-2">
							Email Address
						</label>
						<input
							{...register("email")}
							id="email"
							type="email"
							className="w-full bg-slate-50 border border-slate-200 py-3.5 px-5 text-[15px] font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00647c] focus:ring-1 focus:ring-[#00647c] transition-all rounded-2xl"
							placeholder="name@company.com"
						/>
						{errors.email && (
							<p className="text-[12px] text-red-600 mt-2 font-bold pl-2">
								{errors.email.message}
							</p>
						)}
					</div>

					<div>
						<label className="block text-[14px] font-bold text-slate-900 mb-2 pl-2">
							Password
						</label>
						<input
							{...register("password")}
							id="password"
							type="password"
							className="w-full bg-slate-50 border border-slate-200 py-3.5 px-5 text-[15px] font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00647c] focus:ring-1 focus:ring-[#00647c] transition-all rounded-2xl"
							placeholder="Enter your secure password"
						/>
						{errors.password && (
							<p className="text-[12px] text-red-600 mt-2 font-bold pl-2">
								{errors.password.message}
							</p>
						)}
					</div>

					<div className="flex justify-between items-center pt-2 pb-4">
						<button
							type="button"
							className="text-[13px] text-slate-500 hover:text-slate-900 transition-colors font-bold pl-2"
						>
							Need help signing in?
						</button>
					</div>

					<button
						type="submit"
						disabled={isLoading}
						className="adms-button w-full !bg-[#00647c] !text-white hover:!bg-[#005266] justify-center text-[16px] py-4 rounded-2xl"
					>
						{isLoading ? (
							<span className="flex items-center gap-3">
								<Loader2 size={20} className="animate-spin" />
								Entering Portal...
							</span>
						) : (
							<>
								<span>Sign In</span>
								<ArrowRight size={20} strokeWidth={2.5} />
							</>
						)}
					</button>
				</form>
			</motion.div>
		</div>
	);
}
