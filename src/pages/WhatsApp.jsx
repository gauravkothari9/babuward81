import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { waLink, logSend, waSend } from '../api.js';
import { both } from '../utils/names.js';
import { removeVoter, clearSelection } from '../selection.js';
import { useCandidate } from '../utils/candidate.js';
import { slipMessage, shareSlip } from '../utils/slip.js';
import { useWaStatus, waReady } from '../utils/waSession.js';
import VoterSlip from '../components/VoterSlip.jsx';
import WaConnect from '../components/WaConnect.jsx';

// {name} = voter name, {slip} = candidate + voting details block
const TEMPLATES = [
  {
    label: 'Voter slip | मतदाता पर्ची (उम्मीदवार + विवरण)',
    text: '{slip}'
  },
  {
    label: 'Voting reminder | मतदान अनुस्मारक',
    text: 'नमस्ते {name} जी, कृपया मतदान के दिन अपने मताधिकार का प्रयोग अवश्य करें। आपका वोट महत्वपूर्ण है! 🗳️'
  },
  {
    label: 'Reminder + slip | अनुस्मारक + पर्ची',
    text: 'नमस्ते {name} जी, कृपया मतदान के दिन अपने मताधिकार का प्रयोग अवश्य करें। 🗳️\n\n{slip}'
  },
  { label: 'Custom | अपना संदेश', text: '' }
];

// Pause between automatic bulk sends (ms) — keeps the number from looking like spam.
const BULK_DELAY_MIN = 6000;
const BULK_DELAY_MAX = 12000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const validPhone = (number) => {
  const d = String(number || '').replace(/\D/g, '');
  return d.length === 10 || (d.length >= 11 && d.length <= 15);
};

function loadBulk() {
  try {
    const raw = sessionStorage.getItem('waBulk');
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.map((r) => ({ ...r, sent: false, error: '' })) : [];
  } catch {
    return [];
  }
}

export default function WhatsApp() {
  const [params] = useSearchParams();
  const bulk = params.get('bulk') === '1';
  const name = params.get('name') || '';
  const voterId = params.get('id') || '';
  const [saveMsg, setSaveMsg] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const candidate = useCandidate();
  const wa = useWaStatus();
  const direct = waReady(wa); // server session linked: photo + text go straight to the number
  const hasPhoto = !!candidate?.photo;

  // single mode
  const [number, setNumber] = useState(params.get('phone') || '');
  const [message, setMessage] = useState(
    name ? TEMPLATES[1].text.replace('{name}', name) : bulk ? TEMPLATES[0].text : ''
  );
  const [touched, setTouched] = useState(false);
  const [voter, setVoter] = useState(null); // full voter record (single mode)
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!voterId) return;
    api.get(`/voters/${voterId}`).then((r) => setVoter(r.data)).catch(() => {});
  }, [voterId]);

  // Default single-voter message = voter slip once voter + candidate are loaded
  useEffect(() => {
    if (!bulk && voter && candidate && !touched) setMessage(slipMessage(voter, candidate));
  }, [voter, candidate]); // eslint-disable-line

  // Expand {name} / {slip} for one recipient
  function personalize(text, r) {
    const rec = r || voter || { name };
    return String(text || '')
      .replaceAll('{name}', both(rec.name, rec.nameEn) || '')
      .replaceAll('{slip}', candidate ? slipMessage(rec, candidate) : '');
  }

  async function shareRecipientSlip(r) {
    if (!candidate) return;
    try {
      const res = await shareSlip(r, candidate);
      if (res === 'downloaded') {
        setSaveMsg('Slip image downloaded — attach it in WhatsApp | पर्ची इमेज डाउनलोड हुई');
        if (r.phone) window.open(waLink(r.phone, slipMessage(r, candidate)), '_blank');
      }
    } catch (e) {
      setErrMsg('Could not create slip: ' + e.message);
    }
  }

  // bulk mode
  const [recipients, setRecipients] = useState(bulk ? loadBulk : []);
  const [sendMode, setSendMode] = useState('multi'); // 'multi' | 'single'
  const [singleNumber, setSingleNumber] = useState('');
  const [singleMsg, setSingleMsg] = useState('');
  const [singleSent, setSingleSent] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [progress, setProgress] = useState('');
  const stopRef = useRef(false);
  const recipientsRef = useRef(recipients);
  recipientsRef.current = recipients;

  function buildListMessage(list) {
    const sep = '━━━━━━━━━━━━━━━━';
    const blocks = list.map((r, i) => {
      const lines = [`*${i + 1}. ${both(r.name, r.nameEn)}*`];
      if (r.part !== '' && r.part != null) lines.push(`📍 Part | भाग: *${r.part}*`);
      if (r.slNo !== '' && r.slNo != null) lines.push(`🔢 Sl. No. | क्रम सं.: *${r.slNo}*`);
      if (r.epicNo) lines.push(`🪪 EPIC No.: *${r.epicNo}*`);
      if (r.houseNo) lines.push(`🏠 House | मकान सं.: *${r.houseNo}*`);
      if (r.relativeName) {
        lines.push(`👤 ${r.relation || 'Relative | संबंधी'}: ${both(r.relativeName, r.relativeNameEn)}`);
      } else if (r.relation) {
        lines.push(`👤 Relation | संबंध: ${r.relation}`);
      }
      return lines.join('\n');
    });
    return [
      `🗳️ *मतदाता सूची (Voter List)*`,
      `कुल सदस्य (Total): *${list.length}*`,
      sep,
      blocks.join(`\n${sep}\n`),
      sep
    ].join('\n');
  }

  function switchMode(m) {
    setSendMode(m);
    if (m === 'single' && !singleMsg) setSingleMsg(buildListMessage(recipients));
  }

  // Deliver one message. Connected → server sends photo + text and logs it.
  // Not connected → open wa.me (text only) and log it.
  async function deliver(payload) {
    setErrMsg('');
    if (direct) {
      const out = await waSend(payload);
      const parts = out?.sent?.parts || 1;
      setSaveMsg(
        `✅ Sent to +${out?.log?.phone || payload.phone}` +
        (out?.log?.withPhoto ? ' with candidate photo' : '') +
        (parts > 1 ? ' (photo + message)' : '') +
        ' — saved to sent list | फोटो और संदेश भेज दिया गया'
      );
      return out;
    }
    window.open(waLink(payload.phone, payload.message), '_blank');
    try {
      const r = await logSend(payload);
      setSaveMsg(
        'Opened in WhatsApp — press Send there. Number saved to sent list ✅' +
        (hasPhoto ? ' · Connect WhatsApp below to send the candidate photo automatically.' : '')
      );
      return r.data;
    } catch (e) {
      setErrMsg('Could not save to sent list: ' + (e.response?.data?.error || e.message));
      return null;
    }
  }

  const errText = (e) => e?.response?.data?.error || e?.message || 'Send failed';

  async function sendSingle() {
    setSending(true);
    try {
      await deliver({
        phone: singleNumber,
        message: singleMsg,
        mode: 'list',
        recipientNames: recipients.map((r) => r.name || '')
      });
      setSingleSent(true);
      clearSelection();
      saveBulk([]);
    } catch (e) {
      setErrMsg(errText(e));
    } finally {
      setSending(false);
    }
  }

  function applyTemplate(text) {
    setTouched(true);
    setMessage(bulk ? text : personalize(text));
  }

  function updateRecipient(i, patch) {
    setRecipients((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  function saveBulk(list) {
    try { sessionStorage.setItem('waBulk', JSON.stringify(list)); } catch { /* ignore */ }
  }

  function removeRecipient(i) {
    const r = recipients[i];
    const next = recipients.filter((_, j) => j !== i);
    setRecipients(next);
    saveBulk(next);
    if (r.id) removeVoter(r.id);
    if (sendMode === 'single') setSingleMsg(buildListMessage(next));
  }

  function removeAll() {
    if (!window.confirm('Remove all selected voters from this list? | सभी चयनित मतदाता हटाएं?')) return;
    setRecipients([]);
    saveBulk([]);
    clearSelection();
    setSingleMsg('');
  }

  async function sendOne(i) {
    const r = recipientsRef.current[i];
    if (!r || !validPhone(r.phone)) return false;
    const personal = personalize(message, r);
    updateRecipient(i, { sending: true, error: '' });
    try {
      await deliver({ voterId: r.id, voterName: r.name, phone: r.phone, message: personal, mode: 'bulk' });
      updateRecipient(i, { sent: true, sending: false });
      // Sent voter leaves the shared selection; row stays here marked "Sent".
      if (r.id) removeVoter(r.id);
      saveBulk(recipientsRef.current.filter((x, j) => j !== i && !x.sent));
      return true;
    } catch (e) {
      updateRecipient(i, { sending: false, error: errText(e) });
      return false;
    }
  }

  // Automatic bulk: send to every unsent valid row, pausing between voters.
  async function sendAll() {
    if (!direct) return;
    const todo = recipients.map((r, i) => (!r.sent && validPhone(r.phone) ? i : -1)).filter((i) => i >= 0);
    if (!todo.length) return;
    if (!window.confirm(`Send photo + message to ${todo.length} voters now? | ${todo.length} मतदाताओं को अभी भेजें?`)) return;
    stopRef.current = false;
    setSendingAll(true);
    let ok = 0;
    let fail = 0;
    for (let k = 0; k < todo.length; k++) {
      if (stopRef.current) break;
      setProgress(`Sending ${k + 1} of ${todo.length}…`);
      (await sendOne(todo[k])) ? ok++ : fail++;
      if (k < todo.length - 1 && !stopRef.current) {
        const wait = BULK_DELAY_MIN + Math.random() * (BULK_DELAY_MAX - BULK_DELAY_MIN);
        setProgress(`Sent ${k + 1} of ${todo.length}. Waiting ${Math.round(wait / 1000)} s before next…`);
        await sleep(wait);
      }
    }
    setProgress('');
    setSendingAll(false);
    setSaveMsg(`Bulk finished: ${ok} sent${fail ? `, ${fail} failed (see rows)` : ''}${stopRef.current ? ' — stopped' : ''} ✅`);
  }

  async function send() {
    setSending(true);
    try {
      const finalMsg = personalize(message);
      await deliver({ voterId: voterId || undefined, voterName: name, phone: number, message: finalMsg, mode: 'single' });
      if (voterId) removeVoter(voterId);
    } catch (e) {
      setErrMsg(errText(e));
    } finally {
      setSending(false);
    }
  }

  const sentListLink = (
    <p className="subtitle" style={{ marginTop: -8 }}>
      <Link to="/whatsapp/sent">📋 View sent list | भेजी गई सूची देखें →</Link>
    </p>
  );

  const photoTag = direct && hasPhoto ? ' + 📷 photo' : '';
  const sentCount = recipients.filter((r) => r.sent).length;
  const pendingCount = recipients.filter((r) => !r.sent && validPhone(r.phone)).length;

  if (bulk) {
    return (
      <>
        <h1>Send WhatsApp Message | व्हाट्सएप संदेश भेजें</h1>
        <p className="subtitle" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span>{recipients.length} voters selected | {recipients.length} मतदाता चयनित</span>
          {recipients.length > 0 && (
            <button type="button" className="btn danger small" onClick={removeAll} disabled={sendingAll}>
              🗑 Remove all | सभी हटाएं
            </button>
          )}
        </p>
        {sentListLink}
        <WaConnect compact={direct} />
        {saveMsg && <div className="msg ok">{saveMsg}</div>}
        {errMsg && <div className="msg err">{errMsg}</div>}

        <div className="tabs">
          <button className={`tab ${sendMode === 'multi' ? 'active' : ''}`} onClick={() => switchMode('multi')}>
            Send to each voter | हर मतदाता को भेजें
          </button>
          <button className={`tab ${sendMode === 'single' ? 'active' : ''}`} onClick={() => switchMode('single')}>
            Send list to one person | सूची एक व्यक्ति को भेजें
          </button>
        </div>

        {sendMode === 'single' ? (
          <div className="card" style={{ maxWidth: 640 }}>
            <p className="subtitle" style={{ marginTop: 0 }}>
              Sends the whole selected list as one message — e.g. to a booth worker or family head.
              {direct && hasPhoto ? ' The candidate photo goes with it.' : ''}
            </p>
            {recipients.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label className="fld">Selected voters | चयनित मतदाता</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {recipients.map((r, i) => (
                    <span key={r.id || i} className="badge chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {r.name}
                      <button
                        type="button"
                        title="Remove | हटाएं"
                        onClick={() => removeRecipient(i)}
                        style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--red)', fontWeight: 700, padding: 0, lineHeight: 1 }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label className="fld">WhatsApp Number | व्हाट्सएप नंबर</label>
              <input
                type="tel"
                style={{ width: '100%' }}
                placeholder="e.g. 9876543210 or 919876543210"
                value={singleNumber}
                onChange={(e) => setSingleNumber(e.target.value)}
              />
              {singleNumber && !validPhone(singleNumber) && (
                <div className="msg err">Enter a valid number (10 digits, or 11–15 with country code).</div>
              )}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="fld">Message with voter list | संदेश (edit freely)</label>
              <textarea rows="10" value={singleMsg} onChange={(e) => setSingleMsg(e.target.value)} />
              <button
                type="button"
                className="btn outline small"
                style={{ marginTop: 6 }}
                onClick={() => setSingleMsg(buildListMessage(recipients))}
              >
                Rebuild list | सूची फिर बनाएं
              </button>
            </div>
            <button className="btn green" disabled={!validPhone(singleNumber) || sending} onClick={sendSingle}>
              {sending ? '⏳ Sending…' : direct ? `📲 Send list now${photoTag}` : '📲 Send list in WhatsApp'}
            </button>
            {singleSent && (
              <div className="msg ok">
                {direct ? 'Sent ✅' : 'Opened in WhatsApp — press Send there. ✅'} Selection cleared | चयन हटा दिया गया
              </div>
            )}
          </div>
        ) : (
          <>
        <p className="subtitle">
          {sentCount} of {recipients.length} sent.{' '}
          {direct
            ? <>Press <b>Send all</b> to deliver the candidate photo + message to every voter automatically, or Send one row at a time. | सभी को एक साथ भेजने के लिए <b>Send all</b> दबाएं।</>
            : <>WhatsApp opens one chat at a time; press Send in each chat, then come back for the next person.</>}
          {' '}Sent voters are unselected automatically | भेजे गए मतदाता स्वतः अचयनित हो जाते हैं।
        </p>

        <div className="card">
          <div style={{ marginBottom: 10 }}>
            <label className="fld">Quick templates — <code>{'{name}'}</code> = voter's name, <code>{'{slip}'}</code> = candidate + voting details of each voter</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TEMPLATES.map((t) => (
                <button key={t.label} type="button" className="btn outline small" onClick={() => applyTemplate(t.text)} disabled={sendingAll}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="fld">Message | संदेश</label>
            <textarea rows="4" value={message} onChange={(e) => setMessage(e.target.value)} disabled={sendingAll} />
          </div>
          {direct && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
              {!sendingAll ? (
                <button className="btn green" disabled={!pendingCount} onClick={sendAll}>
                  🚀 Send all ({pendingCount}){photoTag}
                </button>
              ) : (
                <button className="btn danger" onClick={() => { stopRef.current = true; }}>
                  ⏹ Stop
                </button>
              )}
              {progress && <span style={{ color: 'var(--muted)', fontSize: 13.5 }}>{progress}</span>}
            </div>
          )}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name | नाम</th>
                <th>WhatsApp Number | नंबर</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((r, i) => (
                <tr key={r.id || i}>
                  <td className="wrap"><b>{r.name}</b></td>
                  <td>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={r.phone}
                      disabled={sendingAll}
                      onChange={(e) => updateRecipient(i, { phone: e.target.value })}
                    />
                  </td>
                  <td>
                    {r.sending
                      ? <span className="badge chip">Sending…</span>
                      : r.sent
                        ? <span className="badge on">Sent ✓</span>
                        : r.error
                          ? <span className="badge off" title={r.error}>Failed: {r.error}</span>
                          : r.phone && !validPhone(r.phone)
                            ? <span className="badge off">Invalid number</span>
                            : <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className={`btn small ${r.sent ? 'outline' : 'green'}`}
                        disabled={!validPhone(r.phone) || r.sending || sendingAll}
                        onClick={() => sendOne(i)}
                      >
                        {r.sent ? 'Send again' : `📲 Send${photoTag}`}
                      </button>
                      <button className="btn small outline" title="Share slip image | पर्ची इमेज भेजें" disabled={!candidate || sendingAll} onClick={() => shareRecipientSlip(r)}>
                        🪪 Slip
                      </button>
                      <button className="btn small outline" title="Remove from list | सूची से हटाएं" disabled={sendingAll} onClick={() => removeRecipient(i)}>
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {recipients.length === 0 && (
                <tr><td colSpan="4">No voters selected. Go to the Dashboard, tick some voters, then press "Send WhatsApp".</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ maxWidth: 640, color: 'var(--muted)', fontSize: 13.5, marginTop: 16 }}>
          Tip: 10-digit numbers are automatically treated as Indian (+91). Voters without a saved
          phone number need it typed in before sending.
          {direct ? ' Bulk send pauses 6–12 seconds between voters to protect the number.' : ''}
        </div>
          </>
        )}
      </>
    );
  }

  const valid = validPhone(number);

  return (
    <>
      <h1>Send WhatsApp Message | व्हाट्सएप संदेश भेजें</h1>
      <p className="subtitle">
        {name ? <>Sending to voter: <b>{name}</b>. </> : null}
        {direct
          ? 'Type the WhatsApp number and message — the candidate photo and message are sent directly from the linked WhatsApp.'
          : 'Type the WhatsApp number and message — it opens in WhatsApp with the message ready to send.'}
        {voterId ? ' The number is saved on this voter and added to the sent list.' : ' The number is added to the sent list.'}
      </p>
      {sentListLink}
      <WaConnect compact={direct} />
      {saveMsg && <div className="msg ok">{saveMsg}</div>}
      {errMsg && <div className="msg err">{errMsg}</div>}

      <div className="card" style={{ maxWidth: 640 }}>
        <div style={{ marginBottom: 14 }}>
          <label className="fld">WhatsApp Number | व्हाट्सएप नंबर (10-digit Indian number or with country code)</label>
          <input
            type="tel"
            style={{ width: '100%' }}
            placeholder="e.g. 9876543210 or 919876543210"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
          {number && !valid && <div className="msg err">Enter a valid number (10 digits, or 11–15 with country code).</div>}
        </div>

        <div style={{ marginBottom: 10 }}>
          <label className="fld">Quick templates</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TEMPLATES.map((t) => (
              <button key={t.label} type="button" className="btn outline small" onClick={() => applyTemplate(t.text)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="fld">Message | संदेश</label>
          <textarea rows="12" value={message} onChange={(e) => { setTouched(true); setMessage(e.target.value); }} />
        </div>

        {direct && hasPhoto && candidate?.photo && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, fontSize: 13.5, color: 'var(--muted)' }}>
            <img src={candidate.photo} alt="Candidate" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
            <span>📷 This candidate photo is attached with the message. | यह फोटो संदेश के साथ जाएगी। <Link to="/candidate">change</Link></span>
          </div>
        )}

        <button className="btn green" disabled={!valid || sending} onClick={send}>
          {sending ? '⏳ Sending…' : direct ? `📲 Send now${photoTag}` : '📲 Open in WhatsApp'}
        </button>
      </div>

      {voter && <VoterSlip voter={voter} phone={number} />}

      <div className="card" style={{ maxWidth: 640, color: 'var(--muted)', fontSize: 13.5 }}>
        Tip: 10-digit numbers are automatically treated as Indian (+91).
        {direct
          ? ' Messages are sent from the linked WhatsApp number and appear in its chats.'
          : ' The message opens in WhatsApp (app or WhatsApp Web) — press Send there to deliver it.'}
      </div>
    </>
  );
}
