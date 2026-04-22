export async function yieldToMainThread({
	signal,
	strategy = 'animationFrame',
	delayMs = 0,
} = {}) {
	if (signal?.aborted) return;

	if (delayMs > 0) {
		await new Promise((resolve) => {
			setTimeout(resolve, delayMs);
		});
		return;
	}

	if (strategy === 'idle' && typeof requestIdleCallback === 'function') {
		await new Promise((resolve) => {
			requestIdleCallback(resolve);
		});
		return;
	}

	if (strategy === 'animationFrame' && typeof requestAnimationFrame === 'function') {
		await new Promise((resolve) => {
			requestAnimationFrame(resolve);
		});
		return;
	}

	await new Promise((resolve) => setTimeout(resolve, 0));
}

export async function* streamArrayChunks(
	items,
	{
		chunkSize = 25,
		signal,
		strategy = 'animationFrame',
		yieldDelayMs = 0,
	} = {}
) {
	if (!Array.isArray(items) || items.length === 0) return;
	const safeChunkSize = Number.isFinite(chunkSize) && chunkSize > 0 ? Math.floor(chunkSize) : 25;

	for (let start = 0; start < items.length; start += safeChunkSize) {
		if (signal?.aborted) return;
		const chunk = items.slice(start, start + safeChunkSize);
		yield chunk;
		if (start + safeChunkSize < items.length) {
			await yieldToMainThread({ signal, strategy, delayMs: yieldDelayMs });
		}
	}
}

