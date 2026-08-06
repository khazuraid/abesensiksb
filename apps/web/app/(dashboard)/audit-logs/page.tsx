"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";
import PaginationControls, {
	type PageMeta,
} from "@/components/pagination-controls";
import api from "@/lib/api";

type Audit = {
	id: number;
	action: string;
	target: string;
	details: unknown;
	createdAt: string;
	user: { name: string | null; email: string | null };
};

const actionLabel: Record<string, string> = {
	CREATE: "Dibuat",
	UPDATE: "Diubah",
	DELETE: "Dihapus",
	LOGIN: "Masuk",
	COMMAND: "Perintah",
};

function DetailBlock({ details }: { details: unknown }) {
	if (
		!details ||
		(typeof details === "object" && Object.keys(details).length === 0)
	) {
		return <span className="text-[#75827d]">Tidak ada rincian</span>;
	}
	if (typeof details !== "object") return <span>{String(details)}</span>;
	const value = details as Record<string, unknown>;
	const oldData = value.oldData ?? value.old;
	const newData = value.newData ?? value.new;
	if (oldData !== undefined || newData !== undefined) {
		return (
			<div className="grid min-w-[360px] grid-cols-2 gap-3">
				<div>
					<p className="mb-1 text-[10px] font-bold uppercase tracking-[.08em]">
						Sebelum
					</p>
					<pre className="whitespace-pre-wrap break-words bg-[#f3f6f4] p-3 text-[11px] leading-5">
						{JSON.stringify(oldData ?? null, null, 2)}
					</pre>
				</div>
				<div>
					<p className="mb-1 text-[10px] font-bold uppercase tracking-[.08em]">
						Sesudah
					</p>
					<pre className="whitespace-pre-wrap break-words bg-[#edf6f2] p-3 text-[11px] leading-5">
						{JSON.stringify(newData ?? null, null, 2)}
					</pre>
				</div>
			</div>
		);
	}
	return (
		<dl className="grid min-w-[280px] gap-x-4 gap-y-2 sm:grid-cols-2">
			{Object.entries(value).map(([key, item]) => (
				<div key={key} className="min-w-0">
					<dt className="text-[10px] font-bold uppercase tracking-[.06em] text-[#75827d]">
						{key}
					</dt>
					<dd className="mt-0.5 break-words text-xs text-[#14211d]">
						{typeof item === "object" ? JSON.stringify(item) : String(item)}
					</dd>
				</div>
			))}
		</dl>
	);
}

export default function AuditLogsPage() {
	const [page, setPage] = useState(1),
		[search, setSearch] = useState("");
	const { data, isLoading, isError, refetch } = useQuery<{
		data: Audit[];
		meta: PageMeta;
	}>({
		queryKey: ["audit-logs", page, search],
		queryFn: async () =>
			(
				await api.get(
					`/audit-logs?page=${page}&limit=10&search=${encodeURIComponent(search)}`,
				)
			).data,
	});

	return (
		<div className="mx-auto max-w-[1200px] space-y-5 md:space-y-6">
			<header>
				<p className="mb-2 text-[11px] font-semibold uppercase tracking-[.14em] text-[#087066]">
					Keamanan sistem
				</p>
				<h1 className="text-3xl font-semibold">Audit log</h1>
				<p className="mt-1 max-w-xl text-sm text-[#53635d]">
					Riwayat tindakan sensitif, pelaku, dan perubahan data.
				</p>
			</header>

			<section
				className="adms-card overflow-hidden p-0"
				aria-labelledby="audit-list-title"
			>
				<div className="flex flex-col gap-4 border-b border-[#d5ded9] bg-[#f8faf8] p-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2
							id="audit-list-title"
							className="flex items-center gap-2 !text-base"
						>
							<ShieldCheck size={17} className="text-[#087066]" /> Aktivitas
							sistem
						</h2>
						<p className="mt-1 text-xs">
							{data?.meta.total ?? 0} aktivitas tercatat
						</p>
					</div>
					<label className="relative block w-full sm:w-72">
						<span className="sr-only">Cari audit</span>
						<Search
							size={16}
							className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#53635d]"
						/>
						<input
							placeholder="Cari aksi atau target"
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setPage(1);
							}}
							className="w-full pl-9 pr-3"
						/>
					</label>
				</div>

				{isLoading ? (
					<div className="space-y-3 p-5" role="status">
						{[1, 2, 3, 4].map((item) => (
							<div key={item} className="h-16 animate-pulse bg-[#eaf0ed]" />
						))}
					</div>
				) : isError ? (
					<div className="p-8 text-center" role="alert">
						<p className="font-semibold">Gagal memuat audit.</p>
						<button
							type="button"
							className="adms-button-outline mt-4"
							onClick={() => refetch()}
						>
							Coba lagi
						</button>
					</div>
				) : data?.data.length === 0 ? (
					<div className="grid justify-items-center px-5 py-14 text-center">
						<Activity size={28} className="mb-3 text-[#087066]" />
						<p className="font-semibold text-[#14211d]">Belum ada aktivitas</p>
						<p className="mt-1 text-sm">
							Aktivitas sensitif sistem akan tampil di sini.
						</p>
					</div>
				) : (
					<>
						<div className="grid divide-y divide-[#d5ded9] lg:hidden">
							{data?.data.map((row) => (
								<article key={row.id} className="p-4">
									<div className="flex items-start justify-between gap-3">
										<div>
											<span
												className={
													row.action === "DELETE"
														? "adms-pill-alert"
														: row.action === "CREATE"
															? "adms-pill-success"
															: "adms-pill-neutral"
												}
											>
												{actionLabel[row.action] ?? row.action}
											</span>
											<h3 className="mt-2 text-sm font-semibold">
												{row.target}
											</h3>
										</div>
										<time className="shrink-0 text-right text-[11px] leading-5 text-[#53635d]">
											{new Date(row.createdAt).toLocaleDateString("id-ID", {
												day: "2-digit",
												month: "short",
											})}
											<br />
											{new Date(row.createdAt).toLocaleTimeString("id-ID", {
												hour: "2-digit",
												minute: "2-digit",
											})}
										</time>
									</div>
									<p className="mt-3 text-xs">
										Oleh {row.user?.name || row.user?.email || "Sistem"}
									</p>
									<details className="mt-3 border-t border-[#d5ded9] pt-3">
										<summary className="text-xs font-semibold text-[#087066]">
											Lihat rincian
										</summary>
										<div className="mt-3 overflow-x-auto">
											<DetailBlock details={row.details} />
										</div>
									</details>
								</article>
							))}
						</div>
						<div className="hidden overflow-x-auto lg:block">
							<table>
								<thead>
									<tr>
										<th className="px-5 py-3 text-left">Waktu</th>
										<th className="px-5 py-3 text-left">Pelaku</th>
										<th className="px-5 py-3 text-left">Aktivitas</th>
										<th className="px-5 py-3 text-left">Rincian perubahan</th>
									</tr>
								</thead>
								<tbody>
									{data?.data.map((row) => (
										<tr key={row.id} className="align-top">
											<td className="whitespace-nowrap px-5 py-4 text-xs text-[#53635d]">
												{new Date(row.createdAt).toLocaleString("id-ID", {
													dateStyle: "medium",
													timeStyle: "short",
												})}
											</td>
											<td className="px-5 py-4">
												<p className="font-semibold text-[#14211d]">
													{row.user?.name || "Sistem"}
												</p>
												{row.user?.email && (
													<p className="mt-1 text-xs">{row.user.email}</p>
												)}
											</td>
											<td className="px-5 py-4">
												<span
													className={
														row.action === "DELETE"
															? "adms-pill-alert"
															: row.action === "CREATE"
																? "adms-pill-success"
																: "adms-pill-neutral"
													}
												>
													{actionLabel[row.action] ?? row.action}
												</span>
												<p className="mt-2 font-mono text-xs text-[#53635d]">
													{row.target}
												</p>
											</td>
											<td className="max-w-xl px-5 py-4">
												<DetailBlock details={row.details} />
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</>
				)}
				{data?.meta && (
					<PaginationControls meta={data.meta} onPageChange={setPage} />
				)}
			</section>
		</div>
	);
}
