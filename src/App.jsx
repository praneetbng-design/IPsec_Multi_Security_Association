import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import LiveNetwork from './pages/LiveNetwork';
import Policies from './pages/Policies';
import Inspector from './pages/Inspector';
import AttackLab from './pages/AttackLab';
import Scenarios from './pages/Scenarios';
import './App.css';

export default function App(){
 const [activePage,setActivePage]=useState('live');
 const goLive=()=>setActivePage('live');
 const page={live:<LiveNetwork/>,policies:<Policies/>,inspector:<Inspector/>,attack:<AttackLab goLive={goLive}/>,scenarios:<Scenarios goLive={goLive}/>}[activePage];
 return <div className="app"><Sidebar activePage={activePage} setActivePage={setActivePage}/><main className="app-content"><div className="page-container"><Topbar activePage={activePage}/>{page}</div></main></div>;
}
