import { useEffect } from "react";
import { useAsync } from "../hooks/useAnalysis";
import { getHeatmap, type HeatmapData } from "../lib/api";
import { LoadingSpinner } from "./LoadingSpinner";

interface Props { sessionId: string; }

function getHeatClass(value: number, maxAbs: number): string {
  if (maxAbs === 0 || value === 0) return "heatmap-neutral";
  const ratio = Math.max(-1, Math.min(1, value / maxAbs));
  const level = Math.max(1, Math.ceil(Math.abs(ratio) * 5));
  return `${ratio > 0 ? "heatmap-pass" : "heatmap-fail"} heatmap-level-${level}`;
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
      <p className="text-xs text-gray-500 -mt-3 mb-6">Identifies profitable and losing time slots. Pass tone = profit, fail tone = loss; every cell also carries its signed value.</p>

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
                        className={`heatmap-cell ${getHeatClass(val, maxAbs)}`}
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
          <div className="heatmap-legend heatmap-legend-fail" />
          <span>Loss</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="heatmap-legend heatmap-neutral" />
          <span>Neutral</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="heatmap-legend heatmap-legend-pass" />
          <span>Profit</span>
        </div>
      </div>
    </div>
  );
}
