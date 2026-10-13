import type { MockTemplate, TriageResult } from "../../src/domain/types";
import type { ReasoningAdapter, ReasoningContext } from "../../src/domain/adapter";
import { createMockStore, type ApplyRequest, type ApplyResult, type MockStore } from "../../src/domain/mockStore";

/**
 * Controllable mock reasoning provider for fault injection.
 * Simulates API latency, rate limits (429), timeouts, malformed JSON, and prompt injections.
 */
export class FaultInjectableAdapter implements ReasoningAdapter {
  id = "fault-injector";
  name = "Fault Injectable Test Adapter";
  version = "1.0.0-test";

  private simulateTimeout = false;
  private simulate429 = false;
  private simulateMalformed = false;
  private mockResult: TriageResult | null = null;

  setTimeout(enabled: boolean): this {
    this.simulateTimeout = enabled;
    return this;
  }

  setRateLimit(enabled: boolean): this {
    this.simulate429 = enabled;
    return this;
  }

  setMalformed(enabled: boolean): this {
    this.simulateMalformed = enabled;
    return this;
  }

  setMockResult(res: TriageResult | null): this {
    this.mockResult = res;
    return this;
  }

  triage(_ctx: ReasoningContext): TriageResult {
    if (this.simulateTimeout) {
      throw new Error("Provider timeout: ETIMEDOUT after 5000ms");
    }
    if (this.simulate429) {
      throw new Error("Provider rate limit: 429 Too Many Requests (RPM limit exceeded)");
    }
    if (this.simulateMalformed) {
      return {
        issueType: "INVALID_INJECTED_TYPE" as any,
        urgency: "EXPLODED" as any,
        route: "UNKNOWN_ROUTE" as any,
        needsHuman: false,
        confidence: 999,
        confidenceBand: "high",
        rationale: "Malformed test output",
        missingInformation: [],
      };
    }
    if (this.mockResult) {
      return { ...this.mockResult };
    }

    // Default: pass through to standard rule baseline
    return {
      issueType: "template_rejection",
      urgency: "medium",
      route: "rules_playbook",
      needsHuman: false,
      confidence: 0.9,
      confidenceBand: "high",
      rationale: "FaultInjectableAdapter default prediction",
      missingInformation: [],
    };
  }
}

/**
 * Fault-injectable state store wrapper.
 * Simulates storage crashes, action timeouts, state drift (TOCTOU), and unavailable fresh reads.
 */
export interface FaultInjectableStore extends MockStore {
  setThrowOnApply(shouldThrow: boolean, errMessage?: string): void;
  setSimulateDriftOnApply(driftFn: ((t: MockTemplate) => void) | null): void;
  setMakeFreshReadUnavailable(unavailable: boolean, onlyAfterExecution?: boolean): void;
  getHistory(): ApplyRequest[];
  getConcurrencyCount(): number;
}

export function createFaultInjectableStore(): FaultInjectableStore {
  const inner = createMockStore();
  let throwOnApply = false;
  let throwMessage = "Store network partition: Write timeout";
  let driftOnApply: ((t: MockTemplate) => void) | null = null;
  let makeFreshReadUnavailable = false;
  let unavailableOnlyAfterExecution = false;
  let concurrencyCounter = 0;
  const history: ApplyRequest[] = [];

  return {
    getTemplate(id: string): MockTemplate | undefined {
      if (makeFreshReadUnavailable) {
        if (unavailableOnlyAfterExecution) {
          if (history.length > 0) return undefined;
          return inner.getTemplate(id);
        }
        return undefined; // Simulates store loss or database read failure
      }
      return inner.getTemplate(id);
    },

    listTemplates(): MockTemplate[] {
      return inner.listTemplates();
    },

    hasIdempotencyKey(key: string): boolean {
      return inner.hasIdempotencyKey(key);
    },

    updateTemplate(id: string, mutator: (t: MockTemplate) => void): boolean {
      return inner.updateTemplate(id, mutator);
    },

    applyApprovedChange(req: ApplyRequest): ApplyResult {
      history.push(req);
      concurrencyCounter++;

      if (throwOnApply) {
        throw new Error(throwMessage);
      }

      if (driftOnApply) {
        // Mutate target state in-place right before inner execution to simulate race condition / drift
        inner.updateTemplate(req.targetId, driftOnApply);
      }

      return inner.applyApprovedChange(req);
    },

    reset(): void {
      inner.reset();
      throwOnApply = false;
      driftOnApply = null;
      makeFreshReadUnavailable = false;
      unavailableOnlyAfterExecution = false;
      concurrencyCounter = 0;
      history.length = 0;
    },

    setThrowOnApply(shouldThrow: boolean, errMessage?: string): void {
      throwOnApply = shouldThrow;
      if (errMessage) throwMessage = errMessage;
    },

    setSimulateDriftOnApply(driftFn: ((t: MockTemplate) => void) | null): void {
      driftOnApply = driftFn;
    },

    setMakeFreshReadUnavailable(unavailable: boolean, onlyAfterExecution?: boolean): void {
      makeFreshReadUnavailable = unavailable;
      unavailableOnlyAfterExecution = !!onlyAfterExecution;
    },

    getHistory(): ApplyRequest[] {
      return [...history];
    },

    getConcurrencyCount(): number {
      return concurrencyCounter;
    },
  };
}
