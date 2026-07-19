import { lazy, Suspense, useState } from "react";
import { AcademyWorkspace } from "./components/academy/AcademyWorkspace";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Sidebar } from "./components/Sidebar";
import { UploadPanel } from "./components/UploadPanel";
import { setPlatformCredential, type UploadResponse } from "./lib/api";

const AdvancedMetricsPanel = lazy(() => import("./components/AdvancedMetricsPanel").then((module) => ({ default: module.AdvancedMetricsPanel })));
const AiAnalyst = lazy(() => import("./components/AiAnalyst").then((module) => ({ default: module.AiAnalyst })));
const ComparisonPanel = lazy(() => import("./components/ComparisonPanel").then((module) => ({ default: module.ComparisonPanel })));
const DistributionPanel = lazy(() => import("./components/DistributionPanel").then((module) => ({ default: module.DistributionPanel })));
const EquityChart = lazy(() => import("./components/EquityChart").then((module) => ({ default: module.EquityChart })));
const HeatmapPanel = lazy(() => import("./components/HeatmapPanel").then((module) => ({ default: module.HeatmapPanel })));
const ImprovementsPanel = lazy(() => import("./components/ImprovementsPanel").then((module) => ({ default: module.ImprovementsPanel })));
const MetricsOverview = lazy(() => import("./components/MetricsOverview").then((module) => ({ default: module.MetricsOverview })));
const RobustnessPanel = lazy(() => import("./components/RobustnessPanel").then((module) => ({ default: module.RobustnessPanel })));
const SettingsPanel = lazy(() => import("./components/SettingsPanel").then((module) => ({ default: module.SettingsPanel })));
const TradesTable = lazy(() => import("./components/TradesTable").then((module) => ({ default: module.TradesTable })));

export type View =
  | "academy"
  | "overview"
  | "improvements"
  | "advanced"
  | "robustness"
  | "distribution"
  | "heatmap"
  | "trades"
  | "compare"
  | "ai"
  | "settings";

const VIEW_TITLES: Record<View, string> = {
  academy: "Automation Academy",
  overview: "Performance Overview",
  improvements: "Strategy Improvements",
  advanced: "Advanced Analytics",
  robustness: "Robustness Testing",
  distribution: "Distribution Analysis",
  heatmap: "Time & Session Analysis",
  trades: "Trade Log",
  compare: "Strategy Comparison",
  ai: "AI Strategy Analyst",
  settings: "Settings",
};

export default function App() {
  const [session, setSession] = useState<UploadResponse | null>(null);
  const [view, setView] = useState<View>("academy");
  const [apiKey, setApiKey] = useState("");
  const [platformApiKey, setPlatformApiKey] = useState("");
  const [aiProvider, setAiProvider] = useState<"anthropic" | "openai" | "perplexity">("anthropic");

  return (
    <div className="min-h-screen">
      <a href="#main-content" className="skip-link">Skip to workspace</a>
      <Sidebar
        view={view}
        onNavigate={setView}
        session={session}
        onReset={() => { setSession(null); setView("overview"); }}
      />

      <main id="main-content" className="app-main min-h-screen">
        {view !== "academy" && (
          <header className="app-topbar">
            <div>
              <h1>{VIEW_TITLES[view]}</h1>
              <p>{session ? `${session.filename} · ${session.n_rows.toLocaleString()} trades · ${session.kind}` : "Import a validated NinjaTrader export to begin analysis."}</p>
            </div>
            <div className="app-session-state">
              <div><span>Session</span><code>{session?.session_id ?? "NOT LOADED"}</code></div>
              <i className={session ? "connected" : "idle"} title={session ? "API connected" : "Waiting for data"} />
            </div>
          </header>
        )}

        <div className={view === "academy" ? "academy-app-content" : "app-content"}>
          <ErrorBoundary key={view}>
            <Suspense fallback={<div className="academy-state" role="status">Loading workspace…</div>}>
              {view === "academy" && <AcademyWorkspace />}
              {view !== "academy" && !session && <UploadPanel onUpload={setSession} />}
              {session && view === "overview" && <div className="space-y-8"><MetricsOverview sessionId={session.session_id} /><EquityChart sessionId={session.session_id} /></div>}
              {session && view === "improvements" && <ImprovementsPanel sessionId={session.session_id} />}
              {session && view === "advanced" && <AdvancedMetricsPanel sessionId={session.session_id} />}
              {session && view === "robustness" && <RobustnessPanel sessionId={session.session_id} />}
              {session && view === "distribution" && <DistributionPanel sessionId={session.session_id} />}
              {session && view === "heatmap" && <HeatmapPanel sessionId={session.session_id} />}
              {session && view === "trades" && <TradesTable sessionId={session.session_id} />}
              {session && view === "compare" && <ComparisonPanel currentSessionId={session.session_id} />}
              {session && view === "ai" && <AiAnalyst sessionId={session.session_id} apiKey={apiKey} provider={aiProvider} />}
              {view === "settings" && <SettingsPanel platformApiKey={platformApiKey} onPlatformApiKeyChange={(value) => { setPlatformApiKey(value); setPlatformCredential(value); }} apiKey={apiKey} onApiKeyChange={setApiKey} provider={aiProvider} onProviderChange={setAiProvider} />}
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
