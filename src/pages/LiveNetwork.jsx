import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowRight, Check, CheckCircle2, Eye, Globe2,
  KeyRound, LockKeyhole, Play, RefreshCw, ShieldAlert, ShieldCheck,
  Target, Unlock, Zap, Wifi, ScanSearch, Database, Lock, UnlockKeyhole
} from 'lucide-react';
import { securityAssociations } from '../data/securityAssociations';
import { securityPolicies } from '../data/securityPolicies';
import { createPacket, matchPolicy } from '../logic/packetProcessor';
import { protectPayload, tamperProtectedPacket, verifyAndDecrypt } from '../logic/ipsecEngine';
import GlassCard from '../components/GlassCard';
import EventTimeline from '../components/EventTimeline';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const NORMAL_STEPS = [
  { key:'generate', title:'Packet created', icon:'📦', what:'The Head Office application creates data that needs to reach the Branch Office.', why:'Every transmission starts as application data that must be carried inside a network packet.' },
  { key:'gateway', title:'HQ gateway receives it', icon:'🛡️', what:'The packet reaches the Head Office IPsec gateway, the security checkpoint between the office and the untrusted network.', why:'The gateway decides how outgoing traffic should be handled before it leaves the office.' },
  { key:'spd', title:'SPD checks the policy', icon:'📋', what:'The Security Policy Database matches the source and destination and returns PROTECT.', why:'The SPD answers: “Should this traffic be protected, bypassed, or discarded?”' },
  { key:'sa', title:'SA-001 is selected', icon:'🔑', what:'The matching Security Association supplies the SPI, ESP mode, encryption and integrity parameters.', why:'The SPD says WHAT to do; the selected SA says HOW IPsec will do it.' },
  { key:'esp', title:'ESP protects the packet', icon:'🔒', what:'ESP adds its security information, encrypts the payload and creates an integrity value.', why:'Encryption hides the message; integrity protection helps detect modification.' },
  { key:'network', title:'Packet crosses the Internet', icon:'🌐', what:'Only the protected packet crosses the untrusted network. An observer cannot directly read the original payload.', why:'The public network is not trusted, so sensitive application data must remain protected while travelling.' },
  { key:'verify', title:'Branch gateway verifies', icon:'🔎', what:'The Branch IPsec gateway checks the packet and verifies its integrity before accepting it.', why:'A protected packet should not be delivered if its security check fails.' },
  { key:'decrypt', title:'Payload is decrypted', icon:'🔓', what:'After successful verification, the Branch gateway decrypts the protected payload.', why:'The Branch needs the original application data after the security checks are complete.' },
  { key:'deliver', title:'Packet delivered', icon:'🏢', what:'The original message reaches the Branch Office application.', why:'Secure transmission is complete.' },
];

const BYPASS_STEPS = [
  { key:'generate', title:'Packet created', icon:'📦', what:'The Head Office application creates the same kind of packet.', why:'We use the same message so the difference comes from the security policy.' },
  { key:'gateway', title:'HQ gateway receives it', icon:'🛡️', what:'The packet reaches the security gateway.', why:'The gateway is where the traffic policy is evaluated.' },
  { key:'spd', title:'SPD chooses BYPASS', icon:'⚠️', what:'The demonstration policy says this traffic may cross without IPsec protection.', why:'BYPASS is useful as a comparison scenario; it is not the normal protected company policy.' },
  { key:'network', title:'Plain packet enters Internet', icon:'🌐', what:'No SA is selected and no ESP protection is added. The payload remains readable.', why:'This shows what changes when IPsec protection is not applied.' },
  { key:'exposure', title:'Payload can be observed', icon:'👁️', what:'An interceptor on the untrusted path can potentially see the plaintext application data.', why:'Without encryption, confidentiality is not provided.' },
  { key:'deliver', title:'Packet reaches Branch', icon:'🏢', what:'The Branch receives the packet, but it was not protected by IPsec during transit.', why:'Delivery alone does not mean the communication was secure.' },
];

const TAMPER_STEPS = [
  ...NORMAL_STEPS.slice(0, 6),
  { key:'attack', title:'Attacker modifies packet', icon:'⚔️', what:'A simulated attacker changes the protected ciphertext while it is travelling through the untrusted network.', why:'This demonstrates why integrity protection matters in addition to encryption.' },
  { key:'verify', title:'Integrity check fails', icon:'🚨', what:'The Branch gateway recalculates the integrity value and detects that the packet was changed.', why:'A modified protected packet must not be trusted.' },
  { key:'reject', title:'Packet rejected', icon:'⛔', what:'The Branch gateway refuses the altered packet instead of delivering corrupted data.', why:'IPsec security processing stops an unauthenticated or modified protected packet.' },
];

const SCENARIOS = [
  { id:'normal', label:'Normal IPsec', icon:<LockKeyhole size={18}/>, title:'Protected company traffic', text:'Watch the complete secure journey from packet creation to verified delivery.', tone:'secure' },
  { id:'bypass', label:'Bypass comparison', icon:<Unlock size={18}/>, title:'What if IPsec is not applied?', text:'See the same message cross the untrusted network as readable plaintext.', tone:'warning' },
  { id:'tamper', label:'Tamper attack', icon:<ShieldAlert size={18}/>, title:'Can an attacker change it?', text:'Watch a protected packet get modified and rejected by the Branch gateway.', tone:'danger' },
];

export default function LiveNetwork() {
  const [scenario, setScenario] = useState('normal');
  const [payload, setPayload] = useState('Quarterly financial report');
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(-1);
  const [events, setEvents] = useState([]);
  const [packet, setPacket] = useState(null);
  const [selectedSA, setSelectedSA] = useState(securityAssociations[0]);
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState({ sent:0, protected:0, insecure:0, blocked:0 });
  const abortRef = useRef(false);

  const steps = scenario === 'normal' ? NORMAL_STEPS : scenario === 'bypass' ? BYPASS_STEPS : TAMPER_STEPS;
  const current = step >= 0 ? steps[step] : null;
  const progress = step < 0 ? 0 : Math.round(((step + 1) / steps.length) * 100);
  const stagePosition = useMemo(() => {
    if (step < 0) return 0;
    if (scenario === 'normal' || scenario === 'tamper') {
      const positions = [0, 25, 25, 25, 50, 50, 75, 75, 75];
      return positions[Math.min(step, positions.length - 1)];
    }
    const positions = [0, 25, 25, 50, 50, 100];
    return positions[Math.min(step, positions.length - 1)];
  }, [step, scenario]);
  const isSecure = scenario !== 'bypass';

  const addEvent = (message, type='success') => setEvents((prev) => [{ message, type, time:new Date().toLocaleTimeString() }, ...prev]);

  const reset = () => {
    abortRef.current = true;
    setRunning(false); setStep(-1); setPacket(null); setResult(null); setEvents([]);
  };

  const chooseScenario = (id) => { if (!running) { reset(); setScenario(id); } };

  const runTransmission = async () => {
    if (running || !payload.trim()) return;
    abortRef.current = false;
    setRunning(true); setResult(null); setEvents([]); setStep(0);
    const id = `PKT-${String(stats.sent + 1).padStart(4, '0')}`;
    const base = createPacket({ id, source:'192.168.1.10', destination:'192.168.2.10', payload:payload.trim() });
    setPacket(base); setStats((s)=>({...s, sent:s.sent+1}));
    addEvent(`${id} created at Head Office`);
    await sleep(1300); if (abortRef.current) return;

    setStep(1); addEvent('Packet reached the HQ IPsec gateway');
    await sleep(1300); if (abortRef.current) return;

    setStep(2);
    const policyAction = scenario === 'bypass' ? 'BYPASS' : 'PROTECT';
    const policy = matchPolicy(securityPolicies, base.source, base.destination, policyAction);
    addEvent(`SPD ${policy.id}: ${policy.action}${policy.action === 'PROTECT' ? ` → ${selectedSA.id}` : ' — no IPsec protection'}`, policy.action === 'PROTECT' ? 'success' : 'warning');
    await sleep(1500); if (abortRef.current) return;

    if (scenario === 'bypass') {
      setStep(3); addEvent('No SA selected — packet remains plaintext', 'warning');
      await sleep(1500); if (abortRef.current) return;
      setStep(4); addEvent(`Interceptor can potentially read: “${base.payload}”`, 'danger');
      await sleep(1400); if (abortRef.current) return;
      setStep(5); addEvent('Branch received the unprotected packet', 'warning');
      setResult({ ok:true, insecure:true, message:'DELIVERED WITHOUT IPsec', detail:base.payload });
      setStats((s)=>({...s, insecure:s.insecure+1})); setRunning(false); return;
    }

    setStep(3); addEvent(`${selectedSA.id} selected — SPI ${selectedSA.spi}`);
    await sleep(1400); if (abortRef.current) return;
    setStep(4); addEvent('ESP processing started');
    const protectedData = await protectPayload(base.payload, base.id, selectedSA);
    setPacket({...base, protected:true, protectedData});
    addEvent('AES-256 encryption completed');
    addEvent('HMAC-SHA256 integrity tag created');
    await sleep(1700); if (abortRef.current) return;
    setStep(5); addEvent('Protected packet entered the untrusted network');
    await sleep(1600); if (abortRef.current) return;

    if (scenario === 'tamper') {
      setStep(6); const received = tamperProtectedPacket(protectedData);
      addEvent('ATTACKER changed the protected packet in transit', 'danger');
      await sleep(1600); if (abortRef.current) return;
      setStep(7);
      const verification = await verifyAndDecrypt({...received, aad:protectedData.aad});
      addEvent('HMAC-SHA256 verification failed', 'danger');
      await sleep(1300); if (abortRef.current) return;
      setStep(8); addEvent('Modified packet rejected by Branch gateway', 'danger');
      setResult({ok:false, message:'PACKET REJECTED', detail:verification.reason});
      setStats((s)=>({...s, blocked:s.blocked+1})); setRunning(false); return;
    }

    setStep(6); addEvent('HMAC-SHA256 verification successful');
    await sleep(1300); if (abortRef.current) return;
    setStep(7); addEvent('AES-256 decryption successful');
    await sleep(1300); if (abortRef.current) return;
    setStep(8); addEvent('Original message delivered to Branch');
    setResult({ok:true, message:'PACKET DELIVERED SECURELY', detail:base.payload});
    setStats((s)=>({...s, protected:s.protected+1})); setRunning(false);
  };

  useEffect(() => () => { abortRef.current = true; }, []);

  const packetVisual = scenario === 'bypass' ? '📦' : scenario === 'tamper' && step >= 6 ? '⚠️' : step >= 7 ? '🔓' : '🔒';
  const packetLabel = scenario === 'bypass' ? 'PLAINTEXT' : scenario === 'tamper' && step >= 6 ? 'MODIFIED' : step >= 7 ? 'PAYLOAD RESTORED' : step >= 4 ? 'ESP PACKET' : 'IP PACKET';
  const packetMode = scenario === 'bypass' ? 'PLAIN' : scenario === 'tamper' && step >= 6 ? 'ALTERED' : step >= 7 ? 'DECRYPTED' : step >= 4 ? 'PROTECTED' : 'ORIGINAL';
  const packetDetails = scenario === 'bypass'
    ? { header:'IP HEADER', payload:basePayloadLabel(payload), footer:'NO ESP / NO SA' }
    : scenario === 'tamper' && step >= 6
      ? { header:'ESP + SPI 0x1001', payload:'CIPHERTEXT ✕ MODIFIED', footer:'HMAC INVALID' }
      : step >= 7
        ? { header:'IP HEADER • VERIFIED', payload:basePayloadLabel(payload), footer:'ORIGINAL DATA RESTORED' }
        : step >= 4
          ? { header:`ESP HEADER • ${selectedSA.spi}`, payload:'████████████ • CIPHERTEXT', footer:'HMAC-SHA256 ✓' }
          : { header:'IP HEADER', payload:basePayloadLabel(payload), footer:'APPLICATION DATA' };
  function basePayloadLabel(value){ return value ? (value.length > 26 ? `${value.slice(0,26)}…` : value) : 'APPLICATION DATA'; }

  return (
    <div className="mission-page">
      <section className="mission-hero">
        <div>
          <div className="mission-kicker"><Target size={13}/> NETWORK MISSION 01</div>
          <p>Send one message. Watch the security system make every decision.</p>
        </div>
        <div className="mission-status"><span/> SIMULATION ONLINE</div>
      </section>

      <section className="mission-brief glass-card">
        <div className="brief-icon"><Zap size={22}/></div>
        <div><strong>Your mission</strong><span>Transmit a message from Head Office to Branch Office through an untrusted network. The system will show what happens at every checkpoint.</span></div>
      </section>

      <section className="scenario-deck">
        {SCENARIOS.map((item) => (
          <button key={item.id} className={`scenario-card ${scenario===item.id ? `selected ${item.tone}` : ''}`} disabled={running} onClick={()=>chooseScenario(item.id)}>
            <div className="scenario-icon">{item.icon}</div>
            <div><strong>{item.label}</strong><span>{item.title}</span><small>{item.text}</small></div>
            {scenario===item.id && <CheckCircle2 className="scenario-check" size={19}/>} 
          </button>
        ))}
      </section>

      <section className="mission-console glass-card">
        <div className="console-head">
          <div><span className="story-label">LIVE TRANSMISSION</span><h2>Follow the packet</h2></div>
          <div className="console-stats"><span>Packets <b>{stats.sent}</b></span><span>Protected <b>{stats.protected}</b></span><span>Blocked <b>{stats.blocked}</b></span></div>
        </div>

        <div className={`mission-map ${scenario}`}>
          <div className="route-backdrop">
            <div className="route-label route-label-left">TRUSTED OFFICE</div>
            <div className="route-label route-label-mid"><Globe2 size={14}/> UNTRUSTED INTERNET</div>
            <div className="route-label route-label-right">TRUSTED OFFICE</div>
            <div className="route-line"><span className="route-base"/><span className="route-progress" style={{width:`${stagePosition}%`, '--packet-progress': stagePosition / 100}}/></div>
            <div className="route-dots">{[0,25,50,75,100].map((position)=><span key={position} style={{left:`${position}%`}} className={stagePosition >= position ? 'passed' : ''}/>)}</div>
          </div>

          <div className="journey-node node-hq-office">
            <div className="node-art">🏢</div><strong>HEAD OFFICE</strong><span>192.168.1.10</span><small>APPLICATION</small>
            <div className={`node-state ${step>=0?'on':''}`}>{step>=0?'PACKET CREATED':'READY'}</div>
          </div>
          <div className={`journey-node node-hq-gateway ${step>=1?'lit':''}`}>
            <div className="gateway-icon"><ShieldCheck size={22}/></div><strong>HQ GATEWAY</strong><span>IPsec CHECKPOINT</span>
            <div className={`node-state ${step>=1?'on':''}`}>{step>=2?'SPD / SA':'WAITING'}</div>
          </div>
          <div className="journey-node node-internet">
            <div className="internet-core"><Wifi size={22}/></div><strong>UNTRUSTED NETWORK</strong><span>PUBLIC INTERNET</span>
            <div className={`node-state ${step>=5?'on':''}`}>{scenario==='tamper' && step>=6?'ATTACK ZONE':step>=5?'IN TRANSIT':'WAITING'}</div>
          </div>
          <div className={`journey-node node-branch-gateway ${step>=6 || (scenario==='bypass' && step>=5)?'lit':''}`}>
            <div className="gateway-icon"><ShieldCheck size={22}/></div><strong>BRANCH GATEWAY</strong><span>VERIFY / DECRYPT</span>
            <div className={`node-state ${step>=6 || (scenario==='bypass' && step>=5)?'on':''}`}>{scenario==='tamper' && step>=8?'REJECTED':scenario==='bypass' && step>=5?'RECEIVE':step>=6?'CHECKING':'WAITING'}</div>
          </div>
          <div className={`journey-node node-branch-office ${step>=8 && scenario!=='bypass'?'lit-office':''}`}>
            <div className="node-art">🏢</div><strong>BRANCH OFFICE</strong><span>192.168.2.10</span><small>APPLICATION</small>
            <div className={`node-state ${(scenario==='bypass' ? step>=5 : step>=8 && scenario!=='tamper')?'on':''}`}>{(scenario==='bypass' && step>=5) || (step>=8 && scenario!=='tamper')?'DELIVERED':'WAITING'}</div>
          </div>

          {step>=0 && (
            <div className={`real-packet packet-${packetMode.toLowerCase()} ${isSecure?'secure':''} ${scenario==='tamper' && step>=6?'damaged':''}`} style={{left:`${stagePosition}%`, '--packet-progress': stagePosition / 100}}>
              <div className="packet-tab"><span>{packetVisual}</span><b>{packetLabel}</b></div>
              <div className="packet-header-row"><span>SRC 192.168.1.10</span><span>DST 192.168.2.10</span></div>
              <div className="packet-body"><div className="packet-stripe"/><div><b>{packetMode}</b><span>{packetDetails.payload}</span></div></div>
              <div className="packet-footer"><span>{packetDetails.header}</span><span>{packetDetails.footer}</span></div>
              <div className="packet-arrow"><ArrowRight size={13}/></div>
            </div>
          )}

          {scenario==='tamper' && step>=6 && <div className="attack-pop"><ShieldAlert size={16}/><strong>ATTACKER</strong><span>Packet modified in transit</span></div>}
          {scenario==='bypass' && step>=4 && <div className="observer-pop"><Eye size={16}/><strong>OBSERVER</strong><span>Payload is readable</span></div>}
        </div>

        <div className="packet-stage-strip">
          <div className={`packet-stage ${step>=0?'reached':''}`}><div><ScanSearch size={15}/></div><span>1</span><strong>Inspect</strong><small>Gateway receives packet</small></div>
          <div className={`packet-stage ${step>=2?'reached':''}`}><div><Database size={15}/></div><span>2</span><strong>Policy</strong><small>SPD decides PROTECT</small></div>
          <div className={`packet-stage ${step>=3?'reached':''}`}><div><KeyRound size={15}/></div><span>3</span><strong>SA context</strong><small>{scenario==='bypass'?'No SA':'SPI '+selectedSA.spi}</small></div>
          <div className={`packet-stage ${step>=4?'reached':''}`}><div><Lock size={15}/></div><span>4</span><strong>ESP transform</strong><small>{scenario==='bypass'?'Skipped':'Encrypt + HMAC'}</small></div>
          <div className={`packet-stage ${step>=6?'reached':''} ${scenario==='tamper' && step>=7?'danger-stage':''}`}><div><UnlockKeyhole size={15}/></div><span>5</span><strong>{scenario==='tamper' && step>=7?'Reject':'Output'}</strong><small>{scenario==='tamper' && step>=7?'Integrity failed':step>=6?'Verify → decrypt':'Awaiting Branch'}</small></div>
        </div>

        <div className="live-explainer">
          <div className="explainer-number">{current ? String(step+1).padStart(2,'0') : '00'}</div>
          <div className="explainer-main"><div className="explainer-title">{current ? `${current.icon} ${current.title}` : 'Ready for transmission'}</div><p>{current?.what || 'Press SEND PACKET. The simulation will pause briefly at every checkpoint so you can see what is happening.'}</p></div>
          <div className="explainer-why"><span>WHY IT MATTERS</span><p>{current?.why || 'The goal is to understand the packet journey, not just watch an animation.'}</p></div>
        </div>

        <div className="checkpoint-row">
          {steps.map((item,index)=><div key={`${item.key}-${index}`} className={`checkpoint ${index===step?'active':''} ${index<step?'done':''}`}><span>{index<step?<Check size={12}/>:index+1}</span><b>{item.title}</b></div>)}
        </div>
      </section>

      <section className="mission-input glass-card">
        <div className="message-box"><label>MESSAGE TO SEND</label><input value={payload} maxLength={90} disabled={running} onChange={(e)=>setPayload(e.target.value)} /><small>From <b>Head Office</b> → <b>Branch Office</b></small></div>
        <button className={`mission-send ${scenario}`} disabled={running || !payload.trim()} onClick={runTransmission}>{running?<Activity className="spin"/>:<Play/>}<span>{running?'PACKET IN TRANSIT':'SEND PACKET'}</span><ArrowRight size={17}/></button>
        <button className="mission-reset" disabled={running} onClick={reset}><RefreshCw size={16}/><span>Reset</span></button>
      </section>

      <section className="live-detail-grid">
        <GlassCard>
          <div className="detail-head"><div><span className="story-label">PACKET VIEW</span><h2>What is inside the packet?</h2></div><Eye/></div>
          <div className="packet-window">
            <div className="packet-side"><span>BEFORE IPsec</span><strong>{packet?.payload || payload}</strong><small>Readable application data</small></div>
            <div className="packet-transform"><ArrowRight/><span>{scenario==='bypass'?'BYPASS':'ESP'}</span></div>
            <div className={`packet-side ${scenario==='bypass'?'plain-side':'protected-side'}`}><span>{scenario==='bypass'?'ON NETWORK':'ON NETWORK'}</span><strong>{scenario==='bypass' ? (packet?.payload || payload) : (packet?.protected ? '████████████████' : 'WAITING FOR ESP')}</strong><small>{scenario==='bypass'?'Plaintext exposed':'Encrypted payload'}</small></div>
          </div>
          <div className="packet-anatomy">
            <div className="anatomy-head"><div><span className="story-label">PACKET ANATOMY</span><strong>Watch the packet change shape</strong></div><span className="anatomy-live"><span/> LIVE</span></div>
            <div className="anatomy-flow">
              <div className={`anatomy-block ${step>=0?'active':''}`}><span>IP</span><b>IP HEADER</b><small>Source + destination</small></div>
              <ArrowRight size={16}/>
              <div className={`anatomy-block ${step>=3?'active':''}`}><span>SA</span><b>SECURITY CONTEXT</b><small>{scenario==='bypass'?'Not selected':selectedSA.id+' • '+selectedSA.spi}</small></div>
              <ArrowRight size={16}/>
              <div className={`anatomy-block ${step>=4?'active secure-block':''} ${scenario==='tamper' && step>=6?'danger-block':''}`}><span>{scenario==='bypass'?'PL':'ESP'}</span><b>{scenario==='bypass'?'PLAINTEXT':'PROTECTED PAYLOAD'}</b><small>{scenario==='bypass'?'Readable on path':'Ciphertext + HMAC'}</small></div>
              <ArrowRight size={16}/>
              <div className={`anatomy-block ${step>=6?'active':''}`}><span>✓</span><b>{scenario==='tamper' && step>=7?'REJECT':'OUTPUT'}</b><small>{scenario==='tamper' && step>=7?'Modified packet stopped':'Original data restored'}</small></div>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="detail-head"><div><span className="story-label">LIVE SECURITY STATE</span><h2>Packet status</h2></div><ShieldCheck/></div>
          <div className="security-state-list">
            <div><span>Policy</span><b>{scenario==='bypass'?'BYPASS':'PROTECT'}</b></div>
            <div><span>Security Association</span><b>{scenario==='bypass'?'Not selected':selectedSA.id}</b></div>
            <div><span>SPI</span><b>{scenario==='bypass'?'—':selectedSA.spi}</b></div>
            <div><span>Encryption</span><b>{scenario==='bypass'?'None':'AES-256'}</b></div>
            <div><span>Integrity</span><b>{scenario==='bypass'?'None':'HMAC-SHA256'}</b></div>
            <div><span>Current state</span><b className={result?.ok===false?'danger-text':scenario==='bypass'?'warning-text':'safe-text'}>{result?.ok===false?'REJECTED':result?.message || 'READY'}</b></div>
          </div>
        </GlassCard>
      </section>

      <section className="live-detail-grid bottom-details">
        <GlassCard>
          <div className="detail-head"><div><span className="story-label">LIVE EVENT FEED</span><h2>System activity</h2></div><Activity/></div>
          <EventTimeline events={events}/>
        </GlassCard>
        <GlassCard>
          <div className="detail-head"><div><span className="story-label">MULTI-SA</span><h2>Security Association in use</h2></div><KeyRound/></div>
          {scenario==='bypass' ? <div className="sa-message warning-box"><Unlock size={22}/><div><strong>No SA selected</strong><span>The demonstration policy chose BYPASS, so the packet does not enter IPsec protection.</span></div></div> : <div className="sa-live-card"><div className="sa-live-top"><span>ACTIVE CONTEXT</span><b>{selectedSA.id}</b></div><div className="sa-live-grid"><span>SPI <b>{selectedSA.spi}</b></span><span>Protocol <b>ESP</b></span><span>Mode <b>Tunnel</b></span><span>Encryption <b>AES-256</b></span><span>Integrity <b>HMAC-SHA256</b></span></div><div className="sa-switcher">{securityAssociations.filter(sa=>sa.direction==='HQ → Branch').map(sa=><button key={sa.id} disabled={running} className={selectedSA.id===sa.id?'selected':''} onClick={()=>setSelectedSA(sa)}>{sa.id}</button>)}</div></div>}
        </GlassCard>
      </section>

      <section className="mission-principle"><ShieldCheck size={22}/><div><strong>Remember the journey</strong><span><b>SPD</b> decides what should happen → <b>SA/SAD</b> provides the security parameters → <b>ESP</b> protects the packet → the <b>untrusted network</b> carries it → the Branch gateway <b>verifies and decrypts</b> it.</span></div></section>
    </div>
  );
}
