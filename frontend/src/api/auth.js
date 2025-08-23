import { apiFetch, setToken } from './client';

export async function login(payload) {
  // payload: { email, password }
  const res = await apiFetch('/auth/login', { method: 'POST', body: payload });
  // Expect res.data.accessToken (based on backend cookie/token setup)
  const token = res?.data?.accessToken || res?.data?.token || res?.accessToken || '';
  if (token) setToken(token);
  return res?.data || res;
}

export async function register(payload) {
  // payload: { firstName, lastName, email, password }
  const res = await apiFetch('/auth/register', { method: 'POST', body: payload });
  // Optionally auto-login if token returned
  const token = res?.data?.accessToken || res?.data?.token || res?.accessToken || '';
  if (token) setToken(token);
  return res?.data || res;
}

export async function me() {
  const res = await apiFetch('/users/me');
  return res?.data || res;
}

export function logout() {
  setToken('');
  // If server supports logout endpoint, call it here
}
