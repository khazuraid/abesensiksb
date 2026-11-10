"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import * as React from "react";
import PaginationControls, {
	type PageMeta,
} from "@/components/pagination-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
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
		return (
			<span className="text-muted-foreground text-xs font-mono">
				Tidak ada rincian
			</span>
		);
	}
	if (typeof details !== "object")
		return <span className="font-mono text-xs">{String(details)}</span>;
	const value = details as Record<string, unknown>;
	const oldData = value.oldData ?? value.old;
	const newData = value.newData ?? value.new;
	if (oldData !== undefined || newData !== undefined) {
		return (
			<div className="grid min-w-[360px] grid-cols-2 gap-3">
				<div>
					<p className="mb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
						Sebelum
					</p>
					<pre className="whitespace-pre-wrap break-words border border-border bg-muted/40 p-2.5 text-[11px] font-mono leading-relaxed">
						{JSON.stringify(oldData ?? null, null, 2)}
					</pre>
				</div>
				<div>
					<p className="mb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-primary">
						Sesudah
					</p>
					<pre className="whitespace-pre-wrap break-words border border-border bg-primary-subtle/50 p-2.5 text-[11px] font-mono leading-relaxed text-foreground">
						{JSON.stringify(newData ?? null, null, 2)}
					</pre>
				</div>
			</div>
		);
	}
	return (
		<dl className="grid min-w-[280px] gap-x-4 gap-y-2 sm:grid-cols-2 font-mono text-xs">
			{Object.entries(value).map(([key, item]) => (
				<div key={key} className="min-w-0">
					<dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
						{key}
					</dt>
					<dd className="mt-0.5 break-words text-foreground">
						{typeof item === "object" ? JSON.stringify(item) : String(item)}
					</dd>
				</div>
			))}
		</dl>
	);
}

export default function AuditLogsPage() {
	const [page, setPage] = React.useState(1);
	const [search, setSearch] = React.useState("");

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

	const logs = data?.data || [];
	const meta = data?.meta;

	return (
		<div className="page-shell space-y-6">
			{/* Level 1: Page Header */}
			<PageHeader
				title="Audit Log Keamanan"
				description="Riwayat lengkap aktivitas sensitif, perubahan konfigurasi, dan identitas pelaku aksi sistem."
			/>

			{/* Level 2: Filters Toolbar */}
			<div className="border border-border bg-card p-3.5 flex flex-wrap items-center justify-between gap-3">
				<div className="relative w-full sm:w-72">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
					<Input
						placeholder="Cari aksi, target, atau user..."
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
						className="pl-8 text-xs h-8"
					/>
				</div>
				<span className="text-xs font-mono text-muted-foreground">
					{meta?.total ?? logs.length} Catatan Aktivitas
				</span>
			</div>

			{/* Table Container */}
			<div className="border border-border bg-card">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-44">Waktu</TableHead>
							<TableHead className="w-52">Pelaku (User)</TableHead>
							<TableHead className="w-40">Aktivitas</TableHead>
							<TableHead>Rincian Perubahan</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							[1, 2, 3].map((k) => (
								<TableRow key={k} className="animate-pulse">
									<TableCell colSpan={4} className="h-14 bg-card" />
								</TableRow>
							))
						) : isError ? (
							<TableRow>
								<TableCell
									colSpan={4}
									className="py-8 text-center text-xs text-destructive"
								>
									Gagal memuat log audit.{" "}
									<Button
										variant="outline"
										size="sm"
										onClick={() => refetch()}
										className="ml-2 h-7 text-xs"
									>
										Coba Lagi
									</Button>
								</TableCell>
							</TableRow>
						) : logs.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={4}
									className="py-12 text-center text-xs text-muted-foreground"
								>
									Tidak ada riwayat aktivitas yang ditemukan.
								</TableCell>
							</TableRow>
						) : (
							logs.map((row) => (
								<TableRow key={row.id} className="align-top hover:bg-muted/30">
									<TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
										{new Date(row.createdAt).toLocaleString("id-ID", {
											day: "2-digit",
											month: "short",
											year: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</TableCell>
									<TableCell>
										<div className="flex flex-col">
											<span className="font-bold text-foreground text-xs">
												{row.user?.name || "Sistem Otomatis"}
											</span>
											{row.user?.email && (
												<span className="text-[11px] font-mono text-muted-foreground">
													{row.user.email}
												</span>
											)}
										</div>
									</TableCell>
									<TableCell>
										<div className="flex flex-col gap-1 items-start">
											<Badge
												variant={
													row.action === "DELETE"
														? "destructive"
														: row.action === "CREATE"
															? "success"
															: "secondary"
												}
												className="text-[10px]"
											>
												{actionLabel[row.action] ?? row.action}
											</Badge>
											<span className="font-mono text-[11px] text-muted-foreground">
												{row.target}
											</span>
										</div>
									</TableCell>
									<TableCell className="max-w-xl">
										<DetailBlock details={row.details} />
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>

				<div className="p-3 border-t border-border bg-card">
					<PaginationControls
						meta={meta}
						onPageChange={setPage}
						disabled={isLoading}
					/>
				</div>
			</div>
		</div>
	);
}
