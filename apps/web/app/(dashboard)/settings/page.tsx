"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Bot, Calendar, Loader2, Save } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface Setting {
	id: number;
	key: string;
	value: string | null;
}

const toSettingValues = (settings: Setting[] = []) =>
	Object.fromEntries(
		settings.map((setting) => [setting.key, setting.value ?? ""]),
	);

const defaults = {
	TELEGRAM_TOKEN: "",
	TELEGRAM_CHAT_ID: "",
	TELEGRAM_NOTIFY_ATTENDANCE: "true",
	TELEGRAM_NOTIFY_DEVICE_OFFLINE: "true",
	HOLIDAY_API_URL: "",
	HOLIDAY_API_KEY: "",
};

export default function SettingsPage() {
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = React.useState<
		"telegram" | "holiday" | "notify"
	>("telegram");
	const [changes, setChanges] = React.useState<Partial<typeof defaults>>({});

	const { data: settings } = useQuery<Setting[]>({
		queryKey: ["settings"],
		queryFn: async () => (await api.get("/settings")).data,
	});

	const form = React.useMemo(() => {
		const stored = toSettingValues(settings);
		return { ...defaults, ...stored, ...changes };
	}, [settings, changes]);

	const saveMutation = useMutation({
		mutationFn: async (data: typeof defaults) => {
			return (await api.put("/settings", data)).data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings"] });
			toast.success("Konfigurasi sistem berhasil disimpan");
		},
		onError: (err: any) => {
			toast.error(err.response?.data?.message || "Gagal menyimpan konfigurasi");
		},
	});

	return (
		<div className="page-shell space-y-6">
			{/* Level 1: Page Header */}
			<PageHeader
				title="Konfigurasi Sistem"
				description="Pengaturan integrasi bot Telegram, penyedia data hari libur nasional, dan otomasi notifikasi."
				action={
					<Button
						variant="primary"
						size="sm"
						onClick={() => saveMutation.mutate(form)}
						disabled={saveMutation.isPending}
						className="gap-1.5"
					>
						{saveMutation.isPending ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Save className="h-4 w-4" />
						)}
						Simpan Konfigurasi
					</Button>
				}
			/>

			{/* 2-Column Single-Route Layout */}
			<div className="grid grid-cols-1 md:grid-cols-12 gap-6">
				{/* Left Column: Category Tabs (4 cols) */}
				<div className="md:col-span-4 border border-border bg-card p-2 space-y-1 h-fit">
					<button
						type="button"
						onClick={() => setActiveTab("telegram")}
						className={cn(
							"flex w-full items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-left transition-colors border",
							activeTab === "telegram"
								? "border-primary bg-primary text-primary-foreground"
								: "border-transparent text-foreground hover:bg-muted",
						)}
					>
						<Bot className="h-4 w-4 shrink-0" />
						<div>
							<p>Integrasi Telegram Bot</p>
							<span
								className={cn(
									"text-[10px] font-mono",
									activeTab === "telegram"
										? "text-primary-foreground/80"
										: "text-muted-foreground",
								)}
							>
								Token bot & Chat ID grup
							</span>
						</div>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("holiday")}
						className={cn(
							"flex w-full items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-left transition-colors border",
							activeTab === "holiday"
								? "border-primary bg-primary text-primary-foreground"
								: "border-transparent text-foreground hover:bg-muted",
						)}
					>
						<Calendar className="h-4 w-4 shrink-0" />
						<div>
							<p>API Hari Libur Nasional</p>
							<span
								className={cn(
									"text-[10px] font-mono",
									activeTab === "holiday"
										? "text-primary-foreground/80"
										: "text-muted-foreground",
								)}
							>
								Sumber sinkronisasi otomatis
							</span>
						</div>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("notify")}
						className={cn(
							"flex w-full items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-left transition-colors border",
							activeTab === "notify"
								? "border-primary bg-primary text-primary-foreground"
								: "border-transparent text-foreground hover:bg-muted",
						)}
					>
						<Bell className="h-4 w-4 shrink-0" />
						<div>
							<p>Preferensi Notifikasi</p>
							<span
								className={cn(
									"text-[10px] font-mono",
									activeTab === "notify"
										? "text-primary-foreground/80"
										: "text-muted-foreground",
								)}
							>
								Pemicu pengiriman pesan
							</span>
						</div>
					</button>
				</div>

				{/* Right Column: Panel Content (8 cols) */}
				<div className="md:col-span-8 border border-border bg-card p-6">
					{activeTab === "telegram" && (
						<div className="space-y-5">
							<div className="border-b border-border/60 pb-3">
								<h3 className="text-sm font-bold text-foreground">
									Kredensial Bot Telegram
								</h3>
								<p className="text-xs text-muted-foreground">
									Bot akan digunakan untuk mengirim pesan presensi dan alert
									mesin secara otomatis.
								</p>
							</div>

							<div className="space-y-4">
								<div className="space-y-1.5">
									<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
										Bot Token
									</label>
									<Input
										type="password"
										value={form.TELEGRAM_TOKEN}
										onChange={(e) =>
											setChanges({ ...changes, TELEGRAM_TOKEN: e.target.value })
										}
										placeholder="Contoh: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
										className="font-mono text-xs"
									/>
									<p className="text-[11px] text-muted-foreground">
										Diperoleh dari @BotFather saat membuat bot Telegram.
									</p>
								</div>

								<div className="space-y-1.5">
									<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
										Chat ID / Group ID
									</label>
									<Input
										value={form.TELEGRAM_CHAT_ID}
										onChange={(e) =>
											setChanges({
												...changes,
												TELEGRAM_CHAT_ID: e.target.value,
											})
										}
										placeholder="Contoh: -100123456789"
										className="font-mono text-xs"
									/>
									<p className="text-[11px] text-muted-foreground">
										ID grup atau channel penerima pesan.
									</p>
								</div>
							</div>
						</div>
					)}

					{activeTab === "holiday" && (
						<div className="space-y-5">
							<div className="border-b border-border/60 pb-3">
								<h3 className="text-sm font-bold text-foreground">
									Penyedia Kalender Libur
								</h3>
								<p className="text-xs text-muted-foreground">
									Endpoint API pihak ketiga untuk mengambil jadwal libur
									nasional Indonesia.
								</p>
							</div>

							<div className="space-y-4">
								<div className="space-y-1.5">
									<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
										Endpoint URL API
									</label>
									<Input
										value={form.HOLIDAY_API_URL}
										onChange={(e) =>
											setChanges({
												...changes,
												HOLIDAY_API_URL: e.target.value,
											})
										}
										placeholder="https://balasai.id/api/v1/holidays?year={year}"
										className="font-mono text-xs"
									/>
									<p className="text-[11px] text-muted-foreground">
										Biarkan kosong untuk menggunakan penyedia bawaan.
									</p>
								</div>

								<div className="space-y-1.5">
									<label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
										API Key (Opsional)
									</label>
									<Input
										type="password"
										value={form.HOLIDAY_API_KEY}
										onChange={(e) =>
											setChanges({
												...changes,
												HOLIDAY_API_KEY: e.target.value,
											})
										}
										placeholder="Masukkan API key jika diperlukan penyedia"
										className="font-mono text-xs"
									/>
								</div>
							</div>
						</div>
					)}

					{activeTab === "notify" && (
						<div className="space-y-5">
							<div className="border-b border-border/60 pb-3">
								<h3 className="text-sm font-bold text-foreground">
									Otomasi Notifikasi Telegram
								</h3>
								<p className="text-xs text-muted-foreground">
									Pilih peristiwa operasional apa saja yang dikirimkan ke grup.
								</p>
							</div>

							<div className="space-y-3">
								<label className="flex items-start gap-3 p-3 border border-border cursor-pointer hover:bg-muted/30">
									<input
										type="checkbox"
										checked={form.TELEGRAM_NOTIFY_ATTENDANCE === "true"}
										onChange={(e) =>
											setChanges({
												...changes,
												TELEGRAM_NOTIFY_ATTENDANCE: e.target.checked
													? "true"
													: "false",
											})
										}
										className="mt-0.5 h-4 w-4 cursor-pointer accent-emerald-600 rounded-none"
									/>
									<div className="flex flex-col">
										<span className="text-xs font-bold text-foreground">
											Notifikasi Presensi Pegawai
										</span>
										<span className="text-xs text-muted-foreground">
											Kirim pesan instan setiap kali pegawai melakukan check-in
											atau check-out.
										</span>
									</div>
								</label>

								<label className="flex items-start gap-3 p-3 border border-border cursor-pointer hover:bg-muted/30">
									<input
										type="checkbox"
										checked={form.TELEGRAM_NOTIFY_DEVICE_OFFLINE === "true"}
										onChange={(e) =>
											setChanges({
												...changes,
												TELEGRAM_NOTIFY_DEVICE_OFFLINE: e.target.checked
													? "true"
													: "false",
											})
										}
										className="mt-0.5 h-4 w-4 cursor-pointer accent-emerald-600 rounded-none"
									/>
									<div className="flex flex-col">
										<span className="text-xs font-bold text-foreground">
											Alert Terminal Offline
										</span>
										<span className="text-xs text-muted-foreground">
											Kirim peringatan darurat jika salah satu terminal ADMS
											terputus dari jaringan.
										</span>
									</div>
								</label>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
