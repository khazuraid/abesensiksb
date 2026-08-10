// Shared PDF design helpers for jsPDF exports.
// Colors match the web UI palette.
export const PDF_COLORS = {
	primary: [0, 100, 124] as const,
	primaryDark: [0, 78, 97] as const,
	dark: [17, 28, 45] as const,
	gray: [110, 121, 126] as const,
	lightBg: [240, 243, 255] as const,
	green: [0, 108, 73] as const,
	amber: [137, 78, 0] as const,
	red: [186, 26, 26] as const,
	white: [255, 255, 255] as const,
	border: [210, 218, 222] as const,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfDoc = any;

export function drawHeader(
	doc: PdfDoc,
	title: string,
	subtitle: string,
	pageWidth: number,
) {
	doc.setFillColor(...PDF_COLORS.primary);
	doc.rect(0, 0, pageWidth, 54, "F");

	doc.setFillColor(...PDF_COLORS.primaryDark);
	doc.rect(0, 54, pageWidth, 2, "F");

	doc.setTextColor(...PDF_COLORS.white);
	doc.setFontSize(17);
	doc.setFont("helvetica", "bold");
	doc.text(title, 40, 26);

	doc.setFontSize(9);
	doc.setFont("helvetica", "normal");
	doc.text(subtitle, 40, 44);

	doc.setTextColor(...PDF_COLORS.dark);
}

export function drawStatCards(
	doc: PdfDoc,
	cards: {
		label: string;
		value: string;
		unit?: string;
		color: readonly [number, number, number];
	}[],
	startY: number,
	pageWidth: number,
	margin = 40,
) {
	const gap = 10;
	const cardWidth =
		(pageWidth - margin * 2 - (cards.length - 1) * gap) / cards.length;
	const cardHeight = 58;

	cards.forEach((card, i) => {
		const x = margin + i * (cardWidth + gap);

		doc.setFillColor(...PDF_COLORS.white);
		doc.setDrawColor(...PDF_COLORS.border);
		doc.setLineWidth(0.5);
		doc.roundedRect(x, startY, cardWidth, cardHeight, 5, 5, "FD");

		doc.setFillColor(...card.color);
		doc.roundedRect(x, startY, cardWidth, 4, 5, 5, "F");
		doc.rect(x, startY + 2, cardWidth, 2, "F");

		doc.setFontSize(7);
		doc.setFont("helvetica", "normal");
		doc.setTextColor(...PDF_COLORS.gray);
		doc.text(card.label.toUpperCase(), x + 10, startY + 20);

		doc.setFontSize(20);
		doc.setFont("helvetica", "bold");
		doc.setTextColor(...PDF_COLORS.dark);
		doc.text(card.value, x + 10, startY + 44);

		if (card.unit) {
			doc.setFontSize(10);
			doc.setFont("helvetica", "normal");
			doc.setTextColor(...PDF_COLORS.gray);
			const valWidth = doc.getTextWidth(card.value);
			doc.text(card.unit, x + 10 + valWidth + 4, startY + 44);
		}
	});

	doc.setTextColor(...PDF_COLORS.dark);
}

export function drawSectionTitle(doc: PdfDoc, text: string, y: number) {
	doc.setFontSize(11);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(...PDF_COLORS.primary);
	doc.text(text, 40, y);
	doc.setDrawColor(...PDF_COLORS.primary);
	doc.setLineWidth(1.5);
	doc.line(40, y + 4, 75, y + 4);
	doc.setTextColor(...PDF_COLORS.dark);
}

export function drawFormulaNote(doc: PdfDoc, lines: string[], startY: number) {
	doc.setFontSize(7);
	doc.setFont("helvetica", "normal");
	doc.setTextColor(...PDF_COLORS.gray);
	lines.forEach((line, i) => {
		doc.text(line, 40, startY + i * 11);
	});
	doc.setTextColor(...PDF_COLORS.dark);
}

export function drawFooter(doc: PdfDoc, pageWidth: number, pageHeight: number) {
	const pageCount = doc.getNumberOfPages();
	const now = new Date().toLocaleString("id-ID", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
	for (let i = 1; i <= pageCount; i++) {
		doc.setPage(i);
		doc.setDrawColor(...PDF_COLORS.border);
		doc.setLineWidth(0.3);
		doc.line(40, pageHeight - 28, pageWidth - 40, pageHeight - 28);
		doc.setFontSize(7);
		doc.setTextColor(...PDF_COLORS.gray);
		doc.setFont("helvetica", "normal");
		doc.text(`Dicetak: ${now}`, 40, pageHeight - 16);
		doc.text(
			`Halaman ${i} dari ${pageCount}`,
			pageWidth - 40,
			pageHeight - 16,
			{
				align: "right",
			},
		);
	}
	doc.setTextColor(...PDF_COLORS.dark);
}

// Common autoTable style presets
export const TABLE_STYLES = {
	primary: {
		headStyles: {
			fillColor: PDF_COLORS.primary,
			textColor: PDF_COLORS.white,
			fontStyle: "bold" as const,
			fontSize: 8,
		},
		bodyStyles: { fontSize: 8, textColor: PDF_COLORS.dark },
		alternateRowStyles: { fillColor: PDF_COLORS.lightBg },
		margin: { left: 40, right: 40 },
		theme: "grid" as const,
	},
};

// Compute penalty breakdown for an employee recap.
export function computePenalty(emp: {
	totalLateMinutesSum: number;
	totalEarlyOutMinutesSum: number;
	totalAbsent: number;
	totalLeave: number;
	days: {
		isWorkDay: boolean;
		isHoliday: boolean;
		status: string;
		clockIn: string | null;
		clockOut: string | null;
	}[];
}) {
	const totalLateMins = emp.totalLateMinutesSum || 0;
	const totalEarlyMins = emp.totalEarlyOutMinutesSum || 0;
	const totalMins = totalLateMins + totalEarlyMins;
	const penaltyMins = Math.floor(totalMins / 420);
	let missed = 0;
	emp.days.forEach((d) => {
		if (
			d.isWorkDay &&
			!d.isHoliday &&
			d.status !== "LEAVE" &&
			Boolean(d.clockIn) !== Boolean(d.clockOut)
		)
			missed++;
	});
	const penaltyPunch = Math.floor(missed / 2);
	const total = penaltyMins + penaltyPunch + emp.totalAbsent + emp.totalLeave;
	return {
		totalLateMins,
		totalEarlyMins,
		totalMins,
		penaltyMins,
		missed,
		penaltyPunch,
		totalAbsent: emp.totalAbsent,
		totalLeave: emp.totalLeave,
		total,
	};
}
