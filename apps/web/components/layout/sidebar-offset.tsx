"use client";

import * as React from "react";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

interface SidebarOffsetProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
}

export function SidebarOffset({
	children,
	className,
	...props
}: SidebarOffsetProps) {
	const { isSidebarCollapsed } = useUiStore();

	return (
		<div
			className={cn(
				"flex min-h-dvh min-w-0 w-full flex-1 flex-col transition-all duration-200",
				isSidebarCollapsed ? "md:ml-16" : "md:ml-60",
				className,
			)}
			{...props}
		>
			{children}
		</div>
	);
}
