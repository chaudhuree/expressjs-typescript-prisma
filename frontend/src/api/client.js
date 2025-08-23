// Simple API client wrapper for backend endpoints under /api
// Adds Authorization header from localStorage token if present.

const API_BASE = '/api/v1';

export function getToken() {
  return localStorage.getItem('accessToken') || '';
}

export function setToken(token) {
  if (token) localStorage.setItem('accessToken', token);
  else localStorage.removeItem('accessToken');
}

export async function apiFetch(path, { method = 'GET', body, headers = {}, noJson = false } = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include', // for cookie-based flows
    cache: 'no-store',
  });
  if (!res.ok) {
    let msg = 'Request failed';
    try { const j = await res.json(); msg = j?.message || msg; } catch {}
    throw new Error(msg);
  }
  return noJson ? res : res.json();
}

export function buildQuery(params) {
  const usp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && `${v}`.length) usp.set(k, v);
  });
  const s = usp.toString();
  return s ? `?${s}` : '';
}
