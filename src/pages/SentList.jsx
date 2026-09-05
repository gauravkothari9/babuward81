import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { waLink } from '../api.js';

const MODE_LABEL = {
  single: 'Single | एक',
  bulk: 'Each voter | हर मतदाता',
  list: 'List to one | सूची'
};

const fmtDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const fmtPhone = (p) => (p && p.length === 12 && p.startsWith('91') ? `+91 ${p.slice(2)}` : `+${p}`);

export default function SentList() {
  const [tab, setTab] = useState('history'); // 'history' | 'numbers'
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ logs: [], total: 0, page: 1, pages: 1 });
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(null); // expanded log id

  useEffect(() => {
    const t = setTimeout(() => { setQuery(q.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  function loadHistory() {
    setLoading(true);
    return api.get('/whatsapp/log', { params: { q: query, mode, page, limit: 50 } })
      .then((r) => setData(r.data))
      .catch((e) => setErr(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }

  function loadNumbers() {
    setLoading(true);
    return api.get('/whatsapp/numbers')
      .then((r) => setNumbers(r.data.numbers))
      .catch((e) => setErr(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadHistory(); }, [query, mode, page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === 'numbers') loadNumbers(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function remove(id) {
    if (!window.confirm('Remove this entry from the sent list?')) return;
    await api.delete(`/whatsapp/log/${id}`);
    loadHistory();
  }

  async function clearAll() {
    if (!window.confirm('Clear the whole sent list? This cannot be undone.')) return;
    await api.delete('/whatsapp/log');
    setPage(1);
    loadHistory();
    setNumbers([]);
  }

  if (err) return <div className="msg err">{err}</div>;

  return (
    <>
      <h1>WhatsApp Sent List | भेजी गई सूची</h1>
      <p className="subtitle">
        Every WhatsApp send is saved here with the number used. Numbers sent to a voter are also stored on that voter.
      </p>

      <div className="tabs">
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          Sent messages | भेजे गए संदेश<span className="count">{data.total}</span>
        </button>
        <button className={`tab ${tab === 'numbers' ? 'active' : ''}`} onClick={() => setTab('numbers')}>
          Numbers | नंबर सूची{numbers.length > 0 && <span className="count">{numbers.length}</span>}
        </button>
      </div>

      {tab === 'history' ? (
        <>
          <form onSubmit={(e) => e.preventDefault()} className="filters">
            <input
              type="text"
              style={{ flexGrow: 1 }}
              placeholder="Search name / number / message… | खोजें…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select value={mode} onChange={(e) => { setMode(e.target.value); setPage(1); }}>
              <option value="">All modes</option>
              <option value="single">Single</option>
              <option value="bulk">Each voter</option>
              <option value="list">List to one person</option>
            </select>
            {data.total > 0 && (
              <button type="button" className="btn danger" onClick={clearAll}>Clear all</button>
            )}
          </form>

          {loading && <p>Loading…</p>}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date | तारीख</th>
                  <th>Name | नाम</th>
                  <th>WhatsApp Number | नंबर</th>
                  <th>Mode</th>
                  <th>Message | संदेश</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((l) => (
                  <tr key={l._id}>
                    <td>{fmtDate(l.createdAt)}</td>
                    <td className="wrap">
                      {l.voter ? (
                        <Link to={`/voters/${l.voter._id}`}><b>{l.voter.name}</b></Link>
                      ) : (
                        <b>{l.voterName || '-'}</b>
                      )}
                      {l.voter && (
                        <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>
                          Part {l.voter.part ?? '-'} · Sl. {l.voter.slNo ?? '-'} · {l.voter.epicNo}
                        </div>
                      )}
                      {l.mode === 'list' && (
                        <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>
                          {l.recipients} voters in list
                        </div>
                      )}
                    </td>
                    <td><code>{fmtPhone(l.phone)}</code></td>
                    <td>
                      <span className="badge on">{MODE_LABEL[l.mode] || l.mode}</span>
                      <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
                        {l.via === 'api' ? (l.withPhoto ? '📷 photo + text, sent directly' : 'text, sent directly') + (l.fromPhone ? ` from +${l.fromPhone}` : '') : 'via WhatsApp link'}
                      </div>
                    </td>
                    <td
                      className="wrap"
                      style={{ maxWidth: 380, cursor: 'pointer' }}
                      onClick={() => setOpen(open === l._id ? null : l._id)}
                    >
                      {open === l._id ? (
                        <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit', fontSize: 13 }}>{l.message}</pre>
                      ) : (
                        <span title="Click to expand">
                          {(l.message || '').slice(0, 80)}{(l.message || '').length > 80 ? '…' : ''}
                        </span>
                      )}
                    </td>
                    <td>
                      <a
                        href={waLink(l.phone, l.message)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn small green"
                        style={{ textDecoration: 'none', marginRight: 6 }}
                      >
                        Resend
                      </a>
                      <button className="btn small outline" onClick={() => remove(l._id)}>Remove</button>
                    </td>
                  </tr>
                ))}
                {!loading && data.logs.length === 0 && (
                  <tr>
                    <td colSpan="6">
                      Nothing sent yet. Go to <Link to="/whatsapp">WhatsApp</Link> or select voters on the Dashboard.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data.pages > 1 && (
            <div className="pagination">
              <button className="btn outline small" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
              <span className="info">Page {data.page} of {data.pages} · {data.total} entries</span>
              <button className="btn outline small" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next →</button>
            </div>
          )}
        </>
      ) : (
        <>
          {loading && <p>Loading…</p>}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>WhatsApp Number | नंबर</th>
                  <th>Last used for | नाम</th>
                  <th>Messages sent</th>
                  <th>Last sent | अंतिम</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {numbers.map((n) => (
                  <tr key={n.phone}>
                    <td><code>{fmtPhone(n.phone)}</code></td>
                    <td className="wrap">
                      {n.voter ? <Link to={`/voters/${n.voter}`}><b>{n.voterName}</b></Link> : <b>{n.voterName || '-'}</b>}
                    </td>
                    <td>{n.count}</td>
                    <td>{fmtDate(n.lastSentAt)}</td>
                    <td>
                      <Link
                        to={`/whatsapp?${n.voter ? `id=${n.voter}&` : ''}name=${encodeURIComponent(n.voterName || '')}&phone=${encodeURIComponent(n.phone)}`}
                        className="btn small green"
                        style={{ textDecoration: 'none' }}
                      >
                        New message
                      </Link>
                    </td>
                  </tr>
                ))}
                {!loading && numbers.length === 0 && (
                  <tr><td colSpan="5">No numbers saved yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
