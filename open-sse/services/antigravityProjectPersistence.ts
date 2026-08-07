/**
 * Antigravity connection selection for reset-aware combo routing.
 *
 * Reset-aware quota preflight can only pick a sensible connection for an
 * Antigravity/AGY target when the account already carries a Google Cloud Code
 * projectId. A freshly re-added account may still have an empty stored
 * projectId (OAuth-time loadCodeAssist transiently failed — see
 * `ensureAntigravityProjectAssigned()` in antigravityProjectBootstrap.ts),
 * and requesting from such an account degrades to a runtime loadCodeAssist
 * round-trip or a 422 before the quota pool is even consulted.
 *
 * `preferAntigravityConnectionsWithStoredProject()` filters the reset-aware
 * connection pool down to accounts that already store a usable projectId —
 * either on the top-level `projectId` column or inside
 * `providerSpecificData.projectId` (mirroring the fallback read the executor
 * performs in open-sse/executors/antigravity.ts and the persistence shape
 * written by `persistDiscoveredAntigravityProjectId()` in
 * ./antigravityProjectPersist.ts). Whitespace-only values are treated as
 * missing, matching `normalizeProjectId`.
 *
 * Pure leaf: no DB or network access. Callers (`combo/quotaStrategies.ts`)
 * decide when the filter applies.
 */

/**
 * Normalize a raw projectId value the same way the Antigravity executor does:
 * only non-empty (after trim) strings are usable.
 */
function normalizeProjectId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Keep only connections that already store a non-empty Antigravity projectId,
 * either on the top-level `projectId` column or in
 * `providerSpecificData.projectId`.
 */
export function preferAntigravityConnectionsWithStoredProject(
  connections: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  return connections.filter((connection) => {
    const direct = normalizeProjectId(connection.projectId);
    if (direct) return true;
    const psd = asRecord(connection.providerSpecificData);
    if (!psd) return false;
    return normalizeProjectId(psd.projectId) !== null;
  });
}
