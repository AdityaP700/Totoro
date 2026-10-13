import React from "react";
import type { CaseState } from "../../domain/types";

export interface S3ProposalProps {
  state: CaseState;
  onConfirm: () => void;
  onDecline: () => void;
  onRequestHuman: () => void;
  onBackToDiagnosis: () => void;
}

export const S3Proposal: React.FC<S3ProposalProps> = ({
  state,
  onConfirm,
  onDecline,
  onRequestHuman,
  onBackToDiagnosis,
}) => {
  const proposal = state.proposal;
  const tpl = state.templateSnapshot;

  if (!proposal) {
    return (
      <section className="screen-container">
        <p>No proposal available for this case.</p>
        <button type="button" onClick={onBackToDiagnosis} className="btn btn-outline">
          ← Back to Diagnosis
        </button>
      </section>
    );
  }

  return (
    <section aria-labelledby="s3-title" className="screen-container">
      <header className="screen-header">
        <div className="badge-banner">
          <span className="badge badge-mock">CONFIRMATION GATE (G1 / D3)</span>
          <span className="badge-text">Correlation ID: <code>{state.correlationId}</code></span>
        </div>
        <div className="header-actions">
          <button type="button" onClick={onBackToDiagnosis} className="btn btn-outline btn-sm">
            ← Back to Diagnosis
          </button>
        </div>
        <h2 id="s3-title">Proposed Changes — {tpl?.name}</h2>
        <p className="screen-subtitle">
          Review the exact changes below before authorizing the simulated resubmission.
        </p>
      </header>

      {/* Safety Notice Banner */}
      <div className="callout callout-info" role="note">
        <strong>Strict Guardrail G1:</strong> No changes to your template or account occur until you explicitly approve the exact before/after difference below.
      </div>

      {/* Before / After Diff Cards */}
      <div className="card">
        <h3>Proposed Modification ({proposal.operation})</h3>
        <p className="proposal-desc">{proposal.description}</p>

        <div className="diff-container">
          {proposal.changes.map((change, idx) => (
            <div key={idx} className="diff-item">
              <h4 className="diff-field-name">Field: <code>{change.field}</code></h4>
              <p className="diff-reason"><strong>Reason for change:</strong> {change.reason}</p>

              <div className="diff-split">
                <div className="diff-box diff-before">
                  <span className="diff-label">Current (Before)</span>
                  <pre className="diff-content">{change.before}</pre>
                </div>
                <div className="diff-box diff-after">
                  <span className="diff-label">Proposed (After)</span>
                  <pre className="diff-content">{change.after}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Scope of modification boundary */}
        <div className="change-scope-summary">
          <h4>Scope of Change</h4>
          <ul>
            <li><strong>Will change:</strong> {proposal.changes.map((c) => c.field).join(", ")}</li>
            <li><strong>Will NOT change:</strong> All other fields (template name, language, variables structure outside proposed fix) remain strictly untouched.</li>
            <li><strong>Simulated operation:</strong> Allowlisted operation <code>{proposal.operation}</code> only.</li>
          </ul>
        </div>
      </div>

      {/* Confirmation Actions Footer */}
      <footer className="screen-footer confirmation-footer">
        <div className="confirmation-primary">
          <button
            type="button"
            className="btn btn-success btn-lg"
            onClick={onConfirm}
          >
            ✓ Review and resubmit (Authorize simulated action)
          </button>
          <small className="help-text">
            Clicking this button executes the allowlisted simulated write and re-reads state.
          </small>
        </div>

        <div className="confirmation-secondary">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onDecline}
          >
            Keep current template (Decline)
          </button>
          <button
            type="button"
            className="btn btn-danger btn-outline"
            onClick={onRequestHuman}
          >
            Get human help
          </button>
        </div>
      </footer>
    </section>
  );
};
