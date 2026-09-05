import axios from 'axios';

// In dev the Vite proxy forwards /api to the server. In production set VITE_API_URL
// (e.g. https://your-server.example.com) so the hosted client can reach the API.
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const api = axios.create({ baseURL: API_BASE + '/api' });

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
