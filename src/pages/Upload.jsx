import { useState } from 'react';
import api from '../api.js';

export default function Upload() {
  const [file, setFile] = useState(null);
  const [part, setPart] = useState('');
  const [mode, setMode] = useState('append');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return setErr('Please choose an Excel file first.');
    setErr('');
    setResult(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (part) fd.append('part', part);
      fd.append('mode', mode);
      const r = await api.post('/voters/upload', fd);
      setResult(r.data);
    } catch (e2) {
      setErr(e2.response?.data?.error || e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Upload Excel | एक्सेल अपलोड करें</h1>
      <p className="subtitle">
        Supported columns: क्रम संख्या (Sl. No.), मतदाता पहचान पत्र संख्या (EPIC No.), नाम (Name), संबंध (Relation),
        पिता / पति / माता का नाम (Relative Name), मकान संख्या (House No.), आयु (Age), लिंग (Gender), स्थिति (Active).
        Hindi, English or bilingual headers all work. .xlsx / .xls / .csv accepted.
      </p>

      <form className="card" onSubmit={handleUpload}>
        <div style={{ marginBottom: 14 }}>
          <label className="fld">Excel file | फ़ाइल चुनें</label>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files[0])} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="fld">
            Default Part (1–9) — used only if the file has no भाग/Part column. Sheets named "Part 2" etc. are detected automatically.
          </label>
          <select value={part} onChange={(e) => setPart(e.target.value)}>
            <option value="">— none —</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <option key={n} value={n}>Part {n}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="fld">Mode</label>
          <label style={{ marginRight: 18 }}>
            <input type="radio" checked={mode === 'append'} onChange={() => setMode('append')} /> Add to existing data
          </label>
          <label>
            <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} /> Replace all data (पुराना डेटा हटाकर)
          </label>
        </div>

        <button className="btn" disabled={busy}>{busy ? 'Uploading…' : 'Upload'}</button>
      </form>

      {err && <div className="msg err">{err}</div>}
      {result && (
        <div className="msg ok">
          ✅ Imported <b>{result.inserted}</b> of {result.totalParsed} voters.
          {result.warnings?.length > 0 && (
            <div style={{ marginTop: 6 }}>
              Warnings: {result.warnings.slice(0, 5).join(' | ')}
              {result.warnings.length > 5 && ` … and ${result.warnings.length - 5} more`}
            </div>
          )}
        </div>
      )}
    </>
  );
}
