"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	KeyRound,
	Loader2,
	Lock,
	LogOut,
	Save,
	User as UserIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [tab, setTab] = React.useState<"profile" | "password">("profile");
	const [profileForm, setProfileForm] = React.useState<{
		name?: string;
		email?: string;
	}>({});
	const [passwordForm, setPasswordForm] = React.useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});

	const { data: user, isLoading } = useQuery({
		queryKey: ["me"],
		queryFn: async () => (await api.get("/auth/me")).data,
	});

	React.useEffect(() => {
		if (user) {
			setProfileForm({
				name: user.name || "",
				email: user.email || "",
			});
		}
	}, [user]);

	const updateProfileMutation = useMutation({
		mutationFn: async (data: { name: string; email: string }) =>
			(await api.patch("/auth/profile", data)).data,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["me"] });
			toast.success("Profil akun berhasil diperbarui");
		},
		onError: (err: any) => {
			toast.error(err.response?.data?.message || "Gagal memperbarui profil");
		},
	});

	const changePasswordMutation = useMutation({
		mutationFn: async (data: {
			currentPassword: string;
			newPassword: string;
		}) => (await api.patch("/auth/password", data)).data,
		onSuccess: () => {
			setPasswordForm({
				currentPassword: "",
				newPassword: "",
				confirmPassword: "",
			});
			toast.success("Kata sandi berhasil diubah");
		},
		onError: (err: any) => {
			toast.error(err.response?.data?.message || "Gagal mengubah kata sandi");
		},
	});

	const handleLogout = async () => {
		try {
			await api.post("/auth/logout");
		} catch {}
		try {
			localStorage.removeItem("user");
		} catch {}
		router.push("/login");
		router.refresh();
	};

	if (isLoading) {
		return (
			<div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
				<Loader2 className="h-4 w-4 animate-spin mr-2" />
				Memuat data profil...
			</div>
		);
	}

	return (
		<div className="page-shell space-y-6">
			{/* Level 1: Page Header */}
			<PageHeader
				title="Profil & Keamanan Akun"
				description="Kelola informasi identitas akun pribadi, ubah kata sandi, dan status hak akses Anda."
				action={
					<Button
						variant="destructive"
						size="sm"
						onClick={handleLogout}
						className="gap-1.5"
					>
						<LogOut className="h-4 w-4" />
						Keluar Sistem
					</Button>
				}
			/>

			{/* 2-Column Single-Route Layout */}
			<div className="grid grid-cols-1 md:grid-cols-12 gap-6">
				{/* Left Column: Account Summary & Tab Navigation */}
				<div className="md:col-span-4 space-y-4">
					{/* Account ID Card */}
					<div className="border border-border bg-card p-5 space-y-4">
						<div className="flex items-center gap-3">
							<div className="flex h-12 w-12 items-center justify-center border border-border bg-muted/60 font-bold text-foreground">
								<UserIcon className="h-6 w-6 text-primary" />
							</div>
							<div className="min-w-0 flex-1">
								<h2 className="text-sm font-bold text-foreground truncate">
									{user?.name || "Pengguna Sistem"}
								</h2>
								<p className="text-xs font-mono text-muted-foreground truncate">
									{user?.email || "—"}
								</p>
							</div>
						</div>

						<div className="border-t border-border/70 pt-3 flex items-center justify-between">
							<span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
								Tingkat Akses
							</span>
							<Badge
								variant={
									user?.role === "ADMIN"
										? "success"
										: user?.role === "HRD"
											? "info"
											: "secondary"
								}
								className="text-[10px]"
							>
								{user?.role || "USER"}
							</Badge>
						</div>
					</div>

					{/* Navigation Tabs */}
					<div className="border border-border bg-card p-2 space-y-1">
						<button
							type="button"
							onClick={() => setTab("profile")}
							className={cn(
								"flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold text-left transition-colors border",
								tab === "profile"
									? "border-primary bg-primary text-primary-foreground"
									: "border-transparent text-foreground hover:bg-muted",
							)}
						>
							<UserIcon className="h-4 w-4 shrink-0" />
							<span>Informasi Profil</span>
						</button>

						<button
							type="button"
							onClick={() => setTab("password")}
							className={cn(
								"flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold text-left transition-colors border",
								tab === "password"
									? "border-primary bg-primary text-primary-foreground"
									: "border-transparent text-foreground hover:bg-muted",
							)}
						>
							<KeyRound className="h-4 w-4 shrink-0" />
							<span>Ubah Kata Sandi</span>
						</button>
					</div>
				</div>

				{/* Right Column: Form Panels */}
				<div className="md:col-span-8 border border-border bg-card p-6">
					{tab === "profile" && (
						<div className="space-y-5">
							<div className="border-b border-border/60 pb-3">
								<h3 className="text-sm font-bold text-foreground">
									Informasi Akun
								</h3>
								<p className="text-xs text-muted-foreground">
									Perbarui nama lengkap dan email resmi yang terdaftar pada
									sistem.
								</p>
							</div>

							<div className="space-y-4">
								<div className="space-y-1.5">
									<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
										Nama Lengkap
									</label>
									<Input
										value={profileForm.name ?? ""}
										onChange={(e) =>
											setProfileForm({ ...profileForm, name: e.target.value })
										}
										placeholder="Nama lengkap Anda"
									/>
								</div>

								<div className="space-y-1.5">
									<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
										Alamat Email
									</label>
									<Input
										type="email"
										value={profileForm.email ?? ""}
										onChange={(e) =>
											setProfileForm({ ...profileForm, email: e.target.value })
										}
										placeholder="nama@puskesmas.go.id"
									/>
								</div>

								<div className="pt-2">
									<Button
										variant="primary"
										size="sm"
										onClick={() => {
											if (!profileForm.name || !profileForm.email) {
												toast.error("Nama dan email wajib diisi");
												return;
											}
											updateProfileMutation.mutate({
												name: profileForm.name,
												email: profileForm.email,
											});
										}}
										disabled={updateProfileMutation.isPending}
										className="gap-1.5"
									>
										{updateProfileMutation.isPending ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Save className="h-4 w-4" />
										)}
										Simpan Perubahan Profil
									</Button>
								</div>
							</div>
						</div>
					)}

					{tab === "password" && (
						<div className="space-y-5">
							<div className="border-b border-border/60 pb-3">
								<h3 className="text-sm font-bold text-foreground">
									Keamanan & Kata Sandi
								</h3>
								<p className="text-xs text-muted-foreground">
									Pastikan kata sandi baru mengandung minimal 12 karakter untuk
									mematuhi standar keamanan.
								</p>
							</div>

							<div className="space-y-4">
								<div className="space-y-1.5">
									<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
										Kata Sandi Sekarang
									</label>
									<Input
										type="password"
										value={passwordForm.currentPassword}
										onChange={(e) =>
											setPasswordForm({
												...passwordForm,
												currentPassword: e.target.value,
											})
										}
										placeholder="Masukkan kata sandi lama"
									/>
								</div>

								<div className="space-y-1.5">
									<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
										Kata Sandi Baru
									</label>
									<Input
										type="password"
										value={passwordForm.newPassword}
										onChange={(e) =>
											setPasswordForm({
												...passwordForm,
												newPassword: e.target.value,
											})
										}
										placeholder="Minimal 12 karakter"
									/>
								</div>

								<div className="space-y-1.5">
									<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
										Konfirmasi Kata Sandi Baru
									</label>
									<Input
										type="password"
										value={passwordForm.confirmPassword}
										onChange={(e) =>
											setPasswordForm({
												...passwordForm,
												confirmPassword: e.target.value,
											})
										}
										placeholder="Ulangi kata sandi baru"
									/>
								</div>

								<div className="pt-2">
									<Button
										variant="primary"
										size="sm"
										onClick={() => {
											if (
												!passwordForm.currentPassword ||
												!passwordForm.newPassword
											) {
												toast.error("Semua field kata sandi wajib diisi");
												return;
											}
											if (passwordForm.newPassword.length < 12) {
												toast.error("Kata sandi baru minimal 12 karakter");
												return;
											}
											if (
												passwordForm.newPassword !==
												passwordForm.confirmPassword
											) {
												toast.error("Konfirmasi kata sandi tidak cocok");
												return;
											}
											changePasswordMutation.mutate({
												currentPassword: passwordForm.currentPassword,
												newPassword: passwordForm.newPassword,
											});
										}}
										disabled={changePasswordMutation.isPending}
										className="gap-1.5"
									>
										{changePasswordMutation.isPending ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Lock className="h-4 w-4" />
										)}
										Perbarui Kata Sandi
									</Button>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
