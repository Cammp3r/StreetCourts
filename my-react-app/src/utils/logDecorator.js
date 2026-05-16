function formatResult(result) {
	if (typeof result === 'string') {
		return result;
	}

	try {
		return JSON.stringify(result);
	} catch {
		return String(result);
	}
}

function writeLog(logger, value) {
	if (typeof logger === 'function') {
		logger(value);
		return;
	}

	logger?.info?.(value);
}

export function logResult(fn, { logger = console } = {}) {
	if (typeof fn !== 'function') {
		throw new TypeError('logResult expects a function');
	}

	return function loggedResult(...args) {
		const result = fn.apply(this, args);

		if (result && typeof result.then === 'function') {
			return result.then((resolvedResult) => {
				writeLog(logger, formatResult(resolvedResult));
				return resolvedResult;
			});
		}

		writeLog(logger, formatResult(result));
		return result;
	};
}

export function createResultLoggingDecorator(options = {}) {
	return (fn) => logResult(fn, options);
}
