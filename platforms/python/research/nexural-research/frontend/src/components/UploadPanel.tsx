import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { uploadCsv, getSessions, type UploadResponse } from "../lib/api";

interface Props {
  onUpload: (res: UploadResponse) => void;
}

export function UploadPanel({ onUpload }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasDemo, setHasDemo] = useState(false);

  useEffect(() => {
    getSessions().then(sessions => {
      if (sessions && sessions.demo) setHasDemo(true);
    }).catch(() => {});
  }, []);

  const loadDemo = useCallback(async () => {
    setUploading(true);
    try {
      const sessions = await getSessions();
      if (sessions?.demo) {
        onUpload({
          session_id: "demo",
          kind: sessions.demo.kind,
          filename: sessions.demo.filename,
          n_rows: sessions.demo.n_rows,
          columns: [],
          preview: [],
        });
      }
    } finally {
      setUploading(false);
    }
  }, [onUpload]);

  const onDrop = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const res = await uploadCsv(files[0]);
      onUpload(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    multiple: false,
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-8 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/[0.02] rounded-full blur-[100px]" />
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
      </div>

      <div className="max-w-lg w-full relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-2xl shadow-blue-500/25 mb-6">
            <span className="text-white font-bold text-2xl">N</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Nexural Research
          </h1>
          <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">
            Institutional-grade strategy analysis engine for NinjaTrader automation developers
          </p>
        </div>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`glass-card cursor-pointer text-center py-16 px-8 transition-all duration-500 ${
            isDragActive
              ? "border-blue-500/40 glow-blue scale-[1.02]"
              : "hover:border-white/[0.12]"
          }`}
        >
          <input {...getInputProps()} />

          {uploading ? (
            <div className="animate-fade-in">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
              <div className="text-blue-400 font-medium">Analyzing...</div>
              <p className="text-gray-500 text-xs mt-2">Parsing CSV &middot; Detecting export type &middot; Normalizing data</p>
            </div>
          ) : (
            <div>
              <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <p className="text-white font-medium text-base">
                {isDragActive ? "Drop your file here" : "Import NinjaTrader Export"}
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Drag & drop a CSV or click to browse
              </p>
              <div className="flex items-center justify-center gap-4 mt-6 text-[11px] text-gray-600">
                <span className="badge-blue">Trades</span>
                <span className="badge-blue">Executions</span>
                <span className="badge-blue">Optimization</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 inline-block">
              {error}
            </div>
          )}
        </div>

        {/* Demo button */}
        {hasDemo && (
          <div className="text-center mt-6">
            <button onClick={loadDemo} className="btn-secondary text-sm">
              Try Demo with Sample Data
            </button>
            <p className="text-[10px] text-gray-600 mt-2">
              Explore all features with built-in sample trades
            </p>
          </div>
        )}

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          {[
            { label: "Monte Carlo", sub: "5,000+ simulations" },
            { label: "Walk-Forward", sub: "Rolling analysis" },
            { label: "AI Analyst", sub: "Claude / GPT / Perplexity" },
          ].map((f) => (
            <div key={f.label} className="text-center py-3">
              <div className="text-xs font-medium text-gray-400">{f.label}</div>
              <div className="text-[10px] text-gray-600 mt-0.5">{f.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
