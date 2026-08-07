export type ShiftAssignmentRange = {
	startDate: string;
	endDate?: string | null;
};

export function assertValidShiftAssignmentRange(
	startDate: string,
	endDate?: string | null,
) {
	if (endDate && endDate < startDate)
		throw new Error("Tanggal selesai tidak boleh sebelum tanggal mulai");
}

export function overlapsShiftAssignment(
	left: ShiftAssignmentRange,
	right: ShiftAssignmentRange,
) {
	return (
		(left.endDate === null ||
			left.endDate === undefined ||
			left.endDate >= right.startDate) &&
		(right.endDate === null ||
			right.endDate === undefined ||
			right.endDate >= left.startDate)
	);
}
