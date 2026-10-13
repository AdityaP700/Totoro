import React from "react";
import type { CaseState } from "../../domain/types";

export interface S4OutcomeProps {
  state: CaseState;
  onViewCaseFile: () => void;
  onViewManager: () => void;
  onResetDemo: () => void;
}

export const S4Outcome: React.FC<S4OutcomeProps> = ({
  state,
  onViewCaseFile,
  onViewManager,
  onResetDemo,
}) => {
  const verification = state.verification;
  const tpl = state.templateSnapshot;

  const isPending = state.stage === "PENDING" || (verification?.verified === true && verification.observedStatus === "PENDING");
  const isDeclined = state.stage === "DECLINED";
  const isFailed = !verification?.verified && !isDeclined;

  return (
    <section aria-labelledby="s4-title" className="screen-container">
      <header className="screen-header">
        <div className="badge-banner">
          <span className="badge badge-simulated">SIMULATED RESULT</span>
          <span className="badge-text">Correlation ID: <code>{state.correlationId}</code> · Idempotency: <code>{state.confirmation?.idempotencyKey ?? "none"}</code></span>
        </div>
        <div className="header-actions">
          <button type="button" onClick={onViewManager} className="btn btn-secondary btn-sm">
            Event Log (S6)
          </button>
          <button type="button" onClick={onResetDemo} className="btn btn-outline btn-sm">
            Reset Demo
          </button>
        </div>
        <h2 id="s4-title">Verification Outcome — {tpl?.name}</h2>
        <p className="screen-subtitle">
          Fresh read from authoritative mock storage distinguishes attempted action from verified state (G5).
        </p>
      </header>

      {/* Outcome Banner */}
      {isPending && (
        <div className="card card-outcome card-outcome-pending" role="status">
          <div className="status-header">
            <span className="status-pill status-pending">Submitted — Pending Review</span>
            <h3>SIMULATED: Resubmitted for Meta Review</h3>
          </div>
          <p className="outcome-statement">
            <strong>Fresh read verified:</strong> The mock record now shows status <code>PENDING</code>.
          </p>
          <div className="callout callout-warning">
            <strong>Provider Honesty Notice (G6):</strong> This is NOT an approval. Meta's review operates asynchronously outside Cheerio's platform. Cheerio Resolve never falsely claims approval or promises a timeline.
          </div>
        </div>
      )}

      {isFailed && (
        <div className="card card-outcome card-outcome-failed" role="alert">
          <div className="status-header">
            <span className="status-pill status-rejected">Could Not Verify</span>
            <h3>SIMULATED: Fresh Read Did Not Match Expected State</h3>
          </div>
          <p className="outcome-statement">
            {verification?.statement ?? "The simulated action was attempted, but a fresh read of the mock store shows the template remains REJECTED."}
          </p>
          <div className="callout callout-danger">
            <strong>Guardrail G8 / T7:</strong> Retries have been halted to prevent duplicate loops. The case has been packaged into a support case file for human escalation.
          </div>
        </div>
      )}

      {isDeclined && (
        <div className="card card-outcome card-outcome-declined" role="status">
          <div className="status-header">
            <span className="status-pill status-declined">Proposal Declined</span>
            <h3>State Untouched (D3)</h3>
          </div>
          <p className="outcome-statement">
            You declined the suggested correction. The mock template remains unchanged in its original recorded state (<code>REJECTED</code>).
          </p>
        </div>
      )}

      {/* Fresh Read vs Expected Breakdown */}
      <div className="card">
        <h3>Verification Audit Details</h3>
        <dl className="grid-meta">
          <div>
            <dt>Simulated Action Result</dt>
            <dd><code>{state.actionResult ?? "None (declined or read-only)"}</code></dd>
          </div>
          <div>
            <dt>Expected Post-Action Status</dt>
            <dd><code>{verification?.expectedStatus ?? "N/A"}</code></dd>
          </div>
          <div>
            <dt>Observed Fresh Read Status</dt>
            <dd><strong>{verification?.observedStatus ?? tpl?.status}</strong></dd>
          </div>
          <div>
            <dt>Verified Fresh Read Match?</dt>
            <dd>
              <span className={`badge ${verification?.verified ? "badge-success" : "badge-danger"}`}>
                {verification?.verified ? "YES (PENDING verified)" : "NO (Failed to verify)"}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      {/* Navigation Footer */}
      <footer className="screen-footer">
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={onViewCaseFile}
        >
          View Case File & Escalation Details (S5) →
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={onResetDemo}
        >
          Start New Case / Clean Reset (T15)
        </button>
      </footer>
    </section>
  );
};
