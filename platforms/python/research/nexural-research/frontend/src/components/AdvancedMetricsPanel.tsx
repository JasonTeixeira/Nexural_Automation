import { useEffect } from "react";
import { useAsync } from "../hooks/useAnalysis";
import { getDependency, getTimeDecay, getBenchmark, getDeflatedSharpe, getRegime } from "../lib/api";
import { LoadingSpinner } from "./LoadingSpinner";

interface Props { sessionId: string; }

function Row({ label, value, highlight, verdict }: { label: string; value: unknown; highlight?: boolean; verdict?: "pass" | "fail" | "warn" }) {
  const display = typeof value === "number"
    ? (Math.abs(value) >= 1000 ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : Number.isInteger(value) ? String(value) : value.toFixed(4))
    : String(value ?? "N/A");
  return (
    <tr className="border-b border-white/[0.03] group">
      <td className="py-2.5 pr-4 text-gray-500 text-xs group-hover:text-gray-400 transition-colors">{label}</td>
      <td className={`py-2.5 font-mono text-xs ${highlight ? "text-blue-400 font-semibold" : "text-gray-300"}`}>
        <span className="flex items-center gap-2">
          {display}
          {verdict === "pass" && <span className="badge-green">PASS</span>}
          {verdict === "fail" && <span className="badge-red">FAIL</span>}
          {verdict === "warn" && <span className="badge-amber">WARN</span>}
        </span>
      </td>
    </tr>
  );
}

function Section({ title, subtitle, data, highlights = [], verdicts = {} }: {
  title: string; subtitle?: string; data: Record<string, unknown> | null;
  highlights?: string[]; verdicts?: Record<string, "pass" | "fail" | "warn">;
}) {
  if (!data) return null;
  return (
    <div className="panel animate-slide-up">
      <h3 className="section-title">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 -mt-3 mb-4">{subtitle}</p>}
      <table className="w-full">
        <tbody>
          {Object.entries(data).map(([k, v]) => (
            <Row key={k} label={k.replace(/_/g, " ")} value={v}
              highlight={highlights.includes(k)} verdict={verdicts[k]} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdvancedMetricsPanel({ sessionId }: Props) {
  const dep = useAsync<Record<string, unknown>>();
  const decay = useAsync<Record<string, unknown>>();
  const bench = useAsync<Record<string, unknown>>();
  const dsr = useAsync<Record<string, unknown>>();
  const regime = useAsync<Record<string, unknown>>();

  useEffect(() => {
    dep.run(() => getDependency(sessionId));
    decay.run(() => getTimeDecay(sessionId));
    bench.run(() => getBenchmark(sessionId));
    dsr.run(() => getDeflatedSharpe(sessionId));
    regime.run(() => getRegime(sessionId));
  }, [sessionId]);

  if (dep.status === "loading") return <LoadingSpinner text="Running advanced analysis..." />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      <Section title="Trade Dependency" subtitle="Are wins/losses serially correlated?"
        data={dep.data} highlights={["z_score", "serial_correlation", "z_interpretation"]}
        verdicts={dep.data ? {
          z_interpretation: Math.abs(dep.data.z_score as number) < 1.96 ? "pass" : "warn"
        } : {}}
      />
      <Section title="Edge Stability" subtitle="Is the strategy edge decaying over time?"
        data={decay.data} highlights={["is_decaying", "decay_interpretation"]}
        verdicts={decay.data ? {
          is_decaying: (decay.data.is_decaying as boolean) ? "fail" : "pass"
        } : {}}
      />
      <Section title="Deflated Sharpe Ratio" subtitle="Overfitting detection (Bailey & Lopez de Prado)"
        data={dsr.data} highlights={["is_significant", "p_value", "interpretation"]}
        verdicts={dsr.data ? {
          is_significant: (dsr.data.is_significant as boolean) ? "pass" : "fail"
        } : {}}
      />
      <Section title="Benchmark Comparison" subtitle="Strategy vs random entry & buy-and-hold"
        data={bench.data} highlights={["pct_better_than_random", "alpha_vs_random"]}
        verdicts={bench.data ? {
          pct_better_than_random: (bench.data.pct_better_than_random as number) >= 90 ? "pass" : (bench.data.pct_better_than_random as number) >= 60 ? "warn" : "fail"
        } : {}}
      />
      <Section title="Regime Analysis" subtitle="Performance across volatility regimes"
        data={regime.data} highlights={["current_regime", "interpretation"]} />
    </div>
  );
}
