"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Bot, MessageCircle, Save } from "lucide-react";
import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Setting {
	id: number;
	key: string;
	value: string | null;
}

export default function SettingsPage() {
	const queryClient = useQueryClient();
	const [form, setForm] = useState({
		TELEGRAM_TOKEN: "",
		TELEGRAM_CHAT_ID: "",
		TELEGRAM_NOTIFY_ATTENDANCE: "true",
		TELEGRAM_NOTIFY_DEVICE_OFFLINE: "true",
	});

	const { data: settings } = useQuery<Setting[]>({
		queryKey: ["settings"],
		queryFn: async () => (await api.get("/settings")).data,
	});

	useEffect(() => {
		if (settings) {
			const map: Record<string, string> = {};
			for (const s of settings) {
				map[s.key] = s.value || "";
			}
			setForm((prev) => ({ ...prev, ...map }));
		}
	}, [settings]);

	const saveMutation = useMutation({
		mutationFn: async (data: typeof form) => {
			return (await api.put("/settings", data)).data;
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
	});

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="space-y-8"
		>
			<div>
				<h2 className="text-3xl font-bold tracking-tight">Pengaturan</h2>
				<p className="text-foreground/60">
					Konfigurasi Telegram Bot dan notifikasi sistem.
				</p>
			</div>

			<div className="glass-card p-6 space-y-6">
				<div className="flex items-center gap-3 pb-4 border-b border-white/5">
					<div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
						<Bot size={24} />
					</div>
					<div>
						<h3 className="font-bold text-lg">Telegram Bot</h3>
						<p className="text-sm text-foreground/50">
							Konfigurasi bot untuk notifikasi otomatis
						</p>
					</div>
				</div>

				<div className="space-y-4">
					<div>
						<label
							htmlFor="telegram-token"
							className="block text-sm font-semibold text-foreground/70 mb-2"
						>
							Bot Token
						</label>
						<input
							id="telegram-token"
							type="password"
							value={form.TELEGRAM_TOKEN}
							onChange={(e) =>
								setForm({ ...form, TELEGRAM_TOKEN: e.target.value })
							}
							placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
							className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
						/>
						<p className="text-xs text-foreground/40 mt-1">
							Dapatkan dari @BotFather di Telegram
						</p>
					</div>

					<div>
						<label
							htmlFor="telegram-chat-id"
							className="block text-sm font-semibold text-foreground/70 mb-2"
						>
							<MessageCircle size={14} className="inline mr-1" />
							Chat ID
						</label>
						<input
							id="telegram-chat-id"
							type="text"
							value={form.TELEGRAM_CHAT_ID}
							onChange={(e) =>
								setForm({ ...form, TELEGRAM_CHAT_ID: e.target.value })
							}
							placeholder="-1001234567890"
							className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
						/>
						<p className="text-xs text-foreground/40 mt-1">
							ID grup atau channel untuk menerima notifikasi
						</p>
					</div>
				</div>

				<div className="pt-4 border-t border-white/5 space-y-3">
					<h4 className="font-semibold text-sm text-foreground/70">
						Notifikasi
					</h4>
					<label className="flex items-center gap-3 cursor-pointer">
						<input
							type="checkbox"
							checked={form.TELEGRAM_NOTIFY_ATTENDANCE === "true"}
							onChange={(e) =>
								setForm({
									...form,
									TELEGRAM_NOTIFY_ATTENDANCE: e.target.checked
										? "true"
										: "false",
								})
							}
							className="w-4 h-4 rounded accent-primary"
						/>
						<span className="text-sm">Kirim notifikasi saat pegawai absen</span>
					</label>
					<label className="flex items-center gap-3 cursor-pointer">
						<input
							type="checkbox"
							checked={form.TELEGRAM_NOTIFY_DEVICE_OFFLINE === "true"}
							onChange={(e) =>
								setForm({
									...form,
									TELEGRAM_NOTIFY_DEVICE_OFFLINE: e.target.checked
										? "true"
										: "false",
								})
							}
							className="w-4 h-4 rounded accent-primary"
						/>
						<span className="text-sm">Kirim alert saat mesin offline</span>
					</label>
				</div>

				<div className="pt-4">
					<button
						type="button"
						onClick={() => saveMutation.mutate(form)}
						disabled={saveMutation.isPending}
						className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50"
					>
						<Save size={18} />
						{saveMutation.isPending ? "Menyimpan..." : "Simpan Pengaturan"}
					</button>
					{saveMutation.isSuccess && (
						<p className="text-emerald-400 text-sm mt-2">
							✅ Pengaturan berhasil disimpan.
						</p>
					)}
				</div>
			</div>
		</motion.div>
	);
}
