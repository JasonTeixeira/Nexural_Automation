import { useState } from "react";
import { UploadPanel } from "./components/UploadPanel";
import { Sidebar } from "./components/Sidebar";
import { MetricsOverview } from "./components/MetricsOverview";
import { EquityChart } from "./components/EquityChart";
import { RobustnessPanel } from "./components/RobustnessPanel";
import { AdvancedMetricsPanel } from "./components/AdvancedMetricsPanel";
import { DistributionPanel } from "./components/DistributionPanel";
import { HeatmapPanel } from "./components/HeatmapPanel";
import { TradesTable } from "./components/TradesTable";
import { AiAnalyst } from "./components/AiAnalyst";
import { ImprovementsPanel } from "./components/ImprovementsPanel";
import { ComparisonPanel } from "./components/ComparisonPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { ErrorBoundary } from "./components/ErrorBoundary";
import type { UploadResponse } from "./lib/api";

export type View =
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

export default function App() {
  const [session, setSession] = useState<UploadResponse | null>(null);
  const [view, setView] = useState<View>("overview");
  const [apiKey, setApiKey] = useState("");
  const [aiProvider, setAiProvider] = useState<"anthropic" | "openai" | "perplexity">("anthropic");

  if (!session) {
    return <UploadPanel onUpload={setSession} />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        view={view}
        onNavigate={setView}
        session={session}
        onReset={() => { setSession(null); setView("overview"); }}
      />

      <main className="ml-[260px] flex-1 min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-40 backdrop-blur-2xl bg-[#060a13]/80 border-b border-white/[0.04] px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-white">
                {view === "overview" && "Performance Overview"}
                {view === "improvements" && "Strategy Improvements"}
                {view === "advanced" && "Advanced Analytics"}
                {view === "robustness" && "Robustness Testing"}
                {view === "distribution" && "Distribution Analysis"}
                {view === "heatmap" && "Time & Session Analysis"}
                {view === "trades" && "Trade Log"}
                {view === "compare" && "Strategy Comparison"}
                {view === "ai" && "AI Strategy Analyst"}
                {view === "settings" && "Settings"}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {session.filename} &middot; {session.n_rows.toLocaleString()} trades &middot; {session.kind}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Session</div>
                <div className="text-xs font-mono text-gray-400">{session.session_id}</div>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="API Connected" />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8 animate-fade-in">
          <ErrorBoundary key={view}>
            {view === "overview" && (
              <div className="space-y-8">
                <MetricsOverview sessionId={session.session_id} />
                <EquityChart sessionId={session.session_id} />
              </div>
            )}
            {view === "improvements" && <ImprovementsPanel sessionId={session.session_id} />}
            {view === "advanced" && <AdvancedMetricsPanel sessionId={session.session_id} />}
            {view === "robustness" && <RobustnessPanel sessionId={session.session_id} />}
            {view === "distribution" && <DistributionPanel sessionId={session.session_id} />}
            {view === "heatmap" && <HeatmapPanel sessionId={session.session_id} />}
            {view === "trades" && <TradesTable sessionId={session.session_id} />}
            {view === "compare" && <ComparisonPanel currentSessionId={session.session_id} />}
            {view === "ai" && (
              <AiAnalyst
                sessionId={session.session_id}
                apiKey={apiKey}
                provider={aiProvider}
              />
            )}
            {view === "settings" && (
              <SettingsPanel
                apiKey={apiKey}
                onApiKeyChange={setApiKey}
                provider={aiProvider}
                onProviderChange={setAiProvider}
              />
            )}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
