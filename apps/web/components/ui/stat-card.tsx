"use client";

import NumberFlow from "@number-flow/react";
import * as React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
	title: string;
	value: number | string;
	description?: string;
	icon?: React.ReactNode;
	trend?: {
		value: number | string;
		isPositive?: boolean;
		label?: string;
	};
	className?: string;
}

export function StatCard({
	title,
	value,
	description,
	icon,
	trend,
	className,
}: StatCardProps) {
	return (
		<div
			className={cn(
				"relative rounded-none border border-border bg-card p-5 transition-colors hover:border-border-strong shadow-none",
				className,
			)}
		>
			<div className="flex items-center justify-between gap-2">
				<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
					{title}
				</span>
				{icon && <div className="text-muted-foreground">{icon}</div>}
			</div>

			<div className="mt-3 flex items-baseline gap-2">
				{typeof value === "number" ? (
					<span className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
						<NumberFlow value={value} />
					</span>
				) : (
					<span className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
						{value}
					</span>
				)}

				{trend && (
					<span
						className={cn(
							"text-xs font-medium font-mono",
							trend.isPositive ? "text-emerald-600" : "text-red-600",
						)}
					>
						{trend.isPositive ? "+" : ""}
						{trend.value}
						{trend.label ? ` ${trend.label}` : ""}
					</span>
				)}
			</div>

			{description && (
				<p className="mt-1 text-xs text-muted-foreground">{description}</p>
			)}
		</div>
	);
}
