import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api.js';
import { useSelection, toggleVoter, setVoters } from '../selection.js';
import SelectionBar from '../components/SelectionBar.jsx';
import { both } from '../utils/names.js';

export default function Voters() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const selected = useSelection();
  const [q, setQ] = useState(params.get('q') || '');
  const [data, setData] = useState({ voters: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const part = params.get('part') || '';
  const gender = params.get('gender') || '';
  const active = params.get('active') || '';
  const page = parseInt(params.get('page') || '1', 10);

  useEffect(() => {
    setLoading(true);
    setErr('');
    let stale = false; // ignore responses that arrive after a newer request was sent
    api.get('/voters', { params: { q: params.get('q') || '', part, gender, active, page, limit: 25 } })
      .then((r) => { if (!stale) setData(r.data); })
      .catch((e) => { if (!stale) setErr(e.response?.data?.error || e.message); })
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, [params]);

  // live search: push the typed text into the URL 300ms after the last keystroke
  useEffect(() => {
    const current = params.get('q') || '';
    if (q.trim() === current) return;
    const t = setTimeout(() => updateParam('q', q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateParam(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next);
  }

  function goPage(p) {
    const next = new URLSearchParams(params);
    next.set('page', String(p));
    setParams(next);
  }

  return (
    <>
      <h1>Voters | मतदाता सूची</h1>
      <p className="subtitle">{data.total} voters found</p>

      <div className="filters">
        <form
          onSubmit={(e) => { e.preventDefault(); updateParam('q', q.trim()); }}
          style={{ display: 'flex', gap: 8, flexGrow: 1 }}
        >
          <input
            type="text"
            style={{ flexGrow: 1 }}
            placeholder="Search name / EPIC No. / relative name / house no…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn">Search</button>
        </form>

        <select value={part} onChange={(e) => updateParam('part', e.target.value)}>
          <option value="">All Parts | सभी भाग</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <option key={n} value={n}>Part {n}</option>)}
        </select>
        <select value={gender} onChange={(e) => updateParam('gender', e.target.value)}>
          <option value="">All Genders</option>
          <option value="M">Male | पुरुष</option>
          <option value="F">Female | महिला</option>
          <option value="पुरुष">पुरुष</option>
          <option value="महिला">महिला</option>
        </select>
        <select value={active} onChange={(e) => updateParam('active', e.target.value)}>
          <option value="">All Status</option>
          <option value="true">Active | सक्रिय</option>
          <option value="false">Inactive | निष्क्रिय</option>
        </select>
      </div>

      {err && <div className="msg err">{err}</div>}
      {loading && <p>Loading…</p>}

      <SelectionBar />

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={data.voters.length > 0 && data.voters.every((v) => selected[v._id])}
                  onChange={() => {
                    const allOn = data.voters.length > 0 && data.voters.every((v) => selected[v._id]);
                    setVoters(data.voters, !allOn);
                  }}
                  title="Select all shown"
                />
              </th>
              <th>Part</th>
              <th>Sl. No.</th>
              <th>EPIC No.</th>
              <th>Name | नाम</th>
              <th>Relation | संबंध</th>
              <th>Relative Name | पिता / पति का नाम</th>
              <th>House</th>
              <th>Age</th>
              <th>Gender</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.voters.map((v) => (
              <tr key={v._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/voters/${v._id}`)}>
                <td onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={!!selected[v._id]} onChange={() => toggleVoter(v)} />
                </td>
                <td>{v.part ?? '-'}</td>
                <td>{v.slNo ?? '-'}</td>
                <td>{v.epicNo}</td>
                <td className="wrap"><b>{both(v.name, v.nameEn)}</b></td>
                <td>{v.relation}</td>
                <td className="wrap">{both(v.relativeName, v.relativeNameEn)}</td>
                <td>{v.houseNo}</td>
                <td>{v.age ?? '-'}</td>
                <td>{v.gender}</td>
                <td>
                  <span className={`badge ${v.active ? 'on' : 'off'}`}>{v.active ? 'Active' : 'Inactive'}</span>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <Link to={`/voters/${v._id}`} className="btn small outline" style={{ textDecoration: 'none', marginRight: 6 }}>
                    Family
                  </Link>
                  <Link
                    to={`/whatsapp?id=${v._id}&name=${encodeURIComponent(both(v.name, v.nameEn))}&phone=${encodeURIComponent(v.phone || '')}`}
                    className="btn small green"
                    style={{ textDecoration: 'none' }}
                  >
                    WhatsApp
                  </Link>
                </td>
              </tr>
            ))}
            {!loading && data.voters.length === 0 && (
              <tr><td colSpan="12">No voters found. <Link to="/upload">Upload an Excel file</Link>.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button className="btn outline small" disabled={page <= 1} onClick={() => goPage(page - 1)}>← Prev</button>
        <span className="info">Page {data.page} of {data.pages || 1}</span>
        <button className="btn outline small" disabled={page >= data.pages} onClick={() => goPage(page + 1)}>Next →</button>
      </div>
    </>
  );
}
