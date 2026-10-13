/** German level teaching copy. Never includes hint/solution/commands. */

import type { LevelCopy } from './types';

export const deLevels: Record<string, LevelCopy> = {
  'init-1': {
    seriesTitle: 'Basics',
    name: 'MLOps-Projekt initialisieren',
    objective:
      'Das MLOps-Projekt initialisieren, sodass eine Lifecycle-Schiene und ein `prod`-Endpoint existieren — der gemeinsame Ausgangspunkt für jedes Modell, das du shippen wirst.',
    learning: [
      'ml init legt die Lifecycle-Schiene an: ingest → train → eval → register → deploy → monitor',
      'Es erstellt außerdem einen kalten `prod`-Endpoint, damit die Serving-Story vom ersten Befehl sichtbar ist',
      'Noch ist nichts trainiert oder deployed — du hast den Workflow eingeschaltet',
    ],
    fieldNotes: [
      'Jedes Projekt bootstrappen, bevor Daten oder Modelle existieren, damit das ganze Team dieselbe Schiene sieht',
      'Die Schiene ist deine Quelle der Wahrheit für „Wo steht dieses Modell im Lifecycle?"',
    ],
    startDialog: [
      {
        title: 'Warum ein Lifecycle und kein Skript',
        markdown:
          'Ein Notebook, das „ein Modell trainiert", ist kein Produkt. In Produktion hat ein Modell einen **Lifecycle**:\n\n`ingest → train → eval → register → deploy → monitor`\n\nJeder Pfeil ist eine Entscheidung mit einem Verantwortlichen und einer Aufzeichnung. `ml init` legt dir diese Schiene zum Durchlaufen an.',
      },
      {
        title: 'Was `ml init` tut',
        markdown:
          '```\nml init\n```\n\n- Legt die sechs Lifecycle-Stufen auf dem Board an (zuerst alle stale).\n- Erstellt einen **`prod`-Endpoint**, der offline (`cold`) bleibt, bis du deployst.\n\nMental Model: das ist `git init` für die ML-Serving-Pipeline — noch keine Bytes, nur der Workflow.',
      },
    ],
  },
  'data-1': {
    seriesTitle: 'Basics',
    name: 'Trainingsdatensatz versionieren',
    objective:
      '`data/train.csv` versionieren, damit Trainings-Runs reproduzierbar gegen einen benannten, nummerierten Snapshot der Daten laufen.',
    learning: [
      'Ein Datensatz ist ein Objekt mit Versionen, keine Datei, die man hoffentlich unverändert lässt',
      '`ml data add` erhöht den Datensatz auf eine neue Version und zeigt `current` darauf',
      'Training gegen `train@1` bedeutet: jede Aussage über ein Modell benennt genau die Daten, die es nutzte',
    ],
    fieldNotes: [
      'Nie gegen „latest" trainieren — den Run an `train@N` pinnen, damit Incidents eine Antwort haben',
      'Versioning ist, was Drift-Erkennung und Rollback später sinnvoll macht',
    ],
    startDialog: [
      {
        title: 'Die Daten sind die halbe Modell',
        markdown:
          'Zwei Runs mit identischem Code, aber unterschiedlichen Daten, produzieren unterschiedliche Modelle.\n\n```\nml data add data/train.csv\n```\n\nDas macht die Datei zu **`train`** in **v1** — ein benannter, unveränderlicher Snapshot. Die Dataset-Zone des Boards zeigt jetzt `train [v1]`.',
      },
      {
        title: 'Warum Versionen und nicht „Datei aktualisiert"',
        markdown:
          'In echten Projekten ändert sich der Datensatz: neue Zeilen, ein Fix, ein Re-Scrape.\n\nOhne Versionen hat „Welche Daten trainierten dieses Modell?" keine Antwort. Mit Versionen schreibt der Run `train@1` als **lineage** — ein Link, den man auditieren und reproduzieren kann.',
      },
    ],
  },
  'train-1': {
    seriesTitle: 'Train & Register',
    name: 'Einen Run gegen eine Datenversion trainieren',
    objective:
      'Einen Trainings-Experiment `exp-1` auf dem versionierten `train`-Datensatz fahren und seine Parameter und Metriken mit einer Daten-Lineage aufzeichnen.',
    learning: [
      'Ein Run ist die Einheit des Experiments: Parameter + Metriken + welche Datenversion er nutzte',
      'Parameter kommen aus `-p k=v` (Lernrate, Tiefe) — sie reisen mit dem Run',
      'Metriken (acc/loss/f1) sind, was du vergleichst, wenn du wählst, welches Modell du shipst',
    ],
    fieldNotes: [
      'Parameter mit dem Run aufzeichnen — eine Metrik ohne ihre Konfiguration ist Aberglaube',
      'Die `data=train@1`-Lineage ist, was man in einem Post-Mortem zitiert',
    ],
    startDialog: [
      {
        title: 'Von Daten zu einem Run',
        markdown:
          'Der `train`-Datensatz ist in **v1**. Trainiere jetzt dagegen:\n\n```\nml train run -n exp-1 -p lr=0.1 -p depth=40\n```\n\nDas erzeugt einen **Run** `exp-1` mit:\n\n- `params`: lr=0.1, depth=40\n- `metrics`: acc / loss / f1\n- `data`: `train@1` (lineage)',
      },
      {
        title: 'Ein Run ist noch kein Modell',
        markdown:
          'Ein Run ist ein **Ergebnis**, kein deploybares Artefakt. Er liegt in der Run-Liste, bis du ihn in das Registry **registrierst**.\n\nDenke an Runs als Laborergebnisse und an Registry-Versionen als das abgefüllte Produkt. Du behältst jeden Run, aber du förderst nur die guten.',
      },
    ],
  },
  'eval-1': {
    seriesTitle: 'Train & Register',
    name: 'Evaluieren: Runs vergleichen, den besseren befördern',
    objective:
      'Mit `exp-1`, das bereits auf `train@1` trainiert wurde, ein zweites Experiment `exp-2` fahren, die beiden Runs vergleichen und den besseren als `churn-model` registrieren.',
    learning: [
      'Evaluation heißt, ein Modell über eine Verteilung von Runs auszuwählen, nicht von einer glücklichen Zahl',
      'Die `eval`-Stufe ist, wo du Metriken (acc/loss/f1) über Runs vergleichst, bevor du beförderst',
      'Das Registrieren des Challengers ist die Beförderungsentscheidung — der Vergleich ist, was sie rechtfertigt',
    ],
    fieldNotes: [
      'Vergleiche Runs auf einer Halte-Metrik, nie auf der Trainings-Metrik',
      'Der beste Run, den du siehst, überschätzt die wahre Leistung (der winner’s curse) — wiederhole, um die Varianz zu sehen',
    ],
    startDialog: [
      {
        title: 'Ein Run ist eine Stichprobe, nicht die Antwort',
        markdown:
          '`exp-1` ist auf `train@1` trainiert. Echte Evaluation heißt, Varianten zu fahren und zu vergleichen.\n\n```\nml train run -n exp-2 -p lr=0.05 -p depth=60\nml model register exp-2 --name churn-model\n```\n\nZwei Runs auf denselben Daten sind zwei Stichproben desselben Modells. Den besseren zu registrieren ist die Entscheidung.',
      },
      {
        title: 'Vergleichen, bevor du beförderst',
        markdown:
          'Die `eval`-Stufe existiert, damit die Beförderung ein *Vergleich* ist, kein Münzwurf.\n\n`exp-1` und `exp-2` sind zwei Punkte; du schaust auf ihre Metriken, wählst den mit dem besseren Halte-Ergebnis und registrierst ihn. Das ist der gesamte eval-Schritt in Produktionsbegriffen.',
      },
    ],
  },
  'register-1': {
    seriesTitle: 'Train & Register',
    name: 'Ein Modell aus einem Run registrieren',
    objective:
      'Den Run `exp-1` als Version 1 eines benannten Modells, `churn-model`, in das Registry befördern.',
    learning: [
      'Das Registry ist der Katalog der deploybaren Modelle, jedes mit nummerierten Versionen',
      'Die Registrierung überträgt die Parameter, Metriken und die Daten-Lineage des Runs auf die Modellversion',
      'Eine registrierte Version startet in **Staging**; sie wird erst beim Deploy **Production**',
    ],
    fieldNotes: [
      'Den Run registrieren, den Leute *finden und wiederverwenden* sollen, nicht jeden Scratch-Run',
      'Die Versionsnummer ist dein Vertrag: `churn-model:v1` ist für immer genau dieses Artefakt',
    ],
    startDialog: [
      {
        title: 'Ein Ergebnis zu einem Produkt befördern',
        markdown:
          'Der Run `exp-1` hat ein gutes Modell produziert. Abfüllen:\n\n```\nml model register exp-1 --name churn-model\n```\n\nDas Registry hat jetzt **`churn-model` v1**, in der Stufe **Staging**, mit den Metriken des Runs und der `train@1`-Lineage.',
      },
      {
        title: 'Staging vs. Production',
        markdown:
          'Registrieren geht **nicht** live. Es legt eine Version im Registry ab, damit sie bewusst geprüft und deployed werden kann.\n\n`Staging` = bereit, aber nicht servierend. `Production` = die Version, die ein Endpoint tatsächlich serviert. Deploy ist der Schalter zwischen beiden.',
      },
    ],
  },
  'deploy-1': {
    seriesTitle: 'Serve & Guard',
    name: 'Ein registriertes Modell deployen',
    objective:
      'Das registrierte `churn-model` auf den `prod`-Endpoint deployen, damit es live und servierend ist.',
    learning: [
      'Deploy macht eine Registry-Version zu der, die ein live Endpoint serviert',
      'Die deployte Version wird im Registry auf **Production** befördert',
      'War ein Modell bereits live, zeichnet deploy es zuerst als **rollback target** auf',
    ],
    fieldNotes: [
      'Deploy ist eine Beförderungsentscheidung, kein `docker run` — es benennt eine Version',
      'Immer die vorherige Live-Version kennen, bevor du tauschst; das ist dein Sicherheitsnetz',
    ],
    startDialog: [
      {
        title: 'Live gehen',
        markdown:
          '`churn-model` v1 ist in Staging registriert. Vor den Traffic stellen:\n\n```\nml deploy exp-1\n```\n\nDeploy löst `exp-1` → `churn-model:v1` auf und zeigt den `prod`-Endpoint darauf. Der Endpoint ist jetzt **LIVE** und die Registry-Version auf **Production** befördert.',
      },
      {
        title: 'Der Tausch ist der riskante Moment',
        markdown:
          'Beim Deployen können Modelle in der Wildnis regressieren. Weil `ml deploy` das **vorherige Live-Modell** als rollback target aufzeichnet, bevor es tauscht, hast du immer eine bekannte-gute Version einen Schritt zurück.\n\nBeobachte die Service-Zone: Der Endpoint wechselt von `cold` zu `live → churn-model:v1`.',
      },
    ],
  },
  'monitor-1': {
    seriesTitle: 'Serve & Guard',
    name: 'Monitoring einschalten',
    objective:
      'Monitoring auf dem live `prod`-Endpoint aktivieren, damit Drift und Qualität kontinuierlich beobachtet werden.',
    learning: [
      'Monitoring schließt den Kreis: Du bist erst fertig, wenn du es beobachtest, nicht wenn das Modell shippt',
      'Es aktiviert einen **Drift-Schwellwert** auf den Daten — ein Score über dem Schwellwert ist ein Drift-Alarm',
      'Ein live Endpoint ohne Monitoring ist ein Modell, das man hofft, das es noch gut ist',
    ],
    fieldNotes: [
      'Den Drift-Schwellwert vor dem Launch definieren, nicht nach dem ersten Incident',
      'Monitoring + ein rollback target zusammen machen ein Ship „sicher"',
    ],
    startDialog: [
      {
        title: 'Den Kreis schließen',
        markdown:
          '`churn-model:v1` ist live, aber blind. Kameras an:\n\n```\nml monitor on\n```\n\nDas aktiviert Monitoring auf `prod` und aktiviert einen **Drift-Schwellwert** auf dem Datensatz. Der Kreis ist jetzt geschlossen: ingest → train → eval → register → deploy → **monitor**.',
      },
      {
        title: 'Was „Monitoring on" bedeutet',
        markdown:
          'Mit Monitoring on verfolgt der Endpoint die Live-Qualität und der Datensatz den **Drift** — die stille Verschiebung der Eingabedaten, die die Genauigkeit mit der Zeit verschlechtert.\n\nDu siehst keinen Alarm, bis Verkehr ankommt (`ml predict`), aber die Überwachung ist jetzt *armiert*.',
      },
    ],
  },
  'rollback-1': {
    seriesTitle: 'Serve & Guard',
    name: 'Ein Upgrade shippen, dann zurückrollen',
    objective:
      '`prod` auf `churn-model:v2` upgraden (und das rollback target aufzeichnen), dann zurückrollen, damit `prod` wieder `churn-model:v1` serviert.',
    learning: [
      'Ein rollback target ist das vorherige Live-Modell, erfasst beim Deploy',
      '`ml rollback` stellt dieses Ziel in einem Schritt wieder her — der Endpoint geht nie cold',
      'Rollback ist die Übung, die du jetzt einübst, damit sie um 2 Uhr nachts blitzschnell ist',
    ],
    fieldNotes: [
      'Rollback auf einer bekannten-guten Version üben, bevor das riskante Upgrade shippt',
      'Ein Einweg-Ziel wird beim Rollback verbraucht — neu deployen, um ein frisches aufzuzeichnen',
    ],
    startDialog: [
      {
        title: 'Upgrade mit einem Netz unter dir',
        markdown:
          'Du bist live auf `churn-model:v1`. Ein besseres `v2` ist in Staging. Upgrade — und beweise, dass du zurückkommst:\n\n```\nml deploy churn-model:2\nml rollback\n```\n\nDas Deploy zeichnet **`v1`** als rollback target auf, dann stellt `ml rollback` `v1` wieder her. Der Endpoint war die ganze Zeit live.',
      },
      {
        title: 'Warum das eine Fähigkeit ist',
        markdown:
          'Jeder kann deployen. Der professionelle Zug ist *sauber upgraden und zurückdrehen*.\n\nWeil das rollback target beim Deploy erfasst wurde, ratst du nie über die alte Version — du stellst genau die wieder her, die serviert wurde. Das ist das Sicherheitsnetz, um das der ganze MLOps-Kreis gebaut ist.',
      },
    ],
  },
  'canary-1': {
    seriesTitle: 'Serve & Guard',
    name: 'Champion / Challenger-Beförderung',
    objective:
      'Ein Challenger-Experiment fahren, es als `churn-model:v2` registrieren und es deployen, sodass `prod` live auf `v2` ist, während `v1` als rollback target erfasst wird — die champion/challenger-Beförderung.',
    learning: [
      'Champion/challenger ist ein Live-Test: der Challenger ist eine konkrete Version, kein zufälliger Kontrollarm',
      'Die Beförderung ist eine Entscheidung — du beförderst den Challenger nur, wenn du die Kosten einer Regression halten willst',
      'Beim Deploy des Challengers wird der Champion zum rollback target: das Sicherheitsnetz wird beim Switch erfasst',
    ],
    fieldNotes: [
      'Ein Challenger, der „siegt”, ist der winner’s curse — vergleiche auf Halte-Daten',
      'Behalte den Champion als rollback target, damit eine Regression ein Ein-Befehl-Revert ist',
    ],
    startDialog: [
      {
        title: 'Challenger befördern, das Netz behalten',
        markdown:
          '`churn-model:v1` ist der Champion, live auf `prod`. Du hast einen Challenger. Baue ihn und befördere ihn:\n\n```\nml train run -n exp-2 -p lr=0.05 -p depth=60\nml model register exp-2 --name churn-model   # → churn-model:v2 (Challenger)\nml deploy churn-model:2                      # v2 live, v1 → rollback target\n```\n\nDer Champion wird nicht gelöscht — er wird zum rollback target, in dem Moment, in dem der Challenger übernimmt.',
      },
      {
        title: 'Warum das Ziel beim Switch erfasst wird',
        markdown:
          'Die Beförderung ist riskant, gerade weil der Challenger echten Traffic noch nie gesehen hat. Weil `ml deploy churn-model:2` `v1` als rollback target *vor* dem Switch erfasst, ist ein schlechter Challenger ein Ein-Befehl-Revert, kein Retrain.',
      },
    ],
  },
  'retrain-1': {
    seriesTitle: 'Serve & Guard',
    name: 'Auf Drift reagieren: neu trainieren und neu deployen',
    objective:
      'Den Kreis schließen: frische Daten (`v2`) hereinbringen, darauf neu trainieren, `churn-model:v2` registrieren und deployen, sodass `prod` das aktualisierte Modell serviert — die Drift → retrain → redeploy-Antwort.',
    learning: [
      'Drift ist eine Distributionsverschiebung: das Modell wurde auf `train@1` gefittet, aber die Live-Daten sind auf `v2` gezogen',
      'Retraining ist ein *geschlossener* Aktuator — das Drift-Signal des Monitors ist es, was es auslöst',
      'Die Antwort ist, auf der *neuen* Datenversion neu zu trainieren und neu zu deployen, und das alte Modell als rollback target zu erfassen',
    ],
    fieldNotes: [
      'Auf den drifteten Daten neu trainieren — ein Modell, das auf `train@1` gefittet ist, kann eine Verteilung nicht jagen, die es nie gesehen hat',
      'Das Neu-Deploy erfasst das vorherige Modell als rollback target, damit ein schlechteres Retrain rückholbar bleibt',
    ],
    startDialog: [
      {
        title: 'Hier schließt sich der Kreis',
        markdown:
          '`churn-model:v1` ist live auf `prod`, aber die Daten sind gedriftet. Die Antwort ist, auf frischen Daten neu zu trainieren und neu zu deployen:\n\n```\nml data add data/train.csv          # → train@v2 (die drifteten Daten)\nml train run -n exp-2 -p lr=0.05 -p depth=60   # auf train@v2 neu trainieren\nml model register exp-2 --name churn-model      # → churn-model:v2\nml deploy churn-model:2                # v2 live, v1 → rollback target\n```\n\nDas ist die monitor → ingest/train-Kante: der ganze Kreis, geschlossen.',
      },
      {
        title: 'Warum neu trainieren, nicht nur neu deployen',
        markdown:
          'Du kannst Drift nicht beheben, indem du dasselbe Modell neu deployst — es wurde auf `train@1` gefittet und hat `v2` nie gesehen. Auf der neuen Version neu zu trainieren ist es, was dem Modell erlaubt, der Verteilung zu folgen. Das Neu-Deploy erfasst dann `v1` als rollback target, damit ein schlechteres Retrain ein Ein-Befehl-Revert ist.',
      },
    ],
  },
  'ship-1': {
    seriesTitle: 'Ship it',
    name: 'Ein beobachtetes, rollback-bereites Modell shippen',
    objective:
      'Eine veraltete Basis durch den ganzen Lifecycle nehmen: frische Daten versionieren, trainieren, registrieren, deployen und überwachen — sodass `prod` live, überwacht und rollback-fähig bleibt.',
    learning: [
      'Den ganzen Kreis unter einem Ziel integrieren: Daten → Run → Registry → live → überwacht',
      'Die Signatur von „shipped": Daten versioniert + Modell registriert + Endpoint live + Monitoring on + ein rollback target existiert',
      'Die beobachtbare Wirkung jedes Schritts auf dem Board entspricht einem Teil des Ziels',
    ],
    fieldNotes: [
      'Das ist die Onboarding-Woche verdichtet: Ein Modell ist erst fertig, wenn es beobachtet und rückholbar ist, nicht wenn es trainiert',
      'Kannst du erklären, warum jeder der fünf Befehle nötig ist, kannst du ein Modell in Produktion betreiben',
    ],
    startDialog: [
      {
        title: 'Das Capstone',
        markdown:
          'Du bist ein neuer Engineer. Ein Basis-`churn-model:v1` ist auf `prod` **bereits live**, aber:\n\n- der `train`-Datensatz ist **nicht versioniert**\n- niemand hat hier ein frisches Modell trainiert\n- **Monitoring ist aus**\n\nDeine Aufgabe: ein *sauber*es Modell shippen — versionierte Daten, ein registriertes Modell, ein live Endpoint, Monitoring on und ein rollback target.',
      },
      {
        title: 'Die fünf Züge',
        markdown:
          '```\nml data add data/train.csv          # Daten versionieren (ingest)\nml train run -n exp-1 -p lr=0.1 -p depth=40   # auf train@1 trainieren\nml model register exp-1 --name churn-model     # v2 registrieren\nml deploy exp-1                              # live gehen (zeichnet v1 als rollback target auf)\nml monitor on                               # den Kreis schließen\n```\n\nWeil `v1` vor deinem Deploy live war, zeichnet das Deploy von `v2` `v1` als **rollback target** auf — das Sicherheitsnetz, das das Ziel verlangt.',
      },
      {
        title: 'Was „shipped" bedeutet',
        markdown:
          'Du bist fertig, wenn **alle fünf** gleichzeitig gelten:\n\n- Daten **versioniert** (`train` hat eine Version)\n- ein Modell **registriert** (`churn-model` hat eine Version)\n- Endpoint **live** (`prod` serviert ein Modell)\n- **Monitoring on** für `prod`\n- ein **rollback target** für `prod` verfügbar\n\nDiese Kombination — gut, beobachtet und rückholbar — ist, was produktionsreif bedeutet.',
      },
    ],
  },
  'tool-mlflow': {
    seriesTitle: 'Toolbox',
    name: 'Einen Run in MLflow aufzeichnen',
    objective:
      'Ein Trainings-Experiment fahren und seine Parameter, Metriken und Daten-Lineage aufzeichnen — genau das, was die `mlflow.log_*`-API von MLflow für echte Runs tut.',
    learning: [
      'MLflow Tracking ist das System der Wahrheit für Runs: Parameter, Metriken und Artefakte, alles abfragbar und vergleichbar',
      '`mlflow.start_run()` + `mlflow.log_param` / `log_metric` / `log_artifact` ist die Form dessen, was `ml train run` hier simuliert',
      'Der Run, den du hier behältst, ist einer, den du dort loggen würdest — gleiche Idee, reales Tool',
    ],
    fieldNotes: [
      'MLflow auf einen gemeinsamen Store zeigen (S3, eine Datenbank), damit das ganze Team Runs vergleicht, keine Screenshots',
      'Die `train@1`-Lineage ist der Teil, den MLflow speichert, damit eine Metrik nie unspurbar wird',
    ],
    startDialog: [
      {
        title: 'Das Tool hinter „train run"',
        markdown:
          'In einem echten Team lebt der gerade simulierte Run in **MLflow**.\n\n[MLflow-Doku → https://mlflow.org/docs/latest/](https://mlflow.org/docs/latest/)\n\n```\nimport mlflow\nmlflow.start_run(name="exp-1")\nmlflow.log_param("lr", 0.1)\nmlflow.log_metric("acc", 0.907)\n```\n\nGleiche Idee wie `ml train run` — Parameter, Metriken und Lineage, an einen abfragbaren Run gehängt.',
      },
      {
        title: 'Den Befehl fahren',
        markdown:
          'Fahre das Trainings-Experiment erneut. Die Mechanik ist identisch zu `train-1`; der Punkt ist zu sehen, dass dies genau die Einheit ist, die MLflow in Produktion trackt.\n\n```\nml train run -n exp-1 -p lr=0.1 -p depth=40\n```\n\nIn MLflow ist dies eine Zeile in der Run-Tabelle, die du filtern, sortieren und vergleichen kannst.',
      },
    ],
  },
  'tool-kfp': {
    seriesTitle: 'Toolbox',
    name: 'Eine Pipeline in Kubeflow Pipelines modellieren',
    objective:
      'Die Stufen train → register zu einer Pipeline verdrahten — derselbe Graph, den Kubeflow Pipelines als versionierte, erneut ausführbare Komponenten ausführt.',
    learning: [
      'Kubeflow Pipelines kompiliert eine Python-Funktion aus verbundenen Komponenten zu einer versionierten DAG, die auf einem Cluster läuft',
      'Jedes `@component` ist eine Stufe — deine train- und register-Stufe sind zwei Knoten auf derselben Schiene',
      'Eine Pipeline, die du erneut ausführen kannst, ist eine, die du auditieren kannst; die Graphik, nicht eine Notebook-Zelle, ist die Quelle der Wahrheit',
    ],
    fieldNotes: [
      'Den ganzen Lifecycle als eine Pipeline modellieren, damit ein einzelner `kfp`-Run Daten → Modell → Registry bewegt',
      'Komponenten-Ein-/Ausgaben sind Artefakte — dort lebt in der realen Welt die `train@1`-Lineage',
    ],
    startDialog: [
      {
        title: 'Das Tool hinter der Schiene',
        markdown:
          'Deine sechsstufige Schiene ist eine DAG. **Kubeflow Pipelines** ist es, was diese DAG für die Praxis fährt.\n\n[Kubeflow Pipelines-Doku → https://www.kubeflow.org/docs/components/pipelines/](https://www.kubeflow.org/docs/components/pipelines/)\n\n```python\n@kfp.dsl.pipeline def pipeline():\n    train()   # eine Komponente\n    register(depends_on=train())  # die nächste Stufe\n```\n\nDie Schiene auf dem Board und dies sind derselbe Graph.',
      },
      {
        title: 'Zwei Stufen anzünden',
        markdown:
          'Fahre die train → register-Hälfte der Pipeline. Das Ziel ist einfach: einen Run auf der Datenversion und ein registriertes Modell — zwei Stufen der Reihe nach.\n\n```\nml train run -n exp-1 -p lr=0.1 -p depth=40\nml model register exp-1 --name churn-model\n```\n\nIn Kubeflow wären das zwei Komponenten mit einer Kante zwischen ihnen.',
      },
    ],
  },
  'tool-kserve': {
    seriesTitle: 'Toolbox',
    name: 'Ein Modell-Endpoint mit KServe servieren',
    objective:
      'Das registrierte Modell auf den live `prod`-Endpoint deployen — derselbe Akt, den KServe tut, indem es ein Modell zu einem autoskalierenden Kserve-Service deployt.',
    learning: [
      'KServe deployt ein Modell als Kubernetes-Service, der automatisch skaliert (bis auf null bei Leerlauf) und eine standardisierte Inference-API spricht',
      '`ml deploy` und ein KServe-`v1`-Deploy sind dieselbe Entscheidung: einen live Endpoint auf eine benannte Modellversion zeigen',
      'Serving ist, wo ein Modell zum Produkt wird — der Endpoint, nicht das Artefakt, ist es, was Nutzer aufrufen',
    ],
    fieldNotes: [
      'Die Schicht skalieren lassen und bis auf null fahren — bezahle nur für echten Inference-Verkehr',
      'Den Endpoint auf eine Registry-Version pinnen, damit „welches Modell ist live?" eine einzige Antwort hat',
    ],
    startDialog: [
      {
        title: 'Das Tool hinter „deploy"',
        markdown:
          '`ml deploy exp-1` schaltet den `prod`-Endpoint auf live. In einer Kubernetes-Umgebung ist **KServe** das System, das dies tut.\n\n[KServe-Doku → https://kserve.github.io/kserve/](https://kserve.github.io/kserve/)\n\nEin KServe-`InferenceService` wrappt eine registrierte Modellversion in einen autoskalierenden Service mit einem standardisierten Predict-Endpoint.',
      },
      {
        title: 'Es live machen',
        markdown:
          'Bringe das registrierte Modell zum Endpoint.\n\n```\nml deploy exp-1\n```\n\nDer Endpoint wechselt `cold` → `live`, und die Registry-Version wird zu Production befördert — genau die Beförderung, die ein KServe-Deploy für den Verkehr sichtbar macht.',
      },
    ],
  },
  'tool-vertex-ai': {
    seriesTitle: 'Toolbox',
    name: 'Einen verwalteten Endpoint auf Vertex AI deployen',
    objective:
      'Das registrierte Modell auf einen live Endpoint befördern — die verwaltete Entsprechung von `ml deploy`, wie Vertex AI es mit einem verwalteten Endpoint tut.',
    learning: [
      'Vertex AI Model Registry + verwaltete Endpoints übernehmen den Übergang Registry → Serving aus deinen Händen',
      'Ein verwalteter Endpoint übernimmt Skalierung, Health und die Prediction-API; deine Aufgabe ist, welche Version du beförderst',
      'Die `churn-model:vN → endpoint`-Zuordnung hier ist dieselbe Beförderung, die ein Vertex-Deploy macht',
    ],
    fieldNotes: [
      'Die verwaltete Registry nutzen, damit Versionsnummern der Vertrag über Teams hinweg sind, nicht ein Pfad',
      'Bewusst befördern: Ein verwalteter Endpoint macht das Deploy zu einer prüfbaren Aktion, nicht zu einem Skript',
    ],
    startDialog: [
      {
        title: 'Der verwaltete Weg zu „deploy"',
        markdown:
          'Auf GCP verbindet **Vertex AI** eine Model Registry mit verwalteten Endpoints.\n\n[Vertex AI Model Registry → https://cloud.google.com/vertex-ai/docs/model-registry](https://cloud.google.com/vertex-ai/docs/model-registry)\n\nDu registrierst eine Version und deployst sie zu einem verwalteten Endpoint — derselbe Registry → Serving-Schritt wie `ml deploy`.',
      },
      {
        title: 'Befördern auf live',
        markdown:
          'Bringe das registrierte Modell zum Endpoint.\n\n```\nml deploy exp-1\n```\n\n`prod` wird auf der beförderten Version live. In Vertex ist dies der verwaltete Endpoint, der jetzt `churn-model:v1` serviert.',
      },
    ],
  },
  'tool-airflow': {
    seriesTitle: 'Toolbox',
    name: 'Die Ingest-Stufe in Airflow planen',
    objective:
      'Einen versionierten Daten-Snapshot nach Zeitplan erzeugen — die Aufgabe, die eine Airflow-DAG jeden Zyklus fährt, um den Rest des Lifecycle zu speisen.',
    learning: [
      'Airflow fährt Datenaufgaben nach Zeitplan und behält eine Aufgabengeschichte bei — die „ingest"-Stufe als dauerhaftes Job, nicht als einmaliges Skript',
      'Jeder Lauf der DAG legt eine neue Datenversion an; das ist der `ml data add`-Schritt, gemacht wiederholbar und beobachtbar',
      'Ein Scheduler macht „frische Daten" zu einer Garantie, auf die du dich verlässt, sodass downstream-Training immer eine echte Version pinnt',
    ],
    fieldNotes: [
      'Die Daten in der DAG-Stufe selbst versionieren, damit jedes downstream-Training reproduzierbar auf einen benannten Snapshot läuft',
      'Airflows Retry + Alarme sind es, was ein defektes Ingest daran hindert, still veraltete Daten in das Training zu speisen',
    ],
    startDialog: [
      {
        title: 'Das Tool hinter „data add"',
        markdown:
          'Frische, versionierte Daten nach Zeitplan — wofür **Airflow** da ist.\n\n[Airflow-Doku → https://airflow.apache.org/docs/](https://airflow.apache.org/docs/)\n\nEine DAG-Aufgabe zieht neue Daten und schreibt eine Version — die `ingest`-Stufe deiner Schiene, laufend im Takt, jedes Mal.',
      },
      {
        title: 'Die Version erzeugen',
        markdown:
          'Fahre das Ingest: Versioniere den Datensatz, damit Training etwas zum Pinnen hat.\n\n```\nml data add data/train.csv\n```\n\nIn einer echten DAG läuft genau dieser Schritt auf einem Cron und legt jeden Zyklus eine neue `train@N` ab.',
      },
    ],
  },
  'tool-dvc': {
    seriesTitle: 'Toolbox',
    name: 'Daten mit DVC versionieren',
    objective:
      'Den Datensatz als versioniertes, inhaltsadressiertes Objekt tracken — genau das, was DVC mit `dvc add` und der `.dvc`-Pointer-Datei tut.',
    learning: [
      'DVC speichert die eigentlichen Bytes in einer Remote-Storage und behält nur einen Hash-Pointer in Git — `ml data add` simuliert genau diese Trennung',
      'Die Content-ID, die du siehst (`train@1`), ist dieselbe Idee wie DVCs Content-Hash: eine stabile, auditierbare Identität der Daten',
      'Daten wie Code zu versionieren bedeutet: „Welche Daten trainierten dieses Modell?" hat immer einen Hash, auf den man zeigen kann',
    ],
    fieldNotes: [
      'Große Datensätze aus Git heraus und in DVC-Remote-Storage halten; committe nur die kleinen Hash-Pointer',
      'Training auf eine DVC-Version pinnen, damit Experimente auf jeder Maschine reproduzierbar sind',
    ],
    startDialog: [
      {
        title: 'Das Tool hinter Daten-Versionen',
        markdown:
          'Große Datensätze, die wie Code versionieren? Das ist **DVC**.\n\n[DVC-Doku → https://dvc.org/doc](https://dvc.org/doc)\n\n```\ndvc add data/train.csv   # speichert die Datei, behält einen .dvc-Hash-Pointer in Git\n```\n\n`ml data add` ist derselbe Schritt: ein benanntes Objekt mit Content-Versionen.',
      },
      {
        title: 'Den Datensatz versionieren',
        markdown:
          'Bringe die Daten unter Versionskontrolle.\n\n```\nml data add data/train.csv\n```\n\nDie Dataset-Zone zeigt `train [v1]` mit einer Content-ID — der DVC-Pointer, gemacht sichtbar.',
      },
    ],
  },
  'tool-sagemaker': {
    seriesTitle: 'Toolbox',
    name: 'Ein SageMaker-Endpoint anlegen',
    objective:
      'Das registrierte Modell auf einen live Endpoint deployen — die AWS-verwaltete Version von `ml deploy`, wie `sagemaker create-endpoint` es tut.',
    learning: [
      'Amazon SageMaker macht ein registriertes Modell zu einem live, automatisch skalierenden Endpoint über die Model Registry',
      '`ml deploy` und `sagemaker create-endpoint` sind dieselbe Beförderung: eine Registry-Version wird zu einem aufrufbaren, live Service',
      'Der verwaltete Endpoint besitzt die Instanzen und die Skalierung; du besitzt die Entscheidung, welche Version du beförderst',
    ],
    fieldNotes: [
      'Zuerst registrieren, dann deployen — Sagemakers Model Registry ist dieselbe Staging → Production-Disziplin, die du schon nutzt',
      'Der Endpunkt-Name ist der Vertrag, den deine Aufrufer treffen; die Modellversion dahinter ist dein Hebel',
    ],
    startDialog: [
      {
        title: 'Das Tool hinter „deploy" auf AWS',
        markdown:
          'Auf AWS ist **SageMaker** der verwaltete Weg von der Registry zum live Endpoint.\n\n[Amazon SageMaker Model Registry → https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry.html](https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry.html)\n\n```\naws sagemaker create-endpoint --endpoint-name prod --model-name churn\n```\n\nGleiche Idee wie `ml deploy`: einen live Endpoint auf eine Registry-Version zeigen.',
      },
      {
        title: 'Live bringen',
        markdown:
          'Deploye das registrierte Modell.\n\n```\nml deploy exp-1\n```\n\n`prod` wechselt auf live mit `churn-model:v1` — der SageMaker-Endpoint, der jetzt diese Version serviert.',
      },
    ],
  },
  'tool-tfx': {
    seriesTitle: 'Toolbox',
    name: 'Validierung zur Pipeline mit TFX hinzufügen',
    objective:
      'Die train → register → deploy-Sequenz fahren, so wie eine TFX-Pipeline jede Stufe auf eine Validierung prüft, bevor ein Modell shippen darf.',
    learning: [
      'TFX verdrahtet eine komplette MLOps-Pipeline — Datenvalidierung, Training, Modellvalidierung und Publishing — als verbundene Komponenten',
      'Die `push`-Stufe veröffentlicht ein validiertes Modell in die Registry; das ist der register-Schritt, umgeben von Prüfungen',
      'Validierung ist es, was „es trainiert" zu „es darf shippen" macht — ein Tor an jeder Stufe, nicht eine Hoffnung',
    ],
    fieldNotes: [
      'TFX-Schema-Validierung eine schlechte Datenversion blockieren lassen, bevor sie je das Training erreicht',
      'Modellvalidierung + die `push`-Stufe machen die Beförderung zu einer Policy-Entscheidung, die die Pipeline durchsetzt',
    ],
    startDialog: [
      {
        title: 'Das Tool hinter „eine geprüfte Pipeline"',
        markdown:
          '**TFX** ist ein Komponenten-Framework, das die komplette validierte Pipeline baut: Datenvalidierung → train → Modellvalidierung → `push`.\n\n[TFX-Doku → https://www.tensorflow.org/tfx/guide](https://www.tensorflow.org/tfx/guide)\n\nDie `push`-Komponente veröffentlicht ein validiertes Modell in die Registry — dein `ml model register` mit Toren drumherum.',
      },
      {
        title: 'Die Pipeline-Hälfte fahren',
        markdown:
          'Fahre train → register → deploy. Das Ziel ist der volle Weg: ein validiertes Modell, registriert und dann live.\n\n```\nml train run -n exp-1 -p lr=0.1 -p depth=40\nml model register exp-1 --name churn-model\nml deploy exp-1\n```\n\nJede Stufe in TFX ist eine Komponente, die bestehen muss, bevor die nächste läuft.',
      },
    ],
  },
  'tool-mlrun': {
    seriesTitle: 'Toolbox',
    name: 'Den ganzen Kreis in MLrun tracken',
    objective:
      'Den Kreis Daten → train → register → deploy von Anfang bis Ende fahren — die Run-und-Track-Story, für die MLrun gebaut ist, mit jedem Schritt in ein Projekt loggend.',
    learning: [
      'MLrun zeichnet Experimente, Modelle und Pipelines in ein einzelnes Projekt, das du inspizieren und reproduzieren kannst',
      'Daten → Modell → live in einem Durchlauf zu fahren ist der ganze Kreis, den MLrun als abfragbare Historie behält',
      'Wenn jeder Schritt in dasselbe Projekt loggt, ist die Lineage eines Modells ein Dashboard, nicht eine Archäologie-Grabung',
    ],
    fieldNotes: [
      'Alles durch MLrun fahren, damit Daten, Run, registriertes Modell und Deploy eine Lineage teilen',
      'Eine einzelne Projekt-Ansicht ist es, was „dieses Modell reproduzieren" zu einem Klick macht statt zu einer Rekonstruktion',
    ],
    startDialog: [
      {
        title: 'Das Tool hinter „alles tracken"',
        markdown:
          '**MLrun** behält Runs, Modelle und Pipelines in einem Projekt, das du von Anfang bis Ende nachverfolgen kannst.\n\n[MLrun-Doku → https://mlrun.org/docs/](https://mlrun.org/docs/)\n\nDeinen Lifecycle zu fahren ist es, was MLrun loggt — jede Stufe landet als durchsuchbares Artefakt im Projekt.',
      },
      {
        title: 'Den Kreis fahren',
        markdown:
          'Bringe das Projekt von unversionierten Daten zu einem live Modell in einer Sequenz.\n\n```\nml data add data/train.csv\nml train run -n exp-1 -p lr=0.1 -p depth=40\nml model register exp-1 --name churn-model\nml deploy exp-1\n```\n\nJeder Befehl ist ein Schritt des Kreises, den MLrun in dasselbe Projekt aufzeichnen würde.',
      },
    ],
  },
};
