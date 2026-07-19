const BASE = "/api";
const REQUEST_TIMEOUT_MS = 30_000;
let platformCredential = "";

export function setPlatformCredential(value: string) {
  platformCredential = value.trim();
}

const USER_MESSAGES: Record<number, string> = {
  400: "Invalid request. Please check your input.",
  401: "Authentication required. Add your Nexural API key in Settings.",
  403: "This Nexural API key does not have access to that resource.",
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
    const headers = new Headers(init?.headers);
    if (platformCredential) headers.set("Authorization", `Bearer ${platformCredential}`);
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers,
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

// Exports must be fetched so hosted mode can attach the Authorization header.
async function downloadExport(path: string, filename: string) {
  const headers = new Headers();
  if (platformCredential) headers.set("Authorization", `Bearer ${platformCredential}`);
  const response = await fetch(`${BASE}${path}`, { headers });
  if (!response.ok) {
    throw new Error(USER_MESSAGES[response.status] || `Export failed (${response.status})`);
  }
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export const downloadExportJson = (s = "default") =>
  downloadExport(`/export/json?session_id=${encodeURIComponent(s)}`, `${s}-analysis.json`);
export const downloadExportCsv = (s = "default", filtered = false) =>
  downloadExport(
    `/export/csv?session_id=${encodeURIComponent(s)}&filtered=${filtered}`,
    `${s}-${filtered ? "filtered" : "trades"}.csv`,
  );

// Comparison
export const getComparison = (a: string, b: string) =>
  request<Record<string, unknown>>(`/export/comparison?session_a=${a}&session_b=${b}`);

// Sessions
export const getSessions = () =>
  request<Record<string, { kind: string; filename: string; n_rows: number }>>(`/sessions`);

// Automation Academy
export type AcademyStatus = "not_started" | "in_progress" | "completed";

export interface AcademyCriterion {
  id: string;
  metric: string;
  operator: string;
  expected: unknown;
  weight: number;
  visibility: "public" | "hidden";
  message: string;
}

export interface AcademyItem {
  id: string;
  kind: "lesson" | "capstone";
  track: string;
  title: string;
  objectives: string[];
  prerequisites: string[];
  updated_at: string;
  estimated_minutes: number;
  translations: Record<string, Record<string, string>>;
  rubric: AcademyCriterion[];
  hidden_checks: number;
  starter_submission: Record<string, unknown>;
  hints: string[];
  tags: string[];
}

export interface AcademyTrack {
  id: string;
  title: string;
  description: string;
  lessons: string[];
  capstones: string[];
}

export interface AcademyCatalog {
  schema_version: string;
  version: string;
  updated_at: string;
  default_locale: string;
  tracks: Record<string, AcademyTrack>;
  lessons: Record<string, AcademyItem>;
  capstones: Record<string, AcademyItem>;
}

export interface AcademyItemProgress {
  item_id: string;
  status: AcademyStatus;
  attempts: number;
  hint_level: number;
  best_score: number;
  last_failures: string[];
}

export interface AcademyProgress {
  learner_id: string;
  completed: number;
  in_progress: number;
  total_attempts: number;
  items: AcademyItemProgress[];
}

export interface AcademyGrade {
  item_id: string;
  passed: boolean;
  score: number;
  criteria: Array<{
    id: string;
    passed: boolean;
    earned: number;
    possible: number;
    visibility: "public" | "hidden";
    message: string;
  }>;
}

export interface AcademyTraceEvent {
  timestamp: string;
  event: string;
  learner_id: string;
  item_id: string | null;
  data: Record<string, unknown>;
}

export interface AcademyLedgerRecord {
  id: string;
  item_id: string;
  recorded_at: string;
  code_sha: string;
  data_hash: string;
  seed: number;
  costs: Record<string, unknown>;
  folds: Array<Record<string, unknown>>;
  artifacts: Array<{ name: string; sha256: string; size: number }>;
  previous_hash: string | null;
  record_hash: string;
  verified: boolean;
}

export interface AcademyFreshness {
  fresh: boolean;
  stale_items: string[];
  newest_update?: string;
  checked_at?: string;
}

export interface AcademyMarketplaceCatalog {
  schema_version: string;
  templates: Array<{
    name: string;
    version: string;
    publisher: string;
    tags: string[];
    digest: string;
  }>;
}

export interface AcademyCohortSummary {
  cohort_id: string;
  learners: number;
  completed_items: number;
  started_items: number;
  completion_rate: number;
  common_failures: Array<[string, number]>;
}

export const getAcademyCatalog = () => request<AcademyCatalog>(`/academy/catalog`);
export const getAcademyProgress = (learnerId: string) =>
  request<AcademyProgress>(`/academy/progress/${encodeURIComponent(learnerId)}`);
export const getAcademyTrace = (learnerId: string) =>
  request<AcademyTraceEvent[]>(`/academy/trace/${encodeURIComponent(learnerId)}`);
export const getAcademyLedger = (learnerId: string) =>
  request<AcademyLedgerRecord[]>(`/academy/ledger/${encodeURIComponent(learnerId)}`);
export const getAcademyFreshness = () => request<AcademyFreshness>(`/academy/freshness`);
export const getAcademyMarketplace = () =>
  request<AcademyMarketplaceCatalog>(`/academy/marketplace`);
export const getAcademyCohortSummary = (cohortId: string, learnerIds: string[]) =>
  request<AcademyCohortSummary>(`/academy/cohorts/summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cohort_id: cohortId, learner_ids: learnerIds }),
  });
export const applyAcademyFault = (
  profile: "disconnect" | "duplicate" | "latency" | "partial_fill" | "stale_data",
  events: Array<Record<string, unknown>>,
  seed = 42,
) => request<{ profile: string; seed: number; events: Array<Record<string, unknown>> }>(
  `/academy/faults/apply`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile, events, seed }),
  },
);

const academyAction = <T>(
  itemId: string,
  action: "start" | "check" | "submit" | "hint",
  learnerId: string,
  submission?: Record<string, unknown>,
) => request<T>(`/academy/items/${encodeURIComponent(itemId)}/${action}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ learner_id: learnerId, submission: submission ?? {} }),
});

export const startAcademyItem = (itemId: string, learnerId: string) =>
  academyAction<AcademyItemProgress>(itemId, "start", learnerId);
export const checkAcademyItem = (
  itemId: string,
  learnerId: string,
  submission: Record<string, unknown>,
) => academyAction<AcademyGrade>(itemId, "check", learnerId, submission);
export const submitAcademyItem = (
  itemId: string,
  learnerId: string,
  submission: Record<string, unknown>,
) => academyAction<AcademyGrade>(itemId, "submit", learnerId, submission);
export const getAcademyHint = (itemId: string, learnerId: string) =>
  academyAction<{ item_id: string; level: number; text: string }>(itemId, "hint", learnerId);
