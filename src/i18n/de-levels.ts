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
};
