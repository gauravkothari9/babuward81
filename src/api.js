import axios from 'axios';

// In dev the Vite proxy forwards /api to the server. In production set VITE_API_URL
// (e.g. https://your-server.example.com) so the hosted client can reach the API.
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const api = axios.create({ baseURL: API_BASE + '/api' });

// Normalise failures so pages can always render `e.response.data.error` as text.
// Without this, a host's own 404 page (e.g. Vercel's `{ error: { code, message } }`)
// ends up as an object inside JSX and React crashes with a blank page.
api.interceptors.response.use(undefined, (error) => {
  const res = error.response;
  const notConfigured = !API_BASE && typeof window !== 'undefined' && !/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  let message;
  if (notConfigured && (!res || res.status === 404)) {
    message = 'API server URL is not configured. Set VITE_API_URL to the server address and redeploy.';
  } else if (!res) {
    message = error.message || 'Network error';
  } else {
    const d = res.data;
    message =
      (typeof d?.error === 'string' && d.error) ||
      (typeof d?.error?.message === 'string' && d.error.message) ||
      (typeof d?.message === 'string' && d.message) ||
      (typeof d === 'string' && d.slice(0, 200)) ||
      `Request failed (${res.status})`;
  }
  error.message = message;
  error.response = { ...(res || { status: 0 }), data: { ...(typeof res?.data === 'object' && res.data), error: message } };
  return Promise.reject(error);
});

export default api;

// Build a wa.me link. Numbers default to India (+91) when 10 digits.
export function waLink(number, message) {
  let digits = String(number || '').replace(/\D/g, '');
  if (digits.length === 10) digits = '91' + digits;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${text}`;
}

// Record a WhatsApp send on the server (also saves the number on the voter when voterId given).
export function logSend({ voterId, voterName, phone, message, mode = 'single', recipientNames = [] }) {
  return api.post('/whatsapp/log', { voterId, voterName, phone, message, mode, recipientNames });
}

// ---- Server-side WhatsApp session (photo + message sent directly) ----
export const waStatus = () => api.get('/whatsapp/status').then((r) => r.data);
export const waConnect = () => api.post('/whatsapp/connect').then((r) => r.data);
export const waLogout = () => api.post('/whatsapp/logout').then((r) => r.data);
// Sends candidate photo + message to `phone` from the linked WhatsApp and logs it.
export function waSend({ voterId, voterName, phone, message, mode = 'single', recipientNames = [], withPhoto = true }) {
  return api.post('/whatsapp/send', { voterId, voterName, phone, message, mode, recipientNames, withPhoto }).then((r) => r.data);
}
