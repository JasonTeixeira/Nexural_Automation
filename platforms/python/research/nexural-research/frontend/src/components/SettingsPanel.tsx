interface Props {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  provider: "anthropic" | "openai" | "perplexity";
  onProviderChange: (p: "anthropic" | "openai" | "perplexity") => void;
}

export function SettingsPanel({ apiKey, onApiKeyChange, provider, onProviderChange }: Props) {
  return (
    <div className="max-w-2xl space-y-8 animate-slide-up">
      {/* AI Provider */}
      <div className="panel">
        <h3 className="section-title">AI Provider</h3>
        <p className="text-xs text-gray-500 -mt-3 mb-5">
          Connect your own API key to enable AI-powered strategy analysis. Your key is stored only in browser memory and never sent to our servers.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => onProviderChange("anthropic")}
            className={`glass-card p-5 text-left transition-all cursor-pointer ${
              provider === "anthropic" ? "border-blue-500/30 glow-blue" : ""
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xs">A</div>
              <div>
                <div className="text-sm font-medium text-white">Anthropic</div>
                <div className="text-[10px] text-gray-500">Claude Sonnet 4</div>
              </div>
            </div>
            {provider === "anthropic" && <span className="badge-blue">Active</span>}
          </button>

          <button
            onClick={() => onProviderChange("openai")}
            className={`glass-card p-5 text-left transition-all cursor-pointer ${
              provider === "openai" ? "border-blue-500/30 glow-blue" : ""
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-xs">G</div>
              <div>
                <div className="text-sm font-medium text-white">OpenAI</div>
                <div className="text-[10px] text-gray-500">GPT-4o</div>
              </div>
            </div>
            {provider === "openai" && <span className="badge-blue">Active</span>}
          </button>

          <button
            onClick={() => onProviderChange("perplexity")}
            className={`glass-card p-5 text-left transition-all cursor-pointer ${
              provider === "perplexity" ? "border-blue-500/30 glow-blue" : ""
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold text-xs">P</div>
              <div>
                <div className="text-sm font-medium text-white">Perplexity</div>
                <div className="text-[10px] text-gray-500">Sonar Pro + Web</div>
              </div>
            </div>
            {provider === "perplexity" && <span className="badge-blue">Active</span>}
          </button>
        </div>

        {/* API Key Input */}
        <div>
          <label className="block text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">
            {provider === "anthropic" ? "Anthropic" : "OpenAI"} API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder={provider === "anthropic" ? "sk-ant-..." : provider === "openai" ? "sk-..." : "pplx-..."}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 transition-all"
          />
          <p className="text-[10px] text-gray-600 mt-2">
            Your key is stored in browser memory only. It is never persisted or sent to any server other than the AI provider.
          </p>
        </div>

        {/* Status */}
        <div className="mt-4 flex items-center gap-2">
          {apiKey ? (
            <>
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs text-emerald-400">Key configured</span>
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
