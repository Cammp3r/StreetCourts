const LEVELS = { DEBUG: 10, INFO: 20, ERROR: 40 };

function normalizeLevel(level) {
  if (!level) return LEVELS.INFO;
  const up = String(level).toUpperCase();
  return LEVELS[up] ?? LEVELS.INFO;
}

function nowIso() {
  return new Date().toISOString();
}

function safeStringify(value) {
  const seen = new WeakSet();
  return JSON.stringify(value, function (k, v) {
    if (typeof v === 'function') return `[Function ${v.name || 'anonymous'}]`;
    if (v instanceof Error) return { name: v.name, message: v.message, stack: v.stack };
    if (v instanceof Date) return v.toISOString();
    if (v && typeof v === 'object') {
      if (seen.has(v)) return '[Circular]';
      seen.add(v);
    }
    return v;
  });
}

function defaultFormatter(entry, structured = false) {
  if (structured) return entry;
  const base = `[${entry.timestamp}] [${entry.level}] [${entry.label}]`;
  const parts = [base];
  if (entry.message) parts.push(entry.message);
  if ('durationMs' in entry) parts.push(`duration=${entry.durationMs}ms`);
  if ('args' in entry) parts.push(`args=${entry.args}`);
  if ('result' in entry) parts.push(`result=${entry.result}`);
  if ('error' in entry) parts.push(`error=${entry.error}`);
  return parts.join(' ');
}

function consoleTransport(entry, opts = {}) {
  const { structured } = opts;
  const formatted = defaultFormatter(entry, structured);
  if (structured) {
    const method = entry.level === 'ERROR' ? 'error' : entry.level === 'DEBUG' ? 'debug' : 'info';
    console[method] ? console[method](formatted) : console.log(formatted);
    return;
  }

  if (entry.level === 'ERROR') {
    console.error(formatted);
  } else if (entry.level === 'DEBUG') {
    console.debug ? console.debug(formatted) : console.log(formatted);
  } else {
    console.info ? console.info(formatted) : console.log(formatted);
  }
}

function createFileTransport(path) {
  let fs;
  try {
    fs = require('fs');
  } catch (e) {
    return () => {
      throw new Error('fileTransport is only available in Node.js');
    };
  }

  return (entry, opts = {}) => {
    const { structured } = opts;
    const out = structured ? JSON.stringify(entry) : defaultFormatter(entry, false);
    try {
      fs.appendFileSync(path, out + '\n');
    } catch (err) {
      console.error('Failed to write log file:', err);
      console.log(out);
    }
  };
}

function createLogger(globalOpts = {}) {
  const defaults = {
    level: 'INFO',
    transports: [consoleTransport],
    structured: false,
    includeArgs: true,
    includeResult: true,
    includeDuration: true,
    formatter: defaultFormatter,
    conditional: null,
  };

  const config = { ...defaults, ...globalOpts };

  function shouldLog(level) {
    return normalizeLevel(level) >= normalizeLevel(config.level);
  }

  async function dispatch(entry) {
    const opts = { structured: config.structured };
    for (const t of config.transports) {
      try {
        t(entry, opts);
      } catch (e) {
        console.error('Log transport failed:', e);
      }
    }
  }

  function makeEntry({ level, label, message, args, result, error, durationMs }) {
    const entry = {
      timestamp: nowIso(),
      level,
      label: label || 'anonymous',
    };

    if (message) entry.message = message;
    if (config.includeDuration && typeof durationMs === 'number') entry.durationMs = durationMs;
    if (config.includeArgs && typeof args !== 'undefined') entry.args = config.structured ? args : safeStringify(args);
    if (config.includeResult && typeof result !== 'undefined') entry.result = config.structured ? result : safeStringify(result);
    if (error) entry.error = config.structured ? { name: error.name, message: error.message, stack: error.stack } : safeStringify(error);
    return entry;
  }

  function wrapFunction(fn, opts = {}) {
    if (typeof fn !== 'function') throw new TypeError('Can only wrap functions');
    const loggerLevel = opts.level || config.level;
    const label = opts.label || fn.name || 'anonymous';
    const conditional = opts.conditional || config.conditional;

    return function wrapped(...fnArgs) {
      const started = Date.now();

      const logStart = () => {
        if (!config.includeArgs) return;
        if (!shouldLog(loggerLevel)) return;
        if (typeof conditional === 'function' && !conditional({ phase: 'start', args: fnArgs })) return;
        const entry = makeEntry({ level: loggerLevel, label, args: fnArgs });
        dispatch(entry);
      };

      const logSuccess = (res) => {
        const durationMs = Math.max(0, Date.now() - started);
        if (!shouldLog(loggerLevel)) return res;
        if (typeof conditional === 'function' && !conditional({ phase: 'success', result: res })) return res;
        const entry = makeEntry({ level: loggerLevel, label, result: res, durationMs });
        dispatch(entry);
        return res;
      };

      const logError = (err) => {
        const durationMs = Math.max(0, Date.now() - started);
        const entry = makeEntry({ level: 'ERROR', label, error: err, durationMs });
        dispatch(entry);
        throw err;
      };
      try {
        logStart();
        const result = fn.apply(this, fnArgs);
        if (result && typeof result.then === 'function') {
          return result.then((r) => logSuccess(r), (e) => logError(e));
        }
        return logSuccess(result);
      } catch (e) {
        return logError(e);
      }
    };
  }

  function logDecoratorFactory(opts = {}) {
    const merged = { ...config, ...opts };

    return function decorator(...args) {
      if (args.length === 1 && typeof args[0] === 'function') {
        return wrapFunction(args[0], merged);
      }

      if (args.length === 3 && typeof args[2] === 'object') {
        const [target, name, descriptor] = args;
        const original = descriptor.value;
        if (typeof original !== 'function') return descriptor;
        descriptor.value = wrapFunction(original, merged);
        return descriptor;
      }

      return function (fn) {
        return wrapFunction(fn, merged);
      };
    };
  }

  return {
    log: logDecoratorFactory,
    wrapFunction,
    createFileTransport,
    setLevel(newLevel) {
      config.level = newLevel;
    },
    addTransport(t) {
      config.transports.push(t);
    },
  };
}

export const logger = createLogger();
export const log = (opts) => logger.log(opts);
export default createLogger;
