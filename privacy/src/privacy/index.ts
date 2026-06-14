/**
 * Adapter factory. Defaults to the mock so the UI works out of the box; set
 * VITE_USE_REAL_SDK=true (after installing the SDK per INSTALL.md) to use the
 * real Privacy Pools v2 integration.
 */
import { PrivacyPoolAdapter } from "./adapter";
import { MockPrivacyPoolAdapter } from "./mockAdapter";
import { RealPrivacyPoolAdapter } from "./realAdapter";

export function createAdapter(): PrivacyPoolAdapter {
  const useReal = import.meta.env.VITE_USE_REAL_SDK === "true";
  return useReal ? new RealPrivacyPoolAdapter() : new MockPrivacyPoolAdapter();
}

export * from "./adapter";
