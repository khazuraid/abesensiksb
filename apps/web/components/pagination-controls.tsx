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
			className="flex flex-col gap-3 border-t border-black/5 bg-[#f9f9ff] p-4 sm:flex-row sm:items-center sm:justify-between"
		>
			<p aria-live="polite" className="text-[12px] font-medium text-[#6e797e]">
				Halaman {meta.page} dari {meta.totalPages} · {meta.total} data
			</p>
			<div className="flex flex-wrap items-center gap-2">
				<button
					type="button"
					onClick={() => onPageChange(meta.page - 1)}
					disabled={disabled || meta.page <= 1}
					className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[12px] font-semibold text-[#111c2d] transition-colors hover:bg-[#dee8ff]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00647c] disabled:cursor-not-allowed disabled:opacity-50"
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
						className={`h-8 w-8 rounded-lg text-[12px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00647c] disabled:cursor-not-allowed disabled:opacity-50 ${page === meta.page ? "bg-[#00647c] text-white" : "border border-black/10 bg-white text-[#3e484d] hover:bg-[#dee8ff]/50"}`}
					>
						{page}
					</button>
				))}
				<button
					type="button"
					onClick={() => onPageChange(meta.page + 1)}
					disabled={disabled || meta.page >= meta.totalPages}
					className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[12px] font-semibold text-[#111c2d] transition-colors hover:bg-[#dee8ff]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00647c] disabled:cursor-not-allowed disabled:opacity-50"
				>
					Selanjutnya
				</button>
			</div>
		</nav>
	);
}
