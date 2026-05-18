function getNow() {
	return typeof performance !== 'undefined' && typeof performance.now === 'function'
		? performance.now()
		: Date.now();
}

function formatValue(value, seen = new WeakSet()) {
	if (value === null || value === undefined) {
		return String(value);
	}

	if (typeof value === 'string') {
		return value;
	}

	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
		return String(value);
	}

	if (typeof value === 'function') {
		return `[Function ${value.name || 'anonymous'}]`;
	}

	if (value instanceof Error) {
		return value.stack || value.message || value.name;
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	try {
		return JSON.stringify(value, (key, currentValue) => {
			if (typeof currentValue === 'function') {
				return `[Function ${currentValue.name || 'anonymous'}]`;
			}

			if (currentValue instanceof Error) {
				return {
					name: currentValue.name,
					message: currentValue.message,
					stack: currentValue.stack,
				};
			}

			if (currentValue instanceof Date) {
				return currentValue.toISOString();
			}

			if (currentValue && typeof currentValue === 'object') {
				if (seen.has(currentValue)) {
					return '[Circular]';
				}

				seen.add(currentValue);
			}

			return currentValue;
		}, 2);
	} catch {
		return String(value);
	}
}

function formatArgs(args) {
	if (!args.length) {
		return '[]';
	}

	return formatValue(args);
}

function writeLog(logger, level, value) {
	if (typeof logger === 'function') {
		logger(value);
		return;
	}

	logger?.[level]?.(value);
}

function getLabel(fn, label) {
	return label || fn.name || 'anonymous';
}

function createLoggedFunction(fn, options) {
	const {
		logger = console,
		label,
		logArgs = true,
		logResult = true,
		logDuration = true,
		logError = true,
	} = options;

	if (typeof fn !== 'function') {
		throw new TypeError('logResult expects a function');
	}

	return function loggedResult(...args) {
		const effectiveLabel = getLabel(fn, label);
		const startedAt = getNow();

		if (logArgs) {
			writeLog(logger, 'info', `[${effectiveLabel}] args=${formatArgs(args)}`);
		}

		const finishSuccess = (result) => {
			const durationMs = Math.max(0, Math.round(getNow() - startedAt));
			const durationPart = logDuration ? ` duration=${durationMs}ms` : '';

			if (logResult) {
				writeLog(logger, 'info', `[${effectiveLabel}] result=${formatValue(result)}${durationPart}`);
			}

			return result;
		};

		const finishError = (error) => {
			const durationMs = Math.max(0, Math.round(getNow() - startedAt));
			const durationPart = logDuration ? ` duration=${durationMs}ms` : '';

			if (logError) {
				writeLog(logger, 'error', `[${effectiveLabel}] error=${formatValue(error)}${durationPart}`);
			}

			throw error;
		};

		try {
			const result = fn.apply(this, args);

			if (result && typeof result.then === 'function') {
				return result.then(finishSuccess, finishError);
			}

			return finishSuccess(result);
		} catch (error) {
			return finishError(error);
		}
	};
}

export function logResult(fn, options = {}) {
	return createLoggedFunction(fn, options);
}

export function createResultLoggingDecorator(options = {}) {
	return (fn) => createLoggedFunction(fn, options);
}

export function logWithDetails(fn, options = {}) {
	return createLoggedFunction(fn, options);
}
