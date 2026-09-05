// Live status of the server-side WhatsApp session (QR / connected phone).
// Polls /api/whatsapp/status; fast while linking, slow once connected.
import { useEffect, useState } from 'react';
import { waStatus } from '../api.js';

let cache = { status: 'unknown', qr: '', phone: '', name: '', error: '', savedSession: false, remote: false };
const subs = new Set();
let timer = null;

function broadcast(next) {
  cache = next;
  subs.forEach((fn) => fn(next));
}

async function tick() {
  try {
    broadcast(await waStatus());
  } catch (e) {
    broadcast({ ...cache, status: 'offline', error: e.message });
  }
  schedule();
}

function schedule() {
  clearTimeout(timer);
  if (!subs.size) return;
  const fast = ['starting', 'qr', 'authenticated', 'unknown'].includes(cache.status);
  timer = setTimeout(tick, fast ? 2000 : 10000);
}

export function refreshWaStatus() {
  clearTimeout(timer);
  return tick();
}

export function useWaStatus() {
  const [s, setS] = useState(cache);
  useEffect(() => {
    subs.add(setS);
    if (subs.size === 1) tick();
    return () => {
      subs.delete(setS);
      if (!subs.size) clearTimeout(timer);
    };
  }, []);
  return s;
}

export const waReady = (s) => s?.status === 'ready';
