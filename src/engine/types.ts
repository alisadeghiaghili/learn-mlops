/** Core simulation types for LearnMLOps. */

// ── Zone 1: Dataset ─────────────────────────────────────────

export interface DatasetVersion {
  /** Monotonic version number (v1, v2, …). */
  version: number;
  /** Stable content identity (deterministic fake hash). */
  contentId: string;
  /** Where this version came from (a path or url). */
  source: string;
  /** Row count hint for display. */
  rowCount?: number;
}

export interface DriftSignal {
  enabled: boolean;
  /** Current drift score in [0,1]. */
  score: number;
  /** Score above which drift is considered detected. */
  threshold: number;
}

export interface Dataset {
  /** Canonical key, e.g. `train`. */
  name: string;
  /** Displayed path, e.g. `data/train.csv`. */
  path: string;
  /** Version history (oldest first). */
  versions: DatasetVersion[];
  /** The pointer to the active version; `null` means unversioned. */
  current: number | null;
  /** The feature set (column names). */
  featureCols?: string[];
  /** Live drift signal. */
  drift?: DriftSignal;
}

// ── Zone 2: Model Registry ──────────────────────────────────

export type RunStatus = 'succeeded' | 'failed';

export interface Run {
  /** The name the learner chose with `-n`, or an auto id. */
  id: string;
  /** Params used for this run. */
  params: Record<string, string | number>;
  /** Metrics produced by this run. */
  metrics: Record<string, number>;
  /** Lineage: which dataset version it trained on, e.g. `train@1`. */
  datasetRef?: string;
  status: RunStatus;
  /** Deterministic fake artifact id of the trained model. */
  artifactId?: string;
  /** Monotonic creation counter (display ordering). */
  createdAt: number;
}

export type ModelStage = 'None' | 'Staging' | 'Production';

export interface ModelVersion {
  version: number;
  /** The Run that produced this version (lineage). */
  runId: string;
  params: Record<string, string | number>;
  metrics: Record<string, number>;
  /** Lineage inherited from the run. */
  datasetRef?: string;
  artifactId: string;
  stage: ModelStage;
}

export interface RegisteredModel {
  name: string;
  versions: ModelVersion[];
  /** The pointer to the champion / latest version. */
  current: number;
}

// ── Zone 3: Service ─────────────────────────────────────────

export interface ModelRef {
  name: string;
  version: number;
}

export interface Monitoring {
  enabled: boolean;
  /** Recent live quality points (feeds the sparkline / drift teaching). */
  window: number[];
  driftAlert: boolean;
}

export interface ServiceEndpoint {
  name: string;
  live: boolean;
  /** Which registered model version it serves; `null` when cold. */
  modelRef: ModelRef | null;
  url?: string;
  predictionsServed: number;
  monitoring: Monitoring;
}

export interface RollbackTarget {
  endpoint: string;
  /** The previous live model — the safety net. */
  modelRef: ModelRef;
  setAt: number;
  reason?: string;
}

// ── The DAG rail (reuses LearnDVC's PipelineStage verbatim) ─
export interface PipelineStage {
  name: string;
  deps: string[];
  outs: string[];
  cmd: string;
  params: string[];
  metrics: string[];
  frozen: boolean;
  /** Whether the lifecycle stage has completed. */
  upToDate: boolean;
  outDirs?: string[];
  lastRunSig?: string;
}

export interface MlopsEvent {
  t: number;
  kind: string;
  detail: string;
}

export interface MlopsState {
  initialized: boolean;
  // three zones
  datasets: Record<string, Dataset>;
  runs: Run[];
  registry: Record<string, RegisteredModel>;
  endpoints: Record<string, ServiceEndpoint>;
  /** Keyed by endpoint name — the recorded "previous live model". */
  rollbackTargets: Record<string, RollbackTarget>;
  // DAG strip — the lifecycle status rail, seeded at `ml init`.
  pipeline: PipelineStage[];
  // Mirror of the latest run — keeps `metricsAtLeast`/`paramsAt` goal arms free.
  metrics: Record<string, number>;
  params: Record<string, string | number>;
  // Append-only activity log (replaces git commits).
  events: MlopsEvent[];
  /** Successful commands run this level — REQUIRED, solution.ts tier-2 reads it. */
  commandHistory: string[];
}

// ── Shared contracts (reused verbatim from LearnDVC) ────────

export interface CommandResult {
  ok: boolean;
  output: string;
  error?: string;
}

export interface DialogSlide {
  title?: string;
  markdown: string;
}

export type GoalCheck =
  | { kind: 'initialized'; value?: boolean }
  | { kind: 'datasetVersioned'; name: string; minVersion?: number }
  | { kind: 'datasetDriftClean'; name: string }
  | { kind: 'datasetDriftDetected'; name: string }
  | { kind: 'runExists'; min: number }
  | { kind: 'runUsesData'; name: string; version: number }
  | { kind: 'modelRegistered'; name: string; minVersion?: number }
  | { kind: 'endpointLive'; name: string }
  | { kind: 'endpointServes'; name: string; ref: ModelRef }
  | { kind: 'notDeployed'; name: string }
  | { kind: 'monitoringOn'; name: string }
  | { kind: 'rollbackAvailable'; name: string }
  | { kind: 'predictionsServed'; name: string; min: number }
  | { kind: 'metricsAtLeast'; key: string; value: number }
  | { kind: 'metricsExact'; key: string; value: number }
  | { kind: 'paramsAt'; key: string; value: string | number }
  | { kind: 'stageExists'; name: string }
  | { kind: 'stageUpToDate'; name: string }
  | { kind: 'allOf'; checks: GoalCheck[] };

export interface SolutionStepStatus {
  command: string;
  done: boolean;
  note: string;
  /** Inspect/help commands that do not block level completion. */
  optional?: boolean;
}

export interface LevelDef {
  id: string;
  series: string;
  seriesTitle: string;
  name: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  par: number;
  hint: string;
  objective: string;
  /** Concepts this level is supposed to install — shown in the goal panel. */
  learning: string[];
  /** What a working MLOps engineer does with this in production. */
  fieldNotes?: string[];
  startDialog: DialogSlide[];
  startState: MlopsState;
  /** State checks that mark the level solved — must mirror `solution` step effects. */
  goal: GoalCheck;
  /** Ordered commands that solve the level; the Goal panel lists these verbatim. */
  solution: string[];
  disabled?: string[];
}

export interface LevelProgress {
  solved: boolean;
  bestCommands?: number;
}
