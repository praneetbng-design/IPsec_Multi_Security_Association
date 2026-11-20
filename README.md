# IPsec Live Security Lab

A conceptual, interactive IPsec multi-Security Association simulator for demonstrating secure and insecure packet transmission between a Head Office and Branch Office.

## What the project demonstrates

- Generate a packet with a real user-entered message.
- Follow the packet visually from Head Office to Branch Office.
- Secure path: SPD -> selected SA/SAD context -> ESP -> encrypted payload -> untrusted network -> verification -> decryption -> delivery.
- Insecure path: SPD -> BYPASS -> plaintext network -> payload exposure -> delivery.
- Optional attacker/interception demonstration.
- Real browser cryptographic processing using Web Crypto API for AES-256-class encryption (AES-GCM) and HMAC-SHA256 integrity verification.
- Packet inspector, event timeline, SPD/SAD configuration, attack lab and demo scenarios.

## Important scope

This is an educational simulator, not a real operating-system IPsec tunnel, router configuration, or live packet capture system. The network path is simulated in the browser while the cryptographic demonstration uses the browser Web Crypto API.

## Run

```powershell
npm install
npm run dev
```

Open the localhost URL shown by Vite.

## Best presentation sequence

1. Open Live Network.
2. Enter a message such as `Quarterly financial report`.
3. Select Secure transmission.
4. Click Send Packet and explain each stage as the packet moves.
5. Show the encrypted payload in the packet inspector.
6. Reset.
7. Select Insecure transmission and send the same message.
8. Show that the plaintext remains visible on the untrusted network.
9. Enable Add attacker/interception and repeat.
10. Return to Secure transmission + attacker and show that tampering causes integrity verification to fail and the packet to be rejected.
11. Open SPD / SAD to show the policy and SA parameters used by the live demonstration.

## Final live demonstration flow
The main Live Packet Transmission screen is designed as an interactive mission:
1. Create a packet at Head Office.
2. Send it to the HQ IPsec gateway.
3. Watch the SPD make the protection decision.
4. Watch the selected Security Association supply the IPsec parameters.
5. Watch ESP encryption and HMAC integrity processing.
6. Watch the protected packet cross the untrusted network.
7. Watch the Branch gateway verify and decrypt it.
8. Watch the original message get delivered.

Three presentation scenarios are available: Normal IPsec, Bypass comparison, and Tamper attack. Secure/insecure is not treated as a normal user choice; bypass and tampering are demonstration scenarios used to explain why IPsec is needed.

## Final Live Packet Journey UI

The Live Network screen now presents the transmission as an animated packet journey rather than a static network diagram. The packet visibly moves through five checkpoints: Head Office, HQ IPsec Gateway, Untrusted Internet, Branch IPsec Gateway, and Branch Office.

At each checkpoint the simulator pauses and explains:
- what the packet is doing,
- why that stage matters,
- which security state the packet is currently in,
- and how the packet structure changes.

The packet itself is rendered like a small network packet with source/destination fields, IP/SA/ESP context, payload state, and integrity status. During normal IPsec processing it changes from original application data to protected ESP/ciphertext and finally back to the verified original payload. The tamper scenario visibly marks the packet as modified and shows the integrity failure/rejection path.

### Presentation flow
1. Select **Normal IPsec** and press **SEND PACKET**.
2. Watch the packet travel and pause at each security checkpoint.
3. Use the **Packet Anatomy** strip to explain IP header → SA context → ESP protected payload → verified output.
4. Select **Bypass comparison** to show readable plaintext crossing the untrusted network.
5. Select **Tamper attack** to show modification, HMAC failure and rejection.
6. Select SA-001 or SA-002 to demonstrate the configured HQ→Branch Security Association context.

This remains a conceptual browser-side IPsec simulator; it does not transmit real network traffic.
