export interface PageMeta {
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export function pageWindow(page: number, totalPages: number) {
	const length = Math.min(5, totalPages);
	const start = Math.max(1, Math.min(page - 2, totalPages - length + 1));
	return Array.from({ length }, (_, index) => start + index);
}

export default function PaginationControls({
	meta,
	onPageChange,
	disabled = false,
}: {
	meta?: PageMeta;
	onPageChange: (page: number) => void;
	disabled?: boolean;
}) {
	if (!meta || meta.totalPages <= 1) return null;
	return (
		<nav
			aria-label="Navigasi halaman"
			className="flex flex-col gap-3 border-t border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
		>
			<p aria-live="polite" className="text-xs font-mono text-muted-foreground">
				Halaman {meta.page} dari {meta.totalPages} · {meta.total} data total
			</p>
			<div className="flex flex-wrap items-center gap-1.5">
				<button
					type="button"
					onClick={() => onPageChange(meta.page - 1)}
					disabled={disabled || meta.page <= 1}
					className="h-8 border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
				>
					Sebelumnya
				</button>
				{pageWindow(meta.page, meta.totalPages).map((page) => (
					<button
						key={page}
						type="button"
						aria-current={page === meta.page ? "page" : undefined}
						aria-label={`Halaman ${page}`}
						onClick={() => onPageChange(page)}
						disabled={disabled}
						className={`h-8 min-w-[32px] px-2 text-xs font-mono font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40 ${
							page === meta.page
								? "border border-primary bg-primary text-primary-foreground font-bold"
								: "border border-border bg-card text-foreground hover:bg-muted"
						}`}
					>
						{page}
					</button>
				))}
				<button
					type="button"
					onClick={() => onPageChange(meta.page + 1)}
					disabled={disabled || meta.page >= meta.totalPages}
					className="h-8 border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
				>
					Selanjutnya
				</button>
			</div>
		</nav>
	);
}
