const BASE = "/api";
const REQUEST_TIMEOUT_MS = 30_000;

const USER_MESSAGES: Record<number, string> = {
  400: "Invalid request. Please check your input.",
  404: "Data not found. Please upload a CSV first.",
  413: "File is too large. Maximum upload size is 100MB.",
  422: "Invalid parameters. Please check your input values.",
  429: "Too many sessions. Please delete old sessions first.",
  500: "Server error. Please try again later.",
  502: "AI provider error. Please check your API key.",
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const userMsg = USER_MESSAGES[res.status] || `Request failed (${res.status})`;
      console.error(`[API] ${res.status} ${path}: ${body}`);
      throw new Error(userMsg);
    }
    return res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out. The server may be busy.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function uploadCsv(
  file: File,
  sessionId = "default"
): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  return request(`/upload?session_id=${sessionId}`, {
    method: "POST",
    body: form,
  });
}

export interface UploadResponse {
  session_id: string;
  kind: string;
  filename: string;
  n_rows: number;
  columns: string[];
  preview: Record<string, unknown>[];
}

// Core metrics
export const getMetrics = (s = "default") =>
  request<Record<string, unknown>>(`/analysis/metrics?session_id=${s}`);

export const getMetricsBy = (group: string, s = "default") =>
  request<Record<string, unknown>[]>(`/analysis/metrics/by/${group}?session_id=${s}`);

// Advanced metrics
export const getRiskReturn = (s = "default") =>
  request<Record<string, unknown>>(`/analysis/risk-return?session_id=${s}`);

export const getExpectancy = (s = "default") =>
  request<Record<string, unknown>>(`/analysis/expectancy?session_id=${s}`);

export const getDependency = (s = "default") =>
  request<Record<string, unknown>>(`/analysis/dependency?session_id=${s}`);

export const getDistribution = (s = "default") =>
  request<Record<string, unknown>>(`/analysis/distribution?session_id=${s}`);

export const getTimeDecay = (s = "default", windowSize = 50) =>
  request<Record<string, unknown>>(`/analysis/time-decay?session_id=${s}&window_size=${windowSize}`);

export const getComprehensive = (s = "default") =>
  request<Record<string, unknown>>(`/analysis/comprehensive?session_id=${s}`);

// Robustness
export const getMonteCarlo = (s = "default", n = 1000) =>
  request<Record<string, unknown>>(`/robustness/monte-carlo?session_id=${s}&n=${n}`);

export const getParametricMC = (s = "default", n = 5000, dist = "empirical") =>
  request<Record<string, unknown>>(`/robustness/parametric-monte-carlo?session_id=${s}&n_simulations=${n}&distribution=${dist}`);

export const getBlockBootstrap = (s = "default", n = 2000) =>
  request<Record<string, unknown>>(`/robustness/block-bootstrap?session_id=${s}&n_simulations=${n}`);

export const getWalkForward = (s = "default") =>
  request<Record<string, unknown>>(`/robustness/walk-forward?session_id=${s}`);

export const getRollingWF = (s = "default", windows = 5, anchored = false) =>
  request<Record<string, unknown>>(`/robustness/rolling-walk-forward?session_id=${s}&n_windows=${windows}&anchored=${anchored}`);

export const getDeflatedSharpe = (s = "default", trials = 100) =>
  request<Record<string, unknown>>(`/robustness/deflated-sharpe?session_id=${s}&n_trials=${trials}`);

export const getRegime = (s = "default") =>
  request<Record<string, unknown>>(`/robustness/regime?session_id=${s}`);

// Portfolio & benchmark
export const getPortfolio = (s = "default") =>
  request<Record<string, unknown>>(`/analysis/portfolio?session_id=${s}`);

export const getBenchmark = (s = "default") =>
  request<Record<string, unknown>>(`/analysis/benchmark?session_id=${s}`);

// Charts
export interface EquityData {
  timestamps: string[];
  equity: number[];
  pnl: number[];
  drawdown: number[];
}
export const getEquityCurve = (s = "default") =>
  request<EquityData>(`/charts/equity?session_id=${s}`);

export interface HeatmapData {
  days: string[];
  hours: number[];
  values: number[][];
}
export const getHeatmap = (s = "default") =>
  request<HeatmapData>(`/charts/heatmap?session_id=${s}`);

export interface DistributionData {
  centers: number[];
  counts: number[];
  edges: number[];
}
export const getPnlDistribution = (s = "default") =>
  request<DistributionData>(`/charts/distribution?session_id=${s}`);

export const getTradesData = (s = "default") =>
  request<Record<string, unknown>[]>(`/charts/trades?session_id=${s}`);

// Strategy improvements
export const getImprovements = (s = "default") =>
  request<Record<string, unknown>>(`/analysis/improvements?session_id=${s}`);

// Exports
export const getExportJsonUrl = (s = "default") => `${BASE}/export/json?session_id=${s}`;
export const getExportCsvUrl = (s = "default", filtered = false) =>
  `${BASE}/export/csv?session_id=${s}&filtered=${filtered}`;

// Comparison
export const getComparison = (a: string, b: string) =>
  request<Record<string, unknown>>(`/export/comparison?session_a=${a}&session_b=${b}`);

// Sessions
export const getSessions = () =>
  request<Record<string, { kind: string; filename: string; n_rows: number }>>(`/sessions`);
