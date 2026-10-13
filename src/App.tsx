import React from "react";
import { createMockStore } from "./domain/mockStore";
import { ResolveSession } from "./domain/stateMachine";
import type { SessionDeps } from "./domain/stateMachine";
import type { AuditEvent, MockTemplate } from "./domain/types";
import { S1TemplateList } from "./ui/components/S1TemplateList";
import { S2Diagnosis } from "./ui/components/S2Diagnosis";
import { S3Proposal } from "./ui/components/S3Proposal";
import { S4Outcome } from "./ui/components/S4Outcome";
import { S5CaseFile } from "./ui/components/S5CaseFile";
import { S6ManagerView } from "./ui/components/S6ManagerView";

type Screen = "S1" | "S2" | "S3" | "S4" | "S5" | "S6";

export default function App() {
  const [store] = React.useState(() => createMockStore());
  const [templates, setTemplates] = React.useState<MockTemplate[]>(() => store.listTemplates());
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string>("TPL-1001");
  const [currentScreen, setCurrentScreen] = React.useState<Screen>("S1");
  const [previousScreen, setPreviousScreen] = React.useState<Screen>("S1");
  const [session, setSession] = React.useState<ResolveSession | null>(null);
  const [allEvents, setAllEvents] = React.useState<AuditEvent[]>([]);

  // Dependency injector for ResolveSession
  const deps: SessionDeps = React.useMemo(() => {
    let idCounter = Date.now() % 10000;
    return {
      store,
      now: () => new Date().toISOString(),
      newId: (prefix: string) => `${prefix}-${String(idCounter++).padStart(4, "0")}`,
    };
  }, [store]);

  const refreshState = (newSession?: ResolveSession) => {
    setTemplates(store.listTemplates());
    if (newSession) {
      setSession(newSession);
      setAllEvents((prev) => {
        const existingIds = new Set(prev.map((e) => e.eventId));
        const added = newSession.state.events.filter((e) => !existingIds.has(e.eventId));
        return [...prev, ...added];
      });
    }
  };

  const handleStartRecovery = (templateId: string, customMessage?: string) => {
    const msg = customMessage || "Why isn't this template working?";
    const newSession = new ResolveSession(deps, { templateId, message: msg });
    refreshState(newSession);
    setPreviousScreen("S1");
    if (newSession.state.stage === "HANDOFF") {
      setCurrentScreen("S5");
    } else {
      setCurrentScreen("S2");
    }
  };

  const handleReviewSuggestedChange = () => {
    setPreviousScreen(currentScreen);
    setCurrentScreen("S3");
  };

  const handleConfirmProposal = () => {
    if (!session) return;
    session.approveProposal();
    refreshState(session);
    setPreviousScreen(currentScreen);
    if (session.state.stage === "HANDOFF") {
      setCurrentScreen("S5");
    } else {
      setCurrentScreen("S4");
    }
  };

  const handleDeclineProposal = () => {
    if (!session) return;
    session.declineProposal();
    refreshState(session);
    setPreviousScreen(currentScreen);
    setCurrentScreen("S4");
  };

  const handleRequestHuman = () => {
    if (!session) return;
    session.requestHuman("User requested human assistance.");
    refreshState(session);
    setPreviousScreen(currentScreen);
    setCurrentScreen("S5");
  };

  const handleAnswerClarification = (answer: string) => {
    if (!session) return;
    session.clarify(answer);
    refreshState(session);
    if (session.state.stage === "HANDOFF") {
      setCurrentScreen("S5");
    } else if (session.state.stage === "PROPOSE") {
      setCurrentScreen("S3");
    } else {
      setCurrentScreen("S2");
    }
  };

  const handleResetDemo = () => {
    store.reset();
    setTemplates(store.listTemplates());
    setSession(null);
    setSelectedTemplateId("TPL-1001");
    setAllEvents([]);
    setCurrentScreen("S1");
    setPreviousScreen("S1");
  };

  const navigateTo = (screen: Screen) => {
    setPreviousScreen(currentScreen);
    setCurrentScreen(screen);
  };

  return (
    <div className="app-layout">
      {/* Persistent App Header with MOCK banners (G7) */}
      <header className="app-topbar" role="banner">
        <div className="topbar-branding">
          <h1 className="app-title">Cheerio Resolve</h1>
          <span className="app-tagline">Context-Aware Recovery Prototype</span>
        </div>
        <div className="topbar-mock-badge">
          <span className="badge badge-mock">SIMULATED / MOCK ENVIRONMENT</span>
          <span className="topbar-subtext">Zero external Meta/Cheerio calls · Deterministic rules core</span>
        </div>
        <nav aria-label="Breadcrumb navigation" className="screen-nav">
          <button
            type="button"
            className={`nav-tab ${currentScreen === "S1" ? "active" : ""}`}
            onClick={() => navigateTo("S1")}
          >
            S1 Templates
          </button>
          <button
            type="button"
            className={`nav-tab ${currentScreen === "S2" ? "active" : ""}`}
            disabled={!session}
            onClick={() => navigateTo("S2")}
          >
            S2 Diagnosis
          </button>
          <button
            type="button"
            className={`nav-tab ${currentScreen === "S3" ? "active" : ""}`}
            disabled={!session?.state.proposal}
            onClick={() => navigateTo("S3")}
          >
            S3 Proposal
          </button>
          <button
            type="button"
            className={`nav-tab ${currentScreen === "S4" ? "active" : ""}`}
            disabled={!session || (session.state.stage !== "PENDING" && session.state.stage !== "DECLINED" && session.state.stage !== "VERIFY")}
            onClick={() => navigateTo("S4")}
          >
            S4 Outcome
          </button>
          <button
            type="button"
            className={`nav-tab ${currentScreen === "S5" ? "active" : ""}`}
            disabled={!session}
            onClick={() => navigateTo("S5")}
          >
            S5 Case File
          </button>
          <button
            type="button"
            className={`nav-tab ${currentScreen === "S6" ? "active" : ""}`}
            onClick={() => navigateTo("S6")}
          >
            S6 Manager View
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="app-main" id="main-content">
        {currentScreen === "S1" && (
          <S1TemplateList
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={setSelectedTemplateId}
            onStartRecovery={handleStartRecovery}
            onViewManager={() => navigateTo("S6")}
            onResetDemo={handleResetDemo}
          />
        )}

        {currentScreen === "S2" && session && (
          <S2Diagnosis
            state={session.state}
            onReviewSuggestedChange={handleReviewSuggestedChange}
            onRequestHuman={handleRequestHuman}
            onAnswerClarification={handleAnswerClarification}
            onBackToList={() => navigateTo("S1")}
          />
        )}

        {currentScreen === "S3" && session && (
          <S3Proposal
            state={session.state}
            onConfirm={handleConfirmProposal}
            onDecline={handleDeclineProposal}
            onRequestHuman={handleRequestHuman}
            onBackToDiagnosis={() => navigateTo("S2")}
          />
        )}

        {currentScreen === "S4" && session && (
          <S4Outcome
            state={session.state}
            onViewCaseFile={() => navigateTo("S5")}
            onViewManager={() => navigateTo("S6")}
            onResetDemo={handleResetDemo}
          />
        )}

        {currentScreen === "S5" && session && (
          <S5CaseFile
            state={session.state}
            onBackToOutcome={() => navigateTo(previousScreen === "S4" ? "S4" : "S2")}
            onViewManager={() => navigateTo("S6")}
            onResetDemo={handleResetDemo}
          />
        )}

        {currentScreen === "S6" && (
          <S6ManagerView
            events={allEvents}
            onBackToApp={() => navigateTo(previousScreen || "S1")}
            onResetDemo={handleResetDemo}
          />
        )}
      </main>

      {/* Persistent Honest Provenance Footer */}
      <footer className="app-footer">
        <p>
          <strong>Cheerio Resolve Prototype:</strong> Built for Cheerio product-intern assignment (Assignment A).
          All data, reason codes, operations, and outcomes are simulated fixtures.
          Rules-only deterministic baseline. No real customer data.
        </p>
      </footer>
    </div>
  );
}
