import React from "react";
import type { CaseState } from "../../domain/types";

export interface S2DiagnosisProps {
  state: CaseState;
  onReviewSuggestedChange: () => void;
  onRequestHuman: () => void;
  onAnswerClarification: (answer: string) => void;
  onBackToList: () => void;
}

export const S2Diagnosis: React.FC<S2DiagnosisProps> = ({
  state,
  onReviewSuggestedChange,
  onRequestHuman,
  onAnswerClarification,
  onBackToList,
}) => {
  const [clarifyAnswer, setClarifyAnswer] = React.useState<string>("");

  const tpl = state.templateSnapshot;
  const triage = state.triage;
  const diagnosis = state.diagnosis;
  const clarify = state.clarify;

  return (
    <section aria-labelledby="s2-title" className="screen-container">
      <header className="screen-header">
        <div className="badge-banner">
          <span className="badge badge-mock">MOCK CONTEXT</span>
          <span className="badge-text">Correlation ID: <code>{state.correlationId}</code> · Case: <code>{state.caseId}</code></span>
        </div>
        <div className="header-actions">
          <button type="button" onClick={onBackToList} className="btn btn-outline btn-sm">
            ← Back to Templates
          </button>
        </div>
        <h2 id="s2-title">Diagnosis — {tpl?.name ?? state.templateId}</h2>
        <p className="screen-subtitle">
          Context-aware diagnosis extracted directly from the recorded mock state.
        </p>
      </header>

      {/* Clarification state (G9 / CLARIFY_ONCE) */}
      {state.stage === "CLARIFY_ONCE" && clarify && (
        <div className="card card-warning" role="alert">
          <h3>One Clarifying Question Needed</h3>
          <p>The system detected an ambiguous query and asks exactly one question before proceeding:</p>
          <p className="clarification-question"><strong>{clarify.question}</strong></p>
          <div className="input-group">
            <input
              type="text"
              className="text-input"
              value={clarifyAnswer}
              onChange={(e) => setClarifyAnswer(e.target.value)}
              placeholder="Type your response here..."
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={!clarifyAnswer.trim()}
              onClick={() => onAnswerClarification(clarifyAnswer.trim())}
            >
              Submit Response
            </button>
          </div>
        </div>
      )}

      {/* Context Inspection Card */}
      <div className="card">
        <h3>Authoritative Mock State (Read-only)</h3>
        <dl className="grid-meta">
          <div>
            <dt>Original User Message</dt>
            <dd>"{state.originalMessage}" <span className="tag-provenance">({state.language})</span></dd>
          </div>
          <div>
            <dt>Template ID</dt>
            <dd><code>{tpl?.id}</code></dd>
          </div>
          <div>
            <dt>Template Status</dt>
            <dd><span className="status-pill status-rejected">{tpl?.status}</span></dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd><span className="tag-category">{tpl?.category}</span></dd>
          </div>
          <div>
            <dt>Rejection Reason Code</dt>
            <dd>
              <code>{tpl?.reasonCode ?? "none (missing)"}</code>
              <small className="tag-provenance"> (FIXTURE CODE NOT ASSERTED AS OFFICIAL)</small>
            </dd>
          </div>
          <div>
            <dt>Triage Issue Classification</dt>
            <dd><strong>{triage?.issueType}</strong> (urgency: {triage?.urgency})</dd>
          </div>
        </dl>
      </div>

      {/* Diagnosis Explanation Card */}
      {diagnosis && (
        <div className="card card-diagnosis">
          <h3>Diagnosis Details</h3>
          <p className="diagnosis-explanation">{diagnosis.plainExplanation}</p>

          <div className="meta-section">
            <h4>Evidence Fields Used</h4>
            <ul className="evidence-list">
              {diagnosis.evidenceUsed.map((field) => (
                <li key={field}>
                  <code>{field}</code>: {field in (tpl ?? {}) ? String((tpl as any)[field]) : "checked"}
                </li>
              ))}
            </ul>
          </div>

          {diagnosis.cannotVerify.length > 0 && (
            <div className="callout callout-warning">
              <h4>What Cannot Be Verified</h4>
              <ul>
                {diagnosis.cannotVerify.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {diagnosis.playbookId === "PB-004-UNKNOWN-REASON" && (
            <div className="callout callout-info">
              <p>
                <strong>No provider reason code available:</strong> Cheerio Resolve never invents reasons (D10). Human review is recommended.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Footer */}
      <footer className="screen-footer">
        {state.proposal ? (
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={onReviewSuggestedChange}
          >
            Review suggested change →
          </button>
        ) : (
          <div className="notice-no-proposal">
            <em>No automated fix proposal available for this diagnosis.</em>
          </div>
        )}
        <button
          type="button"
          className="btn btn-danger btn-outline"
          onClick={onRequestHuman}
        >
          Get human help
        </button>
      </footer>
    </section>
  );
};
