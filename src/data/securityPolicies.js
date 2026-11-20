export const securityPolicies = [
  { id: 'POL-001', source: '192.168.1.0/24', destination: '192.168.2.0/24', action: 'PROTECT', sa: 'SA-001', description: 'HQ to Branch protected business traffic' },
  { id: 'POL-002', source: '192.168.2.0/24', destination: '192.168.1.0/24', action: 'PROTECT', sa: 'SA-003', description: 'Branch to HQ protected business traffic' },
  { id: 'POL-003', source: '192.168.1.0/24', destination: '192.168.2.0/24', action: 'BYPASS', sa: null, description: 'Demonstration rule: send without IPsec' },
  { id: 'POL-004', source: '192.168.1.0/24', destination: '192.168.2.0/24', action: 'DISCARD', sa: null, description: 'Demonstration rule: reject traffic' },
];
