/**
 * The Toolbox series: nine one-step levels. Each takes a concept you already
 * mastered in Basics → Ship it and re-runs it, framed around a real MLOps tool
 * and its official documentation. The goal and solution are the commands you
 * already know — the tool is the mapping, not new mechanics.
 */

import type { LevelDef } from '../engine/types';
import { initProject, registeredState, versionedTrain } from './states';
import { sandboxMlopsState } from '../engine/state';

const SERIES = 'toolbox';
const SERIES_TITLE = 'Toolbox';

const toolboxLevels: LevelDef[] = [
  {
    id: 'tool-mlflow',
    series: SERIES,
    seriesTitle: SERIES_TITLE,
    name: 'Record a run in MLflow',
    difficulty: 2,
    par: 1,
    hint: 'ml train run -n exp-1 -p lr=0.1 -p depth=40',
    objective:
      'Run a training experiment and record its params, metrics, and data lineage — the exact thing MLflow’s `mlflow.log_*` API does for real runs.',
    learning: [
      'MLflow Tracking is the system of record for runs: params, metrics, and artifacts, all queryable and comparable',
      '`mlflow.start_run()` + `mlflow.log_param` / `log_metric` / `log_artifact` is the shape of what `ml train run` simulates here',
      'The run you keep here is one you would log there — same idea, real tool',
    ],
    fieldNotes: [
      'Point MLflow at a shared store (S3, a database) so the whole team compares runs, not screenshots',
      'The `train@1` lineage is the part MLflow saves so a metric is never untraceable',
    ],
    startDialog: [
      {
        title: 'The tool behind “train run”',
        markdown:
          'In a real team, the run you just simulated lives in **MLflow**.\n\n[MLflow docs → https://mlflow.org/docs/latest/](https://mlflow.org/docs/latest/)\n\n```\nimport mlflow\nmlflow.start_run(name="exp-1")\nmlflow.log_param("lr", 0.1)\nmlflow.log_metric("acc", 0.907)\n```\n\nSame idea as `ml train run` — params, metrics, and lineage attached to one queryable run.',
      },
      {
        title: 'Run the command',
        markdown:
          'Re-run the training experiment. The mechanics are identical to `train-1`; the point is to see that this is the exact unit MLflow tracks in production.\n\n```\nml train run -n exp-1 -p lr=0.1 -p depth=40\n```\n\nIn MLflow this is one row in the runs table you can filter, sort, and compare.',
      },
    ],
    startState: versionedTrain(),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'runExists', min: 1 }, { kind: 'runUsesData', name: 'train', version: 1 }],
    },
    solution: ['ml train run -n exp-1 -p lr=0.1 -p depth=40'],
  },
  {
    id: 'tool-kfp',
    series: SERIES,
    seriesTitle: SERIES_TITLE,
    name: 'Model your pipeline in Kubeflow Pipelines',
    difficulty: 3,
    par: 2,
    hint: 'ml train run …; ml model register …',
    objective:
      'Wire the train → register stages into a pipeline — the same graph Kubeflow Pipelines executes as versioned, re-runnable components.',
    learning: [
      'Kubeflow Pipelines compiles a Python function of connected components into a versioned DAG you can run on a cluster',
      'Each `@component` is one stage — your train step and register step are two nodes on the same rail',
      'A pipeline you can re-run is a pipeline you can audit; the graph, not a notebook cell, is the source of truth',
    ],
    fieldNotes: [
      'Model the whole lifecycle as one pipeline so a single `kfp` run moves data → model → registry',
      'Component inputs/outputs are artifacts — that is where `train@1` lineage lives in the real world',
    ],
    startDialog: [
      {
        title: 'The tool behind the rail',
        markdown:
          'Your six-stage rail is a DAG. **Kubeflow Pipelines** is what runs that DAG for real.\n\n[Kubeflow Pipelines docs → https://www.kubeflow.org/docs/components/pipelines/](https://www.kubeflow.org/docs/components/pipelines/)\n\n```python\n@kfp.dsl.pipeline def pipeline():\n    train()   # one component\n    register(depends_on=train())  # the next stage\n```\n\nThe board’s rail and this are the same graph.',
      },
      {
        title: 'Light two stages',
        markdown:
          'Run the train → register half of the pipeline. The goal is simply to have a run on the data version and a registered model — two stages lit in sequence.\n\n```\nml train run -n exp-1 -p lr=0.1 -p depth=40\nml model register exp-1 --name churn-model\n```\n\nIn Kubeflow these would be two components with an edge between them.',
      },
    ],
    startState: versionedTrain(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'runExists', min: 1 },
        { kind: 'runUsesData', name: 'train', version: 1 },
        { kind: 'modelRegistered', name: 'churn-model' },
      ],
    },
    solution: [
      'ml train run -n exp-1 -p lr=0.1 -p depth=40',
      'ml model register exp-1 --name churn-model',
    ],
  },
  {
    id: 'tool-kserve',
    series: SERIES,
    seriesTitle: SERIES_TITLE,
    name: 'Serve a model endpoint with KServe',
    difficulty: 3,
    par: 1,
    hint: 'ml deploy exp-1',
    objective:
      'Deploy the registered model to the live `prod` endpoint — the same act KServe performs by deploying a model to an autoscaling Kserve service.',
    learning: [
      'KServe deploys a model as a Kubernetes service that autoscales (to zero when idle) and speaks a standard inference API',
      '`ml deploy` and a KServe `v1` deploy are the same decision: point a live endpoint at one named model version',
      'Serving is where a model becomes a product — the endpoint, not the artifact, is what users call',
    ],
    fieldNotes: [
      'Let the serving layer autoscale and scale to zero — pay only for real inference traffic',
      'Pin the endpoint to a registry version so “which model is live?” has a single answer',
    ],
    startDialog: [
      {
        title: 'The tool behind “deploy”',
        markdown:
          '`ml deploy exp-1` flips the `prod` endpoint live. In a Kubernetes shop, **KServe** is the system that does this.\n\n[KServe docs → https://kserve.github.io/kserve/](https://kserve.github.io/kserve/)\n\nA KServe `InferenceService` wraps a registered model version in an autoscaling service with a standard predict endpoint.',
      },
      {
        title: 'Make it live',
        markdown:
          'Bring the registered model to the endpoint.\n\n```\nml deploy exp-1\n```\n\nThe endpoint goes `cold` → `live`, and the registry version is promoted to Production — exactly the promotion a KServe deploy makes visible to traffic.',
      },
    ],
    startState: registeredState(),
    goal: { kind: 'allOf', checks: [{ kind: 'endpointLive', name: 'prod' }] },
    solution: ['ml deploy exp-1'],
  },
  {
    id: 'tool-vertex-ai',
    series: SERIES,
    seriesTitle: SERIES_TITLE,
    name: 'Deploy a managed endpoint on Vertex AI',
    difficulty: 3,
    par: 1,
    hint: 'ml deploy exp-1',
    objective:
      'Promote the registered model to a live endpoint — the managed equivalent of `ml deploy`, as Vertex AI does with a managed Endpoint.',
    learning: [
      'Vertex AI Model Registry + managed Endpoints take the registry → serving handoff out of your hands',
      'A managed endpoint handles scaling, health, and the prediction API; your job is choosing which version to promote',
      'The `churn-model:vN → endpoint` mapping here is the same promotion a Vertex deploy makes',
    ],
    fieldNotes: [
      'Use the managed registry so version numbers are the contract across teams, not a file path',
      'Promote deliberately: a managed endpoint makes the deploy a reviewable action, not a script',
    ],
    startDialog: [
      {
        title: 'The managed path to “deploy”',
        markdown:
          'On GCP, **Vertex AI** pairs a model registry with managed endpoints.\n\n[Vertex AI Model Registry → https://cloud.google.com/vertex-ai/docs/model-registry](https://cloud.google.com/vertex-ai/docs/model-registry)\n\nYou register a version, then deploy it to a managed Endpoint — the same registry → serving move as `ml deploy`.',
      },
      {
        title: 'Promote to live',
        markdown:
          'Take the registered model to the endpoint.\n\n```\nml deploy exp-1\n```\n\n`prod` becomes live on the promoted version. In Vertex this is the managed endpoint now serving `churn-model:v1`.',
      },
    ],
    startState: registeredState(),
    goal: { kind: 'allOf', checks: [{ kind: 'endpointLive', name: 'prod' }] },
    solution: ['ml deploy exp-1'],
  },
  {
    id: 'tool-airflow',
    series: SERIES,
    seriesTitle: SERIES_TITLE,
    name: 'Schedule the ingest stage in Airflow',
    difficulty: 2,
    par: 1,
    hint: 'ml data add data/train.csv',
    objective:
      'Produce a versioned data snapshot on a schedule — the task an Airflow DAG runs each cycle to feed the rest of the lifecycle.',
    learning: [
      'Airflow runs data tasks on a schedule and keeps a task-level history — the “ingest” stage as a durable job, not a one-off script',
      'Each run of the DAG lands a new data version; that is the `ml data add` step made repeatable and observable',
      'A scheduler makes “fresh data” a guarantee you can rely on, so downstream training always pins a real version',
    ],
    fieldNotes: [
      'Version the data in the DAG step itself so every downstream run is reproducible against a named snapshot',
      'Airflow’s retry + alerting is what keeps a broken ingest from silently feeding stale data to training',
    ],
    startDialog: [
      {
        title: 'The tool behind “data add”',
        markdown:
          'Fresh, versioned data on a schedule is what **Airflow** is for.\n\n[Airflow docs → https://airflow.apache.org/docs/](https://airflow.apache.org/docs/)\n\nA DAG task pulls new data and writes a version — the `ingest` stage of your rail, running on time, every time.',
      },
      {
        title: 'Produce the version',
        markdown:
          'Run the ingest: version the dataset so training has something to pin.\n\n```\nml data add data/train.csv\n```\n\nIn a real DAG this exact step runs on a cron and drops a new `train@N` each cycle.',
      },
    ],
    startState: initProject(),
    goal: { kind: 'allOf', checks: [{ kind: 'datasetVersioned', name: 'train' }] },
    solution: ['ml data add data/train.csv'],
  },
  {
    id: 'tool-dvc',
    series: SERIES,
    seriesTitle: SERIES_TITLE,
    name: 'Version data with DVC',
    difficulty: 2,
    par: 1,
    hint: 'ml data add data/train.csv',
    objective:
      'Track the dataset as a versioned, content-addressed object — precisely what DVC does with `dvc add` and the `.dvc` pointer file.',
    learning: [
      'DVC stores the actual bytes in remote storage and keeps only a hash pointer in Git — `ml data add` simulates that split',
      'The content id you see (`train@1`) is the same idea as DVC’s content hash: a stable, auditable identity for the data',
      'Versioning data like code means “which data trained this model?” always has a hash to point at',
    ],
    fieldNotes: [
      'Keep big datasets out of Git and in DVC remote storage; commit only the small hash pointers',
      'Pin training to a DVC version so experiments are reproducible on any machine',
    ],
    startDialog: [
      {
        title: 'The tool behind data versions',
        markdown:
          'Big datasets that version like code? That is **DVC**.\n\n[DVC docs → https://dvc.org/doc](https://dvc.org/doc)\n\n```\ndvc add data/train.csv   # stores the file, keeps a .dvc hash pointer in Git\n```\n\n`ml data add` is the same move: a named object with content versions.',
      },
      {
        title: 'Version the dataset',
        markdown:
          'Bring the data under version control.\n\n```\nml data add data/train.csv\n```\n\nThe Dataset zone shows `train [v1]` with a content id — the DVC pointer, made visible.',
      },
    ],
    startState: initProject(),
    goal: { kind: 'allOf', checks: [{ kind: 'datasetVersioned', name: 'train' }] },
    solution: ['ml data add data/train.csv'],
  },
  {
    id: 'tool-sagemaker',
    series: SERIES,
    seriesTitle: SERIES_TITLE,
    name: 'Create a SageMaker endpoint',
    difficulty: 3,
    par: 1,
    hint: 'ml deploy exp-1',
    objective:
      'Deploy the registered model to a live endpoint — the AWS managed version of `ml deploy`, as `sagemaker create-endpoint` does.',
    learning: [
      'Amazon SageMaker turns a registered model into a live, auto-scaling endpoint through the Model Registry',
      '`ml deploy` and `sagemaker create-endpoint` are the same promotion: a registry version becomes a callable, live service',
      'The managed endpoint owns instances and scaling; you own the decision of which version to promote',
    ],
    fieldNotes: [
      'Register first, deploy second — SageMaker’s Model Registry is the same Staging → Production discipline you already use',
      'The endpoint name is the contract your callers hit; the model version behind it is your lever',
    ],
    startDialog: [
      {
        title: 'The tool behind “deploy” on AWS',
        markdown:
          'On AWS, **SageMaker** is the managed path from registry to a live endpoint.\n\n[Amazon SageMaker Model Registry → https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry.html](https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry.html)\n\n```\naws sagemaker create-endpoint --endpoint-name prod --model-name churn\n```\n\nSame idea as `ml deploy`: point a live endpoint at a registry version.',
      },
      {
        title: 'Bring it live',
        markdown:
          'Deploy the registered model.\n\n```\nml deploy exp-1\n```\n\n`prod` flips to live on `churn-model:v1` — the SageMaker endpoint now serving that version.',
      },
    ],
    startState: registeredState(),
    goal: { kind: 'allOf', checks: [{ kind: 'endpointLive', name: 'prod' }] },
    solution: ['ml deploy exp-1'],
  },
  {
    id: 'tool-tfx',
    series: SERIES,
    seriesTitle: SERIES_TITLE,
    name: 'Add validation to the pipeline with TFX',
    difficulty: 4,
    par: 3,
    hint: 'ml train run …; ml model register …; ml deploy …',
    objective:
      'Run the train → register → deploy sequence, the way a TFX pipeline gates each stage on validation before a model is allowed to ship.',
    learning: [
      'TFX wires a full MLOps pipeline — data validation, training, model validation, and publishing — as connected components',
      'The `push` stage publishes a validated model to the registry; that is the register step guarded by checks',
      'Validation is what turns “it trained” into “it is allowed to ship” — a gate on every stage, not a hope',
    ],
    fieldNotes: [
      'Let TFX schema validation block a bad data version before it ever reaches training',
      'Model validation + the `push` stage make promotion a policy decision the pipeline enforces',
    ],
    startDialog: [
      {
        title: 'The tool behind “a gated pipeline”',
        markdown:
          '**TFX** is a component framework that builds the whole validated pipeline: data validation → train → model validation → `push`.\n\n[TFX docs → https://www.tensorflow.org/tfx/guide](https://www.tensorflow.org/tfx/guide)\n\nThe `push` component publishes a validated model to the registry — your `ml model register` with gates around it.',
      },
      {
        title: 'Run the pipeline half',
        markdown:
          'Execute train → register → deploy. The goal is the full path: a validated model registered and then live.\n\n```\nml train run -n exp-1 -p lr=0.1 -p depth=40\nml model register exp-1 --name churn-model\nml deploy exp-1\n```\n\nEach stage in TFX is a component that must pass before the next runs.',
      },
    ],
    startState: versionedTrain(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'modelRegistered', name: 'churn-model' },
        { kind: 'endpointLive', name: 'prod' },
      ],
    },
    solution: [
      'ml train run -n exp-1 -p lr=0.1 -p depth=40',
      'ml model register exp-1 --name churn-model',
      'ml deploy exp-1',
    ],
  },
  {
    id: 'tool-mlrun',
    series: SERIES,
    seriesTitle: SERIES_TITLE,
    name: 'Track the whole loop in MLrun',
    difficulty: 4,
    par: 4,
    hint: 'ml data add …; ml train run …; ml model register …; ml deploy …',
    objective:
      'Drive the data → train → register → deploy loop end to end — the run-and-track story MLrun is built around, with every step logged to one project.',
    learning: [
      'MLrun records experiments, models, and pipelines into a single project you can inspect and reproduce',
      'Driving data → model → live in one pass is the whole loop MLrun keeps as a queryable history',
      'When every step is logged to the same project, a model’s lineage is a dashboard, not an archaeology dig',
    ],
    fieldNotes: [
      'Run everything through MLrun so the data, the run, the registered model, and the deploy share one lineage',
      'A single project view is what makes “reproduce this model” a click instead of a reconstruction',
    ],
    startDialog: [
      {
        title: 'The tool behind “track everything”',
        markdown:
          '**MLrun** keeps runs, models, and pipelines in one project you can trace end to end.\n\n[MLrun docs → https://mlrun.org/docs/](https://mlrun.org/docs/)\n\nRunning your lifecycle is what MLrun logs — every stage lands as a searchable artifact in the project.',
      },
      {
        title: 'Run the loop',
        markdown:
          'Take the project from unversioned data to a live model in one sequence.\n\n```\nml data add data/train.csv\nml train run -n exp-1 -p lr=0.1 -p depth=40\nml model register exp-1 --name churn-model\nml deploy exp-1\n```\n\nEach command is one step of the loop MLrun would record to the same project.',
      },
    ],
    startState: sandboxMlopsState(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'datasetVersioned', name: 'train' },
        { kind: 'modelRegistered', name: 'churn-model' },
        { kind: 'endpointLive', name: 'prod' },
      ],
    },
    solution: [
      'ml data add data/train.csv',
      'ml train run -n exp-1 -p lr=0.1 -p depth=40',
      'ml model register exp-1 --name churn-model',
      'ml deploy exp-1',
    ],
  },
];

export { toolboxLevels };
export const TOOLBOX_DOCS: Record<string, string> = {
  'tool-mlflow': 'https://mlflow.org/docs/latest/',
  'tool-kfp': 'https://www.kubeflow.org/docs/components/pipelines/',
  'tool-kserve': 'https://kserve.github.io/kserve/',
  'tool-vertex-ai': 'https://cloud.google.com/vertex-ai/docs/model-registry',
  'tool-airflow': 'https://airflow.apache.org/docs/',
  'tool-dvc': 'https://dvc.org/doc',
  'tool-sagemaker': 'https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry.html',
  'tool-tfx': 'https://www.tensorflow.org/tfx/guide',
  'tool-mlrun': 'https://mlrun.org/docs/',
};
