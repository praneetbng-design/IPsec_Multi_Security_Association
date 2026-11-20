import { Database, ShieldCheck } from 'lucide-react';
import { securityPolicies } from '../data/securityPolicies';
import { securityAssociations } from '../data/securityAssociations';
import GlassCard from '../components/GlassCard';

export default function Policies() {
  return <div className="content-page"><span className="card-label">CONFIGURATION</span><h2 className="page-title">SPD & SAD</h2><p className="page-subtitle">These databases drive the live transmission. Change the policy model here conceptually, then use the Live Network to observe the decision.</p>
    <div className="database-grid">
      <GlassCard><div className="card-title-row"><div><span className="card-label">SPD</span><h3>Security Policy Database</h3></div><Database/></div><div className="table-wrap"><table><thead><tr><th>Policy</th><th>Traffic</th><th>Action</th><th>SA</th></tr></thead><tbody>{securityPolicies.map(p=><tr key={p.id}><td>{p.id}</td><td>{p.source} → {p.destination}</td><td><span className={`policy-tag ${p.action.toLowerCase()}`}>{p.action}</span></td><td>{p.sa || '—'}</td></tr>)}</tbody></table></div></GlassCard>
      <GlassCard><div className="card-title-row"><div><span className="card-label">SAD</span><h3>Security Association Database</h3></div><ShieldCheck/></div><div className="sa-detail-list">{securityAssociations.map(sa=><div className="sa-detail" key={sa.id}><div><strong>{sa.id}</strong><span>{sa.direction}</span></div><b>{sa.spi}</b><span>{sa.protocol} · {sa.mode}</span><span>{sa.encryption}</span><span>{sa.integrity}</span></div>)}</div></GlassCard>
    </div>
  </div>;
}
