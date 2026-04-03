import { useCallback, useRef, useState, useEffect } from "react";

interface Props {
  sessionId: string;
  apiKey: string;
  provider: "anthropic" | "openai" | "perplexity";
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const QUICK_PROMPTS = [
  "Give me a complete honest assessment of this strategy. Is it worth developing further?",
  "What are the top 3 specific changes I should make to improve this strategy?",
  "Analyze the risk profile. What's the realistic worst-case scenario?",
  "Is this strategy overfit? What evidence do you see for or against?",
  "What time filters or session restrictions would improve performance?",
  "How should I size positions for this strategy? What does Kelly suggest?",
  "Compare this to what you'd expect from a professional quant strategy.",
  "What market conditions would cause this strategy to blow up?",
];

export function AiAnalyst({ sessionId, apiKey, provider }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async (text: string) => {
    if (!text.trim()) return;
    if (!apiKey) {
      setError("Please configure your API key in Settings first.");
      return;
    }

    const userMsg: Message = { role: "user", content: text.trim(), timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          provider,
          message: text.trim(),
          session_id: sessionId,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(body.detail || `Error ${res.status}`);
      }

      const data = await res.json();
      const aiMsg: Message = { role: "assistant", content: data.response, timestamp: Date.now() };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get AI response");
    } finally {
      setLoading(false);
    }
  }, [apiKey, provider, sessionId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  if (!apiKey) {
    return (
      <div className="max-w-2xl mx-auto animate-slide-up">
        <div className="panel text-center py-16">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">AI Strategy Analyst</h3>
          <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6">
            Connect your Claude or OpenAI API key to get institutional-grade AI analysis of your strategy data.
          </p>
          <p className="text-xs text-gray-500">
            Go to <span className="text-blue-400 font-medium">Settings</span> to configure your API key
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-slide-up">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <h3 className="text-base font-medium text-gray-300 mb-2">Ask the AI Analyst</h3>
            <p className="text-xs text-gray-500 mb-8 max-w-md mx-auto">
              The AI has full context of your {sessionId} analysis — all metrics, robustness tests, regime data, and distribution statistics.
              Ask it anything about your strategy.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => send(prompt)}
                  className="glass-card px-4 py-3 text-left text-xs text-gray-400 hover:text-gray-200 hover:border-blue-500/20 transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] ${msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}`}>
              {msg.role === "assistant" ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  {msg.content.split("\n").map((line, j) => {
                    if (line.startsWith("## ")) return <h3 key={j} className="text-blue-400 font-semibold text-sm mt-4 mb-2">{line.slice(3)}</h3>;
                    if (line.startsWith("### ")) return <h4 key={j} className="text-gray-300 font-medium text-sm mt-3 mb-1">{line.slice(4)}</h4>;
                    if (line.startsWith("- ") || line.startsWith("* ")) return <div key={j} className="flex gap-2 text-xs my-0.5"><span className="text-blue-500 mt-0.5">&#8226;</span><span>{line.slice(2)}</span></div>;
                    if (line.startsWith("**") && line.endsWith("**")) return <div key={j} className="font-semibold text-gray-200 text-xs mt-2">{line.slice(2, -2)}</div>;
                    if (line.trim() === "") return <div key={j} className="h-2" />;
                    return <p key={j} className="text-xs my-1">{line}</p>;
                  })}
                </div>
              ) : (
                <div className="text-sm">{msg.content}</div>
              )}
              <div className="text-[9px] text-gray-600 mt-2">
                {msg.role === "assistant" ? (provider === "anthropic" ? "Claude" : provider === "openai" ? "GPT-4o" : "Perplexity") : "You"}
                {" "}&middot;{" "}
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="chat-bubble-ai flex items-center gap-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-xs text-gray-500">Analyzing your strategy data...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-400 max-w-md">
              {error}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-3 pt-4 border-t border-white/[0.04]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your strategy..."
          disabled={loading}
          className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="btn-primary disabled:opacity-30 disabled:cursor-not-allowed px-6"
        >
          {loading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
