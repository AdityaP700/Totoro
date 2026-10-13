import React from "react";
import type { AuditEvent } from "../../domain/types";

export interface S6ManagerViewProps {
  events: AuditEvent[];
  onBackToApp: () => void;
  onResetDemo: () => void;
}

export const S6ManagerView: React.FC<S6ManagerViewProps> = ({
  events,
  onBackToApp,
  onResetDemo,
}) => {
  // Aggregate simulated metrics from events array
  const totalEvents = events.length;
  const casesOpened = events.filter((e) => e.eventType === "CASE_OPENED").length;
  const triaged = events.filter((e) => e.eventType === "TRIAGED").length;
  const confirmed = events.filter((e) => e.eventType === "USER_CONFIRMED").length;
  const verified = events.filter((e) => e.eventType === "STATE_VERIFIED" && e.details.verified === true).length;
  const handoffs = events.filter((e) => e.eventType === "HANDOFF_CREATED").length;
  const declined = events.filter((e) => e.eventType === "FIX_DECLINED").length;

  return (
    <section aria-labelledby="s6-title" className="screen-container">
      <header className="screen-header">
        <div className="badge-banner">
          <span className="badge badge-simulated">SIMULATED ANALYTICS (P5 / D9)</span>
          <span className="badge-text">Derived directly from runtime audit events. Not real Cheerio production data.</span>
        </div>
        <div className="header-actions">
          <button type="button" onClick={onBackToApp} className="btn btn-primary btn-sm">
            ← Return to Flow
          </button>
          <button type="button" onClick={onResetDemo} className="btn btn-outline btn-sm">
            Reset Demo
          </button>
        </div>
        <h2 id="s6-title">Manager Audit & Recovery Analytics</h2>
        <p className="screen-subtitle">
          Operational visibility for CX and support managers: tracking verified recovery, escalations, and event integrity.
        </p>
      </header>

      {/* Metric Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Cases Opened</span>
          <strong className="stat-value">{casesOpened}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Triaged Cases</span>
          <strong className="stat-value">{triaged}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">User Confirmed</span>
          <strong className="stat-value">{confirmed}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Verified Pending</span>
          <strong className="stat-value stat-success">{verified}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Human Escalations</span>
          <strong className="stat-value stat-warning">{handoffs}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Declined Changes</span>
          <strong className="stat-value">{declined}</strong>
        </div>
      </div>

      {/* Audit Event Timeline Table */}
      <div className="card">
        <h3>Audit Trail — Recorded Events ({totalEvents} events)</h3>
        <p className="help-text">
          Every recovery step records an immutable audit event with a correlation ID, outcome description, and provenance label (G11).
        </p>

        <div className="table-responsive">
          <table className="data-table" aria-label="Audit event log">
            <thead>
              <tr>
                <th scope="col">Event ID</th>
                <th scope="col">Timestamp</th>
                <th scope="col">Event Type</th>
                <th scope="col">Correlation ID</th>
                <th scope="col">Outcome & Details</th>
                <th scope="col">Provenance</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6}><em>No events recorded yet. Start a case to generate audit records.</em></td>
                </tr>
              ) : (
                events.map((evt) => (
                  <tr key={evt.eventId}>
                    <td><code>{evt.eventId}</code></td>
                    <td><small>{evt.timestamp}</small></td>
                    <td><span className="event-pill">{evt.eventType}</span></td>
                    <td><code>{evt.correlationId}</code></td>
                    <td>
                      <div><strong>{evt.outcome}</strong></div>
                      {Object.keys(evt.details).length > 0 && (
                        <small className="help-text">{JSON.stringify(evt.details)}</small>
                      )}
                    </td>
                    <td><span className="badge badge-mock">{evt.sourceLabel}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
