import { Activity, Database, FileSearch, LayoutDashboard, ShieldAlert, ShieldCheck } from 'lucide-react';
const items = [
 {id:'live',label:'Live Network',icon:Activity},
 {id:'policies',label:'SPD / SAD',icon:Database},
 {id:'inspector',label:'Packet Inspector',icon:FileSearch},
 {id:'attack',label:'Attack Lab',icon:ShieldAlert},
 {id:'scenarios',label:'Demo Scenarios',icon:ShieldCheck},
];
export default function Sidebar({activePage,setActivePage}) {
 return <aside className="sidebar"><div className="brand"><div className="brand-icon"><ShieldCheck size={23}/></div><div><h2>IPsec</h2><span>Live Security Lab</span></div></div><div className="sidebar-label">WORKSPACE</div><nav className="sidebar-nav">{items.map(({id,label,icon:Icon})=><button key={id} className={`nav-item ${activePage===id?'active':''}`} onClick={()=>setActivePage(id)}><Icon size={19}/><span>{label}</span></button>)}</nav><div className="sidebar-footer"><div className="connection-dot"/><div><strong>Simulation Online</strong><span>Ready for packet transmission</span></div></div></aside>;
}
