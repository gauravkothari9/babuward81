import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCandidate } from '../utils/candidate.js';
import { renderSlip, canvasToBlob, downloadBlob, slipFileName, shareSlip, slipMessage } from '../utils/slip.js';
import { waLink } from '../api.js';

// Preview of the voter slip (candidate poster + voter details) with
// Share / Download / WhatsApp buttons.
export default function VoterSlip({ voter, phone, compact = false }) {
  const candidate = useCandidate();
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!candidate || !voter) return;
    let stale = false;
    renderSlip(voter, candidate)
      .then((cv) => { if (!stale) setPreview(cv.toDataURL('image/png')); })
      .catch(() => {});
    return () => { stale = true; };
  }, [candidate, voter]);

  if (!voter) return null;

  async function onShare() {
    setBusy(true);
    setNote('');
    try {
      const r = await shareSlip(voter, candidate);
      if (r === 'shared') setNote('Shared ✅ | साझा किया गया');
      else if (r === 'downloaded') {
        setNote('Image downloaded — attach it in WhatsApp. | इमेज डाउनलोड हुई, व्हाट्सएप में अटैच करें।');
        if (phone) window.open(waLink(phone, slipMessage(voter, candidate)), '_blank');
      }
    } catch (e) {
      setNote('Could not create slip: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function onDownload() {
    setBusy(true);
    try {
      const cv = await renderSlip(voter, candidate);
      downloadBlob(await canvasToBlob(cv), slipFileName(voter));
      setNote('Downloaded ✅');
    } finally {
      setBusy(false);
    }
  }

  async function onCopyText() {
    try {
      await navigator.clipboard.writeText(slipMessage(voter, candidate));
      setNote('Text copied ✅ | संदेश कॉपी हुआ');
    } catch {
      setNote('Copy failed');
    }
  }

  return (
    <div className="card slip-card">
      <div className="section-title" style={{ marginTop: 0 }}>
        🪪 Voter Slip | मतदाता पर्ची
        {candidate && (
          <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 13.5, marginLeft: 8 }}>
            उम्मीदवार : {candidate.nameEn} ({candidate.name}) · <Link to="/candidate">edit</Link>
          </span>
        )}
      </div>
      <div className="slip-row">
        <div className="slip-preview">
          {preview
            ? <img src={preview} alt="Voter slip" />
            : <div style={{ padding: 30, color: 'var(--muted)' }}>Generating slip…</div>}
        </div>
        <div className="slip-actions">
          <button className="btn green" disabled={busy || !candidate} onClick={onShare}>
            📲 Share slip to WhatsApp | पर्ची भेजें
          </button>
          <button className="btn outline" disabled={busy || !candidate} onClick={onDownload}>
            ⬇ Download image | इमेज डाउनलोड
          </button>
          <button className="btn outline" disabled={!candidate} onClick={onCopyText}>
            📋 Copy text | टेक्स्ट कॉपी
          </button>
          {phone && candidate && (
            <a className="btn outline" href={waLink(phone, slipMessage(voter, candidate))} target="_blank" rel="noreferrer">
              💬 Send text only to {phone}
            </a>
          )}
          {note && <div className="msg ok" style={{ margin: 0 }}>{note}</div>}
          {!compact && (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>
              "Share" opens the system share sheet (choose WhatsApp). If sharing is not
              supported here, the image downloads and WhatsApp opens with the text — attach the image there.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
