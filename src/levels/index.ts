import type { LevelDef } from '../engine/types';
import { emptyMlopsState, lifecycleRail, logEvent } from '../engine/state';
import { fakeMd5 } from '../engine/hash';
import { initProject, versionedTrain, trainedState, registeredState, deployedState, twoVersionLiveState } from './states';
import { toolboxLevels } from './toolbox';

const basicsLevels: LevelDef[] = [
  {
    id: 'init-1',
    series: 'basics',
    seriesTitle: 'Basics',
    name: 'Initialize the MLOps project',
    difficulty: 1,
    par: 1,
    hint: 'ml init',
    objective:
      'Initialize the MLOps project so a lifecycle rail and a `prod` endpoint exist — the shared starting point for every model you will ship.',
    learning: [
      'ml init seeds the lifecycle rail: ingest → train → eval → register → deploy → monitor',
      'It also creates a cold `prod` endpoint, so the serving story is visible from the first command',
      'Nothing is trained or deployed yet — you enabled the workflow',
    ],
    fieldNotes: [
      'Bootstrap every project before data or models exist so the whole team sees the same rail',
      'The rail is your source of truth for “where is this model in the lifecycle?”',
    ],
    startDialog: [
      {
        title: 'Why a lifecycle, not a script',
        markdown:
          'A notebook that “trains a model” is not a product. In production a model has a **lifecycle**:\n\n`ingest → train → eval → register → deploy → monitor`\n\nEach arrow is a decision with an owner and a record. `ml init` lays that rail down for you to walk.',
      },
      {
        title: 'What `ml init` does',
        markdown:
          '```\nml init\n```\n\n- Seeds the six lifecycle stages on the board (all stale at first).\n- Creates a **`prod` endpoint** that is offline (`cold`) until you deploy.\n\nMental model: this is `git init` for the ML serving pipeline — no bytes yet, just the workflow.',
      },
    ],
    startState: emptyMlopsState(),
    goal: { kind: 'allOf', checks: [{ kind: 'initialized', value: true }] },
    solution: ['ml init'],
  },
  {
    id: 'data-1',
    series: 'basics',
    seriesTitle: 'Basics',
    name: 'Version the training dataset',
    difficulty: 1,
    par: 1,
    hint: 'ml data add data/train.csv',
    objective:
      'Version `data/train.csv` so training runs are reproducible against a named, numbered snapshot of the data.',
    learning: [
      'A dataset is an object with versions, not a file you hope is unchanged',
      '`ml data add` bumps the dataset to a new version and points `current` at it',
      'Training against `train@1` means every claim about a model names the exact data it used',
    ],
    fieldNotes: [
      'Never train against “latest” — pin the run to `train@N` so incidents have an answer',
      'Versioning is what makes drift detection and rollback meaningful later',
    ],
    startDialog: [
      {
        title: 'The data is half the model',
        markdown:
          'Two runs with identical code but different data produce different models.\n\n```\nml data add data/train.csv\n```\n\nThis turns the file into **`train`** at **v1** — a named, immutable snapshot. The board’s Dataset zone now shows `train [v1]`.',
      },
      {
        title: 'Why versions, not “updated the file”',
        markdown:
          'In real projects the dataset changes: new rows, a fix, a re-scrape.\n\nWithout versions, “which data trained this model?” has no answer. With versions, the run records `train@1` as **lineage** — a link you can audit and reproduce.',
      },
    ],
    startState: initProject(),
    goal: { kind: 'allOf', checks: [{ kind: 'datasetVersioned', name: 'train' }] },
    solution: ['ml data add data/train.csv'],
  },
];

const modelLevels: LevelDef[] = [
  {
    id: 'train-1',
    series: 'model',
    seriesTitle: 'Train & Register',
    name: 'Train a run against a data version',
    difficulty: 2,
    par: 1,
    hint: 'ml train run -n exp-1 -p lr=0.1 -p depth=40',
    objective:
      'Run a training experiment `exp-1` on the versioned `train` dataset, recording its params and metrics with a data lineage.',
    learning: [
      'A run is the unit of experiment: params + metrics + which data version it used',
      'Params come from `-p k=v` (learning rate, depth) — they travel with the run',
      'Metrics (acc/loss/f1) are what you will compare when choosing a model to ship',
    ],
    fieldNotes: [
      'Record params with the run — a metric without its config is folklore',
      'The `data=train@1` lineage is what you quote in a post-mortem',
    ],
    startDialog: [
      {
        title: 'From data to a run',
        markdown:
          'The `train` dataset is at **v1**. Now train against it:\n\n```\nml train run -n exp-1 -p lr=0.1 -p depth=40\n```\n\nThis produces a **run** `exp-1` with:\n\n- `params`: lr=0.1, depth=40\n- `metrics`: acc / loss / f1\n- `data`: `train@1` (lineage)',
      },
      {
        title: 'A run is not a model yet',
        markdown:
          'A run is a **result**, not a deployable artifact. It sits in the runs list until you **register** it into the registry.\n\nThink of runs as lab results and registry versions as the bottled product. You keep every run, but only promote the good ones.',
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
    id: 'register-1',
    series: 'model',
    seriesTitle: 'Train & Register',
    name: 'Register a model from a run',
    difficulty: 2,
    par: 1,
    hint: 'ml model register exp-1 --name churn-model',
    objective:
      'Promote the `exp-1` run into the registry as version 1 of a named model, `churn-model`.',
    learning: [
      'The registry is the catalog of deployable models, each with numbered versions',
      'Registration captures the run’s params, metrics, and data lineage onto the model version',
      'A registered version starts in **Staging**; it becomes **Production** only on deploy',
    ],
    fieldNotes: [
      'Register the run you want people to *find and reuse*, not every scratch run',
      'The version number is your contract: `churn-model:v1` is forever that exact artifact',
    ],
    startDialog: [
      {
        title: 'Promote a result to a product',
        markdown:
          'Run `exp-1` produced a good model. Bottle it:\n\n```\nml model register exp-1 --name churn-model\n```\n\nThe registry now has **`churn-model` v1**, in stage **Staging**, carrying the run’s metrics and `train@1` lineage.',
      },
      {
        title: 'Staging vs Production',
        markdown:
          'Registering does **not** go live. It places a version in the registry so it can be reviewed and deployed deliberately.\n\n`Staging` = ready but not serving. `Production` = the version an endpoint actually serves. Deploy is the switch between them.',
      },
    ],
    startState: trainedState(),
    goal: { kind: 'allOf', checks: [{ kind: 'modelRegistered', name: 'churn-model' }] },
    solution: ['ml model register exp-1 --name churn-model'],
  },
  {
    id: 'eval-1',
    series: 'model',
    seriesTitle: 'Train & Register',
    name: 'Evaluate: compare runs, promote the better',
    difficulty: 3,
    par: 2,
    hint: 'ml train run -n exp-2 -p lr=0.05 -p depth=60; ml model register exp-2 --name churn-model',
    objective:
      'With `exp-1` already trained on `train@1`, run a second experiment `exp-2`, compare the two runs, and register the better one as `churn-model`.',
    learning: [
      'Evaluation is choosing a model over a distribution of runs, not from one lucky number',
      'The `eval` stage is where you compare metrics (acc/loss/f1) across runs before promoting',
      'Registering the challenger is the promotion decision — the comparison is what justifies it',
    ],
    fieldNotes: [
      'Compare runs on a held-out metric, never the train metric',
      'The best run you see overstates true performance (the winner’s curse) — repeat to see the variance',
    ],
    startDialog: [
      {
        title: 'A run is a sample, not the answer',
        markdown:
          '`exp-1` is trained on `train@1`. Real evaluation means running variants and comparing.\n\n```\nml train run -n exp-2 -p lr=0.05 -p depth=60\nml model register exp-2 --name churn-model\n```\n\nTwo runs on the same data are two samples of the same model. Registering the better one is the decision.',
      },
      {
        title: 'Compare before you promote',
        markdown:
          'The `eval` stage exists so promotion is a *comparison*, not a coin flip.\n\n`exp-1` and `exp-2` are two points; you look at their metrics, pick the one with the better held-out result, and register it. That is the whole eval step in production terms.',
      },
    ],
    startState: trainedState(),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'runUsesData', name: 'train', version: 1 }, { kind: 'modelRegistered', name: 'churn-model' }],
    },
    solution: [
      'ml train run -n exp-2 -p lr=0.05 -p depth=60',
      'ml model register exp-2 --name churn-model',
    ],
  },
];

const serveLevels: LevelDef[] = [
  {
    id: 'deploy-1',
    series: 'serve',
    seriesTitle: 'Serve & Guard',
    name: 'Deploy a registered model',
    difficulty: 3,
    par: 1,
    hint: 'ml deploy exp-1',
    objective:
      'Deploy the registered `churn-model` to the `prod` endpoint so it is live and serving.',
    learning: [
      'Deploy makes a registry version the one a live endpoint serves',
      'The deployed version is promoted to **Production** in the registry',
      'If a model was already live, deploy records it as the **rollback target** first',
    ],
    fieldNotes: [
      'Deploy is a promotion decision, not a `docker run` — it names a version',
      'Always know the previous live version before you swap; that is your safety net',
    ],
    startDialog: [
      {
        title: 'Go live',
        markdown:
          '`churn-model` v1 is registered in Staging. Put it in front of traffic:\n\n```\nml deploy exp-1\n```\n\nDeploy resolves `exp-1` → `churn-model:v1` and points the `prod` endpoint at it. The endpoint is now **LIVE** and the registry version is promoted to **Production**.',
      },
      {
        title: 'The swap is the risky moment',
        markdown:
          'Deploying is where models can regress in the wild. Because `ml deploy` records the **previous live model** as a rollback target before it swaps, you always have a known-good version one step back.\n\nWatch the Service zone: the endpoint flips from `cold` to `live → churn-model:v1`.',
      },
    ],
    startState: registeredState(),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'endpointLive', name: 'prod' }, { kind: 'modelRegistered', name: 'churn-model' }],
    },
    solution: ['ml deploy exp-1'],
  },
  {
    id: 'monitor-1',
    series: 'serve',
    seriesTitle: 'Serve & Guard',
    name: 'Turn on monitoring',
    difficulty: 3,
    par: 1,
    hint: 'ml monitor on',
    objective:
      'Enable monitoring on the live `prod` endpoint so drift and quality are watched continuously.',
    learning: [
      'Monitoring closes the loop: you are not done when the model ships, you are done when you are watching it',
      'It arms a **drift threshold** on the data — a score above the threshold is a drift alert',
      'A live endpoint without monitoring is a model you hope is still good',
    ],
    fieldNotes: [
      'Define the drift threshold before launch, not after the first incident',
      'Monitoring + a rollback target together are what make a ship “safe”',
    ],
    startDialog: [
      {
        title: 'Close the loop',
        markdown:
          '`churn-model:v1` is live but blind. Turn the cameras on:\n\n```\nml monitor on\n```\n\nThis enables monitoring on `prod` and arms a **drift threshold** on the dataset. The loop is now closed: ingest → train → eval → register → deploy → **monitor**.',
      },
      {
        title: 'What “monitoring on” means',
        markdown:
          'With monitoring on, the endpoint tracks live quality and the dataset tracks **drift** — the quiet shift in input data that degrades accuracy over time.\n\nYou will not see an alert until traffic accrues (`ml predict`), but the watch is now *armed*.',
      },
    ],
    startState: deployedState(),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'monitoringOn', name: 'prod' }, { kind: 'endpointLive', name: 'prod' }],
    },
    solution: ['ml monitor on'],
  },
  {
    id: 'rollback-1',
    series: 'serve',
    seriesTitle: 'Serve & Guard',
    name: 'Ship an upgrade, then roll back',
    difficulty: 4,
    par: 2,
    hint: 'ml deploy churn-model:2; ml rollback',
    objective:
      'Upgrade `prod` to `churn-model:v2` (recording the rollback target), then roll back so `prod` serves `churn-model:v1` again.',
    learning: [
      'A rollback target is the previous live model, captured at deploy time',
      '`ml rollback` restores that target in one step — the endpoint never goes cold',
      'Rollback is the drill you rehearse now so it is instant at 2am',
    ],
    fieldNotes: [
      'Rehearse rollback on a known-good version before the risky upgrade ships',
      'A one-shot target is consumed on rollback — re-deploy to record a fresh one',
    ],
    startDialog: [
      {
        title: 'Upgrade with a net under you',
        markdown:
          'You are live on `churn-model:v1`. A better `v2` is in Staging. Upgrade — and prove you can come back:\n\n```\nml deploy churn-model:2\nml rollback\n```\n\nThe deploy records **`v1`** as the rollback target, then `ml rollback` restores `v1`. The endpoint stayed live the whole time.',
      },
      {
        title: 'Why this is a skill',
        markdown:
          'Anyone can deploy. The professional move is *upgrading and reverting cleanly*.\n\nBecause the rollback target was captured at deploy, you never guess the old version — you restore the exact one that was serving. That is the safety net the whole MLOps loop is built around.',
      },
    ],
    startState: twoVersionLiveState(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'endpointServes', name: 'prod', ref: { name: 'churn-model', version: 1 } },
        { kind: 'endpointLive', name: 'prod' },
      ],
    },
    solution: ['ml deploy churn-model:2', 'ml rollback'],
  },
  {
    id: 'canary-1',
    series: 'serve',
    seriesTitle: 'Serve & Guard',
    name: 'Champion / challenger promotion',
    difficulty: 4,
    par: 3,
    hint: 'ml train run …; ml model register …; ml deploy churn-model:2',
    objective:
      'Run a challenger experiment, register it as `churn-model:v2`, and deploy it so `prod` is live on `v2` while `v1` is captured as the rollback target — the champion/challenger promotion.',
    learning: [
      'Champion/challenger is a live test: the challenger is a specific version, not a random control',
      'Promotion is a decision — deploy the challenger only once you are willing to hold the cost of a regression',
      'Deploying the challenger demotes the champion to the rollback target: the safety net is recorded at the swap',
    ],
    fieldNotes: [
      'A challenger that “wins” on one test set can be the winner’s curse — compare on held-out data',
      'Keep the champion as the rollback target so a regression is a one-command revert',
    ],
    startDialog: [
      {
        title: 'Promote the challenger, keep the net',
        markdown:
          '`churn-model:v1` is the champion, live on `prod`. You have a challenger. Build it and promote it:\n\n```\nml train run -n exp-2 -p lr=0.05 -p depth=60\nml model register exp-2 --name churn-model   # → churn-model:v2 (challenger)\nml deploy churn-model:2                      # v2 live, v1 → rollback target\n```\n\nThe champion is not deleted — it becomes the rollback target the moment the challenger takes over.',
      },
      {
        title: 'Why the target is recorded at the swap',
        markdown:
          'The promotion is risky precisely because the challenger has not seen real traffic. Because `ml deploy churn-model:2` records `v1` as the rollback target *before* the swap, a bad challenger is a one-command revert, not a retrain.',
      },
    ],
    startState: deployedState(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'endpointServes', name: 'prod', ref: { name: 'churn-model', version: 2 } },
        { kind: 'rollbackAvailable', name: 'prod' },
      ],
    },
    solution: [
      'ml train run -n exp-2 -p lr=0.05 -p depth=60',
      'ml model register exp-2 --name churn-model',
      'ml deploy churn-model:2',
    ],
  },
  {
    id: 'retrain-1',
    series: 'serve',
    seriesTitle: 'Serve & Guard',
    name: 'Respond to drift: retrain and redeploy',
    difficulty: 5,
    par: 4,
    hint: 'ml data add …; ml train run …; ml model register …; ml deploy churn-model:2',
    objective:
      'Close the loop: bring in fresh data (`v2`), retrain a model on it, register `churn-model:v2`, and deploy it so `prod` serves the refreshed model — the drift → retrain → redeploy response.',
    learning: [
      'Drift is a distribution shift: the model was fit on `train@1`, but live data has moved to `v2`',
      'Retraining is a *closed-loop actuator* — the monitor’s drift signal is what triggers it',
      'The response is to retrain on the *new* data version and redeploy, recording the old model as the rollback target',
    ],
    fieldNotes: [
      'Retrain on the drifted data — a model fit on `train@1` cannot chase a distribution it has never seen',
      'The redeploy records the previous model as the rollback target, so a worse retrain is reversible',
    ],
    startDialog: [
      {
        title: 'The loop closes here',
        markdown:
          '`churn-model:v1` is live on `prod`, but the data has drifted. The response is to retrain on fresh data and redeploy:\n\n```\nml data add data/train.csv          # → train@v2 (the drifted data)\nml train run -n exp-2 -p lr=0.05 -p depth=60   # retrain on train@v2\nml model register exp-2 --name churn-model      # → churn-model:v2\nml deploy churn-model:2                # v2 live, v1 → rollback target\n```\n\nThis is the monitor → ingest/train edge: the whole loop, closed.',
      },
      {
        title: 'Why retrain, not just redeploy',
        markdown:
          'You cannot fix drift by redeploying the same model — it was fit on `train@1` and has never seen `v2`. Retraining on the new version is what lets the model chase the distribution. The redeploy then records `v1` as the rollback target, so a worse retrain is a one-command revert.',
      },
    ],
    startState: deployedState(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'datasetVersioned', name: 'train', minVersion: 2 },
        { kind: 'modelRegistered', name: 'churn-model', minVersion: 2 },
        { kind: 'endpointServes', name: 'prod', ref: { name: 'churn-model', version: 2 } },
      ],
    },
    solution: [
      'ml data add data/train.csv',
      'ml train run -n exp-2 -p lr=0.05 -p depth=60',
      'ml model register exp-2 --name churn-model',
      'ml deploy churn-model:2',
    ],
  },
];

const shipLevels: LevelDef[] = [
  {
    id: 'ship-1',
    series: 'ship',
    seriesTitle: 'Ship it',
    name: 'Ship a monitored, rollback-ready model',
    difficulty: 5,
    par: 5,
    hint: 'ml data add data/train.csv; ml train run; ml model register; ml deploy; ml monitor on',
    objective:
      'Take a stale baseline through the whole lifecycle: version fresh data, train, register, deploy, and monitor — leaving `prod` live, monitored, and able to roll back.',
    learning: [
      'Integrate the full loop under one goal: data → run → registry → live → monitored',
      'The signature of “shipped”: data versioned + model registered + endpoint live + monitoring on + a rollback target exists',
      'Each step’s observable effect on the board maps to a piece of the goal',
    ],
    fieldNotes: [
      'This is the onboarding week compressed: a model is not done when it trains, but when it is watched and reversible',
      'If you can explain why each of the five commands is required, you can run a model in production',
    ],
    startDialog: [
      {
        title: 'The capstone',
        markdown:
          'You are a new engineer. A baseline `churn-model:v1` is **already live** on `prod`, but:\n\n- the `train` dataset is **not versioned**\n- nobody has trained a fresh model here\n- **monitoring is off**\n\nYour job: ship a *proper* model — versioned data, a registered model, a live endpoint, monitoring on, and a rollback target in place.',
      },
      {
        title: 'The five moves',
        markdown:
          '```\nml data add data/train.csv          # version the data (ingest)\nml train run -n exp-1 -p lr=0.1 -p depth=40   # train on train@1\nml model register exp-1 --name churn-model     # register v2\nml deploy exp-1                              # go live (records v1 as rollback target)\nml monitor on                               # close the loop\n```\n\nBecause `v1` was live before your deploy, deploying `v2` records `v1` as the **rollback target** — the safety net the goal requires.',
      },
      {
        title: 'What “shipped” means',
        markdown:
          'You are done when **all five** hold at once:\n\n- data **versioned** (`train` has a version)\n- a model **registered** (`churn-model` has a version)\n- endpoint **live** (`prod` serves a model)\n- **monitoring on** for `prod`\n- a **rollback target** available for `prod`\n\nThat combination — good, watched, and reversible — is what production-grade means.',
      },
    ],
    startState: (() => {
      // Mirrors the sandbox: initialized, train unversioned, churn-model:v1 live, monitoring off.
      const s = emptyMlopsState();
      s.initialized = true;
      s.pipeline = lifecycleRail();
      s.datasets.train = {
        name: 'train',
        path: 'data/train.csv',
        versions: [],
        current: null,
        featureCols: ['age', 'spend', 'tenure'],
        drift: { enabled: false, score: 0.1, threshold: 0.3 },
      };
      s.registry['churn-model'] = {
        name: 'churn-model',
        current: 1,
        versions: [
          {
            version: 1,
            runId: 'exp-legacy',
            params: { lr: 0.2, depth: 20 },
            metrics: { acc: 0.71 },
            datasetRef: 'train@1',
            artifactId: fakeMd5('model:churn:v1'),
            stage: 'Production',
          },
        ],
      };
      s.runs = [
        {
          id: 'exp-legacy',
          params: { lr: 0.2, depth: 20 },
          metrics: { acc: 0.71 },
          datasetRef: 'train@1',
          status: 'succeeded',
          artifactId: fakeMd5('model:churn:v1'),
          createdAt: 1,
        },
      ];
      s.endpoints.prod = {
        name: 'prod',
        live: true,
        modelRef: { name: 'churn-model', version: 1 },
        url: 'https://api.example.com/predict',
        predictionsServed: 1200,
        monitoring: { enabled: false, window: [], driftAlert: false },
      };
      s.metrics = { acc: 0.71 };
      s.params = { lr: 0.2, depth: 20 };
      logEvent(s, 'init', 'Baseline endpoint already live');
      return s;
    })(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'datasetVersioned', name: 'train' },
        { kind: 'modelRegistered', name: 'churn-model' },
        { kind: 'endpointLive', name: 'prod' },
        { kind: 'monitoringOn', name: 'prod' },
        { kind: 'rollbackAvailable', name: 'prod' },
      ],
    },
    solution: [
      'ml data add data/train.csv',
      'ml train run -n exp-1 -p lr=0.1 -p depth=40',
      'ml model register exp-1 --name churn-model',
      'ml deploy exp-1',
      'ml monitor on',
    ],
  },
];

export const allLevels: LevelDef[] = [
  ...basicsLevels,
  ...modelLevels,
  ...serveLevels,
  ...shipLevels,
  ...toolboxLevels,
];

export function getLevel(id: string): LevelDef | undefined {
  return allLevels.find((l) => l.id === id);
}

export function getLevelIndex(id: string): number {
  return allLevels.findIndex((l) => l.id === id);
}

export function getNextLevel(id: string): LevelDef | undefined {
  const i = getLevelIndex(id);
  return i >= 0 ? allLevels[i + 1] : undefined;
}

export function seriesOf(): { id: string; title: string; levels: LevelDef[] }[] {
  const order = ['basics', 'model', 'serve', 'ship', 'toolbox'];
  const titles: Record<string, string> = {
    basics: 'Basics',
    model: 'Train & Register',
    serve: 'Serve & Guard',
    ship: 'Ship it',
    toolbox: 'Toolbox',
  };
  return order.map((id) => ({
    id,
    title: titles[id]!,
    levels: allLevels.filter((l) => l.series === id),
  }));
}

/** What an independent MLOps engineer should be able to do after this course. */
export function curriculumOutcomes(): string[] {
  return [
    'Initialize an MLOps project and read the ingest → train → eval → register → deploy → monitor rail',
    'Version a dataset with `ml data add` and train a run pinned to `train@N` (lineage)',
    'Record a run’s params and metrics, and compare runs to choose what to promote',
    'Register a run as a named model version in Staging, and deploy it to promote Production',
    'Deploy a model to a live endpoint and understand the champion/challenger stage switch',
    'Turn on monitoring and arm a drift threshold so a live model is watched, not hoped for',
    'Upgrade a live endpoint while recording a rollback target, then roll back in one step',
    'State the definition of “shipped”: data versioned + model registered + endpoint live + monitoring on + rollback available',
    'Answer “which data produced this model?” using the run → model → deploy lineage',
    'Use `concepts` as a field glossary when stuck on a real MLOps project',
    'Map each lifecycle concept to the tool your team uses (MLflow, Kubeflow, KServe, Vertex AI, Airflow, DVC, SageMaker, TFX, MLrun)',
  ];
}
