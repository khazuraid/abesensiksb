"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Cookies from "js-cookie";
import { Lock, LogOut, Mail, Save, Shield, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function ProfilePage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [tab, setTab] = useState<"profile" | "password">("profile");
	const [profileForm, setProfileForm] = useState({ name: "", email: "" });
	const [passwordForm, setPasswordForm] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});

	const { data: user, isLoading } = useQuery({
		queryKey: ["me"],
		queryFn: async () => (await api.get("/auth/me")).data,
	});

	useEffect(() => {
		if (user)
			setProfileForm({ name: user.name || "", email: user.email || "" });
	}, [user]);

	const updateProfileMutation = useMutation({
		mutationFn: async (data: { name: string; email: string }) =>
			(await api.patch("/auth/profile", data)).data,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
	});

	const changePasswordMutation = useMutation({
		mutationFn: async (data: {
			currentPassword: string;
			newPassword: string;
		}) => (await api.patch("/auth/password", data)).data,
		onSuccess: () =>
			setPasswordForm({
				currentPassword: "",
				newPassword: "",
				confirmPassword: "",
			}),
	});

	const handleLogout = () => {
		Cookies.remove("token");
		localStorage.removeItem("user");
		router.push("/login");
	};

	if (isLoading)
		return (
			<div className="flex items-center justify-center min-h-[400px] text-[zinc-400] animate-pulse">
				Memuat profil...
			</div>
		);

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="w-full mx-auto space-y-8"
		>
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-3xl font-display font-bold text-slate-900">
						Profil Saya
					</h2>
					<p className="text-slate-500 mt-1">
						Kelola informasi akun dan keamanan.
					</p>
				</div>
				<button
					type="button"
					onClick={handleLogout}
					className="flex items-center gap-2 adms-pill-alert px-5 py-2.5 rounded-lg hover:bg-red-50 transition-all"
				>
					<LogOut size={18} /> Keluar
				</button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
				{/* Sidebar */}
				<div className="space-y-6">
					<div className="adms-card p-6 text-center">
						<div className="w-20 h-20 bg-[#e7eeff] text-[#00647c] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#00647c]/10">
							<User size={40} />
						</div>
						<h3 className="text-xl font-bold text-slate-900">{user?.name}</h3>
						<p className="text-sm text-slate-500">{user?.email}</p>
						<span className="inline-block mt-2 px-3 py-1 rounded-full text-[10px] uppercase font-bold bg-[#e7eeff] text-[#00647c] border border-[#00647c]/10">
							{user?.role}
						</span>
					</div>
					<div className="adms-card p-2 space-y-1">
						<button
							type="button"
							onClick={() => setTab("profile")}
							className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${tab === "profile" ? "bg-[#e7eeff] text-[#00647c] font-semibold" : "hover:bg-slate-50 text-slate-500"}`}
						>
							<User size={18} /> Detail Profil
						</button>
						<button
							type="button"
							onClick={() => setTab("password")}
							className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${tab === "password" ? "bg-[#e7eeff] text-[#00647c] font-semibold" : "hover:bg-slate-50 text-slate-500"}`}
						>
							<Lock size={18} /> Ubah Password
						</button>
					</div>
				</div>

				{/* Content */}
				<div className="md:col-span-2">
					{tab === "profile" && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="adms-card p-6 space-y-6"
						>
							<h4 className="text-lg font-bold text-slate-900">Informasi Akun</h4>
							<div className="space-y-4">
								<div>
									<label
										htmlFor="pname"
										className="block text-sm font-medium text-slate-500 mb-1"
									>
										Nama Lengkap
									</label>
									<input
										id="pname"
										value={profileForm.name}
										onChange={(e) =>
											setProfileForm({ ...profileForm, name: e.target.value })
										}
										className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c]"
									/>
								</div>
								<div>
									<label
										htmlFor="pemail"
										className="block text-sm font-medium text-slate-500 mb-1"
									>
										<Mail size={14} className="inline mr-1" />
										Email
									</label>
									<input
										id="pemail"
										type="email"
										value={profileForm.email}
										onChange={(e) =>
											setProfileForm({ ...profileForm, email: e.target.value })
										}
										className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c]"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-slate-500 mb-1">
										<Shield size={14} className="inline mr-1" />
										Role
									</label>
									<div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-500">
										{user?.role}
									</div>
								</div>
							</div>
							<button
								type="button"
								onClick={() => updateProfileMutation.mutate(profileForm)}
								disabled={updateProfileMutation.isPending}
								className="flex items-center gap-2 adms-button !bg-[#00647c] !text-white hover:!bg-[#007f9d] disabled:opacity-50"
							>
								<Save size={18} />{" "}
								{updateProfileMutation.isPending
									? "Menyimpan..."
									: "Simpan Perubahan"}
							</button>
							{updateProfileMutation.isSuccess && (
								<p className="text-emerald-400 text-sm">
									✅ Profil berhasil diperbarui.
								</p>
							)}
							{updateProfileMutation.isError && (
								<p className="text-red-500 text-sm">
									❌ Gagal memperbarui profil.
								</p>
							)}
						</motion.div>
					)}

					{tab === "password" && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="adms-card p-6 space-y-6"
						>
							<h4 className="text-lg font-bold text-slate-900">Ubah Password</h4>
							<div className="space-y-4">
								<div>
									<label
										htmlFor="curpw"
										className="block text-sm font-medium text-slate-500 mb-1"
									>
										Password Saat Ini
									</label>
									<input
										id="curpw"
										type="password"
										value={passwordForm.currentPassword}
										onChange={(e) =>
											setPasswordForm({
												...passwordForm,
												currentPassword: e.target.value,
											})
										}
										className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c]"
									/>
								</div>
								<div>
									<label
										htmlFor="newpw"
										className="block text-sm font-medium text-slate-500 mb-1"
									>
										Password Baru
									</label>
									<input
										id="newpw"
										type="password"
										value={passwordForm.newPassword}
										onChange={(e) =>
											setPasswordForm({
												...passwordForm,
												newPassword: e.target.value,
											})
										}
										className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c]"
									/>
								</div>
								<div>
									<label
										htmlFor="cfmpw"
										className="block text-sm font-medium text-slate-500 mb-1"
									>
										Konfirmasi Password Baru
									</label>
									<input
										id="cfmpw"
										type="password"
										value={passwordForm.confirmPassword}
										onChange={(e) =>
											setPasswordForm({
												...passwordForm,
												confirmPassword: e.target.value,
											})
										}
										className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#00647c] focus:border-[#00647c]"
									/>
								</div>
							</div>
							{passwordForm.newPassword &&
								passwordForm.confirmPassword &&
								passwordForm.newPassword !== passwordForm.confirmPassword && (
									<p className="text-red-500 text-sm">
										Password baru tidak cocok.
									</p>
								)}
							<button
								type="button"
								onClick={() =>
									changePasswordMutation.mutate({
										currentPassword: passwordForm.currentPassword,
										newPassword: passwordForm.newPassword,
									})
								}
								disabled={
									changePasswordMutation.isPending ||
									!passwordForm.currentPassword ||
									!passwordForm.newPassword ||
									passwordForm.newPassword !== passwordForm.confirmPassword
								}
								className="flex items-center gap-2 adms-button !bg-[#00647c] !text-white hover:!bg-[#007f9d] disabled:opacity-50"
							>
								<Lock size={18} />{" "}
								{changePasswordMutation.isPending
									? "Mengubah..."
									: "Ubah Password"}
							</button>
							{changePasswordMutation.isSuccess && (
								<p className="text-emerald-400 text-sm">
									✅ Password berhasil diubah.
								</p>
							)}
							{changePasswordMutation.isError && (
								<p className="text-red-500 text-sm">
									❌ Password lama salah atau gagal mengubah.
								</p>
							)}
						</motion.div>
					)}
				</div>
			</div>
		</motion.div>
	);
}
