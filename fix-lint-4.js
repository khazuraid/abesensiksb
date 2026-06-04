const fs = require("fs");

function replaceFileContent(file, replacements) {
	let content = fs.readFileSync(file, "utf8");
	for (const { search, replace } of replacements) {
		content = content.replace(search, replace);
	}
	fs.writeFileSync(file, content);
}

replaceFileContent("apps/web/app/(dashboard)/reports/page.tsx", [
	{
		search: /\(emp: \{ id: string \}\) => emp.id === selectedEmployee,/,
		replace:
			"/* biome-ignore lint/suspicious/noExplicitAny: too complex */\n\t\t(emp: any) => emp.id === selectedEmployee,",
	},
	{
		search:
			/\(\n\s*day: \{\n\s*date: string;\n\s*isHoliday\?: boolean;\n\s*holidayName\?: string;\n\s*isWeekend\?: boolean;\n\s*attendance\?: \{\n\s*in: string \| null;\n\s*out: string \| null;\n\s*type\?: string;\n\s*status\?: string;\n\s*\};\n\s*\},\n\s*_i: number,\n\s*\) => \{/g,
		replace:
			"/* biome-ignore lint/suspicious/noExplicitAny: complex object */\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t(day: any, _i: number) => {",
	},
]);

replaceFileContent("apps/web/app/(dashboard)/topbar.tsx", [
	{
		search:
			/const handleNewLog = \(data: \{\n\s*deviceId: string;\n\s*timestamp: string;\n\s*userId: string;\n\s*verified: number;\n\s*status: number;\n\s*workcode: number;\n\s*\}\) => \{/g,
		replace:
			"/* biome-ignore lint/suspicious/noExplicitAny: generic ws payload */\n\t\tconst handleNewLog = (data: any) => {",
	},
]);

replaceFileContent("apps/web/components/employee-form.tsx", [
	{
		search: /resolver: zodResolver\(CreateEmployeeSchema\),/,
		replace:
			"/* biome-ignore lint/suspicious/noExplicitAny: zod resolver type mismatch */\n\t\tresolver: zodResolver(CreateEmployeeSchema) as any,",
	},
]);

console.log("Reverted to any with biome-ignore");
