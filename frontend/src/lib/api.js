import { handleMockRequest } from './mockApi';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
const USE_DUMMY_DATA = (import.meta.env.VITE_USE_DUMMY_DATA || 'false') === 'true';
const CUSTOMER_TOKEN_KEY = 'qfx_customer_token';

const buildHeaders = (headers = {}, hasBody = false) => {
  const nextHeaders = { ...headers };
  const customerToken = typeof window !== 'undefined' ? window.localStorage.getItem(CUSTOMER_TOKEN_KEY) : null;
  if (hasBody && !nextHeaders['Content-Type']) {
    nextHeaders['Content-Type'] = 'application/json';
  }
  if (customerToken && !nextHeaders.Authorization) {
    nextHeaders.Authorization = `Bearer ${customerToken}`;
  }
  return nextHeaders;
};

const request = async (path, options = {}) => {
  const hasBody = options.body !== undefined;
  const method = (options.method || 'GET').toUpperCase();

  if (USE_DUMMY_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return handleMockRequest(path, method, options.body || {});
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers: buildHeaders(options.headers, hasBody),
    body: hasBody && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload?.message
        ? payload.message
        : 'Request failed';
    throw new Error(message);
  }

  return payload;
};

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

export { API_BASE_URL, USE_DUMMY_DATA, CUSTOMER_TOKEN_KEY };
