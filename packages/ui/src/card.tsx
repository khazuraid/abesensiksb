import type { ReactNode } from "react";

export function Card({
	title,
	children,
	href,
}: {
	title: string;
	children: ReactNode;
	href: string;
}): JSX.Element {
	return (
		<a
			href={`${href}?utm_source=create-turbo&utm_medium=basic&utm_campaign=create-turbo"`}
			target="_blank"
			rel="noopener noreferrer"
		>
			<h2>
				{title} <span>-&gt;</span>
			</h2>
			<p>{children}</p>
		</a>
	);
}
