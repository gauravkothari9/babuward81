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
export const waConnect = ({ accountId, label } = {}) => api.post('/whatsapp/connect', { accountId, label }).then((r) => r.data);
export const waLogout = ({ accountId } = {}) => api.post('/whatsapp/logout', { accountId }).then((r) => r.data);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Sends candidate photo + message to `phone` from the linked WhatsApp and logs it.
// When the API is serverless the send is queued for the WhatsApp agent; we then
// wait for the agent to deliver it so callers get the same { log, sent } shape.
export async function waSend({ voterId, voterName, phone, message, mode = 'single', recipientNames = [], withPhoto = true, accountId = '' }, { timeoutMs = 120000 } = {}) {
  const r = await api.post('/whatsapp/send', { voterId, voterName, phone, message, mode, recipientNames, withPhoto, accountId });
  if (r.status !== 202 || !r.data?.queued) return r.data;

  const jobId = r.data.jobId;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(1500);
    const { data } = await api.get('/whatsapp/jobs', { params: { ids: jobId } });
    const job = data.jobs?.[0];
    if (!job) continue;
    if (job.status === 'sent') {
      return { queued: true, log: { phone: job.phone, withPhoto: !!job.result?.withPhoto }, sent: { parts: job.result?.parts || 1, from: job.result?.from || '' } };
    }
    if (job.status === 'failed') {
      const err = new Error(job.error || 'Send failed');
      err.response = { status: 400, data: { error: err.message } };
      throw err;
    }
  }
  const err = new Error('Still waiting for the WhatsApp agent to deliver this message. Check the Sent List in a minute.');
  err.response = { status: 504, data: { error: err.message } };
  throw err;
}
