// Voter slip: candidate poster + voter details, as WhatsApp text and as a
// PNG image (canvas). Format follows the reference WhatsApp message:
//
//   उम्मीदवार : Prakash Bagoriya
//   वोटिंग डिटेल्स
//   नाम : ...  पति/पिता : ...  वार्ड : 88  क्र. : 675  मतदान कार्ड : ...  मतदान स्थल : ...
import { both, englishOf } from './names.js';
import { boothFor } from './candidate.js';

const SEP = '------------------------------';

// Label for the relative line based on the relation value
export function relationLabel(relation) {
  const r = String(relation || '');
  if (r.includes('पति') || /husband/i.test(r)) return 'पति';
  if (r.includes('पिता') || /father/i.test(r)) return 'पिता';
  if (r.includes('माता') || /mother/i.test(r)) return 'माता';
  if (r.includes('अन्य') || /other/i.test(r)) return 'अन्य';
  return 'पति/पिता';
}

export function candidateLine(c) {
  if (!c) return '';
  const en = c.nameEn || '';
  const hi = c.name || '';
  return en && hi && en !== hi ? `${en} (${hi})` : en || hi;
}

// Candidate details block (the same fields as the Candidate settings page),
// used at the top of the "send list to one person" message.
export function candidateBlock(c) {
  if (!c) return '';
  const lines = [];
  if (c.name || c.nameEn) lines.push(`*उम्मीदवार | Candidate : ${candidateLine(c)}*`);
  if (c.election) lines.push(`चुनाव | Election : ${c.election}`);
  if (c.ward) lines.push(`वार्ड नं. | Ward No. : ${c.ward}`);
  if (c.ballotNo) lines.push(`बैलेट नं. | Ballot No. : ${c.ballotNo}`);
  if (c.symbol || c.symbolEn) {
    const sym = c.symbol && c.symbolEn && c.symbol !== c.symbolEn ? `${c.symbol} (${c.symbolEn})` : c.symbol || c.symbolEn;
    lines.push(`चुनाव चिन्ह | Symbol : ${sym}`);
  }
  if (c.tagline) lines.push(c.tagline);
  if (c.slogan) lines.push(`_${c.slogan}_`);
  if (c.phone) lines.push(`सम्पर्क : ${c.phone}`);
  return lines.join('\n');
}

export function slipLines(voter, c) {
  const v = voter || {};
  const lines = [];
  lines.push(`उम्मीदवार : ${candidateLine(c)}`);
  const meta = [];
  if (c?.ward) meta.push(`वार्ड नं. ${c.ward}`);
  if (c?.ballotNo) meta.push(`बैलेट नं. ${c.ballotNo}`);
  if (c?.symbol) meta.push(`चुनाव चिन्ह : ${c.symbol}`);
  if (meta.length) lines.push(meta.join(' | '));
  lines.push(SEP);
  lines.push('वोटिंग डिटेल्स');
  lines.push(`नाम : ${both(v.name, v.nameEn)}`);
  if (v.relativeName) lines.push(`${relationLabel(v.relation)} : ${both(v.relativeName, v.relativeNameEn)}`);
  if (c?.ward) lines.push(`वार्ड : ${c.ward}`);
  if (v.part !== '' && v.part != null) lines.push(`भाग (Part) : ${v.part}`);
  if (v.slNo !== '' && v.slNo != null) lines.push(`क्र. सं. : ${v.slNo}`);
  if (v.epicNo) lines.push(`मतदान कार्ड : ${v.epicNo}`);
  if (v.houseNo) lines.push(`मकान सं. : ${v.houseNo}`);
  const booth = boothFor(c, v);
  if (booth) lines.push(`मतदान स्थल : ${booth}`);
  lines.push(SEP);
  if (c?.slogan) lines.push(c.slogan);
  if (c?.phone) lines.push(`सम्पर्क : ${c.phone}`);
  return lines;
}

// Ward / ballot / symbol line under the candidate name
const isMetaLine = (l) => /^(वार्ड नं\.|बैलेट नं\.|चुनाव चिन्ह)/.test(l);
// Lines shown bold (WhatsApp *markup* and slip image)
const isBoldLine = (l) => l.startsWith('उम्मीदवार :') || isMetaLine(l) || l === 'वोटिंग डिटेल्स' || l.startsWith('नाम :');

// Plain-text WhatsApp message
export function slipMessage(voter, c) {
  return slipLines(voter, c).map((l) => (isBoldLine(l) ? `*${l}*` : l)).join('\n');
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load candidate photo'));
    img.src = src;
  });
}

function wrap(ctx, text, maxWidth) {
  const words = String(text).split(' ');
  const out = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxWidth && cur) { out.push(cur); cur = w; }
    else cur = t;
  }
  if (cur) out.push(cur);
  return out;
}

const FONT = '"Nirmala UI", "Segoe UI", "Noto Sans Devanagari", "Mangal", system-ui, sans-serif';

// Render the slip to a canvas and return it. Width fixed at 720px.
export async function renderSlip(voter, c) {
  const W = 720;
  const PAD = 36;
  let img = null;
  if (c?.photo) {
    try { img = await loadImage(c.photo); } catch { img = null; }
  }
  const imgH = img ? Math.round(W * (img.naturalHeight / img.naturalWidth)) : 0;

  // measure text block height first
  const probe = document.createElement('canvas').getContext('2d');
  const lines = slipLines(voter, c);
  const laid = [];
  for (const l of lines) {
    const isHead = l.startsWith('उम्मीदवार :') || isMetaLine(l) || l === 'वोटिंग डिटेल्स';
    const isName = l.startsWith('नाम :');
    const isSep = l === SEP;
    const size = isHead ? 30 : isName ? 28 : 26;
    const weight = isBoldLine(l) ? '700' : '400';
    probe.font = `${weight} ${size}px ${FONT}`;
    if (isSep) { laid.push({ sep: true, h: 26 }); continue; }
    for (const part of wrap(probe, l, W - PAD * 2)) {
      laid.push({ text: part, size, weight, h: Math.round(size * 1.45) });
    }
  }
  const textH = laid.reduce((s, x) => s + x.h, 0) + PAD * 2;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = imgH + textH;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (img) ctx.drawImage(img, 0, 0, W, imgH);

  let y = imgH + PAD;
  ctx.fillStyle = '#111111';
  ctx.textBaseline = 'top';
  for (const item of laid) {
    if (item.sep) {
      ctx.strokeStyle = '#999';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(PAD, y + 12);
      ctx.lineTo(W - PAD, y + 12);
      ctx.stroke();
      ctx.setLineDash([]);
      y += item.h;
      continue;
    }
    ctx.font = `${item.weight} ${item.size}px ${FONT}`;
    ctx.fillText(item.text, PAD, y);
    y += item.h;
  }
  return canvas;
}

export function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

export function slipFileName(voter) {
  const base = (englishOf(voter?.name, voter?.nameEn) || 'voter').replace(/[^\w]+/g, '_');
  return `voter_slip_${base}${voter?.epicNo ? '_' + voter.epicNo : ''}.png`;
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// Share the slip image (+ text) via the system share sheet (WhatsApp shows
// there on Android / Windows / Mac). Returns 'shared' | 'downloaded' | 'cancelled'.
export async function shareSlip(voter, c) {
  const canvas = await renderSlip(voter, c);
  const blob = await canvasToBlob(canvas);
  const name = slipFileName(voter);
  const file = new File([blob], name, { type: 'image/png' });
  const text = slipMessage(voter, c);
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text, title: 'मतदाता पर्ची (Voter Slip)' });
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
    }
  }
  downloadBlob(blob, name);
  return 'downloaded';
}

// Candidate poster alone (no voter details) as a canvas — used when a list
// message goes to one person and there is no single voter to make a slip for.
export async function renderPoster(c) {
  if (!c?.photo) throw new Error('No candidate photo set');
  const img = await loadImage(c.photo);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext('2d').drawImage(img, 0, 0);
  return canvas;
}

// Put a PNG on the clipboard so it can be pasted (Ctrl+V) into the WhatsApp
// chat that wa.me opens. `canvasPromise` is passed as a promise so the write
// starts inside the click gesture (Chrome/Edge require that).
// Returns 'copied' | 'downloaded' | 'failed'.
export async function copyImageToClipboard(canvasPromise, fileName) {
  const blobPromise = canvasPromise.then(canvasToBlob);
  if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
    try {
      let item;
      try {
        item = new ClipboardItem({ 'image/png': blobPromise });
      } catch {
        item = new ClipboardItem({ 'image/png': await blobPromise });
      }
      await navigator.clipboard.write([item]);
      return 'copied';
    } catch {
      /* fall through to download */
    }
  }
  try {
    downloadBlob(await blobPromise, fileName);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}

// Copy the voter slip (candidate photo + details) for pasting into WhatsApp.
export function copySlipImage(voter, c) {
  return copyImageToClipboard(renderSlip(voter, c), slipFileName(voter));
}

// Copy just the candidate poster for pasting into WhatsApp.
export function copyPosterImage(c) {
  return copyImageToClipboard(renderPoster(c), 'candidate.png');
}
