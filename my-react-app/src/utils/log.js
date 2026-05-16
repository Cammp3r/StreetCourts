function simpleLog(fn) {
  if (typeof fn !== 'function') return fn;
  return function (...args) {
    try {
      console.log('start', fn.name || 'anon');
      const res = fn.apply(this, args);
      if (res && typeof res.then === 'function') {
        return res.then((r) => {
          console.log('end', fn.name || 'anon');
          return r;
        }, (e) => {
          console.error('error', e && e.message ? e.message : e);
          throw e;
        });
      }
      console.log('end', fn.name || 'anon');
      return res;
    } catch (e) {
      console.error('error', e && e.message ? e.message : e);
      throw e;
    }
  };
}

export default simpleLog;
