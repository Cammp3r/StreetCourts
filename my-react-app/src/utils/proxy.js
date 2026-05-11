export const AUTH_METHODS = Object.freeze({
  NONE: 'NONE',
  OAUTH: 'OAUTH',
  API_KEY: 'API_KEY',
  JWT: 'JWT',
});

function normalizeAuthMethod(method) {
  const normalized = String(method || AUTH_METHODS.NONE).toUpperCase();
  if (normalized === 'OAUTH') return AUTH_METHODS.OAUTH;
  if (normalized === 'API_KEY') return AUTH_METHODS.API_KEY;
  if (normalized === 'JWT') return AUTH_METHODS.JWT;
  return AUTH_METHODS.NONE;
}

class RateLimiter {
  constructor({ maxRequests = Number.POSITIVE_INFINITY, windowMs = 60_000 } = {}) {
    const hasValidMax = Number.isFinite(maxRequests) && maxRequests > 0;
    const hasValidWindow = Number.isFinite(windowMs) && windowMs > 0;

    this.maxRequests = hasValidMax ? maxRequests : Number.POSITIVE_INFINITY;
    this.windowMs = hasValidWindow ? windowMs : 60_000;
    this.timestamps = [];
  }

  async waitForSlot() {
    if (!Number.isFinite(this.maxRequests)) return 0;

    let waitedMs = 0;

    while (true) {
      const now = Date.now();
      this.timestamps = this.timestamps.filter((timestamp) => now - timestamp < this.windowMs);

      if (this.timestamps.length < this.maxRequests) {
        this.timestamps.push(now);
        return waitedMs;
      }

      const oldest = this.timestamps[0];
      const delayMs = Math.max(1, this.windowMs - (now - oldest));
      waitedMs += delayMs;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export class AuthProxy {
  constructor({ fetchImpl = fetch, logger = console, rateLimit, enableLogging = true } = {}) {
    this.fetchImpl = typeof fetchImpl === 'function'
      ? fetchImpl.bind(globalThis)
      : globalThis.fetch.bind(globalThis);
    this.logger = logger;
    this.enableLogging = Boolean(enableLogging);
    this.strategy = { type: AUTH_METHODS.NONE };
    this.rateLimiter = new RateLimiter(rateLimit);
    this.refreshPromise = null;

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      authRetries: 0,
      rateLimitedWaits: 0,
      totalRateLimitDelayMs: 0,
      lastRequestAt: null,
    };
  }

  setStrategy(methodOrStrategy, credential) {
    if (typeof methodOrStrategy === 'string') {
      this.setAuthMethod(methodOrStrategy, credential);
      return;
    }

    const nextStrategy = methodOrStrategy || { type: AUTH_METHODS.NONE };
    this.strategy = {
      type: normalizeAuthMethod(nextStrategy.type),
      ...nextStrategy,
    };
  }

  setAuthMethod(method, credential, options = {}) {
    const normalized = normalizeAuthMethod(method);

    if (normalized === AUTH_METHODS.API_KEY) {
      this.strategy = {
        type: AUTH_METHODS.API_KEY,
        apiKey: credential,
        headerName: options.headerName || 'x-api-key',
        queryParamName: options.queryParamName,
      };
      return;
    }

    if (normalized === AUTH_METHODS.JWT || normalized === AUTH_METHODS.OAUTH) {
      this.strategy = {
        type: normalized,
        token: credential,
        tokenType: options.tokenType || 'Bearer',
        headerName: options.headerName || 'Authorization',
        refreshToken: options.refreshToken,
        getToken: options.getToken,
      };
      return;
    }

    this.strategy = { type: AUTH_METHODS.NONE };
  }

  async request(url, options = {}) {
    const waitedMs = await this.rateLimiter.waitForSlot();
    if (waitedMs > 0) {
      this.metrics.rateLimitedWaits += 1;
      this.metrics.totalRateLimitDelayMs += waitedMs;
    }

    this.metrics.totalRequests += 1;
    this.metrics.lastRequestAt = new Date().toISOString();

    try {
      const response = await this.executeRequest(url, options, true);
      if (response.ok) {
        this.metrics.successfulRequests += 1;
      } else {
        this.metrics.failedRequests += 1;
      }
      return response;
    } catch (error) {
      this.metrics.failedRequests += 1;
      this.logError(url, error);
      throw error;
    }
  }

  async executeRequest(url, options, allowAuthRetry) {
    const startedAt = Date.now();
    const { finalUrl, headers } = await this.buildRequestConfig(url, options.headers || {});
    const requestOptions = {
      ...options,
      headers,
    };

    this.logRequest(requestOptions.method || 'GET', finalUrl, this.strategy.type);
    const response = await this.fetchImpl(finalUrl, requestOptions);
    this.logResponse(requestOptions.method || 'GET', finalUrl, response.status, Date.now() - startedAt);

    if (response.status === 401 && allowAuthRetry && this.canRefreshToken()) {
      await this.refreshAuthToken();
      this.metrics.authRetries += 1;
      return this.executeRequest(url, options, false);
    }

    return response;
  }

  async buildRequestConfig(url, initialHeaders) {
    const headers = { ...initialHeaders };
    let finalUrl = url;

    if (this.strategy.type === AUTH_METHODS.JWT || this.strategy.type === AUTH_METHODS.OAUTH) {
      const token = this.strategy.token || (typeof this.strategy.getToken === 'function'
        ? await this.strategy.getToken()
        : null);

      if (token) {
        const headerName = this.strategy.headerName || 'Authorization';
        const tokenType = this.strategy.tokenType || 'Bearer';
        headers[headerName] = `${tokenType} ${token}`;
      }
    }

    if (this.strategy.type === AUTH_METHODS.API_KEY && this.strategy.apiKey) {
      const headerName = this.strategy.headerName || 'x-api-key';
      headers[headerName] = this.strategy.apiKey;

      if (this.strategy.queryParamName) {
        const parsed = new URL(url, window.location.origin);
        parsed.searchParams.set(this.strategy.queryParamName, this.strategy.apiKey);
        finalUrl = parsed.toString();
      }
    }

    return { finalUrl, headers };
  }

  canRefreshToken() {
    return Boolean(
      (this.strategy.type === AUTH_METHODS.JWT || this.strategy.type === AUTH_METHODS.OAUTH)
      && typeof this.strategy.refreshToken === 'function'
    );
  }

  async refreshAuthToken() {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      const refreshed = await this.strategy.refreshToken();

      if (typeof refreshed === 'string') {
        this.strategy.token = refreshed;
      } else if (refreshed && typeof refreshed === 'object') {
        this.strategy.token = refreshed.accessToken || refreshed.token || this.strategy.token;
      }

      return this.strategy.token;
    })();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  logRequest(method, url, authType) {
    if (!this.enableLogging) return;
    this.logger.info?.(`[AuthProxy] -> ${method} ${url} (auth: ${authType})`);
  }

  logResponse(method, url, status, durationMs) {
    if (!this.enableLogging) return;
    this.logger.info?.(`[AuthProxy] <- ${method} ${url} status=${status} duration=${durationMs}ms`);
  }

  logError(url, error) {
    if (!this.enableLogging) return;
    this.logger.error?.(`[AuthProxy] !! ${url}`, error);
  }

  getMetrics() {
    return { ...this.metrics };
  }

  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      authRetries: 0,
      rateLimitedWaits: 0,
      totalRateLimitDelayMs: 0,
      lastRequestAt: null,
    };
  }

  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  async post(url, body, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
  }

  async put(url, body, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
  }

  async delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }
}

export function createAuthProxy(options) {
  return new AuthProxy(options);
}

const authProxy = new AuthProxy();
export default authProxy;