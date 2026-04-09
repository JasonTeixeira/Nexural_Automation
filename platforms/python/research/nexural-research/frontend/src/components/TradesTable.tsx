import { useEffect, useState } from "react";
import { useAsync } from "../hooks/useAnalysis";
import { getTradesData } from "../lib/api";
import { LoadingSpinner } from "./LoadingSpinner";

const PAGE_SIZE = 50;

interface Props { sessionId: string; }

function formatCell(key: string, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    if (key.includes("profit") || key.includes("mae") || key.includes("mfe") || key.includes("commission"))
      return value >= 0 ? `$${value.toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`;
    if (key.includes("price")) return value.toFixed(2);
    if (key.includes("duration")) return `${(value / 60).toFixed(1)}m`;
    return value.toFixed(2);
  }
  if (typeof value === "string" && value.includes("T")) return value.replace("T", " ").slice(0, 19);
  return String(value);
}

export function TradesTable({ sessionId }: Props) {
  const trades = useAsync<Record<string, unknown>[]>();
  const [page, setPage] = useState(0);
  useEffect(() => { trades.run(() => getTradesData(sessionId)); setPage(0); }, [sessionId]);
  if (trades.status === "loading") return <LoadingSpinner text="Loading trades..." />;
  if (!trades.data || trades.data.length === 0) return <div className="text-gray-500 text-center py-10">No trades data available. Upload a CSV to get started.</div>;

  const totalPages = Math.ceil(trades.data.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, trades.data.length);
  const pageData = trades.data.slice(start, end);
  const columns = Object.keys(trades.data[0]).filter(k => !k.startsWith("_") && !k.startsWith("unnamed") && k !== "cum_net_profit");

  return (
    <div className="panel animate-slide-up overflow-hidden">
      <div className="flex items-center justify-between mb-5">
        <h3 className="section-title mb-0">Trade Log</h3>
        <span className="text-xs text-gray-500">
          Showing {start + 1}-{end} of {trades.data.length} trades
        </span>
      </div>
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              {columns.map((col) => (
                <th key={col} className="whitespace-nowrap">{col.replace(/_/g, " ")}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => (
              <tr key={start + i}>
                <td className="text-gray-600">{start + i + 1}</td>
                {columns.map((col) => {
                  const val = row[col];
                  const isProfit = col === "profit";
                  const color = isProfit && typeof val === "number"
                    ? (val > 0 ? "text-emerald-400" : val < 0 ? "text-red-400" : "")
                    : "";
                  return (
                    <td key={col} className={`whitespace-nowrap ${color}`}>
                      {formatCell(col, val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.04]">
          <button
            type="button"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-30"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500">
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
