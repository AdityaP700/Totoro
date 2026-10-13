import type { MockTemplate, ProposedChange } from "./types";
import { MOCK_TEMPLATES } from "../data/templates";
import { ALLOWLISTED_OPERATIONS, isAllowlisted } from "./allowlist";

/**
 * In-memory mock state store. The ONLY way domain code mutates template state
 * is `applyApprovedChange`, which enforces the allowlist, explicit
 * confirmation and idempotency (G1/G2/D8/G11). All state is mock (G7).
 */
export interface ApplyRequest {
  operation: string;
  targetId: string;
  changes: ProposedChange[];
  confirmation: {
    approvedAt: string;
    exactBefore: string;
    exactAfter: string;
    idempotencyKey: string;
  };
}

export type ApplyFailureKind =
  | "not_allowlisted"
  | "target_not_found"
  | "missing_confirmation"
  | "before_after_mismatch"
  | "duplicate_idempotency_key"
  | "operation_failed";

export interface ApplyResult {
  ok: boolean;
  simulated: true;
  failureKind?: ApplyFailureKind;
  message: string;
  templateAfter?: MockTemplate;
}

export interface MockStore {
  /** Fresh read — returns a copy of the current mock state (G4/G5). */
  getTemplate(id: string): MockTemplate | undefined;
  listTemplates(): MockTemplate[];
  applyApprovedChange(req: ApplyRequest): ApplyResult;
  hasIdempotencyKey(key: string): boolean;
  updateTemplate(id: string, mutator: (t: MockTemplate) => void): boolean;
  /** Restore the pristine fixtures (T15). */
  reset(): void;
}

export function createMockStore(): MockStore {
  let templates: MockTemplate[] = fixtures();
  const usedIdempotencyKeys = new Set<string>();

  function fixtures(): MockTemplate[] {
    return MOCK_TEMPLATES.map((t) => ({ ...t }));
  }

  return {
    getTemplate(id) {
      const t = templates.find((x) => x.id === id);
      return t ? { ...t } : undefined;
    },
    listTemplates() {
      return templates.map((t) => ({ ...t }));
    },
    hasIdempotencyKey(key) {
      return usedIdempotencyKeys.has(key);
    },
    updateTemplate(id, mutator) {
      const t = templates.find((x) => x.id === id);
      if (t) {
        mutator(t);
        return true;
      }
      return false;
    },
    applyApprovedChange(req) {
      if (!isAllowlisted(req.operation)) {
        return {
          ok: false,
          simulated: true,
          failureKind: "not_allowlisted",
          message: `Operation "${req.operation}" is not on the allowlist (${ALLOWLISTED_OPERATIONS.join(", ")}). Nothing was changed.`,
        };
      }
      const target = templates.find((x) => x.id === req.targetId);
      if (!target) {
        return {
          ok: false,
          simulated: true,
          failureKind: "target_not_found",
          message: "Target template not found in the mock store. Nothing was changed.",
        };
      }
      if (
        !req.confirmation ||
        !req.confirmation.approvedAt ||
        !req.confirmation.idempotencyKey
      ) {
        return {
          ok: false,
          simulated: true,
          failureKind: "missing_confirmation",
          message: "No explicit user confirmation is attached. Nothing was changed (G1).",
        };
      }
      if (usedIdempotencyKeys.has(req.confirmation.idempotencyKey)) {
        return {
          ok: false,
          simulated: true,
          failureKind: "duplicate_idempotency_key",
          message: "This confirmation was already used. Duplicate submissions are blocked (G11).",
        };
      }
      if (req.operation === "resubmit_template" && target.status !== "REJECTED") {
        return {
          ok: false,
          simulated: true,
          failureKind: "before_after_mismatch",
          message: `State drift detected: template status is "${target.status}", expected "REJECTED". Nothing was changed (G1).`,
        };
      }
      if (!checkExactChange(target, req.changes, req.confirmation)) {
        return {
          ok: false,
          simulated: true,
          failureKind: "before_after_mismatch",
          message:
            "Confirmed before/after does not match the exact proposed change. Nothing was changed (G1).",
        };
      }

      usedIdempotencyKeys.add(req.confirmation.idempotencyKey);
      for (const change of req.changes) {
        if (change.field === "text") target.text = change.after;
        if (change.field === "category") target.category = change.after as MockTemplate["category"];
      }
      if (target.simulatedResubmitOutcome === "pending") {
        target.status = "PENDING";
      } else {
        // Simulated provider-side failure: state does not clear (T7).
        target.status = "REJECTED";
      }
      target.lastUpdated = req.confirmation.approvedAt;
      return {
        ok: true,
        simulated: true,
        message:
          target.status === "PENDING"
            ? "SIMULATED: resubmission recorded in mock state; status is now PENDING (awaiting review, not approved)."
            : "SIMULATED: resubmission attempted, but the mock record still shows REJECTED.",
        templateAfter: { ...target },
      };
    },
    reset() {
      templates = fixtures();
      usedIdempotencyKeys.clear();
    },
  };
}

/**
 * Compare the confirmed before/after against the proposal's exact changes.
 * exactBefore/exactAfter are JSON serializations of the affected fields.
 */
export function checkExactChange(
  template: Pick<MockTemplate, "text" | "category">,
  changes: { field: "text" | "category"; before: string; after: string }[],
  confirmation: { exactBefore: string; exactAfter: string },
): boolean {
  if (!changes || changes.length === 0) {
    return false;
  }

  const allowedCategories = new Set(["UTILITY", "MARKETING", "AUTHENTICATION"]);

  for (const c of changes) {
    // Invariant: The target template's current state MUST match the proposed before state (G1).
    if (template[c.field] !== c.before) {
      return false;
    }

    if (c.field === "category" && !allowedCategories.has(c.after)) {
      return false;
    }

    if (c.field === "text" && (typeof c.after !== "string" || c.after.length === 0)) {
      return false;
    }
  }

  const beforeObj: Record<string, string> = {
    text: template.text,
    category: template.category,
  };
  const afterObj: Record<string, string> = {
    text: template.text,
    category: template.category,
  };
  for (const c of changes) {
    beforeObj[c.field] = c.before;
    afterObj[c.field] = c.after;
  }
  return (
    confirmation.exactBefore === JSON.stringify(beforeObj) &&
    confirmation.exactAfter === JSON.stringify(afterObj)
  );
}
