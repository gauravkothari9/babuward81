import { useState } from 'react';
import { waConnect, waLogout } from '../api.js';
import { useWaStatus, refreshWaStatus } from '../utils/waSession.js';

export const fmtPhone = (p) => (p && p.length === 12 && p.startsWith('91') ? `+91 ${p.slice(2)}` : p ? `+${p}` : '');

const STATUS_LABEL = {
  ready: '✅ Connected',
  qr: '📷 Scan QR',
  starting: '⏳ Starting…',
  authenticated: '⏳ Linked — loading…',
  disconnected: '⚪ Disconnected',
  auth_failure: '❌ Login failed',
  error: '❌ Error'
};

// Card listing the linked WhatsApp numbers: add (QR), status and unlink for each.
// When at least one number is connected, Send buttons deliver photo + message
// directly, rotating across the connected numbers.
export default function WaConnect({ compact = false }) {
  const s = useWaStatus();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [label, setLabel] = useState('');

  const accounts = s.accounts || [];
  const maxAccounts = s.maxAccounts || 1;
  const canAdd = accounts.length < maxAccounts;
  const single = maxAccounts === 1;
  const ready = accounts.filter((a) => a.status === 'ready');
  const anyReady = ready.length > 0;
  const agentOffline = s.status === 'agent_offline' || s.status === 'unavailable';

  async function add() {
    setBusy(true);
    setErr('');
    try { await waConnect({ label: label.trim() }); setLabel(''); await refreshWaStatus(); }
    catch (e) { setErr(e.response?.data?.error || e.message); }
    finally { setBusy(false); }
  }
  async function reconnect(a) {
    setBusy(true);
    setErr('');
    try { await waConnect({ accountId: a.id, label: a.label }); await refreshWaStatus(); }
    catch (e) { setErr(e.response?.data?.error || e.message); }
    finally { setBusy(false); }
  }
  async function unlink(a) {
    const who = a.phone ? fmtPhone(a.phone) : a.label || 'this number';
    if (a.status === 'ready' && !window.confirm(`Unlink ${who} from this app? You will need to scan its QR again. | ${who} अनलिंक करें?`)) return;
    setBusy(true);
    setErr('');
    try { await waLogout({ accountId: a.id }); await refreshWaStatus(); }
    catch (e) { setErr(e.response?.data?.error || e.message); }
    finally { setBusy(false); }
  }

  if (compact && anyReady) {
    return (
      <div className="msg ok" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span>
          ✅ {ready.length === 1 ? <>WhatsApp connected as <b>{fmtPhone(ready[0].phone)}</b></> : <><b>{ready.length} WhatsApp numbers</b> connected</>}
          {' '}— photo + message are sent directly{ready.length > 1 ? ', rotating between numbers' : ''}. | फोटो और संदेश सीधे भेजे जाएंगे।
        </span>
        <a href="#wa-numbers" className="btn small outline" style={{ textDecoration: 'none' }}>{single ? 'Manage' : 'Manage numbers'}</a>
      </div>
    );
  }

  return (
    <div className="card" id="wa-numbers" style={{ maxWidth: 720 }}>
      <div className="section-title" style={{ marginTop: 0 }}>{single ? '📱 WhatsApp connection | व्हाट्सएप कनेक्शन' : '📱 WhatsApp numbers | व्हाट्सएप नंबर'}</div>

      {agentOffline && (
        <div className="msg" style={{ background: '#fff8e1', border: '1px solid #f5d67a' }}>
          <b>🖥️ WhatsApp agent is not running.</b> Direct sending (candidate photo + message) is done by the agent
          process. Start it and this card will update within a few seconds. Until then, Send buttons open WhatsApp
          with the message pre-filled (text only). | एजेंट चालू नहीं है — अभी संदेश WhatsApp में खुलेगा।
          {s.lastSeen && <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>Last seen: {new Date(s.lastSeen).toLocaleString()}</div>}
        </div>
      )}
      {s.status === 'offline' && <div className="msg err">Server not reachable. {s.error}</div>}
      {s.status === 'unknown' && <div className="subtitle" style={{ margin: 0 }}>Checking…</div>}

      {!agentOffline && s.status !== 'offline' && s.status !== 'unknown' && (
        <>
          {accounts.length === 0 && (
            <p className="subtitle" style={{ marginTop: 0 }}>
              Not connected. Link the campaign WhatsApp number once — after that every Send delivers the candidate
              photo with the message automatically, without opening WhatsApp.
              {!single && ' Add several numbers to spread the sending load.'} |
              एक बार व्हाट्सएप लिंक करें, फिर हर Send में फोटो + संदेश अपने आप जाएगा।
            </p>
          )}

          {accounts.map((a) => (
            <div key={a.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <b style={{ fontSize: 15 }}>
                  {a.phone ? fmtPhone(a.phone) : a.label || 'New number'}
                  {a.name ? <span style={{ color: 'var(--muted)', fontWeight: 400 }}> ({a.name})</span> : null}
                </b>
                {a.label && a.phone && <span className="badge on" style={{ background: '#eef' }}>{a.label}</span>}
                <span className={`badge ${a.status === 'ready' ? 'on' : 'off'}`}>{STATUS_LABEL[a.status] || a.status}</span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  {(a.status === 'disconnected' || a.status === 'error' || a.status === 'auth_failure') && (
                    <button type="button" className="btn small" disabled={busy} onClick={() => reconnect(a)}>Reconnect</button>
                  )}
                  <button type="button" className="btn small outline" disabled={busy} onClick={() => unlink(a)}>
                    {a.status === 'ready' ? 'Unlink' : 'Remove'}
                  </button>
                </span>
              </div>
              {a.error && a.status !== 'ready' && <div className="msg err" style={{ marginTop: 8 }}>{a.error}</div>}
              {a.status === 'qr' && a.qr && (
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start', marginTop: 10 }}>
                  <img src={a.qr} alt="WhatsApp QR" style={{ width: 240, height: 240, border: '1px solid var(--border)', borderRadius: 8, background: '#fff' }} />
                  <ol style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.7 }}>
                    <li>Open WhatsApp on the phone with <b>this number</b> | इस नंबर वाले फोन में व्हाट्सएप खोलें</li>
                    <li>Menu ⋮ → <b>Linked devices</b> → <b>Link a device</b></li>
                    <li>Scan this QR code | यह QR स्कैन करें</li>
                  </ol>
                </div>
              )}
              {(a.status === 'starting' || a.status === 'authenticated') && (
                <div className="msg ok" style={{ marginTop: 8 }}>
                  ⏳ {a.status === 'starting' ? `Starting WhatsApp${s.remote ? ' on the agent' : ''}… (first time takes ~30 s)` : 'Linked — loading chats…'}
                </div>
              )}
            </div>
          ))}

          {canAdd && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
              {!single && (
                <input
                  type="text"
                  placeholder="Label (optional), e.g. Booth 3 phone"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  style={{ flexGrow: 1, minWidth: 180 }}
                  maxLength={40}
                />
              )}
              <button type="button" className="btn green" disabled={busy} onClick={add}>
                {single ? '🔗 Connect WhatsApp | व्हाट्सएप जोड़ें' : '➕ Add WhatsApp number | नंबर जोड़ें'}
              </button>
            </div>
          )}
          {!canAdd && !single && (
            <p className="subtitle" style={{ margin: '6px 0 0' }}>Maximum {maxAccounts} numbers linked. Unlink one to add another.</p>
          )}
          {err && <div className="msg err" style={{ marginTop: 8 }}>{err}</div>}
        </>
      )}

      {!compact && (
        <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 12 }}>
          ⚠️ Use a spare / campaign SIM, not a personal number. WhatsApp may block numbers that send many
          messages to people who have not saved them. Bulk send pauses a few seconds between messages.
        </div>
      )}
    </div>
  );
}
