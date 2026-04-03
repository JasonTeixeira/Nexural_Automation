import { useEffect } from "react";
import { useAsync } from "../hooks/useAnalysis";
import { getImprovements, getExportCsvUrl, getExportJsonUrl } from "../lib/api";
import { LoadingSpinner } from "./LoadingSpinner";
import clsx from "clsx";

interface Props { sessionId: string; }

const PRIORITY_STYLES = {
  critical: { bg: "bg-red-500/10", border: "border-red-500/30", badge: "badge-red", label: "CRITICAL" },
  high: { bg: "bg-amber-500/8", border: "border-amber-500/20", badge: "badge-amber", label: "HIGH" },
  medium: { bg: "bg-blue-500/8", border: "border-blue-500/20", badge: "badge-blue", label: "MEDIUM" },
  low: { bg: "bg-gray-500/8", border: "border-gray-500/20", badge: "text-gray-500 bg-gray-500/10 border-gray-500/20 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border", label: "LOW" },
};

const GRADE_COLORS: Record<string, string> = {
  A: "text-emerald-400", "A-": "text-emerald-400",
  "B+": "text-blue-400", B: "text-blue-400", "B-": "text-blue-400",
  C: "text-amber-400", "C-": "text-amber-400",
  D: "text-red-400", F: "text-red-500",
};

export function ImprovementsPanel({ sessionId }: Props) {
  const report = useAsync<Record<string, unknown>>();

  useEffect(() => {
    report.run(() => getImprovements(sessionId));
  }, [sessionId]);

  if (report.status === "loading") return <LoadingSpinner text="Generating improvement recommendations..." />;
  if (!report.data) return null;

  const r = report.data;
  const recs = (r.recommendations as Record<string, unknown>[]) || [];
  const tf = r.time_filter as Record<string, unknown> | null;
  const dd = r.drawdown_recovery as Record<string, unknown> | null;
  const clusters = (r.loss_clusters as Record<string, unknown>[]) || [];
  const mae = r.mae_mfe as Record<string, unknown> | null;
  const filtered = r.filtered_improvement as Record<string, unknown> | null;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Grade + Export */}
      <div className="flex items-start justify-between">
        <div className="panel flex items-center gap-6 flex-1">
          <div className="text-center">
            <div className={clsx("text-6xl font-bold font-mono", GRADE_COLORS[r.overall_grade as string] || "text-gray-400")}>
              {r.overall_grade as string}
            </div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Strategy Grade</div>
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-300">{r.grade_explanation as string}</p>
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span>{recs.length} recommendations</span>
              <span>Commission impact: {r.commission_impact_pct as number}%</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 ml-4">
          <a href={getExportJsonUrl(sessionId)} target="_blank" className="btn-secondary text-xs text-center">
            Export JSON
          </a>
          <a href={getExportCsvUrl(sessionId, false)} target="_blank" className="btn-secondary text-xs text-center">
            Export CSV
          </a>
          {tf && ((tf.hours_to_remove as number[])?.length > 0 || (tf.days_to_remove as string[])?.length > 0) && (
            <a href={getExportCsvUrl(sessionId, true)} target="_blank" className="btn-primary text-xs text-center">
              Export Filtered CSV
            </a>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="panel">
        <h3 className="section-title">Actionable Recommendations</h3>
        <div className="space-y-4">
          {recs.map((rec, i) => {
            const p = rec.priority as string;
            const style = PRIORITY_STYLES[p as keyof typeof PRIORITY_STYLES] || PRIORITY_STYLES.low;
            return (
              <div key={i} className={clsx("glass-card p-5 border", style.border, style.bg)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={style.badge}>{style.label}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">{rec.category as string}</span>
                  </div>
                  <span className="text-[10px] text-gray-500">Confidence: {rec.confidence as string}</span>
                </div>
                <h4 className="text-sm font-semibold text-white mb-2">{rec.title as string}</h4>
                <p className="text-xs text-gray-400 mb-3 leading-relaxed">{rec.description as string}</p>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <div className="text-gray-600 mb-0.5">Current</div>
                    <div className="text-red-400 font-mono">{rec.current_value as string}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-0.5">Suggested</div>
                    <div className="text-emerald-400 font-mono">{rec.suggested_value as string}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-0.5">Expected Impact</div>
                    <div className="text-blue-400 font-mono">{rec.expected_impact as string}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Time Filter Details */}
      {tf && ((tf.hours_to_remove as number[])?.length > 0 || (tf.days_to_remove as string[])?.length > 0) && (
        <div className="panel">
          <h3 className="section-title">Recommended Time Filters</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wider">Remove These Hours</h4>
              <div className="flex flex-wrap gap-2">
                {(tf.hours_to_remove as number[]).map(h => (
                  <span key={h} className="badge-red font-mono">{h}:00</span>
                ))}
              </div>
              {(tf.days_to_remove as string[]).length > 0 && (
                <>
                  <h4 className="text-xs text-gray-400 font-medium mb-2 mt-4 uppercase tracking-wider">Remove These Days</h4>
                  <div className="flex flex-wrap gap-2">
                    {(tf.days_to_remove as string[]).map(d => (
                      <span key={d} className="badge-red">{d}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div>
              <h4 className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wider">Best Trading Hours</h4>
              <div className="flex flex-wrap gap-2">
                {(tf.best_hours as number[]).map(h => (
                  <span key={h} className="badge-green font-mono">{h}:00</span>
                ))}
              </div>
              <h4 className="text-xs text-gray-400 font-medium mb-2 mt-4 uppercase tracking-wider">Best Days</h4>
              <div className="flex flex-wrap gap-2">
                {(tf.best_days as string[]).map(d => (
                  <span key={d} className="badge-green">{d}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Before/After comparison */}
          {filtered && !filtered.error && (
            <div className="mt-6 pt-4 border-t border-white/[0.04]">
              <h4 className="text-xs text-gray-400 font-medium mb-3 uppercase tracking-wider">Impact of Applying Filters</h4>
              <div className="grid grid-cols-5 gap-3">
                {[
                  ["Trades", `${tf.trades_remaining}`, `from ${(tf.current_net as number) > 0 ? (r as any)?.n_trades : "original"}`],
                  ["Net Profit", `$${(filtered.net_profit as number)?.toFixed(2)}`, `was $${(tf.current_net as number)?.toFixed(2)}`],
                  ["Win Rate", `${filtered.win_rate}%`, ""],
                  ["Profit Factor", `${filtered.profit_factor}`, ""],
                  ["Avg Trade", `$${(filtered.avg_trade as number)?.toFixed(2)}`, ""],
                ].map(([label, val, sub]) => (
                  <div key={label} className="glass-card p-3 text-center">
                    <div className="text-sm font-mono text-emerald-400 font-semibold">{val}</div>
                    <div className="text-[10px] text-gray-500 mt-1">{label}</div>
                    {sub && <div className="text-[9px] text-gray-600 mt-0.5">{sub}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Drawdown Recovery */}
      {dd && (
        <div className="panel">
          <h3 className="section-title">Drawdown Recovery Analysis</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="glass-card p-4 text-center">
              <div className="text-lg font-mono text-white">{dd.n_drawdowns as number}</div>
              <div className="text-[10px] text-gray-500 mt-1">Drawdown Periods</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-lg font-mono text-red-400">${Math.abs(dd.deepest_drawdown as number).toFixed(2)}</div>
              <div className="text-[10px] text-gray-500 mt-1">Deepest Drawdown</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-lg font-mono text-amber-400">{(dd.avg_recovery_trades as number).toFixed(1)}</div>
              <div className="text-[10px] text-gray-500 mt-1">Avg Recovery Trades</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-lg font-mono text-red-400">{dd.max_recovery_trades as number}</div>
              <div className="text-[10px] text-gray-500 mt-1">Max Recovery Trades</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-lg font-mono text-gray-300">{(dd.avg_recovery_time_hours as number).toFixed(1)}h</div>
              <div className="text-[10px] text-gray-500 mt-1">Avg Recovery Time</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className={`text-lg font-mono ${(dd.currently_in_drawdown as boolean) ? "text-red-400" : "text-emerald-400"}`}>
                {(dd.currently_in_drawdown as boolean) ? "YES" : "NO"}
              </div>
              <div className="text-[10px] text-gray-500 mt-1">Currently In Drawdown</div>
            </div>
          </div>
        </div>
      )}

      {/* Loss Clusters */}
      {clusters.length > 0 && (
        <div className="panel">
          <h3 className="section-title">Loss Clusters Detected</h3>
          <p className="text-xs text-gray-500 -mt-3 mb-4">Periods of 3+ consecutive losing trades</p>
          <div className="space-y-2">
            {clusters.map((c, i) => (
              <div key={i} className="glass-card p-4 border border-red-500/10 flex items-center justify-between">
                <div>
                  <span className="text-sm font-mono text-red-400 font-semibold">{c.n_trades as number} consecutive losses</span>
                  <span className="text-xs text-gray-500 ml-3">
                    Trades #{c.start_index as number} — #{c.end_index as number}
                  </span>
                </div>
                <div className="text-sm font-mono text-red-400">${Math.abs(c.total_loss as number).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAE/MFE */}
      {mae && (mae.has_mae_mfe as boolean) && (
        <div className="panel">
          <h3 className="section-title">Entry/Exit Efficiency (MAE/MFE)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-4 text-center">
              <div className="text-lg font-mono text-white">{mae.entry_efficiency as number}%</div>
              <div className="text-[10px] text-gray-500 mt-1">Entry Efficiency</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-lg font-mono text-white">{mae.exit_efficiency as number}%</div>
              <div className="text-[10px] text-gray-500 mt-1">Exit Efficiency</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-lg font-mono text-amber-400">${mae.avg_heat as number}</div>
              <div className="text-[10px] text-gray-500 mt-1">Avg Heat (Adverse)</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-lg font-mono text-emerald-400">${mae.suggested_stop as number}</div>
              <div className="text-[10px] text-gray-500 mt-1">Suggested Stop</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
