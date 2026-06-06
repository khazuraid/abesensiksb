"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Bot, Check, MessageCircle, Save } from "lucide-react";
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
		HOLIDAY_API_URL: "",
		HOLIDAY_API_KEY: "",
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
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className="w-full mx-auto space-y-8 min-h-[calc(100vh-6rem)]"
		>
			<div className="mb-8">
				<h2 className="font-display text-3xl font-semibold text-[#111c2d] mb-2">
					Pengaturan
				</h2>
				<p className="font-sans text-sm text-[#6e797e]">
					Konfigurasi Telegram Bot dan notifikasi sistem.
				</p>
			</div>

			<div className="adms-card p-0 overflow-hidden">
				{/* Card Header */}
				<div className="p-6 border-b border-black/5 flex items-center gap-4 bg-[#e7eeff]/30">
					<div className="w-12 h-12 rounded-lg bg-[#dee8ff] flex items-center justify-center text-[#00647c]">
						<Bot size={28} strokeWidth={1.5} />
					</div>
					<div>
						<h3 className="font-semibold text-lg text-[#111c2d]">
							Integrasi & Notifikasi
						</h3>
						<p className="font-sans text-[13px] text-[#6e797e]">
							Konfigurasi bot Telegram dan API Eksternal
						</p>
					</div>
				</div>

				{/* Form Content */}
				<div className="p-6 space-y-8">
					{/* Bot Token */}
					<div className="space-y-2">
						<label
							htmlFor="bot-token"
							className="block font-sans text-[11px] font-semibold text-[#111c2d] uppercase tracking-wider"
						>
							Bot Token
						</label>
						<input
							type="password"
							value={form.TELEGRAM_TOKEN}
							onChange={(e) =>
								setForm({ ...form, TELEGRAM_TOKEN: e.target.value })
							}
							placeholder="Masukkan Bot Token"
							className="w-full bg-white text-[#111c2d] border border-[#bdc8ce] rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-[#00647c] focus:ring-1 focus:ring-[#00647c] transition-shadow font-mono tracking-widest placeholder:text-[#6e797e] placeholder:tracking-normal placeholder:font-sans"
						/>
						<p className="font-sans text-[11px] text-[#6e797e] mt-1">
							Dapatkan dari @BotFather di Telegram
						</p>
					</div>

					{/* Chat ID */}
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<MessageCircle size={16} className="text-[#6e797e]" />
							<label
								htmlFor="chat-id"
								className="block font-sans text-[11px] font-semibold text-[#111c2d] uppercase tracking-wider"
							>
								Chat ID
							</label>
						</div>
						<input
							type="text"
							value={form.TELEGRAM_CHAT_ID}
							onChange={(e) =>
								setForm({ ...form, TELEGRAM_CHAT_ID: e.target.value })
							}
							placeholder="Masukkan Chat ID"
							className="w-full bg-white text-[#111c2d] border border-[#bdc8ce] rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-[#00647c] focus:ring-1 focus:ring-[#00647c] transition-shadow placeholder:text-[#6e797e]"
						/>
						<p className="font-sans text-[11px] text-[#6e797e] mt-1">
							ID grup atau channel untuk menerima notifikasi
						</p>
					</div>

					{/* Divider */}
					<hr className="border-black/5" />

					{/* Holiday API URL */}
					<div className="space-y-2">
						<label
							htmlFor="holiday-api"
							className="block font-sans text-[11px] font-semibold text-[#111c2d] uppercase tracking-wider"
						>
							Holiday API URL
						</label>
						<input
							type="text"
							value={form.HOLIDAY_API_URL}
							onChange={(e) =>
								setForm({ ...form, HOLIDAY_API_URL: e.target.value })
							}
							placeholder="https://use.api.co.id/holidays/indonesia/?year={year}"
							className="w-full bg-white text-[#111c2d] border border-[#bdc8ce] rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-[#00647c] focus:ring-1 focus:ring-[#00647c] transition-shadow placeholder:text-[#6e797e]"
						/>
						<p className="font-sans text-[11px] text-[#6e797e] mt-1">
							Endpoint API untuk hari libur. Biarkan kosong jika ingin
							menggunakan URL bawaan (api.co.id)
						</p>
					</div>

					{/* Holiday API Key */}
					<div className="space-y-2">
						<label
							htmlFor="holiday-api-key"
							className="block font-sans text-[11px] font-semibold text-[#111c2d] uppercase tracking-wider"
						>
							Holiday API Key
						</label>
						<input
							type="password"
							value={form.HOLIDAY_API_KEY}
							onChange={(e) =>
								setForm({ ...form, HOLIDAY_API_KEY: e.target.value })
							}
							placeholder="Masukkan API Key (jika menggunakan api.co.id)"
							className="w-full bg-white text-[#111c2d] border border-[#bdc8ce] rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-[#00647c] focus:ring-1 focus:ring-[#00647c] transition-shadow font-mono tracking-widest placeholder:text-[#6e797e] placeholder:tracking-normal placeholder:font-sans"
						/>
						<p className="font-sans text-[11px] text-[#6e797e] mt-1">
							API Key yang didapatkan dari dashboard penyedia API (x-api-co-id)
						</p>
					</div>

					{/* Divider */}
					<hr className="border-black/5" />

					{/* Notifications Toggles */}
					<div className="space-y-4">
						<div className="block font-sans text-[11px] font-semibold text-[#111c2d] uppercase tracking-wider mb-4">
							Notifikasi
						</div>

						<label className="flex items-center gap-3 cursor-pointer group">
							<div className="relative flex items-center justify-center w-5 h-5">
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
									className="peer appearance-none w-5 h-5 border-2 border-[#bdc8ce] rounded bg-white checked:bg-[#00647c] checked:border-[#00647c] transition-all cursor-pointer"
								/>
								<Check
									className="text-white absolute w-3.5 h-3.5 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
									strokeWidth={3}
								/>
							</div>
							<span className="font-sans text-[14px] text-[#111c2d] group-hover:text-[#00647c] transition-colors">
								Kirim notifikasi saat pegawai absen
							</span>
						</label>

						<label className="flex items-center gap-3 cursor-pointer group">
							<div className="relative flex items-center justify-center w-5 h-5">
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
									className="peer appearance-none w-5 h-5 border-2 border-[#bdc8ce] rounded bg-white checked:bg-[#00647c] checked:border-[#00647c] transition-all cursor-pointer"
								/>
								<Check
									className="text-white absolute w-3.5 h-3.5 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
									strokeWidth={3}
								/>
							</div>
							<span className="font-sans text-[14px] text-[#111c2d] group-hover:text-[#00647c] transition-colors">
								Kirim alert saat mesin offline
							</span>
						</label>
					</div>

					{saveMutation.isSuccess && (
						<div className="bg-[#6cf8bb]/20 border border-[#6cf8bb] text-[#006c49] px-4 py-3 rounded-lg text-[13px] font-semibold flex items-center gap-2">
							<span className="material-symbols-outlined text-[18px]">
								check_circle
							</span>
							Pengaturan berhasil disimpan.
						</div>
					)}
				</div>

				{/* Card Footer / Actions */}
				<div className="p-6 border-t border-black/5 bg-[#f9f9ff] flex justify-end">
					<button
						type="button"
						onClick={() => saveMutation.mutate(form)}
						disabled={saveMutation.isPending}
						className="adms-button !bg-[#00647c] !text-white hover:!bg-[#007f9d]"
					>
						<Save size={18} />
						{saveMutation.isPending ? "Menyimpan..." : "Simpan Pengaturan"}
					</button>
				</div>
			</div>
		</motion.div>
	);
}
