const LEVELS = { DEBUG: 10, INFO: 20, ERROR: 40 };

function normalize(level) {
  if (!level) return LEVELS.INFO;
  const up = String(level).toUpperCase();
  return LEVELS[up] || LEVELS.INFO;
}

function now() {
  return new Date().toISOString();
}

function createLogger(options = {}) {
  const cfg = {
    level: options.level || 'INFO',
    includeArgs: options.includeArgs ?? true,
    includeResult: options.includeResult ?? true,
  };

  function wrap(fn) {
    if (typeof fn !== 'function') return fn;

    return function (...args) {
      const start = Date.now();
      const label = fn.name || 'anonymous';
      const level = cfg.level;
      if (cfg.includeArgs) console.info(`[${now()}] [${level}] [${label}] args=${JSON.stringify(args)}`);
      try {
        const res = fn.apply(this, args);
        if (res && typeof res.then === 'function') {
          return res.then((r) => {
            const dur = Date.now() - start;
            if (cfg.includeResult) console.info(`[${now()}] [${level}] [${label}] result=${JSON.stringify(r)} duration=${dur}ms`);
            return r;
          }, (e) => {
            const dur = Date.now() - start;
            console.error(`[${now()}] [ERROR] [${label}] error=${e && e.message ? e.message : e} duration=${dur}ms`);
            throw e;
          });
        }
        const dur = Date.now() - start;
        if (cfg.includeResult) console.info(`[${now()}] [${level}] [${label}] result=${JSON.stringify(res)} duration=${dur}ms`);
        return res;
      } catch (e) {
        const dur = Date.now() - start;
        console.error(`[${now()}] [ERROR] [${label}] error=${e && e.message ? e.message : e} duration=${dur}ms`);
        throw e;
      }
    };
  }

  return { wrap };
}

export default createLogger;
