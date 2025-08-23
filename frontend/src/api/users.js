import { apiFetch, buildQuery } from './client';

export async function fetchUsers(params = {}) {
  const query = buildQuery(params);
  const res = await apiFetch(`/users${query}`);
  return res?.data || res;
}

export async function fetchMe() {
  const res = await apiFetch('/users/me');
  return res?.data || res;
}
