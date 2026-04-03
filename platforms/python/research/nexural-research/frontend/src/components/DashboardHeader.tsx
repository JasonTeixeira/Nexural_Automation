import type { UploadResponse } from "../lib/api";

interface Props {
  session: UploadResponse;
  onReset: () => void;
}

export function DashboardHeader({ session, onReset }: Props) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-nex-border bg-nex-surface/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-nex-accent">Nexural</span> Research
        </h1>
        <div className="h-5 w-px bg-nex-border" />
        <div className="text-sm text-nex-muted">
          <span className="text-nex-text font-medium">{session.filename}</span>
          <span className="mx-2">|</span>
          <span>{session.n_rows.toLocaleString()} trades</span>
          <span className="mx-2">|</span>
          <span className="capitalize">{session.kind}</span>
        </div>
      </div>
      <button onClick={onReset} className="btn-secondary text-xs">
        New Analysis
      </button>
    </header>
  );
}
