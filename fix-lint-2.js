const fs = require("fs");

function replaceFileContent(file, replacements) {
	let content = fs.readFileSync(file, "utf8");
	for (const { search, replace } of replacements) {
		content = content.replace(search, replace);
	}
	fs.writeFileSync(file, content);
}

// Fix logs/page.tsx
replaceFileContent("apps/web/app/(dashboard)/logs/page.tsx", [
	{
		search:
			/<label className="font-sans text-\[12px\] font-semibold text-\[#6e797e\]">\s*Pencarian Pegawai\s*<\/label>/,
		replace:
			'<label htmlFor="search-emp" className="font-sans text-[12px] font-semibold text-[#6e797e]">Pencarian Pegawai</label>',
	},
	{
		search: /<input\s+type="text"\s+placeholder="Cari nama pegawai\.\.\."/,
		replace:
			'<input id="search-emp" type="text" placeholder="Cari nama pegawai..."',
	},
	{
		search:
			/<label className="font-sans text-\[12px\] font-semibold text-\[#6e797e\]">\s*Rentang Tanggal\s*<\/label>/,
		replace:
			'<label htmlFor="date-range" className="font-sans text-[12px] font-semibold text-[#6e797e]">Rentang Tanggal</label>',
	},
	{
		search: /<input\s+type="date"/,
		replace: '<input id="date-range" type="date"',
	},
	{
		search:
			/<label className="font-sans text-\[12px\] font-semibold text-\[#6e797e\]">\s*Status\s*<\/label>/,
		replace:
			'<label htmlFor="status-filter" className="font-sans text-[12px] font-semibold text-[#6e797e]">Status</label>',
	},
	{
		search: /<select\s+className="w-full/,
		replace: '<select id="status-filter" className="w-full',
	},
]);

// Fix page.tsx (Dashboard)
replaceFileContent("apps/web/app/(dashboard)/page.tsx", [
	{
		search: /key={`cell-\$\{index\}`}/g,
		replace: "key={`cell-${entry.name}`}",
	},
]);

// Fix profile/page.tsx
replaceFileContent("apps/web/app/(dashboard)/profile/page.tsx", [
	{
		search: /<label className="block text-sm font-medium text-slate-500 mb-1">/,
		replace:
			'<label htmlFor="role-field" className="block text-sm font-medium text-slate-500 mb-1">',
	},
	{
		search:
			/<div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-500">/,
		replace:
			'<div id="role-field" className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-500">',
	},
]);

// Fix reports/page.tsx
replaceFileContent("apps/web/app/(dashboard)/reports/page.tsx", [
	{
		search: /<tr key=\{i\} className="hover:bg-\[#f9f9ff\]">/,
		replace: '<tr key={day.date} className="hover:bg-[#f9f9ff]">',
	},
]);

// Fix settings/page.tsx
replaceFileContent("apps/web/app/(dashboard)/settings/page.tsx", [
	{
		search:
			/<label className="block font-sans text-\[11px\] font-semibold text-\[#111c2d\] uppercase tracking-wider">\s*Bot Token\s*<\/label>/,
		replace:
			'<label htmlFor="bot-token" className="block font-sans text-[11px] font-semibold text-[#111c2d] uppercase tracking-wider">Bot Token</label>',
	},
	{
		search: /<input\s+type="password"\s+value=\{telegramToken\}/,
		replace: '<input id="bot-token" type="password" value={telegramToken}',
	},

	{
		search:
			/<label className="block font-sans text-\[11px\] font-semibold text-\[#111c2d\] uppercase tracking-wider">\s*Chat ID\s*<\/label>/,
		replace:
			'<label htmlFor="chat-id" className="block font-sans text-[11px] font-semibold text-[#111c2d] uppercase tracking-wider">Chat ID</label>',
	},
	{
		search: /<input\s+type="text"\s+value=\{telegramChatId\}/,
		replace: '<input id="chat-id" type="text" value={telegramChatId}',
	},

	{
		search:
			/<label className="block font-sans text-\[11px\] font-semibold text-\[#111c2d\] uppercase tracking-wider">\s*Holiday API URL\s*<\/label>/,
		replace:
			'<label htmlFor="holiday-api" className="block font-sans text-[11px] font-semibold text-[#111c2d] uppercase tracking-wider">Holiday API URL</label>',
	},
	{
		search: /<input\s+type="text"\s+value=\{holidayApiUrl\}/,
		replace: '<input id="holiday-api" type="text" value={holidayApiUrl}',
	},

	{
		search:
			/<label className="block font-sans text-\[11px\] font-semibold text-\[#111c2d\] uppercase tracking-wider mb-4">\s*Notifikasi\s*<\/label>/,
		replace:
			'<div className="block font-sans text-[11px] font-semibold text-[#111c2d] uppercase tracking-wider mb-4">Notifikasi</div>',
	},
]);

// Fix shifts/page.tsx
replaceFileContent("apps/web/app/(dashboard)/shifts/page.tsx", [
	{
		search:
			/<label className="block text-\[13px\] font-semibold text-\[#3e484d\] mb-2">\s*Hari Kerja\s*<\/label>/,
		replace:
			'<div className="block text-[13px] font-semibold text-[#3e484d] mb-2">Hari Kerja</div>',
	},
]);

console.log("Fixed");
