import { FileSearch, Lock, ShieldCheck } from 'lucide-react';
import GlassCard from '../components/GlassCard';

export default function Inspector() {
 return <div className="content-page"><span className="card-label">OBSERVABILITY</span><h2 className="page-title">Packet Inspector</h2><p className="page-subtitle">The inspector is now driven by the live simulator. Send a packet from Live Network to see its actual generated, protected and verified states.</p>
 <GlassCard className="inspector-guide"><FileSearch size={32}/><div><h3>Use the Live Network</h3><p>Enter a payload and press SEND PACKET. The live simulator automatically applies the configured IPsec policy, then exposes the packet fields, ESP transformation and verification state at every checkpoint. Bypass and tampering are separate demonstration scenarios.</p></div></GlassCard>
 <div className="concept-grid"><GlassCard><Lock/><h3>Secure state</h3><p>ESP packet, AES-256 encrypted payload, SPI and HMAC-SHA256 integrity metadata.</p></GlassCard><GlassCard><ShieldCheck/><h3>Verification</h3><p>The Branch gateway verifies the integrity tag before decrypting the protected payload.</p></GlassCard></div>
 </div>
}
