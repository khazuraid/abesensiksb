export type SideEffect = {
	name: string;
	run(): Promise<unknown>;
};

export async function runSideEffects(
	effects: SideEffect[],
	completed: string[] = [],
	checkpoint?: (completedEffects: string[]) => Promise<void>,
) {
	for (const effect of effects) {
		if (completed.includes(effect.name)) continue;
		await effect.run();
		completed.push(effect.name);
		await checkpoint?.([...completed]);
	}
	return completed;
}
