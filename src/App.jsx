import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Upload from './pages/Upload.jsx';
import Voters from './pages/Voters.jsx';
import VoterDetail from './pages/VoterDetail.jsx';
import WhatsApp from './pages/WhatsApp.jsx';
import SentList from './pages/SentList.jsx';
import Candidate from './pages/Candidate.jsx';

export default function App() {
  return (
    <>
      <nav className="navbar">
        <span className="brand">🗳️ Election Platform</span>
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/voters">Voters | मतदाता</NavLink>
        <NavLink to="/upload">Upload Excel</NavLink>
        <NavLink to="/whatsapp" end>WhatsApp</NavLink>
        <NavLink to="/whatsapp/sent">Sent List | भेजी गई सूची</NavLink>
        <NavLink to="/candidate">Candidate | उम्मीदवार</NavLink>
      </nav>
      <div className="container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/voters" element={<Voters />} />
          <Route path="/voters/:id" element={<VoterDetail />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/whatsapp" element={<WhatsApp />} />
          <Route path="/whatsapp/sent" element={<SentList />} />
          <Route path="/candidate" element={<Candidate />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </>
  );
}
