"""Generate the canonical executable Academy curriculum.

This script is intentionally deterministic: rerunning it produces byte-stable
YAML/JSON/Markdown packages for content review and CI.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
UPDATED = "2026-07-19"
RUNNER = "nexural.declarative-trace.v1"

FAULT_OPERATION = {
    "disconnect": "reconcile_after_disconnect",
    "duplicate": "deduplicate_by_event_id",
    "latency": "reject_late_event",
    "partial_fill": "accumulate_partial_fills",
    "stale_data": "reject_stale_timestamp",
}


@dataclass(frozen=True)
class Topic:
    slug: str
    title: str
    title_es: str
    operation: str
    outcome: str
    outcome_es: str
    fault: str


TRACKS: dict[str, tuple[str, str, list[Topic]]] = {
    "nt8-foundations": (
        "NinjaTrader Foundations",
        "Master NinjaScript lifecycle, data, analysis, and Playback semantics.",
        [
            Topic("lifecycle", "NinjaScript State Lifecycle", "Ciclo de estados de NinjaScript", "configure_state_lifecycle", "configure state-specific resources without lifecycle leakage", "configurar recursos por estado sin fugas de ciclo de vida", "disconnect"),
            Topic("calculate-modes", "Calculate Modes", "Modos de cálculo", "select_calculate_mode", "choose OnBarClose, OnEachTick, or OnPriceChange deliberately", "elegir OnBarClose, OnEachTick u OnPriceChange de forma deliberada", "latency"),
            Topic("historical-transition", "Historical to Realtime Transition", "Transición de histórico a tiempo real", "separate_historical_realtime", "separate historical, transition, and realtime behavior", "separar el comportamiento histórico, de transición y en tiempo real", "duplicate"),
            Topic("multi-series", "Multi-Series Synchronization", "Sincronización multiserie", "guard_bars_in_progress", "guard BarsInProgress and CurrentBars before cross-series access", "proteger BarsInProgress y CurrentBars antes del acceso entre series", "stale_data"),
            Topic("session-boundaries", "Session Boundary Control", "Control de límites de sesión", "reset_on_session_boundary", "reset state exactly once at a trading-session boundary", "reiniciar el estado una sola vez en el límite de sesión", "duplicate"),
            Topic("timezones-dst", "Trading Hours, Time Zones, and DST", "Horarios, zonas horarias y DST", "normalize_exchange_timezone", "normalize timestamps using the instrument trading-hours template", "normalizar marcas temporales con la plantilla horaria del instrumento", "stale_data"),
            Topic("contract-rollover", "Contract Rollover Policy", "Política de rollover de contratos", "apply_rollover_policy", "make merge and rollover assumptions explicit and reproducible", "hacer explícitos y reproducibles los supuestos de unión y rollover", "stale_data"),
            Topic("parameters", "Parameters and Serialization", "Parámetros y serialización", "serialize_strategy_parameters", "persist bounded strategy parameters with stable defaults", "persistir parámetros acotados con valores predeterminados estables", "disconnect"),
            Topic("resource-cleanup", "Indicator Resource Cleanup", "Liberación de recursos del indicador", "dispose_runtime_resources", "release runtime resources in the correct termination state", "liberar recursos en el estado de terminación correcto", "disconnect"),
            Topic("strategy-analyzer", "Strategy Analyzer Reproducibility", "Reproducibilidad en Strategy Analyzer", "record_analyzer_configuration", "capture analyzer, fill-resolution, and optimization settings", "capturar ajustes del analizador, resolución de fills y optimización", "partial_fill"),
            Topic("playback", "Playback and Market Replay", "Playback y Market Replay", "validate_playback_semantics", "distinguish Replay101, Sim101, historical, and synchronous Playback", "distinguir Replay101, Sim101, histórico y Playback síncrono", "latency"),
            Topic("diagnostics", "TraceOrders and Diagnostics", "TraceOrders y diagnóstico", "emit_structured_diagnostics", "emit bounded diagnostic context for every order transition", "emitir contexto diagnóstico acotado para cada transición de orden", "duplicate"),
        ],
    ),
    "strategy-builder": (
        "Strategy Builder",
        "Engineer deterministic paper strategies and protective execution behavior.",
        [
            Topic("contracts", "Strategy Contracts", "Contratos de estrategia", "define_strategy_contract", "encode inputs, invariants, and non-goals before implementation", "codificar entradas, invariantes y exclusiones antes de implementar", "stale_data"),
            Topic("regime", "Regime Gates", "Filtros de régimen", "apply_regime_gate", "gate signals using only information available at decision time", "filtrar señales usando solo información disponible al decidir", "stale_data"),
            Topic("idempotency", "Signal Idempotency", "Idempotencia de señales", "deduplicate_signal_intent", "turn repeated signals into one paper intent", "convertir señales repetidas en una sola intención simulada", "duplicate"),
            Topic("state-machine", "Deterministic Strategy State", "Estado determinista de estrategia", "transition_strategy_state", "make every allowed strategy transition explicit", "hacer explícita cada transición permitida", "disconnect"),
            Topic("managed-orders", "Managed Order Semantics", "Semántica de órdenes administradas", "model_managed_order_rules", "model entry handling and signal-name constraints", "modelar reglas de entrada y nombres de señal", "duplicate"),
            Topic("order-updates", "Order Update Handling", "Gestión de actualizaciones de orden", "handle_order_update", "consume order updates without assuming provider ordering", "consumir actualizaciones sin asumir el orden del proveedor", "latency"),
            Topic("execution-updates", "Execution Update Handling", "Gestión de ejecuciones", "handle_execution_update", "drive protection from execution facts rather than intent", "activar protección desde ejecuciones reales y no intenciones", "partial_fill"),
            Topic("bracket-protection", "Protective Bracket Lifecycle", "Ciclo de brackets protectores", "maintain_protective_bracket", "create and amend protective orders without orphaning exposure", "crear y modificar protección sin dejar exposición huérfana", "partial_fill"),
            Topic("partial-fills", "Partial-Fill Accounting", "Contabilidad de fills parciales", "aggregate_execution_quantity", "reconcile quantity and average price across partial executions", "reconciliar cantidad y precio medio entre ejecuciones parciales", "partial_fill"),
            Topic("multi-instrument", "Multi-Instrument Isolation", "Aislamiento multiinstrumento", "isolate_instrument_state", "prevent state and order crossover between instruments", "evitar cruces de estado y órdenes entre instrumentos", "duplicate"),
            Topic("risk-limits", "Pre-Trade Risk Limits", "Límites de riesgo preoperación", "enforce_paper_risk_limits", "fail closed when paper-risk limits or data freshness fail", "cerrar de forma segura al fallar límites o frescura de datos", "stale_data"),
            Topic("paper-deployment", "Paper Deployment Gate", "Puerta de despliegue simulado", "verify_paper_deployment_gate", "promote only a reproducible Playback-tested build", "promover solo una versión reproducible probada en Playback", "disconnect"),
        ],
    ),
    "research-operator": (
        "Research Operator",
        "Build reproducible, leakage-resistant research evidence.",
        [
            Topic("lookahead", "Causal Feature Pipeline", "Pipeline causal de variables", "split_before_feature_engineering", "fit every transformation inside the training boundary", "ajustar cada transformación dentro del límite de entrenamiento", "stale_data"),
            Topic("walk_forward", "Walk-Forward Validation", "Validación walk-forward", "construct_walk_forward_folds", "preserve temporal order and embargo every evaluation fold", "preservar orden temporal y embargo en cada fold", "stale_data"),
            Topic("cost_stress", "Execution Cost Stress", "Estrés de costes de ejecución", "apply_cost_scenarios", "recompute evidence across commissions, spread, and slippage", "recalcular evidencia con comisiones, spread y slippage", "partial_fill"),
            Topic("reproducible-seeds", "Reproducible Randomness", "Aleatoriedad reproducible", "pin_random_seed", "make stochastic evidence exactly replayable", "hacer que la evidencia estocástica sea reproducible", "latency"),
            Topic("data-contracts", "Market Data Contracts", "Contratos de datos de mercado", "validate_data_contract", "reject malformed schemas and impossible timestamps before analysis", "rechazar esquemas inválidos y tiempos imposibles antes del análisis", "stale_data"),
            Topic("session-normalization", "Session Normalization", "Normalización de sesiones", "normalize_session_calendar", "align bars and events to an explicit exchange calendar", "alinear barras y eventos a un calendario de mercado explícito", "stale_data"),
            Topic("execution-matching", "Execution-to-Trade Matching", "Vinculación de ejecuciones a operaciones", "match_executions_deterministically", "derive trades from ordered execution facts", "derivar operaciones de ejecuciones ordenadas", "duplicate"),
            Topic("bootstrap", "Bootstrap Uncertainty", "Incertidumbre bootstrap", "bootstrap_confidence_interval", "report uncertainty without destroying dependence structure", "informar incertidumbre sin destruir la dependencia", "latency"),
            Topic("regime-segmentation", "Regime Segmentation", "Segmentación de régimen", "segment_without_future_labels", "segment regimes without future-informed labels", "segmentar regímenes sin etiquetas futuras", "stale_data"),
            Topic("optimization-bias", "Optimization Bias Controls", "Controles de sesgo de optimización", "measure_selection_bias", "record the complete search space and selection process", "registrar el espacio de búsqueda y proceso de selección completos", "duplicate"),
            Topic("monte-carlo", "Monte Carlo Path Stress", "Estrés Monte Carlo de trayectorias", "simulate_path_uncertainty", "stress sequence risk with deterministic seeds", "estresar el riesgo de secuencia con semillas deterministas", "latency"),
            Topic("evidence-bundles", "Reproducible Evidence Bundles", "Paquetes de evidencia reproducible", "seal_evidence_bundle", "bind code, data, parameters, folds, and artifacts by hash", "vincular código, datos, parámetros, folds y artefactos por hash", "disconnect"),
        ],
    ),
    "bridge-engineer": (
        "Bridge Engineer",
        "Build paper-only transport that remains safe through failures and restarts.",
        [
            Topic("retries", "Bounded Retry Policy", "Política de reintentos acotados", "bound_retry_budget", "retry transient paper-bridge failures without duplicate intent", "reintentar fallos transitorios sin duplicar intención", "duplicate"),
            Topic("reconciliation", "State Reconciliation", "Reconciliación de estado", "reconcile_authoritative_state", "converge local paper state on authoritative observations", "hacer converger el estado local con observaciones autoritativas", "disconnect"),
            Topic("kill_switch", "Persistent Kill Switch", "Kill switch persistente", "persist_kill_switch", "fail closed across process and machine restart", "cerrar de forma segura entre reinicios", "disconnect"),
            Topic("sequence-ids", "Monotonic Sequence IDs", "IDs de secuencia monótonos", "enforce_monotonic_sequence", "detect gaps, reordering, and replay", "detectar huecos, reordenamiento y repetición", "latency"),
            Topic("ack-protocol", "Acknowledgement Protocol", "Protocolo de confirmación", "ack_after_durable_commit", "acknowledge only after durable application", "confirmar solo después de aplicación durable", "disconnect"),
            Topic("stale-signals", "Stale Signal Rejection", "Rechazo de señales obsoletas", "reject_expired_signal", "reject intent beyond its event-time validity window", "rechazar intención fuera de su ventana temporal", "stale_data"),
            Topic("duplicate-delivery", "At-Least-Once Delivery", "Entrega al menos una vez", "deduplicate_delivery_key", "make at-least-once delivery produce exactly-once effect", "lograr efecto único con entrega al menos una vez", "duplicate"),
            Topic("disconnect-recovery", "Disconnect Recovery", "Recuperación de desconexión", "recover_from_checkpoint", "resume only after checkpoint and state reconciliation", "reanudar solo tras checkpoint y reconciliación", "disconnect"),
            Topic("durable-outbox", "Durable Outbox", "Outbox durable", "commit_intent_to_outbox", "atomically persist intent before transport", "persistir intención atómicamente antes del transporte", "disconnect"),
            Topic("heartbeat", "Heartbeat and Liveness", "Heartbeat y disponibilidad", "expire_missing_heartbeat", "stop safely when peer liveness becomes uncertain", "detener con seguridad ante disponibilidad incierta", "latency"),
            Topic("account-isolation", "Account Isolation", "Aislamiento de cuentas", "isolate_account_namespace", "prevent cross-account routing and state leakage", "evitar rutas y fugas entre cuentas", "duplicate"),
            Topic("restart-replay", "Restart Replay", "Replay tras reinicio", "replay_unacked_events", "replay the durable log without duplicating effects", "reproducir el log durable sin duplicar efectos", "duplicate"),
        ],
    ),
    "agent-automation-engineer": (
        "Agent Automation Engineer",
        "Build observable, least-privilege research agents that fail closed.",
        [
            Topic("permissions", "Least-Privilege Permissions", "Permisos de mínimo privilegio", "enforce_least_privilege", "grant only task-scoped tools and data", "conceder solo herramientas y datos del ámbito de la tarea", "disconnect"),
            Topic("prompt_injection", "Prompt Injection Boundaries", "Límites ante inyección de prompts", "separate_untrusted_instructions", "treat external content as data rather than authority", "tratar contenido externo como datos y no autoridad", "stale_data"),
            Topic("observability", "Agent Observability", "Observabilidad de agentes", "emit_agent_trace", "record decisions, tools, inputs, and bounded outputs", "registrar decisiones, herramientas, entradas y salidas acotadas", "latency"),
            Topic("tool-allowlists", "Tool Allowlists", "Listas permitidas de herramientas", "enforce_tool_allowlist", "reject tools outside the declared mission contract", "rechazar herramientas fuera del contrato", "disconnect"),
            Topic("human-approval", "Human Approval Gates", "Puertas de aprobación humana", "require_human_approval", "pause before consequential external state changes", "pausar antes de cambios externos importantes", "latency"),
            Topic("secrets", "Secrets Boundary", "Límite de secretos", "redact_secret_material", "keep credentials out of prompts, traces, and artifacts", "mantener credenciales fuera de prompts, trazas y artefactos", "stale_data"),
            Topic("provenance", "Data Provenance", "Procedencia de datos", "attach_source_provenance", "bind every material claim to source and retrieval time", "vincular cada afirmación a fuente y hora", "stale_data"),
            Topic("deterministic-plans", "Deterministic Plans", "Planes deterministas", "serialize_execution_plan", "make bounded plans inspectable before execution", "hacer planes acotados e inspeccionables antes de ejecutar", "duplicate"),
            Topic("timeout-budget", "Timeout and Budget Control", "Control de tiempo y presupuesto", "enforce_execution_budget", "stop safely at explicit time, token, and retry limits", "detener con seguridad en límites explícitos", "latency"),
            Topic("audit-trails", "Tamper-Evident Audit Trails", "Auditoría a prueba de manipulación", "chain_audit_records", "detect missing or modified automation records", "detectar registros ausentes o modificados", "duplicate"),
            Topic("escalation", "Failure Escalation", "Escalamiento de fallos", "escalate_repeated_failure", "surface repeated blockers with complete evidence", "elevar bloqueos repetidos con evidencia completa", "disconnect"),
            Topic("sandbox", "Sandbox Policy", "Política de sandbox", "enforce_sandbox_boundary", "execute untrusted workloads without host authority", "ejecutar cargas no confiables sin autoridad del host", "disconnect"),
        ],
    ),
}

CAPSTONES = {
    "nt8-foundations": ("capstone.nt8_playback", "Playback-Verified NinjaScript", "NinjaScript verificado en Playback"),
    "strategy-builder": ("capstone.safe_strategy", "Failure-Safe Paper Strategy", "Estrategia simulada segura ante fallos"),
    "research-operator": ("capstone.research_evidence", "Defensible Research Evidence", "Evidencia de investigación defendible"),
    "bridge-engineer": ("capstone.automation_incident", "Bridge Incident Recovery", "Recuperación de incidente del bridge"),
    "agent-automation-engineer": ("capstone.secure_agent", "Secure Research Agent", "Agente de investigación seguro"),
}


def dump_yaml(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        yaml.safe_dump(payload, sort_keys=False, allow_unicode=True, width=100),
        encoding="utf-8",
    )


def write_lab(track_id: str, topic: Topic, prerequisite: str | None) -> str:
    item_id = f"{track_id.split('-')[0]}.{topic.slug}"
    if track_id == "nt8-foundations":
        item_id = f"nt8.{topic.slug}"
    elif track_id == "agent-automation-engineer":
        item_id = f"agent.{topic.slug}"
    package = ROOT / "lessons" / item_id.replace(".", "-").replace("_", "-")
    fault_op = FAULT_OPERATION[topic.fault]
    solution_ops = ["load_fixture", topic.operation, fault_op, "emit_evidence"]
    starter_ops = ["load_fixture", "TODO", "emit_evidence"]
    visible = [
        {"id": "trace-complete", "path": "trace.status", "operator": "equals", "expected": "complete", "message": "Replace every TODO so the trusted runner can complete the trace."},
        {"id": "target-behavior", "path": "source.program.operations", "operator": "contains", "expected": topic.operation, "message": f"The trace must implement `{topic.operation}`."},
    ]
    hidden = [
        {"id": "paper-boundary", "path": "source.program.settings.mode", "operator": "equals", "expected": "paper", "message": "The hidden safety boundary requires paper-only mode."},
        {"id": "fault-resilience", "path": f"fault_evidence.{topic.fault}.handled", "operator": "equals", "expected": True, "message": f"The implementation did not safely handle the seeded {topic.fault} scenario."},
    ]
    rubric_rows = []
    for row, visibility in [*((row, "public") for row in visible), *((row, "hidden") for row in hidden)]:
        metric = (
            f"fault_evidence.{topic.fault}.handled"
            if row["id"] == "fault-resilience"
            else f"tests.{row['id']}.passed"
        )
        rubric_rows.append({
            "id": row["id"], "metric": metric, "operator": "equals",
            "expected": True, "weight": 25, "visibility": visibility, "message": row["message"],
        })
    manifest = {
        "id": item_id, "track": track_id, "title": topic.title, "updated_at": UPDATED,
        "estimated_minutes": 50,
        "objectives": [f"Explain how to {topic.outcome}.", "Produce a deterministic trace and fault-evidence artifact."],
        "prerequisites": [prerequisite] if prerequisite else [],
        "tags": ["executable", "paper-only", topic.fault],
        "translations": {
            "en": {"title": topic.title, "summary": f"Implement and prove how to {topic.outcome}."},
            "es": {"title": topic.title_es, "summary": f"Implementa y demuestra cómo {topic.outcome_es}."},
        },
        "hints": [
            f"Read the visible assertion, then identify how to {topic.outcome}; inspect `{topic.operation}` as a naming clue.",
            f"The target behavior is represented by one explicit operation near `{topic.operation}`.",
            f"Replay the {topic.fault} profile and inspect its required recovery operation.",
        ],
        "execution": {
            "runner": RUNNER, "starter": "starter/program.yaml", "visible_tests": "tests/visible.yaml",
            "hidden_tests": "tests/hidden.yaml", "solution": "solution/program.yaml",
            "expected_trace": "expected-trace.json", "fault_profiles": [topic.fault],
        },
        "rubric": rubric_rows,
    }
    dump_yaml(package / "manifest.yaml", manifest)
    dump_yaml(package / "starter" / "program.yaml", {"program": {"operations": starter_ops, "settings": {"mode": "paper", "deterministic": True}}})
    dump_yaml(package / "solution" / "program.yaml", {"program": {"operations": solution_ops, "settings": {"mode": "paper", "deterministic": True}}})
    dump_yaml(package / "tests" / "visible.yaml", {"tests": visible})
    dump_yaml(package / "tests" / "hidden.yaml", {"tests": hidden})
    dump_yaml(package / "rubric.yaml", {"criteria": [{"id": row["id"], "weight": 25, "evidence": "trusted runner artifact"} for row in visible + hidden]})
    expected = {"status": "complete", "operations": solution_ops, "fault_profile": topic.fault, "deterministic": True}
    (package / "expected-trace.json").write_text(json.dumps(expected, indent=2) + "\n", encoding="utf-8")
    write_concepts(package, topic)
    return item_id


def write_concepts(package: Path, topic: Topic) -> None:
    en = f"""# {topic.title}

## Objectives

- Explain how to {topic.outcome}.
- Produce replayable evidence instead of declaring success in a JSON field.

## Concept

Automation is safe only when its behavior can be reconstructed from ordered facts. This lab models
**{topic.title.lower()}** as an explicit operation in a deterministic, paper-only trace. The runner owns
the clock, seed, fixture, assertions, and fault injection; the learner owns the implementation steps.

## Exercise

Open `starter/program.yaml`, replace `TODO` with the operation implied by the visible specification,
and add the recovery operation required by the seeded `{topic.fault}` scenario. Never paste expected
test booleans into a submission: the grader ignores them and replays the source.

## Evidence

A valid artifact binds the source hash, ordered operations, seeded fault trace, public assertions, hidden
safety checks, and final digest. Compare it with `expected-trace.json`, then explain any divergence.
"""
    es = f"""# {topic.title_es}

## Objetivos

- Explicar cómo {topic.outcome_es}.
- Producir evidencia reproducible en vez de declarar éxito en un campo JSON.

## Concepto

La automatización es segura solo cuando su comportamiento puede reconstruirse a partir de hechos
ordenados. Este laboratorio modela **{topic.title_es.lower()}** como una operación explícita en una traza
determinista y solo simulada. El runner controla reloj, semilla, fixture, aserciones e inyección de fallos;
el alumno controla los pasos de implementación.

## Ejercicio

Abre `starter/program.yaml`, reemplaza `TODO` con la operación indicada por la especificación visible y
añade la recuperación exigida por el escenario `{topic.fault}`. No pegues booleanos esperados: el grader
los ignora y vuelve a ejecutar la fuente.

## Evidencia

Un artefacto válido vincula hash de fuente, operaciones ordenadas, fallo con semilla, aserciones públicas,
controles ocultos y digest final. Compáralo con `expected-trace.json` y explica cualquier diferencia.
"""
    (package / "concept.en.md").write_text(en, encoding="utf-8")
    (package / "concept.es.md").write_text(es, encoding="utf-8")


def write_capstone(track_id: str, lesson_ids: list[str]) -> str:
    item_id, title, title_es = CAPSTONES[track_id]
    package = ROOT / "capstones" / item_id.removeprefix("capstone.").replace("_", "-")
    operations = [TRACKS[track_id][2][-3].operation, TRACKS[track_id][2][-2].operation, TRACKS[track_id][2][-1].operation]
    solution_ops = ["load_fixture", *operations, *FAULT_OPERATION.values(), "seal_evidence_bundle"]
    visible = [
        {"id": "trace-complete", "path": "trace.status", "operator": "equals", "expected": "complete", "message": "The capstone trace must complete."},
        {"id": "integrated-behavior", "path": "source.program.operations", "operator": "ordered_subset", "expected": operations, "message": "The three terminal track behaviors must execute in order."},
    ]
    hidden = [{"id": "paper-boundary", "path": "source.program.settings.mode", "operator": "equals", "expected": "paper", "message": "Capstones remain paper-only."}]
    for profile in FAULT_OPERATION:
        hidden.append({"id": f"fault-{profile}", "path": f"fault_evidence.{profile}.handled", "operator": "equals", "expected": True, "message": f"The capstone failed the {profile} incident replay."})
    rubric = []
    weights = [20, 20, 10, 10, 10, 10, 10, 10]
    for index, (row, visibility) in enumerate([*((row, "public") for row in visible), *((row, "hidden") for row in hidden)]):
        metric = (
            f"fault_evidence.{row['id'].removeprefix('fault-')}.handled"
            if row["id"].startswith("fault-")
            else f"tests.{row['id']}.passed"
        )
        rubric.append({"id": row["id"], "metric": metric, "operator": "equals", "expected": True, "weight": weights[index], "visibility": visibility, "message": row["message"]})
    manifest = {
        "id": item_id, "track": track_id, "title": title, "updated_at": UPDATED, "estimated_minutes": 180,
        "objectives": ["Integrate the terminal track behaviors into one deterministic replay.", "Produce a tamper-evident evidence bundle across all five incident profiles."],
        "prerequisites": lesson_ids,
        "tags": ["executable", "capstone", "paper-only", "incident-replay"],
        "translations": {"en": {"title": title, "summary": "Integrate the track in a deterministic incident replay."}, "es": {"title": title_es, "summary": "Integra el itinerario en una repetición determinista de incidentes."}},
        "hints": ["Start with the final three track operations in curriculum order.", "Every fault profile requires a distinct recovery operation.", "Keep mode paper and seal the final evidence bundle."],
        "execution": {"runner": RUNNER, "starter": "starter/program.yaml", "visible_tests": "tests/visible.yaml", "hidden_tests": "tests/hidden.yaml", "solution": "solution/program.yaml", "expected_trace": "expected-trace.json", "fault_profiles": list(FAULT_OPERATION)},
        "rubric": rubric,
    }
    dump_yaml(package / "manifest.yaml", manifest)
    dump_yaml(package / "starter" / "program.yaml", {"program": {"operations": ["load_fixture", "TODO", "seal_evidence_bundle"], "settings": {"mode": "paper", "deterministic": True}}})
    dump_yaml(package / "solution" / "program.yaml", {"program": {"operations": solution_ops, "settings": {"mode": "paper", "deterministic": True}}})
    dump_yaml(package / "tests" / "visible.yaml", {"tests": visible})
    dump_yaml(package / "tests" / "hidden.yaml", {"tests": hidden})
    dump_yaml(package / "rubric.yaml", {"criteria": [{"id": row["id"], "weight": weights[index], "evidence": "trusted runner artifact"} for index, row in enumerate(visible + hidden)]})
    (package / "expected-trace.json").write_text(json.dumps({"status": "complete", "operations": solution_ops, "fault_profiles": list(FAULT_OPERATION), "deterministic": True}, indent=2) + "\n", encoding="utf-8")
    cap_topic = Topic("capstone", title, title_es, "seal_evidence_bundle", "integrate the track under all incident profiles", "integrar el itinerario bajo todos los perfiles de incidente", "disconnect")
    write_concepts(package, cap_topic)
    return item_id


def main() -> None:
    generated = 0
    for track_id, (title, description, topics) in TRACKS.items():
        lesson_ids: list[str] = []
        previous = None
        for topic in topics:
            item_id = write_lab(track_id, topic, previous)
            lesson_ids.append(item_id)
            previous = item_id
            generated += 1
        capstone = write_capstone(track_id, lesson_ids)
        dump_yaml(ROOT / "tracks" / f"{track_id}.yaml", {"id": track_id, "title": title, "description": description, "lessons": lesson_ids, "capstones": [capstone]})
    if generated != 60:
        raise RuntimeError(f"curriculum generator produced {generated} labs, expected exactly 60")
    dump_yaml(ROOT / "curriculum.yaml", {
        "schema_version": "1.0", "version": "2.0.0", "updated_at": UPDATED, "default_locale": "en",
        "principles": ["Evidence before promotion", "Machine-derived grading", "Safety and correctness before performance", "Deterministic checks with no lookahead", "Playback and paper execution only"],
    })
    print(f"generated {generated} labs and {len(CAPSTONES)} capstones")


if __name__ == "__main__":
    main()
