import type { Config } from './config.js';

export class HttpError extends Error {
  status: number;
  body: any;
  code: string;

  constructor(status: number, message: string, body?: any) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
    this.code = statusToCode(status);
  }

  toJSON() {
    return {
      error: this.message,
      status: this.status,
      code: this.code,
      details: this.body,
    };
  }
}

function statusToCode(status: number): string {
  switch (status) {
    case 0: return 'NETWORK_ERROR';
    case 400: return 'BAD_REQUEST';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 422: return 'VALIDATION_ERROR';
    case 429: return 'RATE_LIMITED';
    case 500: return 'INTERNAL_ERROR';
    case 502: return 'BAD_GATEWAY';
    case 503: return 'SERVICE_UNAVAILABLE';
    case 504: return 'GATEWAY_TIMEOUT';
    default: return 'UNKNOWN_ERROR';
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  signal?: AbortSignal;
  retries?: number;
  retryDelay?: number;
}

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function request<T>(
  config: Config,
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { apiUrl, apiKey, jwt, userAgent } = config;
  // Ensure path has /api/v1 prefix
  const apiPath = path.startsWith('/api/') ? path : `/api/v1${path}`;
  const url = `${apiUrl.replace(/\/$/, '')}${apiPath}`;
  const maxRetries = options.retries ?? MAX_RETRIES;
  const baseDelay = options.retryDelay ?? BASE_DELAY;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': userAgent,
  };
  if (apiKey) headers['X-API-Key'] = apiKey;
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

  const fetchOptions: RequestInit = {
    method: options.method || (options.body ? 'POST' : 'GET'),
    headers,
  };

  if (options.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  let lastError: HttpError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180_000);

    // Combine user signal with timeout
    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }
    fetchOptions.signal = controller.signal;

    let response: Response;
    try {
      response = await fetch(url, fetchOptions);
    } catch (error: any) {
      clearTimeout(timeout);
      
      // Handle abort
      if (error.name === 'AbortError') {
        if (options.signal?.aborted) {
          throw new HttpError(0, 'Request cancelled by user');
        }
        throw new HttpError(0, 'Request timeout after 180 seconds');
      }
      
      lastError = new HttpError(0, error?.message || 'Network error');
      
      // Retry on network errors
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }
      throw lastError;
    }

    clearTimeout(timeout);

    let payload: any = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      payload = await response.json().catch(() => null);
    } else {
      payload = await response.text().catch(() => null);
    }

    if (!response.ok) {
      const message = payload?.message || payload?.error || response.statusText;
      lastError = new HttpError(response.status, message, payload);
      
      // Retry on retryable status codes
      if (RETRYABLE_STATUSES.has(response.status) && attempt < maxRetries) {
        const retryAfter = response.headers.get('retry-after');
        const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : baseDelay * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }
      
      throw lastError;
    }

    return payload as T;
  }

  throw lastError || new HttpError(0, 'Request failed after retries');
}
