const LOG_LEVELS = {
  DEBUG: 10,
  INFO: 20,
  ERROR: 30,
};

function normalizeLevel(level = 'INFO') {
  const normalized = String(level).toUpperCase();
  return LOG_LEVELS[normalized] ? normalized : 'INFO';
}

function getNow() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function getFunctionName(fn, label) {
  return label || fn.name || 'anonymous';
}

function serializeError(error) {
  return {
    name: error?.name || 'Error',
    message: error?.message || String(error),
    stack: error?.stack,
  };
}

function safeJson(value) {
  const seen = new WeakSet();

  return JSON.stringify(value, (_key, currentValue) => {
    if (typeof currentValue === 'function') {
      return `[Function ${currentValue.name || 'anonymous'}]`;
    }

    if (currentValue instanceof Error) {
      return serializeError(currentValue);
    }

    if (currentValue instanceof Date) {
      return currentValue.toISOString();
    }

    if (currentValue && typeof currentValue === 'object') {
      if (seen.has(currentValue)) return '[Circular]';
      seen.add(currentValue);
    }

    return currentValue;
  });
}

function toLogValue(value, structured) {
  if (structured) return value;
  if (typeof value === 'string') return value;

  try {
    return safeJson(value);
  } catch {
    return String(value);
  }
}

export function defaultLogFormatter(entry) {
  if (entry.structured) {
    return JSON.stringify(entry);
  }

  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level}]`,
    `[${entry.functionName}]`,
    entry.phase,
  ];

  if (entry.durationMs !== undefined) {
    parts.push(`duration=${entry.durationMs}ms`);
  }

  if (entry.args !== undefined) {
    parts.push(`args=${entry.args}`);
  }

  if (entry.result !== undefined) {
    parts.push(`result=${entry.result}`);
  }

  if (entry.error !== undefined) {
    parts.push(`error=${entry.error}`);
  }

  return parts.join(' ');
}

export function createConsoleTransport() {
  return (entry, formattedMessage) => {
    const method = entry.level === 'ERROR' ? 'error' : entry.level === 'DEBUG' ? 'debug' : 'info';
    const writer = console[method] || console.log;
    writer.call(console, formattedMessage);
  };
}

export function createFileTransport(filePath) {
  return async (_entry, formattedMessage) => {
    if (!filePath) {
      throw new Error('File path is required for file logging');
    }

    if (typeof window !== 'undefined') {
      throw new Error('File logging is only available in Node.js');
    }

    const importNodeModule = new Function('moduleName', 'return import(moduleName)');
    const fs = await importNodeModule('node:fs/promises');
    await fs.appendFile(filePath, `${formattedMessage}\n`, 'utf8');
  };
}

export function createExternalServiceTransport(url, options = {}) {
  return async (entry) => {
    if (!url) {
      throw new Error('URL is required for external service logging');
    }

    const fetchImpl = options.fetchImpl || globalThis.fetch;
    if (typeof fetchImpl !== 'function') {
      throw new Error('Fetch API is not available for external service logging');
    }

    await fetchImpl(url, {
      method: options.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: JSON.stringify(entry),
    });
  };
}

export function createMemoryTransport(storage = []) {
  return (entry) => {
    storage.push(entry);
  };
}

function shouldWriteEntry(entry, config) {
  const minimumLevel = LOG_LEVELS[normalizeLevel(config.minimumLevel)];
  const entryLevel = LOG_LEVELS[normalizeLevel(entry.level)];

  if (entryLevel < minimumLevel) return false;
  if (config.onlyErrors && entry.level !== 'ERROR') return false;
  if (typeof config.condition === 'function') return Boolean(config.condition(entry));

  return true;
}

async function dispatch(entry, config) {
  if (!shouldWriteEntry(entry, config)) return;

  const formattedMessage = config.formatter(entry);
  const transports = config.transports.length > 0 ? config.transports : [createConsoleTransport()];

  await Promise.all(
    transports.map(async (transport) => {
      try {
        await transport(entry, formattedMessage);
      } catch (transportError) {
        console.error('Log transport failed:', transportError);
      }
    })
  );
}

function createEntry({ level, phase, functionName, startedAt, args, result, error, config }) {
  const durationMs = config.profileExecution
    ? Math.round((getNow() - startedAt) * 100) / 100
    : undefined;

  return {
    timestamp: new Date().toISOString(),
    level,
    phase,
    functionName,
    durationMs,
    args: args === undefined ? undefined : toLogValue(args, config.structured),
    result: result === undefined ? undefined : toLogValue(result, config.structured),
    error: error === undefined ? undefined : toLogValue(serializeError(error), config.structured),
    structured: config.structured,
  };
}

function mergeConfig(options = {}) {
  return {
    level: normalizeLevel(options.level),
    minimumLevel: normalizeLevel(options.minimumLevel || 'DEBUG'),
    onlyErrors: Boolean(options.onlyErrors),
    structured: Boolean(options.structured),
    profileExecution: options.profileExecution !== false,
    logArguments: options.logArguments !== false,
    logResult: options.logResult !== false,
    condition: options.condition,
    formatter: options.formatter || defaultLogFormatter,
    transports: Array.isArray(options.transports) ? options.transports : [],
    label: options.label,
  };
}

export function log(options = {}) {
  const config = mergeConfig(options);

  return function decorate(fn) {
    if (typeof fn !== 'function') {
      throw new TypeError('log decorator can wrap only functions');
    }

    const functionName = getFunctionName(fn, config.label);

    return function loggedFunction(...args) {
      const startedAt = getNow();

      const writeStart = () => {
        if (config.level === 'ERROR' || !config.logArguments) return;

        const entry = createEntry({
          level: config.level,
          phase: 'input',
          functionName,
          startedAt,
          args,
          config,
        });

        void dispatch(entry, config);
      };

      const writeResult = (result) => {
        if (config.level !== 'ERROR' && config.logResult) {
          const entry = createEntry({
            level: config.level,
            phase: 'output',
            functionName,
            startedAt,
            result,
            config,
          });

          void dispatch(entry, config);
        }

        return result;
      };

      const writeError = (error) => {
        const entry = createEntry({
          level: 'ERROR',
          phase: 'error',
          functionName,
          startedAt,
          args,
          error,
          config,
        });

        void dispatch(entry, config);
        throw error;
      };

      try {
        writeStart();
        const result = fn.apply(this, args);

        if (result && typeof result.then === 'function') {
          return result.then(writeResult, writeError);
        }

        return writeResult(result);
      } catch (error) {
        return writeError(error);
      }
    };
  };
}

export function createLogger(defaultOptions = {}) {
  return {
    log(options = {}) {
      return log({ ...defaultOptions, ...options });
    },
  };
}
