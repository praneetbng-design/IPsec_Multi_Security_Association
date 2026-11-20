const enc = new TextEncoder();
const dec = new TextDecoder();

function bytesToB64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}
function b64ToBytes(value) {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
function hex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function deriveKeys(seed = 'ipsec-demo-lab-key') {
  const material = await crypto.subtle.importKey('raw', enc.encode(seed), 'PBKDF2', false, ['deriveKey']);
  const aes = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('IPSEC-SIM-SALT'), iterations: 120000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  const hmac = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('IPSEC-HMAC-SALT'), iterations: 120000, hash: 'SHA-256' },
    material,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    false,
    ['sign', 'verify']
  );
  return { aes, hmac };
}

export async function protectPayload(payload, packetId, sa) {
  if (!window.crypto?.subtle) throw new Error('Web Crypto API is unavailable in this browser.');
  const { aes, hmac } = await deriveKeys();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = enc.encode(`${packetId}|${sa.spi}|${sa.id}`);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, aes, enc.encode(payload)));
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', hmac, cipher));
  return { ciphertext: bytesToB64(cipher), iv: bytesToB64(iv), mac: hex(mac), aad: new TextDecoder().decode(aad) };
}

export async function verifyAndDecrypt(protectedPacket) {
  const { aes, hmac } = await deriveKeys();
  const cipher = b64ToBytes(protectedPacket.ciphertext);
  const suppliedMac = protectedPacket.mac;
  const actual = new Uint8Array(await crypto.subtle.sign('HMAC', hmac, cipher));
  if (hex(actual) !== suppliedMac) return { ok: false, reason: 'HMAC-SHA256 integrity verification failed. Packet was modified or corrupted.' };
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64ToBytes(protectedPacket.iv), additionalData: enc.encode(protectedPacket.aad) },
      aes,
      cipher
    );
    return { ok: true, payload: dec.decode(plain) };
  } catch {
    return { ok: false, reason: 'AES-256 decryption failed. Packet authentication could not be completed.' };
  }
}

export function tamperProtectedPacket(packet) {
  const bytes = b64ToBytes(packet.ciphertext);
  if (bytes.length) bytes[Math.floor(bytes.length / 2)] ^= 0x01;
  return { ...packet, ciphertext: bytesToB64(bytes) };
}
