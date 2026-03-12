const DAY_IN_MS = 86400000;

export function computeRetention(
  strength: number,
  lastAccessedAt: string | undefined,
  decayTau: number,
  importance: number,
  accessCount: number,
): number {
  const normalizedStrength = clamp(Number(strength), 0, 1);
  const normalizedImportance = clamp(Number(importance), 0, 1);
  const normalizedDecayTau = Number.isFinite(decayTau) && decayTau > 0 ? decayTau : DAY_IN_MS;
  const now = Date.now();
  const lastAccess = Date.parse(lastAccessedAt ?? "");
  const elapsed = Number.isFinite(lastAccess) ? Math.max(0, now - lastAccess) : 0;
  const dynamicTau = normalizedDecayTau * (1 + normalizedImportance * 2) * 1.2 ** Math.min(Math.max(0, Math.round(accessCount)), 10);
  return clamp(normalizedStrength * Math.exp(-elapsed / dynamicTau), 0, 1);
}

export function reinforceOnAccess(current: number, importance: number): number {
  return clamp(Number(current) + 0.1 * (1 + clamp(Number(importance), 0, 1)), 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}
