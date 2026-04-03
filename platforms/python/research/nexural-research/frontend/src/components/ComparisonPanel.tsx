import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { uploadCsv, getComparison } from "../lib/api";
import { useAsync } from "../hooks/useAnalysis";
import { LoadingSpinner } from "./LoadingSpinner";
import clsx from "clsx";

interface Props { currentSessionId: string; }

function DeltaRow({ label, data }: { label: string; data: Record<string, unknown> | undefined }) {
  if (!data) return null;
  const delta = data.delta as number;
  const pct = data.pct_change as number;
  const isGood = label === "max_drawdown" ? delta > 0 : delta > 0; // for MDD, less negative is better
  const isMdd = label === "max_drawdown";

  return (
    <tr className="border-b border-white/[0.03]">
      <td className="py-3 text-xs text-gray-400 capitalize">{label.replace(/_/g, " ")}</td>
      <td className="py-3 font-mono text-xs text-gray-300">{typeof data.a === "number" ? data.a.toFixed(4) : String(data.a)}</td>
      <td className="py-3 font-mono text-xs text-gray-300">{typeof data.b === "number" ? data.b.toFixed(4) : String(data.b)}</td>
      <td className={clsx("py-3 font-mono text-xs font-semibold", (isMdd ? delta < 0 : delta > 0) ? "text-emerald-400" : delta === 0 ? "text-gray-500" : "text-red-400")}>
        {delta > 0 ? "+" : ""}{delta.toFixed(4)}
      </td>
      <td className={clsx("py-3 font-mono text-xs", (isMdd ? pct < 0 : pct > 0) ? "text-emerald-400" : "text-gray-500")}>
        {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
      </td>
    </tr>
  );
}

export function ComparisonPanel({ currentSessionId }: Props) {
  const [uploading, setUploading] = useState(false);
  const [sessionB, setSessionB] = useState<string | null>(null);
  const comparison = useAsync<Record<string, unknown>>();

  const onDrop = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const bId = `compare_${Date.now()}`;
      await uploadCsv(files[0], bId);
      setSessionB(bId);
      await comparison.run(() => getComparison(currentSessionId, bId));
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  }, [currentSessionId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    multiple: false,
  });

  if (!sessionB) {
    return (
      <div className="max-w-xl mx-auto animate-slide-up">
        <div className="panel text-center py-12">
          <h3 className="text-lg font-semibold text-white mb-2">Compare Strategies</h3>
          <p className="text-xs text-gray-500 mb-8 max-w-sm mx-auto">
            Upload a second CSV to compare side-by-side with your current analysis.
            See exactly what changed between strategy versions.
          </p>
          <div
            {...getRootProps()}
            className={clsx("glass-card p-10 cursor-pointer transition-all", isDragActive ? "border-blue-500/40 glow-blue" : "hover:border-white/[0.12]")}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <div className="animate-pulse text-blue-400 text-sm">Uploading & comparing...</div>
            ) : (
              <>
                <svg className="w-10 h-10 mx-auto text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <p className="text-sm text-gray-300">Drop second CSV here to compare</p>
                <p className="text-xs text-gray-500 mt-1">or click to browse</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (comparison.status === "loading") return <LoadingSpinner text="Comparing strategies..." />;
  if (!comparison.data) return null;

  const c = comparison.data;
  const metrics = ["net_profit", "win_rate", "profit_factor", "max_drawdown", "sharpe", "sortino", "calmar", "expectancy", "kelly"];

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Grade comparison */}
      <div className="grid grid-cols-2 gap-6">
        <div className="panel text-center">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Strategy A (Current)</div>
          <div className="text-4xl font-bold font-mono text-blue-400">{(c.grade as any)?.a}</div>
          <div className="text-xs text-gray-500 mt-1">{(c.trades as any)?.a} trades</div>
        </div>
        <div className="panel text-center">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Strategy B (Compared)</div>
          <div className="text-4xl font-bold font-mono text-emerald-400">{(c.grade as any)?.b}</div>
          <div className="text-xs text-gray-500 mt-1">{(c.trades as any)?.b} trades</div>
        </div>
      </div>

      {/* Metrics table */}
      <div className="panel">
        <h3 className="section-title">Side-by-Side Metrics</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Strategy A</th>
              <th>Strategy B</th>
              <th>Delta</th>
              <th>% Change</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(m => (
              <DeltaRow key={m} label={m} data={c[m] as Record<string, unknown>} />
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={() => { setSessionB(null); comparison.setData(null); }}
        className="btn-secondary"
      >
        Compare Another Strategy
      </button>
    </div>
  );
}
