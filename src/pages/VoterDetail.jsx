import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api.js';
import { useSelection, toggleVoter, setVoters } from '../selection.js';
import SelectionBar from '../components/SelectionBar.jsx';
import { both } from '../utils/names.js';
import VoterSlip from '../components/VoterSlip.jsx';

function FamilyTable({ title, list }) {
  const selected = useSelection();
  if (!list.length) return null;
  const allOn = list.every((v) => selected[v._id]);
  return (
    <>
      <div className="section-title">{title} ({list.length})</div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>
                <input type="checkbox" checked={allOn} onChange={() => setVoters(list, !allOn)} title="Select all" />
              </th>
              <th>Sl. No.</th><th>EPIC No.</th><th>Name | नाम</th><th>Relation</th>
              <th>Relative Name | पिता / पति का नाम</th><th>House</th><th>Age</th><th>Gender</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((v) => (
              <tr key={v._id}>
                <td>
                  <input type="checkbox" checked={!!selected[v._id]} onChange={() => toggleVoter(v)} />
                </td>
                <td>{v.slNo ?? '-'}</td>
                <td>{v.epicNo}</td>
                <td className="wrap"><Link to={`/voters/${v._id}`}><b>{both(v.name, v.nameEn)}</b></Link></td>
                <td>{v.relation}</td>
                <td className="wrap">{both(v.relativeName, v.relativeNameEn)}</td>
                <td>{v.houseNo}</td>
                <td>{v.age ?? '-'}</td>
                <td>{v.gender}</td>
                <td><span className={`badge ${v.active ? 'on' : 'off'}`}>{v.active ? 'Active' : 'Inactive'}</span></td>
                <td>
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
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function VoterDetail() {
  const { id } = useParams();
  const selected = useSelection();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setData(null);
    api.get(`/voters/${id}/family`)
      .then((r) => {
        setData(r.data);
        setPhone(r.data.voter.phone || '');
      })
      .catch((e) => setErr(e.response?.data?.error || e.message));
  }, [id]);

  async function savePhone() {
    try {
      await api.patch(`/voters/${id}`, { phone });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
  }

  if (err) return <div className="msg err">{err}</div>;
  if (!data) return <p>Loading…</p>;

  const { voter, sameHouse, sameRelative } = data;

  return (
    <>
      <h1>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            style={{ width: 18, height: 18 }}
            checked={!!selected[voter._id]}
            onChange={() => toggleVoter({ ...voter, phone })}
            title="Select for WhatsApp"
          />
          {both(voter.name, voter.nameEn)}
        </label>
      </h1>
      <p className="subtitle">Voter details and family members | मतदाता विवरण एवं परिवार के सदस्य</p>

      <SelectionBar />

      <div className="grid2">
        <div className="card">
          <div className="kv">
            <span className="k">Part | भाग</span><span>{voter.part ?? '-'}</span>
            <span className="k">क्रम संख्या (Sl. No.)</span><span>{voter.slNo ?? '-'}</span>
            <span className="k">EPIC No. | पहचान पत्र</span><span>{voter.epicNo}</span>
            <span className="k">संबंध (Relation)</span><span>{voter.relation || '-'}</span>
            <span className="k">Relative Name | पिता / पति का नाम</span><span>{both(voter.relativeName, voter.relativeNameEn) || '-'}</span>
            <span className="k">मकान संख्या (House No.)</span><span>{voter.houseNo || '-'}</span>
            <span className="k">आयु (Age)</span><span>{voter.age ?? '-'}</span>
            <span className="k">लिंग (Gender)</span><span>{voter.gender || '-'}</span>
            <span className="k">स्थिति (Status)</span>
            <span><span className={`badge ${voter.active ? 'on' : 'off'}`}>{voter.active ? 'Active' : 'Inactive'}</span></span>
          </div>
        </div>

        <div className="card">
          <label className="fld">WhatsApp / Mobile number (save for this voter)</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ flexGrow: 1 }}
            />
            <button className="btn" onClick={savePhone}>Save</button>
            <Link
              to={`/whatsapp?id=${voter._id}&name=${encodeURIComponent(both(voter.name, voter.nameEn))}&phone=${encodeURIComponent(phone)}`}
              className="btn green"
              style={{ textDecoration: 'none' }}
            >
              Send WhatsApp →
            </Link>
          </div>
          {saved && <div className="msg ok">Phone number saved ✅</div>}
        </div>
      </div>

      <VoterSlip voter={voter} phone={phone} />

      <FamilyTable
        title={`🏠 Same house (मकान सं. ${voter.houseNo || '-'}, Part ${voter.part ?? '-'}) — family members`}
        list={sameHouse}
      />
      <FamilyTable title="👥 Same relative name (संभावित परिवार)" list={sameRelative} />

      {sameHouse.length === 0 && sameRelative.length === 0 && (
        <div className="card">No other family members found for this voter.</div>
      )}

      <p><Link to="/voters">← Back to voter list</Link></p>
    </>
  );
}
