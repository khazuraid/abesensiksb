import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
	title: string;
	description?: string;
	action?: React.ReactNode;
	children?: React.ReactNode;
}

export function PageHeader({
	title,
	description,
	action,
	children,
	className,
	...props
}: PageHeaderProps) {
	return (
		<div className={cn("flex flex-col gap-4", className)} {...props}>
			{/* Level 1: Identity Row */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
						{title}
					</h1>
					{description && (
						<p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
							{description}
						</p>
					)}
				</div>
				{action && <div className="flex items-center gap-2">{action}</div>}
			</div>

			{/* Level 2: Optional Toolbar / Filters Row */}
			{children && (
				<div className="flex flex-wrap items-center gap-2.5 border-t border-border/50 pt-3">
					{children}
				</div>
			)}
		</div>
	);
}
