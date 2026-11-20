import { Bell, ShieldCheck } from 'lucide-react';

const names = {
  live: 'Live Packet Transmission',
  policies: 'Security Policy & Associations',
  inspector: 'Packet Inspector',
  attack: 'Attack Lab',
  scenarios: 'Demo Scenarios',
};

export default function Topbar({ activePage }) {
  return (
    <header className="topbar">
      <div className="topbar-heading">
        <h1>{names[activePage] || 'IPsec Live Security Lab'}</h1>
        <span>Interactive network security simulation</span>
      </div>
      <div className="topbar-actions">
        <div className="system-status"><span className="status-dot" /> Simulation Online</div>
        <button className="icon-button" aria-label="Notifications"><Bell size={18} /></button>
        <div className="admin-profile">
          <div className="admin-avatar"><ShieldCheck size={19} /></div>
          <div className="admin-info"><strong>Network Admin</strong><span>Live Demonstration</span></div>
        </div>
      </div>
    </header>
  );
}
