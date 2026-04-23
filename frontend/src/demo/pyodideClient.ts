/** Manages the Pyodide runtime and lazy-loads one or both model bundles (Dataset "real" | "synthetic") on demand, caching each after first load. */
import { QuoteInput, QuotePrediction } from "@/api/types";
import { DEMO_ASSETS } from "@/lib/demoMode";

const PYODIDE_VERSION = "0.27.1";
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const PYODIDE_SCRIPT = `${PYODIDE_INDEX_URL}pyodide.js`;

const JOBLIB_FILES = [
  "me10_actual_hours_v1.joblib",
  "me15_actual_hours_v1.joblib",
  "me230_actual_hours_v1.joblib",
  "ee20_actual_hours_v1.joblib",
  "rb30_actual_hours_v1.joblib",
  "cp50_actual_hours_v1.joblib",
  "bld100_actual_hours_v1.joblib",
  "shp150_actual_hours_v1.joblib",
  "inst160_actual_hours_v1.joblib",
  "trv180_actual_hours_v1.joblib",
  "doc190_actual_hours_v1.joblib",
  "pm200_actual_hours_v1.joblib",
];

const PY_FILES = ["config.py", "features.py", "models.py", "predict.py"];

// ---------------------------------------------------------------------------
// Stage types
// ---------------------------------------------------------------------------

export type Dataset = "real" | "synthetic";

export type PyodideStage =
  | "script"
  | "runtime"
  | "packages"
  | "python"
  | "models_real"
  | "models_synthetic"
  | "ready"
  | "error";

export type PyodideStatus = {
  stage: PyodideStage;
  message: string;
  percent?: number;
};

type StatusListener = (status: PyodideStatus) => void;

// ---------------------------------------------------------------------------
// Pyodide interface
// ---------------------------------------------------------------------------

interface PyodideInterface {
  loadPackage: (packages: string[]) => Promise<unknown>;
  runPython: (code: string) => unknown;
  runPythonAsync: (code: string) => Promise<unknown>;
  FS: {
    mkdirTree: (path: string) => void;
    writeFile: (path: string, data: Uint8Array | string) => void;
  };
  toPy: (obj: unknown) => unknown;
  globals: {
    get: (name: string) => PyCallable;
    set: (name: string, value: unknown) => void;
  };
}

interface PyCallable {
  (...args: unknown[]): unknown;
  toJs?: (opts?: { dict_converter?: (entries: [unknown, unknown][]) => unknown }) => unknown;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let pyodidePromise: Promise<PyodideInterface> | null = null;
const listeners = new Set<StatusListener>();
let latestStatus: PyodideStatus = { stage: "script", message: "Not started" };

// Per-dataset model loading promises - null means not yet started.
const modelPromises: Record<Dataset, Promise<void> | null> = {
  real: null,
  synthetic: null,
};

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------

function notify(s: PyodideStatus) {
  latestStatus = s;
  for (const fn of listeners) fn(s);
}

export function getStatus(): PyodideStatus {
  return latestStatus;
}

export function subscribe(fn: StatusListener): () => void {
  listeners.add(fn);
  fn(latestStatus);
  return () => listeners.delete(fn);
}

// ---------------------------------------------------------------------------
// Script injection
// ---------------------------------------------------------------------------

async function injectScript(src: string): Promise<void> {
  if (document.querySelector(`script[data-src="${src}"]`)) return;
  await new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.dataset.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(el);
  });
}

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideInterface>;
  }
}

// ---------------------------------------------------------------------------
// Inline Python runtime - injected once after packages are ready.
// Pipeline step names from core/models.py:
//   "preprocess" -> ColumnTransformer
//   "model"      -> GradientBoostingRegressor (p50)
// Bundle dict keys: "pipeline", "q10", "q90"
// ---------------------------------------------------------------------------

const PYODIDE_RUNTIME = `
import joblib, json, io
import pandas as pd
from urllib.request import urlopen

# Two parallel stores: LOADED["real"] and LOADED["synthetic"]
LOADED = {"real": {}, "synthetic": {}}
IMPORTANCES_CACHE = {}

def load_bundle(dataset, urls):
    """Fetch and cache all joblib bundles for the given dataset."""
    if LOADED[dataset]:
        return  # already loaded - no-op
    for tgt, url in urls.items():
        with urlopen(url) as resp:
            data = resp.read()
        LOADED[dataset][tgt] = joblib.load(io.BytesIO(data))

def predict_dataset(dataset, input_json):
    """
    Run prediction against a specific dataset's cached bundles.
    Raises KeyError if that dataset has not been loaded yet.
    Returns JSON string matching the QuotePrediction shape.
    """
    if not LOADED[dataset]:
        raise RuntimeError(f"Models for dataset '{dataset}' have not been loaded. Call load_bundle first.")

    from config import SALES_BUCKETS, SALES_BUCKET_MAP
    from features import prepare_quote_features

    payload = json.loads(input_json)
    df = prepare_quote_features(pd.DataFrame([payload]))

    def _confidence(p10, p50, p90):
        eps = 1e-6
        rel_width = (p90 - p10) / max(abs(p50), eps)
        label = "high" if rel_width < 0.3 else ("medium" if rel_width < 0.6 else "low")
        return float(rel_width), label

    ops = {}
    buckets = {b: {"p10": 0.0, "p50": 0.0, "p90": 0.0} for b in SALES_BUCKETS}
    t50 = t10 = t90 = 0.0

    for target, bundle in LOADED[dataset].items():
        # Bundle shape from core/models.py: {"pipeline": pipe, "q10": gbr_q10, "q90": gbr_q90}
        # Pipeline steps: "preprocess" (ColumnTransformer) and "model" (GBR)
        pipe = bundle["pipeline"]
        pre = pipe.named_steps["preprocess"]
        X_proc = pre.transform(df)
        p50 = float(pipe.named_steps["model"].predict(X_proc)[0])
        p10 = float(bundle["q10"].predict(X_proc)[0])
        p90 = float(bundle["q90"].predict(X_proc)[0])
        std = float((p90 - p10) / 2.56)
        rel_width, conf = _confidence(p10, p50, p90)

        op = target.replace("_actual_hours", "")
        ops[op] = {"p50": p50, "p10": p10, "p90": p90, "std": std,
                   "rel_width": rel_width, "confidence": conf}

        b = SALES_BUCKET_MAP.get(op)
        if b in buckets:
            buckets[b]["p10"] += p10
            buckets[b]["p50"] += p50
            buckets[b]["p90"] += p90
        t50 += p50
        t10 += p10
        t90 += p90

    sales_buckets = {}
    for b, totals in buckets.items():
        p10, p50, p90 = totals["p10"], totals["p50"], totals["p90"]
        rel_width, conf = _confidence(p10, p50, p90)
        sales_buckets[b] = {"p10": p10, "p50": p50, "p90": p90,
                            "rel_width": rel_width, "confidence": conf}

    return json.dumps({
        "ops": ops,
        "total_p50": t50,
        "total_p10": t10,
        "total_p90": t90,
        "sales_buckets": sales_buckets,
    })

def collect_importances(dataset):
    """
    Return top-5 feature importances per target for the given dataset.
    Result shape: {targetName: [[featureName, importance], ...]}
    Cached after first call.
    """
    if dataset in IMPORTANCES_CACHE:
        return json.dumps(IMPORTANCES_CACHE[dataset])
    if not LOADED[dataset]:
        raise RuntimeError(f"Models for dataset '{dataset}' have not been loaded.")

    out = {}
    for tgt, bundle in LOADED[dataset].items():
        # Pipeline steps: "preprocess" (ColumnTransformer) and "model" (GBR p50)
        pipe = bundle["pipeline"]
        pre = pipe.named_steps.get("preprocess")
        gbr = pipe.named_steps.get("model")
        if pre is None or gbr is None:
            continue
        try:
            names = list(pre.get_feature_names_out())
            imps = list(gbr.feature_importances_)
            paired = sorted(zip(names, imps), key=lambda p: -p[1])[:5]
            out[tgt] = [[n, float(v)] for n, v in paired]
        except Exception:
            pass  # skip targets where feature names are unavailable

    IMPORTANCES_CACHE[dataset] = out
    return json.dumps(out)
`;

// ---------------------------------------------------------------------------
// Bootstrap - Pyodide runtime + packages + Python shim
// ---------------------------------------------------------------------------

async function bootstrap(): Promise<PyodideInterface> {
  notify({ stage: "script", message: "Warming up the engine…", percent: 5 });
  await injectScript(PYODIDE_SCRIPT);
  if (!window.loadPyodide) throw new Error("Pyodide failed to expose loadPyodide");

  notify({ stage: "runtime", message: "Starting Python runtime…", percent: 15 });
  const pyodide = await window.loadPyodide({ indexURL: PYODIDE_INDEX_URL });

  notify({ stage: "packages", message: "Loading prediction libraries…", percent: 35 });
  await pyodide.loadPackage(["numpy", "pandas", "scikit-learn", "joblib"]);

  notify({ stage: "python", message: "Loading prediction shim…", percent: 60 });
  pyodide.FS.mkdirTree("/demo_py");
  for (const name of PY_FILES) {
    const res = await fetch(`${DEMO_ASSETS}/py/${name}`);
    if (!res.ok) throw new Error(`Could not fetch py/${name} (${res.status})`);
    pyodide.FS.writeFile(`/demo_py/${name}`, await res.text());
  }
  pyodide.runPython("import sys; sys.path.insert(0, '/demo_py')");

  // Install the inline multi-dataset Python runtime.
  await pyodide.runPythonAsync(PYODIDE_RUNTIME);

  // Emit a neutral "python-ready" state. Actual model load stages fire from
  // ensureModelsReady() so the UI shows progress per dataset.
  notify({ stage: "python", message: "Python runtime ready; awaiting model load", percent: 65 });

  return pyodide;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function ensurePyodideReady(): Promise<void> {
  if (!pyodidePromise) {
    pyodidePromise = bootstrap().catch((err: Error) => {
      notify({ stage: "error", message: err.message });
      pyodidePromise = null;
      throw err;
    });
  }
  return pyodidePromise.then(() => undefined);
}

/**
 * Lazy-load the models for a specific dataset. Second call is a no-op.
 * Emits stage progress events while fetching.
 */
export function ensureModelsReady(dataset: Dataset): Promise<void> {
  if (modelPromises[dataset]) return modelPromises[dataset]!;

  const stage: PyodideStage =
    dataset === "real" ? "models_real" : "models_synthetic";
  const label =
    dataset === "real" ? "Loading real-data models" : "Loading synthetic-data models";

  modelPromises[dataset] = (async () => {
    const pyodide = await (pyodidePromise as Promise<PyodideInterface>);

    const basePercent = dataset === "real" ? 67 : 84;

    notify({ stage, message: `${label}…`, percent: basePercent });

    // Build URL map for Python: target -> absolute URL
    const urlMap: Record<string, string> = {};
    for (const fname of JOBLIB_FILES) {
      const target = fname.replace("_v1.joblib", "");
      urlMap[target] = `${window.location.origin}${DEMO_ASSETS}/models_${dataset}/${fname}`;
    }

    // Pass urls as a Python dict literal via JSON → eval in Python.
    const urlMapJson = JSON.stringify(urlMap);
    const totalFiles = JOBLIB_FILES.length;

    // Fetch files one-by-one via TS for progress reporting, then pass buffers
    // to Pyodide FS and call load_bundle with file:// paths.
    const dirPath = `/models_${dataset}`;
    pyodide.FS.mkdirTree(dirPath);

    for (let i = 0; i < JOBLIB_FILES.length; i++) {
      const fname = JOBLIB_FILES[i];
      const url = `${DEMO_ASSETS}/models_${dataset}/${fname}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Could not fetch ${url} (${res.status})`);
      const buf = await res.arrayBuffer();
      pyodide.FS.writeFile(`${dirPath}/${fname}`, new Uint8Array(buf));
      notify({
        stage,
        message: `${label} (${i + 1}/${totalFiles})…`,
        percent: basePercent + Math.round(((i + 1) / totalFiles) * 15),
      });
    }

    // Build a file-path map and call load_bundle in Python.
    const fileUrlMap: Record<string, string> = {};
    for (const fname of JOBLIB_FILES) {
      const target = fname.replace("_v1.joblib", "");
      fileUrlMap[target] = `file://${dirPath}/${fname}`;
    }
    void urlMapJson; // suppress unused warning

    // Use Pyodide's FS-backed paths rather than HTTP - joblib reads from the
    // virtual FS we just populated.
    await pyodide.runPythonAsync(`
import joblib, io
_ds = "${dataset}"
_dir = "${dirPath}"
_files = ${JSON.stringify(Object.fromEntries(JOBLIB_FILES.map(f => [f.replace("_v1.joblib", ""), f])))}
for _tgt, _fname in _files.items():
    LOADED[_ds][_tgt] = joblib.load(f"{_dir}/{_fname}")
`);

    notify({ stage, message: `${label}: done`, percent: basePercent + 16 });
    notify({ stage: "ready", message: "Ready", percent: 100 });
  })().catch((err: Error) => {
    modelPromises[dataset] = null;
    notify({ stage: "error", message: err.message });
    throw err;
  });

  return modelPromises[dataset]!;
}

/**
 * Predict against a specific dataset's models.
 * Throws if that dataset's models have not been loaded yet.
 */
export async function predictQuote(
  input: QuoteInput,
  dataset: Dataset = "synthetic",
): Promise<QuotePrediction> {
  await ensurePyodideReady();
  const pyodide = await (pyodidePromise as Promise<PyodideInterface>);

  if (!modelPromises[dataset]) {
    throw new Error(
      `predictQuote called for '${dataset}' dataset before ensureModelsReady('${dataset}').`,
    );
  }
  await modelPromises[dataset];

  const fn = pyodide.globals.get("predict_dataset");
  const result = fn(dataset, JSON.stringify(input)) as string;
  return JSON.parse(result) as QuotePrediction;
}

/**
 * Returns top-5 feature importances per target for the given dataset.
 * Shape: { targetName: [[featureName, importance], ...] }
 * Cached after first call.
 */
export async function getFeatureImportances(
  dataset: Dataset,
): Promise<Record<string, Array<[string, number]>>> {
  await ensurePyodideReady();
  const pyodide = await (pyodidePromise as Promise<PyodideInterface>);

  if (!modelPromises[dataset]) {
    throw new Error(
      `getFeatureImportances called for '${dataset}' dataset before ensureModelsReady('${dataset}').`,
    );
  }
  await modelPromises[dataset];

  const fn = pyodide.globals.get("collect_importances");
  const result = fn(dataset) as string;
  return JSON.parse(result) as Record<string, Array<[string, number]>>;
}
