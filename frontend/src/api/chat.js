import { apiFetch } from './client';

export async function listConversations() {
  const res = await apiFetch('/chat/conversations');
  return res?.data || res;
}

export async function getMessages(otherUserId) {
  const res = await apiFetch(`/chat/messages/${otherUserId}`);
  return res?.data || res;
}

export async function markSeen(otherUserId) {
  await apiFetch(`/chat/seen/${otherUserId}`, { method: 'POST' });
}

export async function sendMessage(otherUserId, content) {
  const res = await apiFetch(`/chat/messages/${otherUserId}`, {
    method: 'POST',
    body: { content },
  });
  return res?.data || res;
}
