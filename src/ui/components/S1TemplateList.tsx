import React from "react";
import type { MockTemplate } from "../../domain/types";

export interface S1TemplateListProps {
  templates: MockTemplate[];
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
  onStartRecovery: (templateId: string, customMessage?: string) => void;
  onViewManager: () => void;
  onResetDemo: () => void;
}

export const S1TemplateList: React.FC<S1TemplateListProps> = ({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onStartRecovery,
  onViewManager,
  onResetDemo,
}) => {
  const [customMessage, setCustomMessage] = React.useState<string>("");

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? templates[0];

  return (
    <section aria-labelledby="s1-title" className="screen-container">
      <header className="screen-header">
        <div className="badge-banner">
          <span className="badge badge-mock">MOCK DATA</span>
          <span className="badge-text">Demo uses simulated WhatsApp Business API fixtures. No real Meta calls.</span>
        </div>
        <div className="header-actions">
          <button type="button" onClick={onViewManager} className="btn btn-secondary btn-sm">
            Manager View (S6)
          </button>
          <button type="button" onClick={onResetDemo} className="btn btn-outline btn-sm">
            Reset Demo
          </button>
        </div>
        <h2 id="s1-title">WhatsApp Templates — Workspace WS-DEMO-001</h2>
        <p className="screen-subtitle">
          Select a rejected template below to inspect context and initiate recovery.
        </p>
      </header>

      <div className="table-responsive">
        <table className="data-table" aria-label="WhatsApp template list">
          <thead>
            <tr>
              <th scope="col">Template ID</th>
              <th scope="col">Name</th>
              <th scope="col">Category</th>
              <th scope="col">Status</th>
              <th scope="col">Rejection Reason Code</th>
              <th scope="col">Last Updated</th>
              <th scope="col">Select</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((tpl) => {
              const isSelected = tpl.id === selectedTemplateId;
              return (
                <tr key={tpl.id} className={isSelected ? "row-selected" : undefined}>
                  <td><code>{tpl.id}</code></td>
                  <td><strong>{tpl.name}</strong></td>
                  <td><span className="tag-category">{tpl.category}</span></td>
                  <td>
                    <span className={`status-pill status-${tpl.status.toLowerCase()}`}>
                      {tpl.status}
                    </span>
                  </td>
                  <td>
                    <code>{tpl.reasonCode ?? "none"}</code>
                    <small className="tag-provenance"> ({tpl.sourceLabel})</small>
                  </td>
                  <td><small>{tpl.lastUpdated}</small></td>
                  <td>
                    <button
                      type="button"
                      className={`btn btn-sm ${isSelected ? "btn-primary" : "btn-outline"}`}
                      onClick={() => onSelectTemplate(tpl.id)}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card card-active-fixture">
        <h3>Active Template: <code>{selectedTemplate.id}</code> — {selectedTemplate.name}</h3>
        <p><strong>Current Category:</strong> {selectedTemplate.category}</p>
        <p><strong>Current Status:</strong> <span className="status-pill status-rejected">{selectedTemplate.status}</span></p>
        <p><strong>Recorded Reason:</strong> <code>{selectedTemplate.reasonCode ?? "N/A"}</code> (MOCK fixture code)</p>
        <div className="template-preview">
          <label htmlFor="tpl-preview-text"><strong>Template Body Preview:</strong></label>
          <blockquote id="tpl-preview-text">{selectedTemplate.text}</blockquote>
        </div>

        {selectedTemplate.id === "TPL-1003" && (
          <div className="callout callout-warning" role="note">
            <strong>Simulated Failure Path Fixture:</strong> Resubmitting this template will simulate a provider-side state conflict/unchanged failure, leading to <em>Could not verify</em> and human handoff (T7).
          </div>
        )}

        <div className="recovery-action-box">
          <div className="input-group">
            <label htmlFor="custom-query">Optional user inquiry wording (English or Hinglish):</label>
            <input
              id="custom-query"
              type="text"
              className="text-input"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="e.g. Why is this template rejected? or template reject ho gaya bhai"
            />
          </div>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={() => onStartRecovery(selectedTemplate.id, customMessage.trim() || undefined)}
          >
            Why isn't this working?
          </button>
        </div>
      </div>
    </section>
  );
};
