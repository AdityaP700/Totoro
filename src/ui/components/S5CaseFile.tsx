import React from "react";
import type { CaseState } from "../../domain/types";
import { buildCaseFile, copySummary } from "../../domain/caseFile";

export interface S5CaseFileProps {
  state: CaseState;
  onBackToOutcome: () => void;
  onViewManager: () => void;
  onResetDemo: () => void;
}

export const S5CaseFile: React.FC<S5CaseFileProps> = ({
  state,
  onBackToOutcome,
  onViewManager,
  onResetDemo,
}) => {
  const [copied, setCopied] = React.useState<boolean>(false);
  const caseFile = React.useMemo(() => buildCaseFile(state), [state]);
  const summaryText = React.useMemo(() => copySummary(caseFile), [caseFile]);

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(summaryText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <section aria-labelledby="s5-title" className="screen-container">
      <header className="screen-header">
        <div className="badge-banner">
          <span className="badge badge-handoff">HUMAN HANDOFF CASE FILE (D7 / G12)</span>
          <span className="badge-text">Preserving context so user never repeats their story</span>
        </div>
        <div className="header-actions">
          <button type="button" onClick={onViewManager} className="btn btn-secondary btn-sm">
            Manager Audit View (S6)
          </button>
          <button type="button" onClick={onBackToOutcome} className="btn btn-outline btn-sm">
            ← Back
          </button>
        </div>
        <h2 id="s5-title">Support Case File — {caseFile.caseId}</h2>
        <p className="screen-subtitle">
          Complete, evidence-rich handover record ready for the Cheerio human support agent.
        </p>
      </header>

      {/* Prominent Verification Status Callout */}
      {caseFile.noVerifiedResolutionYet && (
        <div className="callout callout-warning" role="alert">
          <div className="status-header">
            <span className="badge badge-danger">NO VERIFIED RESOLUTION YET</span>
            <strong>Status: Awaiting human support review</strong>
          </div>
          <p>{caseFile.handoffReason ?? "This issue requires human escalation per safety guardrails."}</p>
        </div>
      )}

      {/* Copy Action Bar */}
      <div className="action-bar-copy">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleCopy}
          aria-live="polite"
        >
          {copied ? "✓ Copied to Clipboard!" : "📋 Copy Case Summary for Support Ticket"}
        </button>
        <small className="help-text">
          Copies formatted text summary including identifiers, checks, diffs, and audit trail.
        </small>
      </div>

      {/* Case File Details Cards */}
      <div className="card">
        <h3>1. Identification & Channel Context</h3>
        <dl className="grid-meta">
          <div>
            <dt>Case ID</dt>
            <dd><code>{caseFile.caseId}</code></dd>
          </div>
          <div>
            <dt>Correlation ID</dt>
            <dd><code>{caseFile.correlationId}</code></dd>
          </div>
          <div>
            <dt>Workspace / WABA</dt>
            <dd><code>{caseFile.workspace.workspaceId}</code> · <code>{caseFile.workspace.wabaId}</code> (MOCK)</dd>
          </div>
          <div>
            <dt>Account ID</dt>
            <dd><code>{caseFile.workspace.accountId}</code> (MOCK)</dd>
          </div>
          <div>
            <dt>Original User Message</dt>
            <dd>"{caseFile.originalMessage}"</dd>
          </div>
          <div>
            <dt>Detected Language</dt>
            <dd><span className="tag-category">{caseFile.language}</span></dd>
          </div>
        </dl>
      </div>

      <div className="card">
        <h3>2. Triage & Recorded Mock State</h3>
        <dl className="grid-meta">
          <div>
            <dt>Issue Type</dt>
            <dd><strong>{caseFile.issueType}</strong></dd>
          </div>
          <div>
            <dt>Urgency</dt>
            <dd><span className={`tag-urgency tag-${caseFile.urgency}`}>{caseFile.urgency}</span></dd>
          </div>
          <div>
            <dt>Confidence Band</dt>
            <dd>{caseFile.confidenceBand}</dd>
          </div>
          <div>
            <dt>Template ID & Name</dt>
            <dd><code>{caseFile.template?.id}</code> — {caseFile.template?.name}</dd>
          </div>
          <div>
            <dt>Recorded Status</dt>
            <dd><span className="status-pill status-rejected">{caseFile.currentState?.status}</span></dd>
          </div>
          <div>
            <dt>Reason Code</dt>
            <dd><code>{caseFile.currentState?.reasonCode ?? "none"}</code> ({caseFile.currentState?.reasonCodeProvenance})</dd>
          </div>
        </dl>
        <div className="triage-rationale-box">
          <strong>Triage Rationale:</strong> {caseFile.triageRationale}
        </div>
      </div>

      <div className="card">
        <h3>3. Checks Run & Diagnostic Evidence</h3>
        <ul className="evidence-list">
          {caseFile.checksRun.map((chk, idx) => (
            <li key={idx}>
              <strong>{chk.check}:</strong> {chk.result}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3>4. Action, Verification & Recommended Next Step</h3>
        {caseFile.proposedFix && (
          <div className="section-block">
            <h4>Proposed Fix</h4>
            <p>{caseFile.proposedFix.description}</p>
            <ul>
              {caseFile.proposedFix.changes.map((c, i) => (
                <li key={i}>
                  <code>{c.field}</code>: "{c.before}" → "{c.after}" ({c.reason})
                </li>
              ))}
            </ul>
            <p><strong>User Decision:</strong> <code>{caseFile.proposedFix.userDecision}</code></p>
          </div>
        )}

        <div className="section-block">
          <h4>Actions Attempted</h4>
          <ul>
            {caseFile.actionsAttempted.length > 0 ? (
              caseFile.actionsAttempted.map((act, i) => (
                <li key={i}><code>{act.action}</code>: {act.result}</li>
              ))
            ) : (
              <li><em>None (no write-like operation was authorized or performed).</em></li>
            )}
          </ul>
        </div>

        <div className="section-block">
          <h4>Verification Statement</h4>
          <p>{caseFile.verification.statement ?? "Not performed / pending human escalation."}</p>
        </div>

        <div className="callout callout-info">
          <strong>Recommended Next Step for Human Agent:</strong>
          <p>{caseFile.recommendedNextStep}</p>
        </div>
      </div>

      {/* Raw Summary Output Preview */}
      <div className="card card-raw-summary">
        <h3>Formatted Plaintext Case Summary (for clipboard / ticket body)</h3>
        <pre className="summary-pre">{summaryText}</pre>
      </div>

      {/* Footer Actions */}
      <footer className="screen-footer">
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
