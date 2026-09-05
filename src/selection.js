// Shared voter selection, kept in sessionStorage so it survives page
// changes (Dashboard, family view, search) until WhatsApp send / clear.
import { useSyncExternalStore } from 'react';

function load() {
  try {
    return JSON.parse(sessionStorage.getItem('selVoters')) || {};
  } catch {
    return {};
  }
}

let selected = load(); // { _id: { name, phone } }
const subs = new Set();

function emit() {
  try { sessionStorage.setItem('selVoters', JSON.stringify(selected)); } catch { /* ignore */ }
  subs.forEach((fn) => fn());
}

export function useSelection() {
  return useSyncExternalStore(
    (cb) => { subs.add(cb); return () => subs.delete(cb); },
    () => selected
  );
}

const pick = (v) => ({
  name: v.name,
  nameEn: v.nameEn || '',
  relativeNameEn: v.relativeNameEn || '',
  phone: v.phone || '',
  part: v.part ?? '',
  slNo: v.slNo ?? '',
  epicNo: v.epicNo || '',
  houseNo: v.houseNo || '',
  relation: v.relation || '',
  relativeName: v.relativeName || '',
  locality: v.locality || ''
});

export function toggleVoter(v) {
  selected = { ...selected };
  if (selected[v._id]) delete selected[v._id];
  else selected[v._id] = pick(v);
  emit();
}

export function setVoters(voters, on) {
  selected = { ...selected };
  for (const v of voters) {
    if (on) selected[v._id] = pick(v);
    else delete selected[v._id];
  }
  emit();
}

export function removeVoter(id) {
  if (!selected[id]) return;
  selected = { ...selected };
  delete selected[id];
  emit();
}

export function clearSelection() {
  selected = {};
  emit();
}
