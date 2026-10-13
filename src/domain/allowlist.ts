import type { AllowlistedOperation } from "./types";

/**
 * The write allowlist (G2/D8). Application code performs only these narrow
 * operations, only after an explicit, exact-change confirmation. Triage or
 * model output can never add an operation to this list — it is a constant.
 */
export const ALLOWLISTED_OPERATIONS = ["resubmit_template"] as const satisfies readonly AllowlistedOperation[];

export function isAllowlisted(operation: string): operation is AllowlistedOperation {
  return (ALLOWLISTED_OPERATIONS as readonly string[]).includes(operation);
}
