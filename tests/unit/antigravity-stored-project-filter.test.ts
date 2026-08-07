/**
 * tests/unit/antigravity-stored-project-filter.test.ts
 *
 * Regression guard for the missing `antigravityProjectPersistence.ts` module.
 *
 * #8894 added `preferAntigravityConnectionsWithStoredProject` to
 * open-sse/services/combo/quotaStrategies.ts but the imported file was never
 * created — every reset-aware combo build failed at module resolution
 * (`Module not found: Can't resolve '../antigravityProjectPersistence.ts'`).
 * This test imports the module graph (quotaStrategies.ts re-imports it) so a
 * future regression fails at load time, and asserts the filter keeps exactly
 * the Antigravity connections that carry a stored projectId.
 */

import test from "node:test";
import assert from "node:assert/strict";

const mod = await import("../../open-sse/services/antigravityProjectPersistence.ts");
const { preferAntigravityConnectionsWithStoredProject } = mod;

// Importing quotaStrategies.ts also fails loudly if the module goes missing
// again, since it statically re-imports antigravityProjectPersistence.ts.
await import("../../open-sse/services/combo/quotaStrategies.ts");

function connection(overrides: Record<string, unknown> = {}) {
  return {
    id: "conn-x",
    provider: "antigravity",
    email: "a@b.c",
    isActive: true,
    projectId: null,
    providerSpecificData: {},
    ...overrides,
  };
}

test("preferAntigravityConnectionsWithStoredProject: keeps connections with a stored projectId column", () => {
  const kept = preferAntigravityConnectionsWithStoredProject([
    connection({ id: "with-project", projectId: "cloud-proj-1" }),
    connection({ id: "without-project", projectId: null }),
  ]);
  assert.deepEqual(
    kept.map((c) => c.id),
    ["with-project"]
  );
});

test("preferAntigravityConnectionsWithStoredProject: keeps connections with providerSpecificData.projectId", () => {
  const kept = preferAntigravityConnectionsWithStoredProject([
    connection({
      id: "psd-project",
      projectId: null,
      providerSpecificData: { projectId: "cloud-proj-2" },
    }),
    connection({
      id: "psd-no-project",
      projectId: null,
      providerSpecificData: { tierId: "t1" },
    }),
  ]);
  assert.deepEqual(
    kept.map((c) => c.id),
    ["psd-project"]
  );
});

test("preferAntigravityConnectionsWithStoredProject: whitespace-only projectId is treated as missing", () => {
  const kept = preferAntigravityConnectionsWithStoredProject([
    connection({ id: "blank", projectId: "   " }),
    connection({
      id: "psd-blank",
      projectId: null,
      providerSpecificData: { projectId: " \n " },
    }),
  ]);
  assert.deepEqual(kept, []);
});

test("preferAntigravityConnectionsWithStoredProject: empty input returns empty array", () => {
  assert.deepEqual(preferAntigravityConnectionsWithStoredProject([]), []);
});

test("preferAntigravityConnectionsWithStoredProject: top-level projectId wins over providerSpecificData", () => {
  const kept = preferAntigravityConnectionsWithStoredProject([
    connection({
      id: "both",
      projectId: "top-level",
      providerSpecificData: { projectId: "nested" },
    }),
  ]);
  assert.deepEqual(
    kept.map((c) => c.id),
    ["both"]
  );
});
