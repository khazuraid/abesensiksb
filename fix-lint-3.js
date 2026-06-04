const fs = require("fs");

function replaceFileContent(file, replacements) {
	if (!fs.existsSync(file)) return;
	let content = fs.readFileSync(file, "utf8");
	for (const { search, replace } of replacements) {
		content = content.replace(search, replace);
	}
	fs.writeFileSync(file, content);
}

replaceFileContent("apps/web/app/(dashboard)/daily-recap/page.tsx", [
	{
		search:
			/<label className="block text-\[12px\] font-semibold text-\[#6e797e\] mb-1">\s*Pilih Tipe\s*<\/label>/,
		replace:
			'<div className="block text-[12px] font-semibold text-[#6e797e] mb-1">Pilih Tipe</div>',
	},
	{
		search:
			/<label className="block text-\[12px\] font-semibold text-\[#6e797e\] mb-1">\s*\{editingDay.field === "in" \? "Waktu Masuk" : "Waktu Keluar"\}\s*<\/label>/,
		replace:
			'<label htmlFor="time-input" className="block text-[12px] font-semibold text-[#6e797e] mb-1">{editingDay.field === "in" ? "Waktu Masuk" : "Waktu Keluar"}</label>',
	},
	{
		search: /<input\s+type="time"/,
		replace: '<input id="time-input" type="time"',
	},
]);

replaceFileContent("apps/web/app/(dashboard)/reports/page.tsx", [
	{
		search: /\(emp: any\) => emp.id === selectedEmployee,/,
		replace: "(emp: { id: string }) => emp.id === selectedEmployee,",
	},
	{
		search: /\(day: any, _i: number\) => \{/,
		replace:
			"(day: { date: string; isHoliday: boolean; holidayName?: string; isWeekend: boolean; attendance: { in: string | null; out: string | null; type: string; status: string } }, _i: number) => {",
	},
]);

replaceFileContent("apps/web/app/(dashboard)/topbar.tsx", [
	{
		search: /const handleNewLog = \(data: any\) => \{/,
		replace:
			"const handleNewLog = (data: { deviceId: string; timestamp: string; userId: string; verified: number; status: number; workcode: number }) => {",
	},
]);

replaceFileContent("apps/web/components/employee-form.tsx", [
	{
		search: /resolver: zodResolver\(CreateEmployeeSchema\) as any,/,
		replace: "resolver: zodResolver(CreateEmployeeSchema),",
	},
]);

replaceFileContent("apps/web/app/(dashboard)/devices/page.tsx", [
	{ search: /payload\?: any;/, replace: "payload?: unknown;" },
]);

console.log("Fixed more lints");
