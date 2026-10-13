/** Persian level teaching copy. Never includes hint/solution/commands. */

import type { LevelCopy } from './types';

export const faLevels: Record<string, LevelCopy> = {
  'init-1': {
    seriesTitle: 'مبانی',
    name: 'راه‌اندازی پروژه‌ی MLOps',
    objective:
      'پروژه‌ی MLOps را راه‌اندازی کنید تا یک ریلِ چرخه‌ی حیات و یک اندپوینت `prod` وجود داشته باشند — نقطه‌ی شروع مشترک برای هر مدلی که ship خواهید کرد.',
    learning: [
      'ml init ریلِ چرخه‌ی حیات را می‌کارد: ingest → train → eval → register → deploy → monitor',
      'همچنین یک اندپوینت سرد `prod` می‌سازد تا داستان سرویس‌دهی از اولین فرمان دیده شود',
      'هنوز چیزی آموزش یا deploy نشده — شما workflow را روشن کردید',
    ],
    fieldNotes: [
      'هر پروژه را پیش از آن‌که داده یا مدل وجود داشته باشد bootstrap کنید تا کل تیم همان ریل را ببیند',
      'ریل، منبع حقیقت شماست برای «این مدل کجای چرخه‌ی حیات است؟»',
    ],
    startDialog: [
      {
        title: 'چرا یک چرخه‌ی حیات، نه یک اسکریپت',
        markdown:
          'نوت‌بوکی که «یک مدل را train می‌کند» یک محصول نیست. در تولید یک مدل یک **چرخه‌ی حیات** دارد:\n\n`ingest → train → eval → register → deploy → monitor`\n\nهر فلش یک تصمیم است با یک صاحب و یک ثبت. `ml init` همین ریل را برای پیمودن به شما می‌چیند.',
      },
      {
        title: 'چه کاری `ml init` انجام می‌دهد',
        markdown:
          '```\nml init\n```\n\n- شش مرحله‌ی چرخه‌ی حیات را روی بورد می‌کارد (در ابتدا همه stale).\n- یک **اندپوینت `prod`** می‌سازد تا پیش از deploy آفلاین (`cold`) بماند.\n\nمدل ذهنی: این همان `git init` برای pipeline سرویس‌دهیِ ML است — هنوز بایتی نیست، فقط workflow.',
      },
    ],
  },
  'data-1': {
    seriesTitle: 'مبانی',
    name: 'نسخه‌شده‌سازی دیتاستِ آموزشی',
    objective:
      '`data/train.csv` را نسخه‌سازی کنید تا اجرای training روی یک snapshotِ نام‌دار و شماره‌دار از داده reproducible باشد.',
    learning: [
      'دیتاست یک شیء است با نسخه‌ها، نه یک فایل که امیدواریم تغییر نکرده باشد',
      '`ml data add` دیتاست را به یک نسخه‌ی تازه بالا می‌برد و `current` را به آن نشانه می‌رود',
      'آموزش روی `train@1` یعنی هر ادعا درباره‌ی یک مدل، دقیقاً داده‌ی مصرفی‌اش را نام می‌برد',
    ],
    fieldNotes: [
      'هرگز روی «آخرین» train نکنید — run را روی `train@N` pin کنید تا حوادث پاسخ داشته باشند',
      'نسخه‌سازی همان چیزی است که drift detection و rollback را بعدا‌ معنا می‌کند',
    ],
    startDialog: [
      {
        title: 'داده، نیمه‌ی مدل است',
        markdown:
          'دو run با کد یکسان ولی داده‌ی متفاوت، مدل‌های متفاوت می‌سازند.\n\n```\nml data add data/train.csv\n```\n\nاین فایل را به **`train`** در **v1** تبدیل می‌کند — یک snapshotِ نام‌دار و immutable. ناحیه‌ی Datasetِ بورد حالا `train [v1]` را نشان می‌دهد.',
      },
      {
        title: 'چرا نسخه، نه «به‌روزرسانی فایل»',
        markdown:
          'در پروژه‌های واقعی دیتاست تغییر می‌کند: ردیف‌های تازه، یک fix، یک re-scrape.\n\nبدون نسخه، «کدام داده این مدل را train کرده؟» پاسخ ندارد. با نسخه، run مقدار `train@1` را به‌عنوان **lineage** ثبت می‌کند — پیوندی که می‌توان audit و بازتولید کرد.',
      },
    ],
  },
  'train-1': {
    seriesTitle: 'آموزش و ثبت',
    name: 'اجرای یک run روی یک نسخه‌ی داده',
    objective:
      'یک آزمایشِ آموزشی `exp-1` را روی دیتاستِ نسخه‌شده‌ی `train` اجرا کنید و params و metrics آن را با یک lineage از داده ثبت کنید.',
    learning: [
      'یک run یکیتِ آزمایش است: params + metrics + نسخه‌ی داده‌ای که مصرف کرده',
      'params از `-p k=v` می‌آیند (نرخ یادگیری، عمق) — همراه run می‌روند',
      'metrics (acc/loss/f1) همان چیزی‌اند که هنگام انتخاب مدلی که ship می‌کنید با هم مقایسه می‌شوند',
    ],
    fieldNotes: [
      'params را با run ثبت کنید — metric بدون config‌اش افسانه است',
      'lineage‌ی `data=train@1` همان چیزی است که در post-mortem نقل می‌کنید',
    ],
    startDialog: [
      {
        title: 'از داده تا یک run',
        markdown:
          'دیتاستِ `train` در **v1** است. حالا روی آن train کنید:\n\n```\nml train run -n exp-1 -p lr=0.1 -p depth=40\n```\n\nاین یک **run** به نام `exp-1` می‌سازد با:\n\n- `params`: lr=0.1, depth=40\n- `metrics`: acc / loss / f1\n- `data`: `train@1` (lineage)',
      },
      {
        title: 'یک run هنوز یک مدل نیست',
        markdown:
          'یک run یک **نتیجه** است، نه یک آرتیفکتِ قابل deploy. در فهرست runs می‌نشیند تا آن را در رجیستری **register** کنید.\n\nruns را مثل نتایج آزمایشگاهی و نسخه‌های رجیستری را مثل محصولِ بسته‌شده در نظر بگیرید. هر run را نگه می‌دارید، اما فقط خوب‌ها را ترفیع می‌دهید.',
      },
    ],
  },
  'register-1': {
    seriesTitle: 'آموزش و ثبت',
    name: 'ثبت یک مدل از یک run',
    objective:
      'runِ `exp-1` را به‌عنوان نسخه‌ی ۱ از یک مدلِ نام‌دار، `churn-model`، در رجیستری ترفیع دهید.',
    learning: [
      'رجیستری، کاتالوگِ مدل‌های قابل deploy است، هرکدام با نسخه‌های شماره‌دار',
      'ثبت، params و metrics و lineage‌ی داده‌ی همان run را روی نسخه‌ی مدل کپی می‌کند',
      'یک نسخه‌ی registerشده در **Staging** شروع می‌کند؛ فقط با deploy به **Production** می‌رسد',
    ],
    fieldNotes: [
      'run را register کنید که می‌خواهید مردم *آن را پیدا کنند و دوباره استفاده کنند*، نه هر runِ پیش‌نویس',
      'شماره‌ی نسخه قرارداد شماست: `churn-model:v1` برای همیشه دقیقاً همان آرتیفکت است',
    ],
    startDialog: [
      {
        title: 'ترفیع یک نتیجه به یک محصول',
        markdown:
          'runِ `exp-1` یک مدل خوب ساخته است. آن را ببندید:\n\n```\nml model register exp-1 --name churn-model\n```\n\nرجیستری حالا **`churn-model` v1** را دارد، در stage **Staging**، حاملِ metrics همان run و lineage‌ی `train@1`.',
      },
      {
        title: 'Staging در برابر Production',
        markdown:
          'register کردن **live** نمی‌شود. یک نسخه را در رجیستری می‌گذارد تا بتواند عمداً بررسی‌شده و deploy شود — deploy کلید بین این دو است.\n\n`Staging` = آماده اما سرویس‌دهنده نیست. `Production` = نسخه‌ای که یک اندپوینت واقعاً سرویس می‌کند.',
      },
    ],
  },
  'deploy-1': {
    seriesTitle: 'سرویس و حفاظت',
    name: 'deploy کردن یک مدلِ ثبت‌شده',
    objective:
      '`churn-model` ثبت‌شده را روی اندپوینت `prod` deploy کنید تا زنده باشد و سرویس بدهد.',
    learning: [
      'deploy یک نسخه‌ی رجیستری را به همان چیزی تبدیل می‌کند که یک اندپوینت زنده سرویس می‌کند',
      'نسخه‌ی deployشده در رجیستری به **Production** ترفیع می‌گیرد',
      'اگر مدلی از قبل live بوده باشد، deploy ابتدا آن را به‌عنوان **rollback target** ثبت می‌کند',
    ],
    fieldNotes: [
      'deploy یک تصمیمِ ترفیع است، نه یک `docker run` — یک نسخه نام می‌برد',
      'همیشه نسخه‌ی live‌ی قبلی را پیش از تعویض بدانید؛ همان تورباز شماست',
    ],
    startDialog: [
      {
        title: 'زنده شدن',
        markdown:
          '`churn-model` v1 در Staging ثبت شده است. آن را در برابر ترافیک بگذارید:\n\n```\nml deploy exp-1\n```\n\ndeploy مقدار `exp-1` را به `churn-model:v1` تبدیل می‌کند و اندپوینت `prod` را به آن نشانه می‌رود. اندپوینت حالا **LIVE** است و نسخه‌ی رجیستری به **Production** ترفیع شده.',
      },
      {
        title: 'تعویض همان لحظه‌ی پرخطر است',
        markdown:
          'deploy همان‌جاست که مدل‌ها می‌توانند در دنیای واقعی regression کنند. چون `ml deploy` مدلِ live‌ی قبلی را به‌عنوان rollback target ثبت می‌کند پیش از تعویض، همیشه یک نسخه‌ی شناخته‌شده‌ی درست یک قدم عقب دارید.\n\nناحیه‌ی Service را نگاه کنید: اندپوینت از `cold` به `live → churn-model:v1` می‌چرخد.',
      },
    ],
  },
  'monitor-1': {
    seriesTitle: 'سرویس و حفاظت',
    name: 'روشن کردن پایش',
    objective:
      'پایش را روی اندپوینتِ live `prod` فعال کنید تا drift و کیفیت به‌صورت مداوم زیر نظر باشند.',
    learning: [
      'پایش حلقه را می‌بندد: کار وقتی تمام نیست که مدل ship شود، وقتی تمام است که آن را زیر نظر دارید',
      'یک **آستانه‌ی drift** روی داده فعال می‌کند — امتیازی بالاتر از آستانه یک هشدارِ drift است',
      'یک اندپوینت زنده بدون پایش، مدلی است که امیدوارید هنوز خوب باشد',
    ],
    fieldNotes: [
      'آستانه‌ی drift را پیش از launch تعریف کنید، نه بعد از اولین حادثه',
      'پایش + یک rollback target با هم آن چیزی‌اند که یک ship را «ایمن» می‌کنند',
    ],
    startDialog: [
      {
        title: 'بستنِ حلقه',
        markdown:
          '`churn-model:v1` زنده است اما کور. دوربین‌ها را روشن کنید:\n\n```\nml monitor on\n```\n\nاین پایش را روی `prod` فعال می‌کند و یک **آستانه‌ی drift** روی دیتاست فعال می‌کند. حالا حلقه بسته شده: ingest → train → eval → register → deploy → **monitor**.',
      },
      {
        title: 'معنی «پایش روشن»',
        markdown:
          'با پایش روشن، اندپوینت کیفیتِ زنده را ردیابی می‌کند و دیتاست **drift** را — همان جابه‌جایی خاموشِ داده‌ی ورودی که دقت را با گذر زمان خراب می‌کند.\n\nتا ترافیک جمع نشود (`ml predict`) هشدار نخواهید دید، اما نگهبانی حالا *فعال* است.',
      },
    ],
  },
  'rollback-1': {
    seriesTitle: 'سرویس و حفاظت',
    name: 'یک ارتقا ship کنید، بعد برگردید',
    objective:
      '`prod` را به `churn-model:v2` ارتقا دهید (و rollback target را ثبت کنید)، بعد برگردید تا `prod` دوباره `churn-model:v1` را سرویس بدهد.',
    learning: [
      'یک rollback target همان مدلِ live‌ی قبلی است، ثبت‌شده در هنگام deploy',
      '`ml rollback` آن هدف را یک‌قدم برمی‌گرداند — اندپوینت هرگز سرد نمی‌شود',
      'rollback همان تمرین است که حالا می‌کنید تا ساعت ۲ بامداد آن لحظه‌ای باشد',
    ],
    fieldNotes: [
      'rollback را روی یک نسخه‌ی شناخته‌شده‌ی درست تمرین کنید پیش از آن‌که ارتقاهای پرخطر ship شوند',
      'هدفِ یک‌بارمصرف در rollback مصرف می‌شود — برای ثبت یک هدف تازه دوباره deploy کنید',
    ],
    startDialog: [
      {
        title: 'ارتقا با تورباز زیر پای شما',
        markdown:
          'شما روی `churn-model:v1` زنده هستید. یک `v2` بهتر در Staging است. ارتقا دهید — و ثابت کنید که می‌توانید برگردید:\n\n```\nml deploy churn-model:2\nml rollback\n```\n\ndeploy **`v1`** را به‌عنوان rollback target ثبت می‌کند، بعد `ml rollback` نسخه‌ی `v1` را برمی‌گرداند. اندپوینت کل این زمان زنده ماند.',
      },
      {
        title: 'چرا این یک مهارت است',
        markdown:
          'هرکس می‌تواند deploy کند. حرکتِ حرفه‌ای *ارتقا و بازگشتِ تمیز* است.\n\nچون rollback target در هنگام deploy ثبت شده، هرگز حدس نمی‌زنید نسخه‌ی قدیمی کدام است — دقیقاً همان را که سرویس می‌داده برمی‌گردانید. این همان تورباز است که کل حلقه‌ی MLOps حول آن ساخته شده.',
      },
    ],
  },
  'ship-1': {
    seriesTitle: 'Ship کنید',
    name: 'ship کردن یک مدلِ پایش‌شده و آماده‌ی rollback',
    objective:
      'یک baseline کهنه را از سر تا پا در چرخه‌ی حیات ببرید: داده تازه را نسخه کنید، train کنید، register کنید، deploy کنید و پایش کنید — به‌طوری که `prod` زنده، پایش‌شده و rollback‌پذیر بماند.',
    learning: [
      'کل حلقه را تحت یک هدف یکپارچه کنید: داده → run → رجیستری → live → پایش‌شده',
      'امضای «shipped»: داده نسخه‌شده + مدل registerشده + اندپوینت live + پایش روشن + یک rollback target وجود دارد',
      'اثرِ قابل‌مشاهده‌ی هر گام روی بورد با یک تکه از هدف هم‌خوانی دارد',
    ],
    fieldNotes: [
      'این همان هفته‌ی onboarding فشرده‌شده است: مدل وقتی تمام است که زیر نظر باشد و قابل‌برگشت باشد، نه وقتی train شود',
      'اگر می‌توانید دلیلِ نیاز بودنِ هرکدام از پنج فرمان را توضیح دهید، می‌توانید یک مدل را در تولید راه بیندازید',
    ],
    startDialog: [
      {
        title: 'کپستون',
        markdown:
          'شما یک مهندس تازه هستید. یک baseline به نام `churn-model:v1` **از قبل** روی `prod` زنده است، اما:\n\n- دیتاستِ `train` **نسخه‌نشده** است\n- کسی اینجا مدل تازه‌ای train نکرده است\n- **پایش خاموش** است\n\nکار شما: یک مدل *درست* ship کنید — داده نسخه‌شده، یک مدلِ registerشده، یک اندپوینتِ live، پایش روشن، و یک rollback target.',
      },
      {
        title: 'پنج حرکت',
        markdown:
          '```\nml data add data/train.csv          # نسخه‌سازی داده (ingest)\nml train run -n exp-1 -p lr=0.1 -p depth=40   # train روی train@1\nml model register exp-1 --name churn-model     # register v2\nml deploy exp-1                              # زنده شدن (ثبت v1 به‌عنوان rollback target)\nml monitor on                               # بستن حلقه\n```\n\nچون `v1` پیش از deploy شما live بوده، deployِ `v2` نسخه‌ی `v1` را به‌عنوان **rollback target** ثبت می‌کند — همان تورباز که هدف می‌طلبد.',
      },
      {
        title: 'معنی «shipped»',
        markdown:
          'تمام هستید وقتی **هر پنج** هم‌زمان برقرار باشند:\n\n- داده **نسخه‌شده** (`train` یک نسخه دارد)\n- یک مدل **registerشده** (`churn-model` یک نسخه دارد)\n- اندپوینت **live** (`prod` مدلی را سرویس می‌کند)\n- **پایش روشن** برای `prod`\n- یک **rollback target** در دسترس برای `prod`\n\nهمین ترکیب — خوب، زیر نظر، و قابل‌برگشت — همان چیزی است که production-grade به معنی‌اش می‌آید.',
      },
    ],
  },
  'tool-mlflow': {
    seriesTitle: 'جعبه‌ابزار',
    name: 'ثبت یک run در MLflow',
    objective:
      'یک آزمایش train را اجرا کنید و پارامترها، متریک‌ها و lineageی داده‌اش را ثبت کنید — دقیقاً همان کاری که APIِ `mlflow.log_*` از MLflow برای runهای واقعی انجام می‌دهد.',
    learning: [
      'MLflow Tracking منبعِ راستیِ runهاست: پارامتر، متریک و artifact، همه قابل‌استعلام و قابل‌مقایسه',
      '`mlflow.start_run()` + `mlflow.log_param` / `log_metric` / `log_artifact` همان شکلی است که `ml train run` اینجا شبیه‌سازی می‌کند',
      'runی که اینجا نگه می‌دارید همانی است که آنجا log می‌کردید — ایده‌ی یکسان، ابزار واقعی',
    ],
    fieldNotes: [
      'MLflow را به یک store مشترک (S3، یک دیتابیس) وصل کنید تا کل تیم runها را با هم مقایسه کند، نه screenshotها را',
      'lineageی `train@1` همان تکه‌ای است که MLflow می‌سازد تا یک متریک هرگز غیرقابل‌ردیابی نشود',
    ],
    startDialog: [
      {
        title: 'ابزار پشت «train run»',
        markdown:
          'در یک تیم واقعی، runی که همین حالا شبیه‌سازی کردید در **MLflow** زندگی می‌کند.\n\n[مستندات MLflow → https://mlflow.org/docs/latest/](https://mlflow.org/docs/latest/)\n\n```\nimport mlflow\nmlflow.start_run(name="exp-1")\nmlflow.log_param("lr", 0.1)\nmlflow.log_metric("acc", 0.907)\n```\n\nایده‌ی یکسان با `ml train run` — پارامتر، متریک و lineage به یک runِ قابل‌استعلام پیوسته.',
      },
      {
        title: 'فرمان را اجرا کنید',
        markdown:
          'آزمایشِ train را دوباره اجرا کنید. مکانیک دقیقاً مثل `train-1` است؛ نکته این است که ببینید این همان واحدی است که MLflow در تولید track می‌کند.\n\n```\nml train run -n exp-1 -p lr=0.1 -p depth=40\n```\n\nدر MLflow این یک سطر در جدول runهاست که می‌توانید فیلتر، sort و مقایسه کنید.',
      },
    ],
  },
  'tool-kfp': {
    seriesTitle: 'جعبه‌ابزار',
    name: 'مدل‌سازی pipeline در Kubeflow Pipelines',
    objective:
      'مرحله‌های train → register را به یک pipeline تبدیل کنید — همان گرافی که Kubeflow Pipelines به‌صورت کامپوننت‌های نسخه‌شده و قابل‌اجرای مجدد اجرا می‌کند.',
    learning: [
      'Kubeflow Pipelines یک تابع Python از کامپوننت‌های اتصال‌یافته را به یک DAGِ نسخه‌شده کامپایل می‌کند که روی کلاستر اجرا می‌شود',
      'هر `@component` یک مرحله است — مرحله‌های train و register شما دو گره روی یک ریلِ یکسان‌اند',
      'pipelineای که بتوانید دوباره اجرا کنید، pipelineی است که بتوانید audit کنید؛ گراف، نه یک سلولِ notebook، منبعِ راستی است',
    ],
    fieldNotes: [
      'کل چرخه‌ی حیات را به‌صورت یک pipeline مدل کنید تا یک اجرای واحدِ `kfp` داده → مدل → رجیستری را جابه‌جا کند',
      'ورودی/خروجی کامپوننت‌ها artifact هستند — lineageی `train@1` در دنیای واقعی آنجا زندگی می‌کند',
    ],
    startDialog: [
      {
        title: 'ابزار پشت ریل',
        markdown:
          'ریلِ شش‌مرحله‌ای شما یک DAG است. **Kubeflow Pipelines** همان چیزی است که این DAG را در عمل اجرا می‌کند.\n\n[مستندات Kubeflow Pipelines → https://www.kubeflow.org/docs/components/pipelines/](https://www.kubeflow.org/docs/components/pipelines/)\n\n```python\n@kfp.dsl.pipeline def pipeline():\n    train()   # یک کامپوننت\n    register(depends_on=train())  # مرحله‌ی بعد\n```\n\nریل روی بورد و این، گرافی یکسان‌اند.',
      },
      {
        title: 'روشن کردن دو مرحله',
        markdown:
          'نیمه‌ی train → register از pipeline را اجرا کنید. هدف فقط داشتن یک run روی نسخه‌ی داده و یک مدلِ registerشده است — دو مرحله پشت‌سرهم.\n\n```\nml train run -n exp-1 -p lr=0.1 -p depth=40\nml model register exp-1 --name churn-model\n```\n\nدر Kubeflow این دو کامپوننت با یک یال بین آن‌ها بود.',
      },
    ],
  },
  'tool-kserve': {
    seriesTitle: 'جعبه‌ابزار',
    name: 'سرویس یک اندپوینتِ مدل با KServe',
    objective:
      'مدلِ registerشده را به اندپوینتِ زنده‌ی `prod` deploy کنید — همان کاری که KServe انجام می‌دهد وقتی یک مدل را به یک سرویسِ autoscaling از Kserve deploy می‌کند.',
    learning: [
      'KServe یک مدل را به‌صورت یک سرویسِ Kubernetes deploy می‌کند که به‌طور خودکار scale می‌شود (تا صفر در حالت بیکاری) و یک API استانداردِ inference صحبت می‌کند',
      '`ml deploy` و یک deployِ `v1` در KServe تصمیمِ یکسانی‌اند: نشان دادن یک اندپوینتِ زنده به یک نسخه‌ی بنامِ مدل',
      'سرویس همان‌جایی است که مدل به محصول تبدیل می‌شود — اندپوینت، نه artifact، چیزی است که کاربران صدا می‌زنند',
    ],
    fieldNotes: [
      'بگذارید لایه‌ی سرویس autoscale کند و تا صفر برود — فقط برای ترافیکِ inference واقعی بپردازید',
      'اندپوینت را به یک نسخه‌ی رجیستری pin کنید تا «کدام مدل live است؟» یک جوابِ واحد داشته باشد',
    ],
    startDialog: [
      {
        title: 'ابزار پشت «deploy»',
        markdown:
          '`ml deploy exp-1` اندپوینتِ `prod` را زنده می‌کند. در یک کارگاهِ Kubernetes، **KServe** همان سیستمی است که این کار را انجام می‌دهد.\n\n[مستندات KServe → https://kserve.github.io/kserve/](https://kserve.github.io/kserve/)\n\nیک `InferenceService` از KServe یک نسخه‌ی registerشده‌ی مدل را در یک سرویسِ autoscaling با یک اندپوینتِ predict استاندارد قرار می‌دهد.',
      },
      {
        title: 'آن را زنده کنید',
        markdown:
          'مدلِ registerشده را به اندپوینت ببرید.\n\n```\nml deploy exp-1\n```\n\nاندپوینت از `cold` به `live` می‌رود و نسخه‌ی رجیستری به Production ارتقا می‌یابد — دقیقاً همان ارتقایی که یک deploy از KServe را برای ترافیک قابل‌مشاهده می‌کند.',
      },
    ],
  },
  'tool-vertex-ai': {
    seriesTitle: 'جعبه‌ابزار',
    name: 'deploy یک اندپوینتِ مدیریت‌شده روی Vertex AI',
    objective:
      'مدلِ registerشده را به یک اندپوینتِ زنده ارتقا دهید — معادلِ مدیریت‌شده از `ml deploy`، همان‌طور که Vertex AI با یک Endpoint مدیریت‌شده انجام می‌دهد.',
    learning: [
      'Vertex AI Model Registry + Endpoints مدیریت‌شده انتقالِ رجیستری → سرویس را از دستان شما می‌گیرند',
      'یک Endpoint مدیریت‌شده scale، health و API پیش‌بینی را بر عهده می‌گیرد؛ کار شما انتخابِ نسخه‌ای است که ارتقا می‌دهید',
      'نسخه‌ی `churn-model:vN → endpoint` اینجا همان ارتقایی است که یک deploy از Vertex انجام می‌دهد',
    ],
    fieldNotes: [
      'از رجیستریِ مدیریت‌شده استفاده کنید تا شماره‌ی نسخه، قرارداد بین تیم‌ها باشد، نه یک مسیر فایل',
      'موردنظر ارتقا دهید: یک Endpoint مدیریت‌شده deploy را به یک اقدامِ قابل‌بررسی تبدیل می‌کند، نه یک اسکریپت',
    ],
    startDialog: [
      {
        title: 'مسیرِ مدیریت‌شده به «deploy»',
        markdown:
          'روی GCP، **Vertex AI** یک model registry را با Endpoints مدیریت‌شده جفت می‌کند.\n\n[Vertex AI Model Registry → https://cloud.google.com/vertex-ai/docs/model-registry](https://cloud.google.com/vertex-ai/docs/model-registry)\n\nشما یک نسخه register می‌کنید و آن را به یک Endpoint مدیریت‌شده deploy می‌کنید — همان حرکتِ رجیستری → سرویس مثل `ml deploy`.',
      },
      {
        title: 'ارتقا به زنده',
        markdown:
          'مدلِ registerشده را به اندپوینت ببرید.\n\n```\nml deploy exp-1\n```\n\n`prod` روی نسخه‌ی ارتقا‌یافته زنده می‌شود. در Vertex این همان Endpoint مدیریت‌شده است که حالا `churn-model:v1` را سرویس می‌کند.',
      },
    ],
  },
  'tool-airflow': {
    seriesTitle: 'جعبه‌ابزار',
    name: 'برنامه‌ریزی مرحله‌ی ingest در Airflow',
    objective:
      'یک snapshotِ داده‌ی نسخه‌شده را طبق زمان‌بندی تولید کنید — همان کاری که یک DAG از Airflow هر سیکل برای تغذیه‌ی بقیه‌ی چرخه‌ی حیات اجرا می‌کند.',
    learning: [
      'Airflow وظایفِ داده را طبق زمان‌بندی اجرا می‌کند و یک تاریخچه‌ی وظیفه‌به‌وظیفه نگه می‌دارد — مرحله‌ی «ingest» به‌عنوان یک job پایدار، نه یک اسکریپتِ یک‌باره',
      'هر اجرای DAG یک نسخه‌ی داده‌ی تازه می‌گذارد؛ این همان قدمِ `ml data add` است که تکرارپذیر و قابل‌مشاهده شده',
      'یک scheduler «داده‌ی تازه» را به یک تضمین تبدیل می‌کند که می‌توانید به آن اعتماد کنید، تا trainingِ downstream همیشه یک نسخه‌ی واقعی را pin کند',
    ],
    fieldNotes: [
      'داده را در خودِ مرحله‌ی DAG نسخه کنید تا هر trainingِ downstream به‌صورت قابل‌تکرار روی یک snapshotِ بنام اجرا شود',
      'retry + alert از Airflow همان چیزی است که مانع می‌شود یک ingestِ خراب، داده‌ی کهنه را خاموشانه به training تغذیه کند',
    ],
    startDialog: [
      {
        title: 'ابزار پشت «data add»',
        markdown:
          'داده‌ی تازه و نسخه‌شده، طبق زمان‌بندی — همان چیزی که **Airflow** برای آن ساخته شده.\n\n[مستندات Airflow → https://airflow.apache.org/docs/](https://airflow.apache.org/docs/)\n\nیک وظیفه‌ی DAG داده‌ی تازه می‌کشد و یک نسخه می‌نویسد — مرحله‌ی `ingest` از ریل شما، که سرِ وقت و همیشه اجرا می‌شود.',
      },
      {
        title: 'تولیدِ نسخه',
        markdown:
          'ingest را اجرا کنید: دیتاست را نسخه کنید تا training چیزی برای pin کردن داشته باشد.\n\n```\nml data add data/train.csv\n```\n\nدر یک DAG واقعی همین قدم روی یک cron اجرا می‌شود و هر سیکل یک `train@N` تازه می‌گذارد.',
      },
    ],
  },
  'tool-dvc': {
    seriesTitle: 'جعبه‌ابزار',
    name: 'نسخه‌سازی داده با DVC',
    objective:
      'دیتاست را به‌عنوان یک شیءِ نسخه‌شده و content-addressed track کنید — دقیقاً همان کاری که DVC با `dvc add` و فایلِ pointerِ `.dvc` انجام می‌دهد.',
    learning: [
      'DVC بایت‌های واقعی را در storageی remote نگه می‌دارد و فقط یک pointerِ hash در Git نگه می‌دارد — `ml data add` دقیقاً همان تقسیم را شبیه‌سازی می‌کند',
      'شناسه‌ی content که می‌بینید (`train@1`) ایده‌ی یکسانی با hashِ content از DVC است: هویتی پایدار و قابل‌audit برای داده',
      'نسخه‌سازی داده مثل کد یعنی «کدام داده این مدل را train کرد؟» همیشه یک hash دارد که به آن اشاره کنید',
    ],
    fieldNotes: [
      'دیتاست‌های بزرگ را از Git بیرون و در storageی remote از DVC نگه دارید؛ فقط pointerهای hashِ کوچک را commit کنید',
      'training را به یک نسخه‌ی DVC pin کنید تا آزمایش‌ها روی هر ماشینی قابل‌تکرار باشند',
    ],
    startDialog: [
      {
        title: 'ابزار پشت نسخه‌های داده',
        markdown:
          'دیتاست‌های بزرگ که مثل کد نسخه می‌شوند؟ آن **DVC** است.\n\n[مستندات DVC → https://dvc.org/doc](https://dvc.org/doc)\n\n```\ndvc add data/train.csv   # فایل را ذخیره می‌کند، یک pointerِ hashِ .dvc در Git نگه می‌دارد\n```\n\n`ml data add` همان حرکت است: یک شیءِ بنام با نسخه‌های content.',
      },
      {
        title: 'نسخه‌سازی دیتاست',
        markdown:
          'داده را تحت کنترلِ نسخه بگذارید.\n\n```\nml data add data/train.csv\n```\n\nناحیه‌ی Dataset حالا `train [v1]` را با یک شناسه‌ی content نشان می‌دهد — همان pointer از DVC، قابل‌مشاهده.',
      },
    ],
  },
  'tool-sagemaker': {
    seriesTitle: 'جعبه‌ابزار',
    name: 'ساخت یک اندپوینتِ SageMaker',
    objective:
      'مدلِ registerشده را به یک اندپوینتِ زنده deploy کنید — نسخه‌ی AWS مدیریت‌شده از `ml deploy`، همان‌طور که `sagemaker create-endpoint` انجام می‌دهد.',
    learning: [
      'Amazon SageMaker یک مدلِ registerشده را از طریق Model Registry به یک اندپوینتِ زنده و autoscaling تبدیل می‌کند',
      '`ml deploy` و `sagemaker create-endpoint` همان ارتقا هستند: یک نسخه‌ی رجیستری به یک سرویسِ زنده و callable تبدیل می‌شود',
      'اندپوینتِ مدیریت‌شده ownerِ اینستنس‌ها و scale است؛ شما ownerِ تصمیمِ نسخه‌ای هستید که ارتقا می‌دهید',
    ],
    fieldNotes: [
      'اول register، بعد deploy — Model Registry از SageMaker همان نظمِ Staging → Production است که از قبل استفاده می‌کنید',
      'نامِ اندپوینت همان قرارداد است که فراخوان‌های شما به آن ضربه می‌زنند؛ نسخه‌ی مدل پشت آن اهرمِ شماست',
    ],
    startDialog: [
      {
        title: 'ابزار پشت «deploy» در AWS',
        markdown:
          'روی AWS، **SageMaker** مسیرِ مدیریت‌شده از رجیستری به یک اندپوینتِ زنده است.\n\n[Amazon SageMaker Model Registry → https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry.html](https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry.html)\n\n```\naws sagemaker create-endpoint --endpoint-name prod --model-name churn\n```\n\nایده‌ی یکسان با `ml deploy`: نشان دادن یک اندپوینتِ زنده به یک نسخه‌ی رجیستری.',
      },
      {
        title: 'زنده کردن',
        markdown:
          'مدلِ registerشده را deploy کنید.\n\n```\nml deploy exp-1\n```\n\n`prod` روی `churn-model:v1` زنده می‌شود — همان اندپوینتِ SageMaker که حالا این نسخه را سرویس می‌کند.',
      },
    ],
  },
  'tool-tfx': {
    seriesTitle: 'جعبه‌ابزار',
    name: 'افزودن validitation به pipeline با TFX',
    objective:
      'ترتیبِ train → register → deploy را اجرا کنید، همان‌طور که یک pipeline از TFX هر مرحله را پیش از اجازه‌ی ship شدنِ یک مدل به validitation می‌سنجد.',
    learning: [
      'TFX یک pipeline کاملِ MLOps را با هم می‌سازد — validitationِ داده، train، validitationِ مدل و publishing — به‌صورت کامپوننت‌های اتصال‌یافته',
      'مرحله‌ی `push` یک مدلِ validated را به رجیستری منتشر می‌کند؛ این همان قدمِ register با درهای اطرافش است',
      'validitation همان چیزی است که «train شد» را به «حقِ ship دارد» می‌کند — یک در روی هر مرحله، نه یک انتظار',
    ],
    fieldNotes: [
      'بگذارید schema validitation از TFX یک نسخه‌ی داده‌ی بد را قبل از آنکه به train برسد مسدود کند',
      'model validitation + مرحله‌ی `push` ارتقا را به یک تصمیمِ سیاستی تبدیل می‌کند که pipeline آن را اجبار می‌کند',
    ],
    startDialog: [
      {
        title: 'ابزار پشت «pipelineی با کنترل‌ها»',
        markdown:
          '**TFX** یک frameworkِ کامپوننت است که pipeline کاملِ validated را می‌سازد: validitationِ داده → train → validitationِ مدل → `push`.\n\n[مستندات TFX → https://www.tensorflow.org/tfx/guide](https://www.tensorflow.org/tfx/guide)\n\nکامپوننتِ `push` یک مدلِ validated را به رجیستری منتشر می‌کند — همان `ml model register` شما با درهای دور آن.',
      },
      {
        title: 'اجرای نیمه‌ی pipeline',
        markdown:
          'train → register → deploy را اجرا کنید. هدف مسیرِ کامل است: یک مدلِ validated که register و سپس زنده شود.\n\n```\nml train run -n exp-1 -p lr=0.1 -p depth=40\nml model register exp-1 --name churn-model\nml deploy exp-1\n```\n\nهر مرحله در TFX یک کامپوننت است که باید قبل از اجرای بعدی بگذرد.',
      },
    ],
  },
  'tool-mlrun': {
    seriesTitle: 'جعبه‌ابزار',
    name: 'track کردن کل حلقه در MLrun',
    objective:
      'حلقه‌ی داده → train → register → deploy را از ابتدا تا انتها بگردانید — همان داستانِ run و track که MLrun برای آن ساخته شده، با log کردنِ هر قدم به یک پروژه‌ی واحد.',
    learning: [
      'MLrun آزمایش‌ها، مدل‌ها و pipelineها را در یک پروژه‌ی واحد ثبت می‌کند که می‌توانید بررسی و بازتولید کنید',
      'گرداندنِ داده → مدل → live در یک تازگی، کلِ حلقه است که MLrun به‌عنوان تاریخچه‌ی قابل‌استعلام نگه می‌دارد',
      'وقتی هر قدم به همان پروژه log شود، lineageی یک مدل یک dashboard است، نه یک حفاریِ باستان‌شناسی',
    ],
    fieldNotes: [
      'همه‌چیز را از طریق MLrun بچرخانید تا داده، run، مدلِ registerشده و deploy یک lineageی مشترک داشته باشند',
      'یک نمایِ پروژه‌ی واحد همان چیزی است که «بازتولیدِ این مدل» را به یک کلیک تبدیل می‌کند، نه یک بازسازی',
    ],
    startDialog: [
      {
        title: 'ابزار پشت «track کردن همه‌چیز»',
        markdown:
          '**MLrun** runها، مدل‌ها و pipelineها را در یک پروژه نگه می‌دارد که می‌توانید از ابتدا تا انتها ردیابی کنید.\n\n[مستندات MLrun → https://mlrun.org/docs/](https://mlrun.org/docs/)\n\nگرداندنِ چرخه‌ی حیات شما همان چیزی است که MLrun log می‌کند — هر مرحله به‌عنوان یک artifactِ قابل‌جستجو در پروژه فرود می‌آید.',
      },
      {
        title: 'گرداندنِ حلقه',
        markdown:
          'پروژه را از داده‌ی نسخه‌نشده به یک مدلِ زنده در یک ترتیب ببرید.\n\n```\nml data add data/train.csv\nml train run -n exp-1 -p lr=0.1 -p depth=40\nml model register exp-1 --name churn-model\nml deploy exp-1\n```\n\nهر فرمان یک قدم از حلقه است که MLrun را به همان پروژه log می‌کرد.',
      },
    ],
  },
};
