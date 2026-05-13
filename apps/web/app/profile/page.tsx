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
	const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

	const { data: user, isLoading } = useQuery({
		queryKey: ["me"],
		queryFn: async () => (await api.get("/auth/me")).data,
	});

	useEffect(() => {
		if (user) setProfileForm({ name: user.name || "", email: user.email || "" });
	}, [user]);

	const updateProfileMutation = useMutation({
		mutationFn: async (data: { name: string; email: string }) => (await api.patch("/auth/profile", data)).data,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
	});

	const changePasswordMutation = useMutation({
		mutationFn: async (data: { currentPassword: string; newPassword: string }) => (await api.patch("/auth/password", data)).data,
		onSuccess: () => setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" }),
	});

	const handleLogout = () => {
		Cookies.remove("token");
		localStorage.removeItem("user");
		router.push("/login");
	};

	if (isLoading) return <div className="flex items-center justify-center min-h-[400px] text-foreground/60 animate-pulse">Memuat profil...</div>;

	return (
		<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">Profil Saya</h2>
					<p className="text-foreground/60 mt-1">Kelola informasi akun dan keamanan.</p>
				</div>
				<button type="button" onClick={handleLogout} className="flex items-center gap-2 bg-destructive/10 text-destructive border border-destructive/20 px-5 py-3 rounded-xl font-semibold hover:bg-destructive hover:text-white transition-all">
					<LogOut size={18} /> Keluar
				</button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
				{/* Sidebar */}
				<div className="space-y-6">
					<div className="glass-card p-6 text-center">
						<div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
							<User className="text-primary" size={40} />
						</div>
						<h3 className="text-xl font-bold">{user?.name}</h3>
						<p className="text-sm text-foreground/50">{user?.email}</p>
						<span className="inline-block mt-2 px-3 py-1 rounded-full text-[10px] uppercase font-bold bg-primary/10 text-primary border border-primary/20">
							{user?.role}
						</span>
					</div>
					<div className="glass-card p-2 space-y-1">
						<button type="button" onClick={() => setTab("profile")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${tab === "profile" ? "bg-primary/10 border border-primary/20 text-primary font-semibold" : "hover:bg-white/5 text-foreground/60"}`}>
							<User size={18} /> Detail Profil
						</button>
						<button type="button" onClick={() => setTab("password")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${tab === "password" ? "bg-primary/10 border border-primary/20 text-primary font-semibold" : "hover:bg-white/5 text-foreground/60"}`}>
							<Lock size={18} /> Ubah Password
						</button>
					</div>
				</div>

				{/* Content */}
				<div className="md:col-span-2">
					{tab === "profile" && (
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 space-y-6">
							<h4 className="text-lg font-bold">Informasi Akun</h4>
							<div className="space-y-4">
								<div>
									<label htmlFor="pname" className="block text-sm font-medium text-foreground/60 mb-1">Nama Lengkap</label>
									<input id="pname" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" />
								</div>
								<div>
									<label htmlFor="pemail" className="block text-sm font-medium text-foreground/60 mb-1"><Mail size={14} className="inline mr-1" />Email</label>
									<input id="pemail" type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" />
								</div>
								<div>
									<label className="block text-sm font-medium text-foreground/60 mb-1"><Shield size={14} className="inline mr-1" />Role</label>
									<div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-foreground/60">{user?.role}</div>
								</div>
							</div>
							<button type="button" onClick={() => updateProfileMutation.mutate(profileForm)} disabled={updateProfileMutation.isPending} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50">
								<Save size={18} /> {updateProfileMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
							</button>
							{updateProfileMutation.isSuccess && <p className="text-emerald-400 text-sm">✅ Profil berhasil diperbarui.</p>}
							{updateProfileMutation.isError && <p className="text-destructive text-sm">❌ Gagal memperbarui profil.</p>}
						</motion.div>
					)}

					{tab === "password" && (
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 space-y-6">
							<h4 className="text-lg font-bold">Ubah Password</h4>
							<div className="space-y-4">
								<div>
									<label htmlFor="curpw" className="block text-sm font-medium text-foreground/60 mb-1">Password Saat Ini</label>
									<input id="curpw" type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" />
								</div>
								<div>
									<label htmlFor="newpw" className="block text-sm font-medium text-foreground/60 mb-1">Password Baru</label>
									<input id="newpw" type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" />
								</div>
								<div>
									<label htmlFor="cfmpw" className="block text-sm font-medium text-foreground/60 mb-1">Konfirmasi Password Baru</label>
									<input id="cfmpw" type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" />
								</div>
							</div>
							{passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
								<p className="text-destructive text-sm">Password baru tidak cocok.</p>
							)}
							<button type="button" onClick={() => changePasswordMutation.mutate({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword })} disabled={changePasswordMutation.isPending || !passwordForm.currentPassword || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50">
								<Lock size={18} /> {changePasswordMutation.isPending ? "Mengubah..." : "Ubah Password"}
							</button>
							{changePasswordMutation.isSuccess && <p className="text-emerald-400 text-sm">✅ Password berhasil diubah.</p>}
							{changePasswordMutation.isError && <p className="text-destructive text-sm">❌ Password lama salah atau gagal mengubah.</p>}
						</motion.div>
					)}
				</div>
			</div>
		</motion.div>
	);
}
