import { useNavigate } from 'react-router-dom';
import { useSelection, clearSelection } from '../selection.js';

// Green bar shown on any page while voters are selected.
export default function SelectionBar() {
  const navigate = useNavigate();
  const selected = useSelection();
  const count = Object.keys(selected).length;
  if (!count) return null;

  function sendToWhatsApp() {
    const recipients = Object.entries(selected).map(([id, r]) => ({ id, ...r }));
    sessionStorage.setItem('waBulk', JSON.stringify(recipients));
    navigate('/whatsapp?bulk=1');
  }

  return (
    <div className="msg ok" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <b>{count} selected | {count} चयनित</b>
      <button className="btn green small" onClick={sendToWhatsApp}>📲 Send WhatsApp | व्हाट्सएप भेजें</button>
      <button className="btn outline small" onClick={clearSelection}>Clear selection</button>
    </div>
  );
}
