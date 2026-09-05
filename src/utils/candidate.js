// Candidate settings (name, ward, ballot no., poster photo, booths) shared
// across pages. Fetched once from /api/settings/candidate and cached.
import { useEffect, useState } from 'react';
import api from '../api.js';

let cache = null;
let pending = null;
const subs = new Set();

export function loadCandidate() {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = api.get('/settings/candidate')
      .then((r) => { cache = r.data; subs.forEach((fn) => fn(cache)); return cache; })
      .finally(() => { pending = null; });
  }
  return pending;
}

export async function saveCandidate(data) {
  const r = await api.put('/settings/candidate', data);
  cache = r.data;
  subs.forEach((fn) => fn(cache));
  return cache;
}

export function useCandidate() {
  const [c, setC] = useState(cache);
  useEffect(() => {
    subs.add(setC);
    loadCandidate().then(setC).catch(() => {});
    return () => subs.delete(setC);
  }, []);
  return c;
}

// Polling station text for a voter: per-part booth from settings, else the
// locality/section from the voter list.
export function boothFor(candidate, voter) {
  const part = voter?.part;
  const fromSettings = candidate?.booths && part != null && part !== '' ? candidate.booths[String(part)] : '';
  return fromSettings || voter?.locality || '';
}
