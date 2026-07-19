import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Award,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  FlaskConical,
  Gauge,
  GraduationCap,
  Languages,
  LibraryBig,
  LockKeyhole,
  Play,
  RefreshCcw,
  Route,
  ShieldCheck,
  Store,
  TerminalSquare,
  TestTubeDiagonal,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import {
  applyAcademyFault,
  checkAcademyItem,
  getAcademyCatalog,
  getAcademyCohortSummary,
  getAcademyFreshness,
  getAcademyHint,
  getAcademyLedger,
  getAcademyMarketplace,
  getAcademyProgress,
  getAcademyTrace,
  startAcademyItem,
  submitAcademyItem,
  type AcademyCatalog,
  type AcademyCohortSummary,
  type AcademyFreshness,
  type AcademyGrade,
  type AcademyItem,
  type AcademyLedgerRecord,
  type AcademyMarketplaceCatalog,
  type AcademyProgress,
  type AcademyTraceEvent,
  type AcademyTrack,
} from "../../lib/api";

type AcademyView = "mission" | "lab" | "ledger" | "credentials" | "marketplace" | "instructor";
type LabPanel = "brief" | "workbench" | "evidence";

const LEARNER_ID = "local-operator";
const TRACK_ORDER = ["strategy-builder", "research-operator", "bridge-engineer", "agent-automation-engineer"];
const LAB_PANELS: LabPanel[] = ["brief", "workbench", "evidence"];

const VIEW_ITEMS: Array<{ id: AcademyView; label: string; icon: typeof Route }> = [
  { id: "mission", label: "Mission control", icon: Route },
  { id: "lab", label: "Flight simulator", icon: FlaskConical },
  { id: "ledger", label: "Evidence ledger", icon: LibraryBig },
  { id: "credentials", label: "Attestation", icon: Award },
  { id: "marketplace", label: "Marketplace", icon: Store },
  { id: "instructor", label: "Instructor", icon: Users },
];

function itemMap(catalog: AcademyCatalog) {
  return { ...catalog.lessons, ...catalog.capstones };
}

function submissionTemplate(item: AcademyItem): Record<string, unknown> {
  if (item.starter_submission) return item.starter_submission;
  return item.rubric.reduce<Record<string, unknown>>((payload, criterion) => {
    if (criterion.visibility !== "hidden" && !criterion.metric.includes("profit")) {
      payload[criterion.metric] = criterion.expected;
    }
    return payload;
  }, {});
}

function StatusMark({ status }: { status: "locked" | "available" | "active" | "passed" }) {
  if (status === "passed") return <CheckCircle2 aria-label="Passed" className="h-4 w-4 text-[var(--signal-pass)]" />;
  if (status === "locked") return <LockKeyhole aria-label="Locked" className="h-4 w-4 text-[var(--text-dim)]" />;
  if (status === "active") return <Activity aria-label="In progress" className="h-4 w-4 text-[var(--signal-active)]" />;
  return <Play aria-label="Available" className="h-4 w-4 text-[var(--text-muted)]" />;
}

function LoadingDeck() {
  return (
    <div className="academy-state" role="status" aria-live="polite">
      <Gauge className="h-7 w-7 animate-pulse text-[var(--signal-active)]" />
      <div><strong>Calibrating the flight deck</strong><span>Loading curriculum and operator state.</span></div>
    </div>
  );
}

function ErrorDeck({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="academy-state academy-state-error" role="alert">
      <CircleAlert className="h-7 w-7" />
      <div><strong>Academy services unavailable</strong><span>{message}</span></div>
      <button className="academy-button academy-button-secondary" onClick={onRetry}><RefreshCcw className="h-4 w-4" /> Retry</button>
    </div>
  );
}

export function AcademyWorkspace() {
  const [catalog, setCatalog] = useState<AcademyCatalog | null>(null);
  const [progress, setProgress] = useState<AcademyProgress | null>(null);
  const [trace, setTrace] = useState<AcademyTraceEvent[]>([]);
  const [ledger, setLedger] = useState<AcademyLedgerRecord[]>([]);
  const [freshness, setFreshness] = useState<AcademyFreshness | null>(null);
  const [marketplace, setMarketplace] = useState<AcademyMarketplaceCatalog | null>(null);
  const [cohort, setCohort] = useState<AcademyCohortSummary | null>(null);
  const [view, setView] = useState<AcademyView>("mission");
  const [locale, setLocale] = useState<"en" | "es">("en");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submission, setSubmission] = useState("{}");
  const [grade, setGrade] = useState<AcademyGrade | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [fault, setFault] = useState("none");
  const [labPanel, setLabPanel] = useState<LabPanel>("brief");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [nextCatalog, nextProgress, nextTrace, nextLedger, nextFreshness, nextMarketplace, nextCohort] = await Promise.all([
        getAcademyCatalog(),
        getAcademyProgress(LEARNER_ID),
        getAcademyTrace(LEARNER_ID),
        getAcademyLedger(LEARNER_ID),
        getAcademyFreshness(),
        getAcademyMarketplace(),
        getAcademyCohortSummary("local-research-desk", [LEARNER_ID]),
      ]);
      setCatalog(nextCatalog);
      setProgress(nextProgress);
      setTrace(nextTrace);
      setLedger(nextLedger);
      setFreshness(nextFreshness);
      setMarketplace(nextMarketplace);
      setCohort(nextCohort);
      const first = Object.values(nextCatalog.lessons)[0];
      setSelectedId((current) => current ?? first?.id ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The Academy API did not return a valid response.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const items = useMemo(() => catalog ? itemMap(catalog) : {}, [catalog]);
  const selected = selectedId ? items[selectedId] : undefined;
  const progressById = useMemo(
    () => new Map((progress?.items ?? []).map((item) => [item.item_id, item])),
    [progress],
  );
  const complete = new Set((progress?.items ?? []).filter((item) => item.status === "completed").map((item) => item.item_id));
  const totalItems = catalog ? Object.keys(items).length : 0;
  const completion = totalItems ? Math.round(((progress?.completed ?? 0) / totalItems) * 100) : 0;
  const itemTitle = (item: AcademyItem) => item.translations[locale]?.title ?? item.title;
  const orderedTracks = catalog
    ? TRACK_ORDER.map((id) => catalog.tracks[id]).filter(
        (track): track is AcademyTrack => Boolean(track),
      )
    : [];
  const orderedItems = orderedTracks.flatMap((track) =>
    [...track.lessons, ...track.capstones].map((id) => items[id]).filter(Boolean),
  );

  const selectItem = useCallback((item: AcademyItem) => {
    const locked = item.prerequisites.some((required) => !complete.has(required));
    if (locked) return;
    setSelectedId(item.id);
    setSubmission(JSON.stringify(submissionTemplate(item), null, 2));
    setGrade(null);
    setHint(null);
    setFault("none");
    setView("lab");
    setLabPanel("brief");
    void startAcademyItem(item.id, LEARNER_ID).then(() => load());
  }, [complete, load]);

  const run = useCallback(async (mode: "check" | "submit") => {
    if (!selected) return;
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(submission) as Record<string, unknown>;
    } catch {
      setError("Workbench input must be valid JSON before it can be graded.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (fault !== "none") {
        const faultEvidence = await applyAcademyFault(
          fault as "disconnect" | "duplicate" | "latency" | "partial_fill" | "stale_data",
          [
            { id: "evt-1", quantity: 2, state: "accepted" },
            { id: "evt-2", quantity: 2, state: "filled" },
          ],
          42,
        );
        payload.fault_evidence = faultEvidence;
      }
      const result = mode === "submit"
        ? await submitAcademyItem(selected.id, LEARNER_ID, payload)
        : await checkAcademyItem(selected.id, LEARNER_ID, payload);
      setGrade(result);
      setLabPanel("evidence");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The grader failed to return evidence.");
    } finally {
      setBusy(false);
    }
  }, [fault, load, selected, submission]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key !== "Enter" || view !== "lab") return;
      event.preventDefault();
      void run(event.shiftKey ? "submit" : "check");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [run, view]);

  const requestHint = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const response = await getAcademyHint(selected.id, LEARNER_ID);
      setHint(response.text);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Mentor hint unavailable.");
    } finally {
      setBusy(false);
    }
  };

  if (error && !catalog) return <ErrorDeck message={error} onRetry={load} />;
  if (!catalog || !progress) return <LoadingDeck />;

  return (
    <section className="academy-shell" aria-labelledby="academy-title">
      <header className="academy-command-bar">
        <div>
          <span className="academy-eyebrow">Automation Academy / operator {LEARNER_ID}</span>
          <h1 id="academy-title">Research flight deck</h1>
        </div>
        <div className="academy-command-meta">
          <span className={freshness?.fresh ? "status-chip status-chip-pass" : "status-chip status-chip-warn"}>
            <ShieldCheck className="h-3.5 w-3.5" /> {freshness?.fresh ? "Curriculum current" : "Review required"}
          </span>
          <button className="status-chip cursor-pointer" onClick={() => setLocale((current) => current === "en" ? "es" : "en")} aria-label="Switch Academy language">
            <Languages className="h-3.5 w-3.5" /> {locale.toUpperCase()}
          </button>
          <span className="academy-version">CATALOG {catalog.version}</span>
        </div>
      </header>

      <nav className="academy-view-tabs" aria-label="Academy workspaces">
        {VIEW_ITEMS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setView(id)} aria-current={view === id ? "page" : undefined} className={view === id ? "active" : ""}>
            <Icon className="h-4 w-4" /><span>{label}</span>
          </button>
        ))}
      </nav>

      {error && <div className="academy-inline-error" role="alert"><XCircle className="h-4 w-4" />{error}<button onClick={() => setError(null)}>Dismiss</button></div>}

      {view === "mission" && (
        <div className="academy-mission-grid">
          <section className="academy-progress-card">
            <div className="academy-progress-copy">
              <span className="academy-kicker">Operator readiness</span>
              <strong>{completion}<small>%</small></strong>
              <p>{progress.completed} of {totalItems} scenario-gated missions passed.</p>
            </div>
            <div className="academy-progress-rail" aria-label={`${completion}% complete`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}>
              <span style={{ height: `${completion}%` }} />
            </div>
            <dl>
              <div><dt>Attempts</dt><dd>{progress.total_attempts}</dd></div>
              <div><dt>Active</dt><dd>{progress.in_progress}</dd></div>
              <div><dt>Evidence</dt><dd>{ledger.length}</dd></div>
            </dl>
          </section>

          <section className="academy-tracks" aria-labelledby="tracks-heading">
            <div className="academy-section-heading"><div><span>Curriculum vector</span><h2 id="tracks-heading">Four operating tracks</h2></div><BookOpen className="h-5 w-5" /></div>
            {orderedTracks.map((track, index) => {
              const trackItems = [...track.lessons, ...track.capstones].map((id) => items[id]).filter(Boolean);
              const passed = trackItems.filter((item) => complete.has(item.id)).length;
              return (
                <article className="academy-track" key={track.id}>
                  <div className="academy-track-index">0{index + 1}</div>
                  <div className="academy-track-copy">
                    <div><span>{track.id}</span><strong>{track.title}</strong></div>
                    <p>{track.description}</p>
                    <div className="academy-mini-progress"><span style={{ width: `${trackItems.length ? (passed / trackItems.length) * 100 : 0}%` }} /></div>
                  </div>
                  <div className="academy-track-score"><strong>{passed}/{trackItems.length}</strong><span>passed</span></div>
                </article>
              );
            })}
          </section>

          <section className="academy-mission-queue" aria-labelledby="queue-heading">
            <div className="academy-section-heading"><div><span>Execution queue</span><h2 id="queue-heading">Missions</h2></div><TerminalSquare className="h-5 w-5" /></div>
            <div className="academy-queue-list">
              {orderedItems.map((item) => {
                const itemProgress = progressById.get(item.id);
                const locked = item.prerequisites.some((required) => !complete.has(required));
                const status = complete.has(item.id) ? "passed" : locked ? "locked" : itemProgress?.status === "in_progress" ? "active" : "available";
                return (
                  <button key={item.id} disabled={locked} onClick={() => selectItem(item)} className={`academy-queue-item ${status}`}>
                    <StatusMark status={status} />
                    <span><strong>{itemTitle(item)}</strong><small>{item.kind} · {item.estimated_minutes} min · {item.tags.slice(0, 2).join(" / ")}</small></span>
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {view === "lab" && selected && (
        <div className="academy-lab">
          <header className="academy-lab-header">
            <div><span>{selected.track} / {selected.kind}</span><h2>{itemTitle(selected)}</h2></div>
            <div className="academy-lab-actions">
              <label>Fault profile
                <select value={fault} onChange={(event) => setFault(event.target.value)}>
                  <option value="none">Nominal</option><option value="disconnect">Disconnect</option><option value="duplicate">Duplicate event</option><option value="latency">Latency</option><option value="partial_fill">Partial fill</option><option value="stale_data">Stale data</option>
                </select>
              </label>
              <button disabled={busy} onClick={() => void run("check")} className="academy-button academy-button-secondary"><TestTubeDiagonal className="h-4 w-4" /> Check <kbd>Ctrl↵</kbd></button>
              <button disabled={busy} onClick={() => void run("submit")} className="academy-button academy-button-primary"><Play className="h-4 w-4" /> Submit <kbd>⇧Ctrl↵</kbd></button>
            </div>
          </header>

          <div className="academy-mobile-panels" role="tablist" aria-label="Lab panels">
            {LAB_PANELS.map((panel, index) => <button id={`lab-tab-${panel}`} aria-controls={`lab-panel-${panel}`} role="tab" tabIndex={labPanel === panel ? 0 : -1} aria-selected={labPanel === panel} className={labPanel === panel ? "active" : ""} onClick={() => setLabPanel(panel)} onKeyDown={(event) => { if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return; event.preventDefault(); const direction = event.key === 'ArrowRight' ? 1 : -1; const next = LAB_PANELS[(index + direction + LAB_PANELS.length) % LAB_PANELS.length]; setLabPanel(next); document.getElementById(`lab-tab-${next}`)?.focus(); }} key={panel}>{panel}</button>)}
          </div>

          <div className="academy-lab-grid">
            <aside id="lab-panel-brief" role="tabpanel" aria-labelledby="lab-tab-brief" className={`academy-lab-panel academy-brief ${labPanel === "brief" ? "mobile-active" : ""}`}>
              <div className="academy-panel-label"><BookOpen className="h-4 w-4" /> Mission brief</div>
              <ol>{selected.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ol>
              <div className="academy-mentor">
                <div><Bot className="h-5 w-5" /><span><strong>Trace mentor</strong><small>{trace.length} events · hints escalate from failure history.</small></span></div>
                {hint ? <p aria-live="polite">{hint}</p> : <p>No hint requested. Run a check to preserve an unassisted attempt.</p>}
                <button disabled={busy} onClick={() => void requestHint()} className="academy-button academy-button-secondary">Request next hint</button>
              </div>
            </aside>

            <section id="lab-panel-workbench" role="tabpanel" aria-labelledby="lab-tab-workbench" className={`academy-lab-panel academy-workbench ${labPanel === "workbench" ? "mobile-active" : ""}`}>
              <div className="academy-panel-label"><TerminalSquare className="h-4 w-4" /><span id="workbench-heading">Submission payload</span><small>JSON / deterministic</small></div>
              <textarea aria-label="Lab submission JSON" spellCheck={false} value={submission} onChange={(event) => setSubmission(event.target.value)} />
              <footer><span>Seeded grader</span><span>Profitability excluded</span><span>{fault === "none" ? "Nominal feed" : `Fault: ${fault}`}</span></footer>
            </section>

            <aside id="lab-panel-evidence" role="tabpanel" aria-labelledby="lab-tab-evidence" className={`academy-lab-panel academy-evidence ${labPanel === "evidence" ? "mobile-active" : ""}`} aria-live="polite">
              <div className="academy-panel-label"><ShieldCheck className="h-4 w-4" /> Evidence</div>
              {!grade ? <div className="academy-empty"><Activity className="h-6 w-6" /><strong>Awaiting run</strong><span>Checks appear here with public and hidden safety evidence.</span></div> : (
                <>
                  <div className={`academy-grade ${grade.passed ? "passed" : "failed"}`}>
                    {grade.passed ? <CheckCircle2 /> : <XCircle />}<strong>{grade.score}</strong><span>{grade.passed ? "PASS" : "REVISE"}</span>
                  </div>
                  <ul>{grade.criteria.map((criterion) => <li key={criterion.id} className={criterion.passed ? "passed" : "failed"}>{criterion.passed ? <CheckCircle2 /> : <XCircle />}<span><strong>{criterion.id}</strong><small>{criterion.message}</small></span><b>{criterion.earned}/{criterion.possible}</b></li>)}</ul>
                </>
              )}
            </aside>
          </div>
        </div>
      )}

      {view === "ledger" && (
        <section className="academy-single-view">
          <div className="academy-section-heading"><div><span>Append-only operator history</span><h2>Evidence ledger</h2></div><ShieldCheck className="h-5 w-5" /></div>
          {ledger.length === 0 ? <div className="academy-empty"><LibraryBig /><strong>No verified evidence</strong><span>Pass a mission to hash its submission into the append-only experiment ledger.</span></div> : <div className="academy-ledger">{[...ledger].reverse().map((record) => <article key={record.id}><span className="academy-ledger-line" /><div><time>{new Date(record.recorded_at).toLocaleString()}</time><strong>{record.verified ? "verified evidence" : "verification failed"}</strong><small>{record.item_id}</small></div><code>{record.record_hash} · {record.artifacts[0]?.sha256}</code></article>)}</div>}
        </section>
      )}

      {view === "credentials" && (
        <section className="academy-single-view academy-placeholder-grid">
          <div className="academy-section-heading"><div><span>Tamper-evident proof</span><h2>Knowledge attestation</h2></div><Trophy className="h-5 w-5" /></div>
          <article className="academy-credential"><GraduationCap /><div><span>NEXURAL / AUTOMATION KNOWLEDGE</span><strong>{completion === 100 ? "Attestation unlocked" : "Coursework incomplete"}</strong><p>Issued only when every prerequisite mission and capstone scenario contract is complete.</p></div><b>{completion}%</b></article>
          <article className="academy-explainer"><ShieldCheck /><strong>Signed and installation-verifiable.</strong><p>This award attests curriculum knowledge. It does not certify learner-supplied code, live-trading readiness, or behavioral safety. Any payload mutation invalidates local verification.</p></article>
        </section>
      )}

      {view === "marketplace" && (
        <section className="academy-single-view">
          <div className="academy-section-heading"><div><span>Versioned extensions</span><h2>Mission marketplace</h2></div><Store className="h-5 w-5" /></div>
          <div className="academy-market-grid">{(marketplace?.templates ?? []).map((entry) => <article key={entry.name}><span>{entry.tags.join(" / ")}</span><strong>{entry.name.replace(/-/g, " ")}</strong><p>Publisher {entry.publisher}. Content-addressed package for reproducible Academy extension.</p><footer><code>{entry.version} · {entry.digest.slice(0, 18)}…</code><button className="academy-button academy-button-secondary" onClick={() => navigator.clipboard?.writeText(entry.digest)}>Copy digest</button></footer></article>)}</div>
        </section>
      )}

      {view === "instructor" && (
        <section className="academy-single-view">
          <div className="academy-section-heading"><div><span>Cohort operations</span><h2>Instructor console</h2></div><Users className="h-5 w-5" /></div>
          <div className="academy-instructor-grid"><article><span>Active cohort</span><strong>{cohort?.cohort_id.replace(/-/g, " ") ?? "Local research desk"}</strong><dl><div><dt>Learners</dt><dd>{cohort?.learners ?? 0}</dd></div><div><dt>Completion</dt><dd>{Math.round((cohort?.completion_rate ?? 0) * 100)}%</dd></div><div><dt>Common failure</dt><dd>{cohort?.common_failures[0]?.[0] ?? "None"}</dd></div></dl></article><article><span>Curriculum freshness</span><strong>{freshness?.fresh ? "All missions current" : `${freshness?.stale_items?.length ?? 0} reviews due`}</strong><p>Catalog {catalog.version} · updated {catalog.updated_at}</p><button className="academy-button academy-button-secondary" onClick={() => void load()}><RefreshCcw className="h-4 w-4" /> Refresh audit</button></article></div>
        </section>
      )}
    </section>
  );
}
