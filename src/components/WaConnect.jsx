import { useState } from 'react';
import { waConnect, waLogout } from '../api.js';
import { useWaStatus, refreshWaStatus } from '../utils/waSession.js';

const fmtPhone = (p) => (p && p.length === 12 && p.startsWith('91') ? `+91 ${p.slice(2)}` : p ? `+${p}` : '');

// Card showing the linked WhatsApp (server session): Connect / QR / Logout.
// When connected, Send buttons deliver photo + message directly to the number.
export default function WaConnect({ compact = false }) {
  const s = useWaStatus();
  const [busy, setBusy] = useState(false);

  const [err, setErr] = useState('');

  async function connect() {
    setBusy(true);
    setErr('');
    try { await waConnect(); await refreshWaStatus(); }
    catch (e) { setErr(e.response?.data?.error || e.message); }
    finally { setBusy(false); }
  }
  async function logout() {
    if (!window.confirm('Unlink WhatsApp from this app? You will need to scan the QR again. | व्हाट्सएप अनलिंक करें?')) return;
    setBusy(true);
    try { await waLogout(); await refreshWaStatus(); } finally { setBusy(false); }
  }

  const ready = s.status === 'ready';

  if (compact && ready) {
    return (
      <div className="msg ok" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span>✅ WhatsApp connected as <b>{fmtPhone(s.phone)}</b>{s.name ? ` (${s.name})` : ''} — photo + message are sent directly. | फोटो और संदेश सीधे भेजे जाएंगे।</span>
        <button type="button" className="btn small outline" disabled={busy} onClick={logout}>Unlink</button>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <div className="section-title" style={{ marginTop: 0 }}>📱 WhatsApp connection | व्हाट्सएप कनेक्शन</div>

      {ready && (
        <>
          <div className="msg ok">
            ✅ Connected as <b>{fmtPhone(s.phone)}</b>{s.name ? ` (${s.name})` : ''}. Candidate photo + message are
            sent directly from this number. | फोटो और संदेश इसी नंबर से सीधे भेजे जाएंगे।
          </div>
          <button type="button" className="btn outline small" disabled={busy} onClick={logout}>Unlink WhatsApp | अनलिंक</button>
        </>
      )}

      {s.status === 'qr' && s.qr && (
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <img src={s.qr} alt="WhatsApp QR" style={{ width: 240, height: 240, border: '1px solid var(--border)', borderRadius: 8, background: '#fff' }} />
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.7 }}>
            <li>Open WhatsApp on the <b>campaign phone</b> | प्रचार वाले फोन में व्हाट्सएप खोलें</li>
            <li>Menu ⋮ → <b>Linked devices</b> → <b>Link a device</b></li>
            <li>Scan this QR code | यह QR स्कैन करें</li>
          </ol>
        </div>
      )}

      {(s.status === 'starting' || s.status === 'authenticated') && (
        <div className="msg ok">⏳ {s.status === 'starting' ? `Starting WhatsApp${s.remote ? ' on the campaign laptop' : ''}… (first time takes ~30 s)` : 'Linked — loading chats…'}</div>
      )}

      {(s.status === 'disconnected' || s.status === 'error' || s.status === 'auth_failure') && (
        <>
          <p className="subtitle" style={{ marginTop: 0 }}>
            Not connected. Link a WhatsApp number once — after that every Send delivers the candidate photo
            with the message automatically, without opening WhatsApp. |
            एक बार व्हाट्सएप लिंक करें, फिर हर Send में फोटो + संदेश अपने आप जाएगा।
          </p>
          {(err || s.error) && <div className="msg err">{err || s.error}</div>}
          <button type="button" className="btn green" disabled={busy} onClick={connect}>
            🔗 Connect WhatsApp | व्हाट्सएप जोड़ें
          </button>
        </>
      )}

      {(s.status === 'agent_offline' || s.status === 'unavailable') && (
        <div className="msg" style={{ background: '#fff8e1', border: '1px solid #f5d67a' }}>
          <b>🖥️ WhatsApp agent is not running.</b> Direct sending (candidate photo + message) is done by a small
          program on the campaign laptop. Start it there and this card will update within a few seconds:
          <pre style={{ margin: '8px 0', padding: '8px 10px', background: '#fff', border: '1px solid #f5d67a', borderRadius: 6, fontSize: 13 }}>cd server<br />npm run agent</pre>
          Until then, Send buttons open WhatsApp with the message pre-filled (text only).
          | प्रचार लैपटॉप पर <b>npm run agent</b> चलाएँ, फिर फोटो + संदेश सीधे जाएंगे।
          {s.lastSeen && <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>Last seen: {new Date(s.lastSeen).toLocaleString()}</div>}
        </div>
      )}
      {s.status === 'offline' && <div className="msg err">Server not reachable. {s.error}</div>}
      {s.status === 'unknown' && <div className="subtitle" style={{ margin: 0 }}>Checking…</div>}

      {!compact && (
        <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 12 }}>
          ⚠️ Use a spare / campaign SIM, not a personal number. WhatsApp may block numbers that send many
          messages to people who have not saved them. Bulk send waits a few seconds between voters.
        </div>
      )}
    </div>
  );
}
