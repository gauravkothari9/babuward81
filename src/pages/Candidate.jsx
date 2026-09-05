import { useEffect, useState } from 'react';
import { useCandidate, saveCandidate } from '../utils/candidate.js';
import { renderSlip } from '../utils/slip.js';

const SAMPLE_VOTER = {
  name: 'संभव फोफलिया', nameEn: 'Sambhav Phophaliya', relation: 'पिता (Father)',
  relativeName: 'संजय फोफलिया', relativeNameEn: 'Sanjay Phophaliya',
  part: 3, slNo: 675, epicNo: 'YJW2483014', houseNo: '12',
  locality: 'सामुदायिक भवन रूप वाटिका मण्डोरिया गेट के बाहर, रूपा'
};

const FIELDS = [
  ['name', 'Candidate name (Hindi) | उम्मीदवार का नाम'],
  ['nameEn', 'Candidate name (English)'],
  ['election', 'Election | चुनाव'],
  ['ward', 'Ward No. | वार्ड नं.'],
  ['ballotNo', 'Ballot No. | बैलेट नं.'],
  ['symbol', 'Symbol (Hindi) | चुनाव चिन्ह'],
  ['symbolEn', 'Symbol (English)'],
  ['tagline', 'Tagline | परिचय'],
  ['slogan', 'Slogan | नारा'],
  ['phone', 'Contact number | सम्पर्क']
];

function readFile(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(new Error('Could not read file'));
    fr.readAsDataURL(file);
  });
}

// Downscale to max 1000px wide JPEG so the data URL stays small.
function shrink(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const max = 1000;
      const scale = Math.min(1, max / img.naturalWidth);
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.naturalWidth * scale);
      cv.height = Math.round(img.naturalHeight * scale);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      resolve(cv.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export default function Candidate() {
  const current = useCandidate();
  const [form, setForm] = useState(null);
  const [preview, setPreview] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (current && !form) setForm({ ...current, booths: { ...(current.booths || {}) } }); }, [current]); // eslint-disable-line

  useEffect(() => {
    if (!form) return;
    let stale = false;
    const t = setTimeout(() => {
      renderSlip(SAMPLE_VOTER, form).then((cv) => { if (!stale) setPreview(cv.toDataURL('image/png')); }).catch(() => {});
    }, 300);
    return () => { stale = true; clearTimeout(t); };
  }, [form]);

  if (!form) return <p>Loading…</p>;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setBooth = (part, v) => setForm((f) => ({ ...f, booths: { ...f.booths, [part]: v } }));

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const raw = await readFile(file);
      set('photo', await shrink(raw));
    } catch (ex) {
      setErr(ex.message);
    }
  }

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      await saveCandidate(form);
      setMsg('Saved ✅ | सहेजा गया');
    } catch (ex) {
      setErr(ex.response?.data?.error || ex.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h1>Candidate | उम्मीदवार</h1>
      <p className="subtitle">
        Candidate poster and details used on every voter slip and WhatsApp message.
        | मतदाता पर्ची और व्हाट्सएप संदेश में उपयोग होने वाला उम्मीदवार का पोस्टर व विवरण।
      </p>
      {msg && <div className="msg ok">{msg}</div>}
      {err && <div className="msg err">{err}</div>}

      <form onSubmit={onSave} className="grid2">
        <div>
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>Details | विवरण</div>
            {FIELDS.map(([k, label]) => (
              <div key={k} style={{ marginBottom: 10 }}>
                <label className="fld">{label}</label>
                <input type="text" style={{ width: '100%' }} value={form[k] || ''} onChange={(e) => set(k, e.target.value)} />
              </div>
            ))}
          </div>

          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>Poster / photo | पोस्टर</div>
            <input type="file" accept="image/*" onChange={onPhoto} />
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="button" className="btn outline small" onClick={() => set('photo', '/candidate.jpeg')}>
                Use default poster
              </button>
              <button type="button" className="btn outline small" onClick={() => set('photo', '')}>
                No photo
              </button>
            </div>
            {form.photo && <img src={form.photo} alt="Candidate" style={{ maxWidth: 220, marginTop: 12, borderRadius: 8, border: '1px solid var(--border)' }} />}
          </div>

          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>Polling stations per Part | भागवार मतदान स्थल</div>
            <p className="subtitle" style={{ marginTop: 0 }}>
              Shown as "मतदान स्थल" on the slip. Leave blank to use the locality from the voter list.
            </p>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((p) => (
              <div key={p} style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ color: 'var(--muted)', fontSize: 13.5 }}>Part {p}</span>
                <input type="text" value={form.booths?.[p] || ''} placeholder="e.g. 619 - सामुदायिक भवन, रूप वाटिका" onChange={(e) => setBooth(p, e.target.value)} />
              </div>
            ))}
          </div>

          <button className="btn" disabled={saving}>{saving ? 'Saving…' : '💾 Save | सहेजें'}</button>
        </div>

        <div>
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>Slip preview (sample voter) | पर्ची का नमूना</div>
            {preview ? <img src={preview} alt="Slip preview" style={{ width: '100%', maxWidth: 420, border: '1px solid var(--border)', borderRadius: 8 }} /> : <p>Generating…</p>}
          </div>
        </div>
      </form>
    </>
  );
}
