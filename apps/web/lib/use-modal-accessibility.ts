"use client";

import { type RefObject, useEffect } from "react";

const focusableSelector = [
	"a[href]",
	"button:not([disabled])",
	"input:not([disabled])",
	"select:not([disabled])",
	"textarea:not([disabled])",
	'[tabindex]:not([tabindex="-1"])',
].join(",");

export function useModalAccessibility(
	containerRef: RefObject<HTMLElement | null>,
	onClose: () => void,
	open = true,
) {
	useEffect(() => {
		const container = containerRef.current;
		const previouslyFocused = document.activeElement as HTMLElement | null;
		if (!open || !container) return;

		const focusable = () =>
			Array.from(
				container.querySelectorAll<HTMLElement>(focusableSelector),
			).filter(
				(element) =>
					!element.hidden && element.getAttribute("aria-hidden") !== "true",
			);
		focusable()[0]?.focus();
		document.body.style.overflow = "hidden";

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				onClose();
				return;
			}
			if (event.key !== "Tab") return;
			const elements = focusable();
			if (!elements.length) {
				event.preventDefault();
				return;
			}
			const [first] = elements;
			const last = elements.at(-1);
			if (!first || !last) return;
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.body.style.overflow = "";
			previouslyFocused?.focus();
		};
	}, [containerRef, onClose, open]);
}
