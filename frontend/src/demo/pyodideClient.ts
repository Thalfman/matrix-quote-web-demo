import { QuoteInput, QuotePrediction } from "@/api/types";
import { DEMO_ASSETS } from "@/lib/demoMode";

const PYODIDE_VERSION = "0.26.1";
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

export type PyodideStage =
  | "script"
  | "runtime"
  | "packages"
  | "python"
  | "models"
  | "ready"
  | "error";

export type PyodideStatus = {
  stage: PyodideStage;
  message: string;
  percent?: number;
};

type StatusListener = (status: PyodideStatus) => void;

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

interface PyProxy {
  toJs: (opts?: { dict_converter?: (entries: [unknown, unknown][]) => unknown }) => unknown;
  destroy: () => void;
}

let pyodidePromise: Promise<PyodideInterface> | null = null;
const listeners = new Set<StatusListener>();
let latestStatus: PyodideStatus = { stage: "script", message: "Not started" };

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

async function bootstrap(): Promise<PyodideInterface> {
  notify({ stage: "script", message: "Fetching Pyodide runtime…", percent: 5 });
  await injectScript(PYODIDE_SCRIPT);
  if (!window.loadPyodide) throw new Error("Pyodide failed to expose loadPyodide");

  notify({ stage: "runtime", message: "Starting Python runtime…", percent: 15 });
  const pyodide = await window.loadPyodide({ indexURL: PYODIDE_INDEX_URL });

  notify({ stage: "packages", message: "Loading numpy, pandas, scikit-learn…", percent: 35 });
  await pyodide.loadPackage(["numpy", "pandas", "scikit-learn", "joblib"]);

  notify({ stage: "python", message: "Loading prediction shim…", percent: 60 });
  pyodide.FS.mkdirTree("/demo_py");
  for (const name of PY_FILES) {
    const res = await fetch(`${DEMO_ASSETS}/py/${name}`);
    if (!res.ok) throw new Error(`Could not fetch py/${name} (${res.status})`);
    pyodide.FS.writeFile(`/demo_py/${name}`, await res.text());
  }
  pyodide.runPython("import sys; sys.path.insert(0, '/demo_py')");

  notify({ stage: "models", message: "Loading 12 joblib bundles…", percent: 75 });
  pyodide.FS.mkdirTree("/models");
  for (let i = 0; i < JOBLIB_FILES.length; i += 1) {
    const fname = JOBLIB_FILES[i];
    const res = await fetch(`${DEMO_ASSETS}/models/${fname}`);
    if (!res.ok) throw new Error(`Could not fetch models/${fname} (${res.status})`);
    const buf = await res.arrayBuffer();
    pyodide.FS.writeFile(`/models/${fname}`, new Uint8Array(buf));
    notify({
      stage: "models",
      message: `Loading joblib bundles (${i + 1}/${JOBLIB_FILES.length})…`,
      percent: 75 + Math.round(((i + 1) / JOBLIB_FILES.length) * 20),
    });
  }

  // Import predict_one so it's resident and compiled on first call.
  pyodide.runPython("from predict import predict_one");

  notify({ stage: "ready", message: "Ready", percent: 100 });
  return pyodide;
}

export function ensurePyodideReady(): Promise<PyodideInterface> {
  if (!pyodidePromise) {
    pyodidePromise = bootstrap().catch((err: Error) => {
      notify({ stage: "error", message: err.message });
      pyodidePromise = null;
      throw err;
    });
  }
  return pyodidePromise;
}

export async function predictQuote(input: QuoteInput): Promise<QuotePrediction> {
  const pyodide = await ensurePyodideReady();
  const fn = pyodide.globals.get("predict_one");
  // Convert JS object → Python dict so keys/types round-trip cleanly.
  const pyInput = pyodide.toPy(input) as PyProxy;
  try {
    const pyResult = fn(pyInput) as PyProxy;
    try {
      return pyResult.toJs({
        dict_converter: Object.fromEntries as (
          entries: [unknown, unknown][],
        ) => unknown,
      }) as QuotePrediction;
    } finally {
      pyResult.destroy?.();
    }
  } finally {
    pyInput.destroy?.();
  }
}
