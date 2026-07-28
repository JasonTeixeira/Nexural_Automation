interface Props {
  platformApiKey: string;
  onPlatformApiKeyChange: (key: string) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  provider: "anthropic" | "openai" | "perplexity";
  onProviderChange: (p: "anthropic" | "openai" | "perplexity") => void;
}

export function SettingsPanel({ platformApiKey, onPlatformApiKeyChange, apiKey, onApiKeyChange, provider, onProviderChange }: Props) {
  return (
    <div className="max-w-2xl space-y-8 animate-slide-up">
      <div className="panel">
        <h3 className="section-title">Nexural API Access</h3>
        <p className="text-xs text-gray-500 -mt-3 mb-5">
          Required only when NEXURAL_AUTH_ENABLED is active. It protects sessions, Academy progress, AI routes, and exports.
        </p>
        <label htmlFor="platform-api-key" className="block text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">Nexural bearer key</label>
        <input id="platform-api-key" type="password" autoComplete="off" value={platformApiKey} onChange={(event) => onPlatformApiKeyChange(event.target.value)} placeholder="Local server API key" className="min-h-11 w-full rounded-lg border border-[var(--line-strong)] bg-[var(--surface-input)] px-4 py-3 font-mono text-sm text-gray-300 placeholder-gray-600 transition-all focus:border-[var(--signal-active)] focus:outline-none focus:ring-1 focus:ring-[var(--signal-active)]" />
        <p className="text-[10px] text-gray-600 mt-2">Held in browser memory only and attached as an Authorization header to Nexural requests.</p>
      </div>

      {/* AI Provider */}
      <div className="panel">
        <h3 className="section-title">AI Provider</h3>
        <p className="text-xs text-gray-500 -mt-3 mb-5">
          Connect your own API key to enable AI-powered strategy analysis. Your key is stored only in browser memory and never sent to our servers.
        </p>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            onClick={() => onProviderChange("anthropic")}
            aria-pressed={provider === "anthropic"}
            className={`glass-card p-5 text-left transition-all cursor-pointer ${
              provider === "anthropic" ? "border-[var(--signal-active)] glow-active" : ""
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--signal-warn-border)] bg-[var(--signal-warn-soft)] text-xs font-bold text-[var(--signal-warn)]">A</div>
              <div>
                <div className="text-sm font-medium text-white">Anthropic</div>
                <div className="text-[10px] text-gray-500">Claude Sonnet 4</div>
              </div>
            </div>
            {provider === "anthropic" && <span className="badge-active">Active</span>}
          </button>

          <button
            onClick={() => onProviderChange("openai")}
            aria-pressed={provider === "openai"}
            className={`glass-card p-5 text-left transition-all cursor-pointer ${
              provider === "openai" ? "border-[var(--signal-active)] glow-active" : ""
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--signal-pass-border)] bg-[var(--signal-pass-soft)] text-xs font-bold text-[var(--signal-pass)]">G</div>
              <div>
                <div className="text-sm font-medium text-white">OpenAI</div>
                <div className="text-[10px] text-gray-500">GPT-4o</div>
              </div>
            </div>
            {provider === "openai" && <span className="badge-active">Active</span>}
          </button>

          <button
            onClick={() => onProviderChange("perplexity")}
            aria-pressed={provider === "perplexity"}
            className={`glass-card p-5 text-left transition-all cursor-pointer ${
              provider === "perplexity" ? "border-[var(--signal-active)] glow-active" : ""
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line-strong)] bg-[var(--ink-800)] text-xs font-bold text-[var(--ivory)]">P</div>
              <div>
                <div className="text-sm font-medium text-white">Perplexity</div>
                <div className="text-[10px] text-gray-500">Sonar Pro + Web</div>
              </div>
            </div>
            {provider === "perplexity" && <span className="badge-active">Active</span>}
          </button>
        </div>

        {/* API Key Input */}
        <div>
          <label htmlFor="provider-api-key" className="block text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">
            {provider === "anthropic" ? "Anthropic" : "OpenAI"} API Key
          </label>
          <input
            id="provider-api-key"
            type="password"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder={provider === "anthropic" ? "sk-ant-..." : provider === "openai" ? "sk-..." : "pplx-..."}
            className="min-h-11 w-full rounded-lg border border-[var(--line-strong)] bg-[var(--surface-input)] px-4 py-3 font-mono text-sm text-gray-300 placeholder-gray-600 transition-all focus:border-[var(--signal-active)] focus:outline-none focus:ring-1 focus:ring-[var(--signal-active)]"
          />
          <p className="text-[10px] text-gray-600 mt-2">
            Your key is stored in browser memory only. It is never persisted or sent to any server other than the AI provider.
          </p>
        </div>

        {/* Status */}
        <div className="mt-4 flex items-center gap-2">
          {apiKey ? (
            <>
              <div className="w-2 h-2 rounded-full bg-[var(--signal-pass)]" />
              <span className="text-xs text-[var(--signal-pass)]">Key configured</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-gray-600" />
              <span className="text-xs text-gray-500">No key configured</span>
            </>
          )}
        </div>
      </div>

      {/* About */}
      <div className="panel">
        <h3 className="section-title">About Nexural Research</h3>
        <div className="space-y-3 text-sm text-gray-400">
          <p>
            Institutional-grade strategy analysis engine for NinjaTrader automation developers.
            Built for the open-source community to validate trading strategies with the same
            rigor used by prop desks and quant funds.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="glass-card p-4">
              <div className="text-2xl font-bold text-white font-mono">25+</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">API Endpoints</div>
            </div>
            <div className="glass-card p-4">
              <div className="text-2xl font-bold text-white font-mono">50+</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Metrics Computed</div>
            </div>
          </div>
        </div>
        <div className="mt-4 text-xs text-gray-600">
          Version 1.0.0 &middot; Open Source &middot; MIT License
        </div>
      </div>
    </div>
  );
}
