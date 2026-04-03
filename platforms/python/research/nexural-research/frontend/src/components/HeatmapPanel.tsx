import { useEffect } from "react";
import { useAsync } from "../hooks/useAnalysis";
import { getHeatmap, type HeatmapData } from "../lib/api";
import { LoadingSpinner } from "./LoadingSpinner";

interface Props { sessionId: string; }

function getColor(value: number, maxAbs: number): string {
  if (maxAbs === 0) return "rgba(255,255,255,0.02)";
  const ratio = Math.max(-1, Math.min(1, value / maxAbs));
  if (ratio > 0) {
    const i = ratio;
    return `rgba(16, 185, 129, ${0.1 + i * 0.7})`;
  } else {
    const i = -ratio;
    return `rgba(239, 68, 68, ${0.1 + i * 0.7})`;
  }
}

export function HeatmapPanel({ sessionId }: Props) {
  const heat = useAsync<HeatmapData>();
  useEffect(() => { heat.run(() => getHeatmap(sessionId)); }, [sessionId]);
  if (heat.status === "loading") return <LoadingSpinner text="Building heatmap..." />;
  if (!heat.data) return null;

  const { days, hours, values } = heat.data;
  const allValues = values.flat();
  const maxAbs = Math.max(...allValues.map(Math.abs), 1);

  return (
    <div className="panel animate-slide-up">
      <h3 className="section-title">PnL Heatmap — Day of Week x Hour</h3>
      <p className="text-xs text-gray-500 -mt-3 mb-6">Identifies profitable and losing time slots. Green = profit, Red = loss. Use this to filter your strategy's trading hours.</p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-[10px] text-gray-500 text-left font-medium uppercase tracking-wider w-20">Day</th>
              {hours.map((h) => (
                <th key={h} className="p-1 text-[10px] text-gray-600 text-center min-w-[48px] font-mono">{h}:00</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day, di) => (
              <tr key={day}>
                <td className="p-2 text-xs text-gray-400 font-medium">{day.slice(0, 3)}</td>
                {hours.map((h, hi) => {
                  const val = values[di]?.[hi] ?? 0;
                  return (
                    <td key={h} className="p-0.5">
                      <div
                        className="rounded-md text-center text-[10px] font-mono py-2 transition-all hover:scale-110 hover:z-10 relative cursor-default"
                        style={{
                          backgroundColor: getColor(val, maxAbs),
                          color: Math.abs(val / maxAbs) > 0.2 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)",
                        }}
                        title={`${day} ${h}:00 — $${val.toFixed(2)}`}
                      >
                        {val !== 0 ? (val > 0 ? `+${val.toFixed(0)}` : val.toFixed(0)) : ""}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 rounded" style={{ background: "linear-gradient(90deg, rgba(239,68,68,0.7), rgba(239,68,68,0.1))" }} />
          <span>Loss</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 rounded bg-white/[0.03] border border-white/[0.06]" />
          <span>Neutral</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 rounded" style={{ background: "linear-gradient(90deg, rgba(16,185,129,0.1), rgba(16,185,129,0.7))" }} />
          <span>Profit</span>
        </div>
      </div>
    </div>
  );
}
