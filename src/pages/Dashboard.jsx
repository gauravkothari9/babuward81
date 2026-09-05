import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api.js';
import { both } from '../utils/names.js';
import { useSelection, toggleVoter, setVoters } from '../selection.js';
import SelectionBar from '../components/SelectionBar.jsx';
import { useCandidate } from '../utils/candidate.js';

function CandidateCard() {
  const c = useCandidate();
  if (!c) return null;
  return (
    <div className="card candidate-card">
      {c.photo && <img src={c.photo} alt={c.nameEn || c.name} />}
      <div>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>{c.election}</div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{c.name}{c.nameEn && c.nameEn !== c.name ? ` / ${c.nameEn}` : ''}</div>
        <div style={{ marginTop: 4 }}>{c.tagline}</div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {c.ward && <span className="badge chip">वार्ड नं. {c.ward}</span>}
          {c.ballotNo && <span className="badge chip">बैलेट नं. {c.ballotNo}</span>}
          {c.symbol && <span className="badge chip">चुनाव चिन्ह : {c.symbol}{c.symbolEn ? ` (${c.symbolEn})` : ''}</span>}
        </div>
        <div style={{ marginTop: 10 }}><Link to="/candidate">Edit candidate | उम्मीदवार बदलें →</Link></div>
      </div>
    </div>
  );
}

const PAGE = 200; // rows fetched/rendered per step — keeps typing smooth on ~8,800 voters

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState('');

  const [tab, setTab] = useState('all'); // 'all' | part number
  const [q, setQ] = useState('');        // input value
  const [query, setQuery] = useState(''); // debounced value used for the API call
  const [list, setList] = useState({ voters: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(PAGE); // rows rendered so far (grows with "Show more")
  const selected = useSelection();

  function toggleAllVisible() {
    const allOn = list.voters.length > 0 && list.voters.every((v) => selected[v._id]);
    setVoters(list.voters, !allOn);
  }

  useEffect(() => {
    api.get('/voters/stats')
      .then((r) => setStats(r.data))
      .catch((e) => setErr(e.response?.data?.error || e.message));
  }, []);

  useEffect(() => {
    setLoading(true);
    let stale = false;
    api.get('/voters', { params: { q: query, part: tab === 'all' ? '' : tab, limit: shown } })
      .then((r) => { if (!stale) setList(r.data); })
      .catch((e) => { if (!stale) setErr(e.response?.data?.error || e.message); })
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, [tab, query, shown]);

  // new search / part → start again from the first rows
  useEffect(() => { setShown(PAGE); }, [tab, query]);

  // live search: debounce typing by 300ms
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  if (err) return <div className="msg err">Server error: {err}</div>;
  if (!stats) return <p>Loading...</p>;

  return (
    <>
      <h1>Dashboard</h1>
      <p className="subtitle">मतदाता सूची का सारांश (Voter list summary)</p>

      <CandidateCard />

      <div className="stats-grid">
        <div className="stat"><div className="label">Total Voters | कुल मतदाता</div><div className="value">{stats.total}</div></div>
        <div className="stat"><div className="label">Active | सक्रिय</div><div className="value" style={{ color: 'var(--green)' }}>{stats.active}</div></div>
        <div className="stat"><div className="label">Inactive | निष्क्रिय</div><div className="value" style={{ color: 'var(--red)' }}>{stats.inactive}</div></div>
        {stats.byGender.map((g) => (
          <div className="stat" key={g._id || 'na'}>
            <div className="label">Gender: {g._id || 'N/A'}</div>
            <div className="value">{g.count}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="section-title" style={{ marginTop: 0 }}>Part-wise voters | भाग अनुसार मतदाता</div>

        {stats.byPart.length === 0 ? (
          <p>
            No data yet. <Link to="/upload">Upload your Excel file</Link> to get started.
          </p>
        ) : (
          <>
            <div className="tabs">
              <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
                All | सभी<span className="count">{stats.total}</span>
              </button>
              {stats.byPart.filter((p) => p._id != null).map((p) => (
                <button
                  key={p._id}
                  className={`tab ${tab === p._id ? 'active' : ''}`}
                  onClick={() => setTab(p._id)}
                >
                  Part {p._id} | भाग {p._id}<span className="count">{p.count}</span>
                </button>
              ))}
            </div>

            <form onSubmit={(e) => e.preventDefault()} className="filters" style={{ marginBottom: 10 }}>
              <input
                type="text"
                style={{ flexGrow: 1 }}
                placeholder="Search name / EPIC No. / relative name / house no… | नाम खोजें…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {q && (
                <button
                  type="button"
                  className="btn outline"
                  onClick={() => { setQ(''); setQuery(''); }}
                >
                  Clear
                </button>
              )}
            </form>

            <p className="subtitle" style={{ marginBottom: 10 }}>
              {tab === 'all' ? 'All parts' : `Part ${tab} | भाग ${tab}`}
              {query && <> — search “{query}”</>} — {list.total} voters
            </p>
            {loading && <p>Loading…</p>}

            <SelectionBar />

            <div className="table-wrap" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={list.voters.length > 0 && list.voters.every((v) => selected[v._id])}
                        onChange={toggleAllVisible}
                        title="Select all shown"
                      />
                    </th>
                    <th>Part</th>
                    <th>Sl. No.</th>
                    <th>EPIC No.</th>
                    <th>Name | नाम</th>
                    <th>Relation</th>
                    <th>Relative Name</th>
                    <th>House</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.voters.map((v) => (
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
                      <td onClick={(e) => e.stopPropagation()}>
                        <Link to={`/voters/${v._id}`} className="btn small outline" style={{ textDecoration: 'none' }}>
                          Family
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {!loading && list.voters.length === 0 && (
                    <tr><td colSpan="11">No voters in this part.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {list.voters.length < list.total && (
              <p className="subtitle" style={{ marginTop: 8 }}>
                Showing {list.voters.length} of {list.total}.{' '}
                <button type="button" className="btn small outline" onClick={() => setShown((n) => n + PAGE)} disabled={loading}>
                  Show {Math.min(PAGE, list.total - list.voters.length)} more
                </button>
              </p>
            )}

            <div className="pagination">
              <Link to={tab === 'all' ? '/voters' : `/voters?part=${tab}`} style={{ marginLeft: 'auto' }}>
                Open in full search →
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}
