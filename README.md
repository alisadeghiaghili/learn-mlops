# LearnMLOps

An interactive **MLOps** visualizer, sandbox, and tutorial for the machine-learning lifecycle.

A faithful sibling of [LearnDVC](https://github.com/alisadeghiaghili/learn-dvc) — same engine, same teaching model, retargeted to MLOps.

> **Status: in development.** The repository is scaffolded; the app (engine, levels, UI) is being built phase by phase on top of the LearnDVC reference.

Git versions code well; a model is never just a file — it is data + a run + an artifact + a live endpoint + its monitoring. LearnMLOps makes that material flow visible across three zones: **Dataset → Model Registry → Service**.

## The three zones

| Zone            | Accent | What lives there                                            |
| --------------- | ------ | ---------------------------------------------------------- |
| **Dataset**     | purple | Datasets, versions, feature sets, drift signals           |
| **Model Registry** | teal | Runs/experiments, registered models, params, metrics     |
| **Serving**     | amber  | Live endpoints, predictions, monitoring, rollback          |

A pipeline DAG strip (ingest → train → eval → register → deploy → monitor) renders below the board, using the same stage nodes as LearnDVC.

## The signature moment

MLOps has no single `dvc add` — its essence is a **loop**. But every learner chases one moment: **deploy**. A registered model becomes a *live endpoint* that serves real predictions, and a **rollback path** appears as a safety net. A level is *shipped* (sudoku-style completion) only when the whole board is coherent: data versioned + model registered + endpoint live + monitoring on + rollback target available.

## Command surface

A **tool-agnostic** `ml …` teaching CLI (the honest, simplified spirit of LearnDVC). Every command maps to a real, doc-verified operation in a production tool:

```
ml init
ml data add data/train.csv
ml train run -n exp-1 -p lr=0.1
ml model register exp-1
ml deploy exp-1
ml service status
```

A closing **Toolbox** series maps the same concepts onto the real tools: MLflow, Kubeflow Pipelines, KServe, Vertex AI, Airflow, DVC, SageMaker, TFX, MLRun — each with its official docs link.

## Quick start

```bash
npm install
npm run dev
```

GitHub Pages deploys automatically from `main` via `.github/workflows/deploy-pages.yml` once the app lands (build `dist/`, publish with the Pages artifact).

## Project layout (planned)

```
src/engine/   # MLOps lifecycle simulation, command interpreter, goal compare
src/levels/   # level definitions (start state, goal, solution)
src/ui/       # board, terminal, dialogs, app shell
tests/        # vitest coverage for engine + level solutions
```

## Notes

- This is a **teaching simulator**, not a real MLOps binary. `ml` is an educational abstraction; hashes are deterministic fakes and endpoints are abstract objects.
- The stack is TypeScript (strict) + Vite + Vitest, 100% client-side, no UI framework.

## License

Apache License 2.0.

This project is an independent teaching simulator. It is not affiliated with any MLOps tool maintainers.
