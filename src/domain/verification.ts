import type { MockTemplate, TemplateStatus, VerificationResult } from "./types";

/**
 * Fresh-read verification (G5/D6): "Verified" requires re-reading the mock
 * state and matching the expected outcome. A click, a successful function
 * call, or a submitted state is never claimed as approval (G6).
 */
export function expectedStatusAfter(operation: string): TemplateStatus | null {
  if (operation === "resubmit_template") return "PENDING";
  return null;
}

export function verifyAgainstFreshRead(
  fresh: MockTemplate | null | undefined,
  expected: TemplateStatus,
): VerificationResult {
  if (!fresh) {
    return {
      verified: false,
      observedStatus: "UNAVAILABLE",
      expectedStatus: expected,
      statement:
        "Fresh-state verification failed: record was unavailable or could not be re-read from the authoritative store.",
    };
  }

  const verified = fresh.status === expected;
  const statement = verified
    ? "Verified by fresh read: the record now shows SUBMITTED/PENDING review. This is NOT approval — Meta's review is outside Cheerio's control."
    : `Could not verify: the fresh read still shows ${fresh.status}. No further retries will be attempted; the case is escalated with evidence.`;
  return { verified, observedStatus: fresh.status, expectedStatus: expected, statement };
}
