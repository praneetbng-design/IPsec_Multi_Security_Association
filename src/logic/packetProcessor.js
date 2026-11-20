export function matchPolicy(policies, source, destination, preferredAction) {
  const matches = policies.filter((p) => p.source.startsWith(source.split('.').slice(0, 3).join('.')) && p.destination.startsWith(destination.split('.').slice(0, 3).join('.')));
  if (preferredAction) return matches.find((p) => p.action === preferredAction) || matches[0];
  return matches.find((p) => p.action === 'PROTECT') || matches[0];
}

export function createPacket({ id, source, destination, payload }) {
  return {
    id,
    source,
    destination,
    payload,
    createdAt: new Date().toLocaleTimeString(),
    protocol: 'IP',
    protected: false,
    status: 'GENERATED',
  };
}
