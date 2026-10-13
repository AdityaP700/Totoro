import type { AuditEvent, CaseState, EventType } from "./types";

/**
 * Append-only audit event log (G11). One correlation ID per case; every step
 * records what was checked and the outcome. Duplicate confirmations are
 * blocked at the allowlist layer, not by rewriting history.
 */
export function appendEvent(
  state: CaseState,
  eventType: EventType,
  outcome: string,
  details: Record<string, unknown>,
  deps: { now(): string; newId(prefix: string): string },
): void {
  const event: AuditEvent = {
    eventId: deps.newId("EVT"),
    correlationId: state.correlationId,
    caseId: state.caseId,
    timestamp: deps.now(),
    eventType,
    outcome,
    sourceLabel: "MOCK",
    details,
  };
  state.events.push(event);
  state.updatedAt = event.timestamp;
}

export function checksRunFromEvents(events: AuditEvent[]): { check: string; result: string }[] {
  const checks: { check: string; result: string }[] = [];
  for (const e of events) {
    switch (e.eventType) {
      case "STATE_READ":
        checks.push({ check: "Read authoritative mock template record", result: e.outcome });
        break;
      case "TRIAGED":
        checks.push({ check: "Rules triage (no model)", result: e.outcome });
        break;
      case "DIAGNOSED":
        checks.push({ check: "Matched playbook against recorded reason code", result: e.outcome });
        break;
      case "ACTION_SIMULATED":
        checks.push({ check: "Simulated allowlisted operation", result: e.outcome });
        break;
      case "STATE_VERIFIED":
        checks.push({ check: "Fresh read vs expected state", result: e.outcome });
        break;
      default:
        break;
    }
  }
  return checks;
}
