"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	children: React.ReactNode;
	footer?: React.ReactNode;
	maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "5xl";
}

const maxWidthMap = {
	sm: "max-w-sm",
	md: "max-w-md",
	lg: "max-w-lg",
	xl: "max-w-xl",
	"2xl": "max-w-2xl",
	"4xl": "max-w-4xl",
	"5xl": "max-w-5xl",
};

export function Modal({
	open,
	onOpenChange,
	title,
	description,
	children,
	footer,
	maxWidth = "5xl",
}: ModalProps) {
	return (
		<DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
				<DialogPrimitive.Content
					className={cn(
						"fixed left-[50%] top-[50%] z-50 flex flex-col w-[calc(100%-2rem)] max-h-[90vh] translate-x-[-50%] translate-y-[-50%] rounded-none border border-border bg-card p-0 shadow-none duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
						maxWidthMap[maxWidth],
					)}
				>
					{/* Fixed Header */}
					<div className="flex items-center justify-between border-b border-border px-6 py-4">
						<div>
							<DialogPrimitive.Title className="text-base font-bold text-foreground">
								{title}
							</DialogPrimitive.Title>
							{description && (
								<DialogPrimitive.Description className="mt-0.5 text-xs text-muted-foreground">
									{description}
								</DialogPrimitive.Description>
							)}
						</div>
						<DialogPrimitive.Close className="p-1 border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground">
							<X className="h-4 w-4" />
							<span className="sr-only">Tutup</span>
						</DialogPrimitive.Close>
					</div>

					{/* Scrollable Body */}
					<div className="flex-1 overflow-y-auto p-6">{children}</div>

					{/* Fixed Footer */}
					{footer && (
						<div className="flex items-center justify-end gap-3 border-t border-border bg-muted/20 px-6 py-3">
							{footer}
						</div>
					)}
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}
