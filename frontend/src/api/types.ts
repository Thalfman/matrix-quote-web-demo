// Temporary hand-written types mirroring backend/app/schemas_api.py and
// core/schemas.py. Replace with `npm run gen:api` output once the backend is
// running — see package.json scripts.

export type QuoteInput = {
  project_id?: string | null;
  industry_segment: string;
  system_category: string;
  automation_level: string;
  plc_family: string;
  hmi_family: string;
  vision_type: string;
  stations_count?: number;
  robot_count?: number;
  fixture_sets?: number;
  part_types?: number;
  servo_axes?: number;
  pneumatic_devices?: number;
  safety_doors?: number;
  weldment_perimeter_ft?: number;
  fence_length_ft?: number;
  conveyor_length_ft?: number;
  product_familiarity_score?: number;
  product_rigidity?: number;
  is_product_deformable?: number;
  is_bulk_product?: number;
  bulk_rigidity_score?: number;
  has_tricky_packaging?: number;
  process_uncertainty_score?: number;
  changeover_time_min?: number;
  safety_devices_count?: number;
  custom_pct?: number;
  duplicate?: number;
  has_controls?: number;
  has_robotics?: number;
  Retrofit?: number;
  complexity_score_1_5?: number;
  vision_systems_count?: number;
  panel_count?: number;
  drive_count?: number;
  stations_robot_index?: number;
  mech_complexity_index?: number;
  controls_complexity_index?: number;
  physical_scale_index?: number;
  log_quoted_materials_cost?: number;
};

export type Confidence = "high" | "medium" | "low";

export type OpPrediction = {
  p50: number;
  p10: number;
  p90: number;
  std: number;
  rel_width: number;
  confidence: Confidence;
};

export type SalesBucketPrediction = {
  p50: number;
  p10: number;
  p90: number;
  rel_width: number;
  confidence: Confidence;
};

export type QuotePrediction = {
  ops: Record<string, OpPrediction>;
  total_p50: number;
  total_p10: number;
  total_p90: number;
  sales_buckets: Record<string, SalesBucketPrediction>;
};

export type MetricRow = {
  target: string;
  version?: string | null;
  rows?: number | null;
  mae?: number | null;
  mape?: number | null;
  r2?: number | null;
  model_path?: string | null;
};

export type MetricsSummary = {
  models_ready: boolean;
  metrics: MetricRow[];
};

export type DropdownOptions = {
  industry_segment: string[];
  system_category: string[];
  automation_level: string[];
  plc_family: string[];
  hmi_family: string[];
  vision_type: string[];
};

export type HealthResponse = {
  status: string;
  models_ready: boolean;
};

export type LoginResponse = {
  token: string;
  expires_at: string;
};

export type DriverContribution = {
  feature: string;
  contribution: number;
  value: string;
};

export type OperationDrivers = {
  operation: string;
  drivers: DriverContribution[];
  available: boolean;
  reason?: string | null;
};

export type NeighborProject = {
  project_name: string;
  year?: number | null;
  industry_segment: string;
  automation_level: string;
  stations?: number | null;
  actual_hours: number;
  similarity: number;
};

export type ExplainedQuoteResponse = {
  prediction: QuotePrediction;
  drivers?: OperationDrivers[] | null;
  neighbors?: NeighborProject[] | null;
};

export type SavedQuoteCreateBody = {
  name: string;
  project_name: string;
  client_name?: string | null;
  notes?: string | null;
  inputs: QuoteInput;
  prediction: QuotePrediction;
  quoted_hours_by_bucket?: Record<string, number> | null;
};

// Response type — created_by filled server-side from the JWT claim.
export type SavedQuote = SavedQuoteCreateBody & {
  id: string;
  created_at: string;
  created_by: string;
};

export type SavedQuoteSummary = {
  id: string;
  name: string;
  project_name: string;
  client_name: string | null;
  industry_segment: string;
  hours: number;
  range_low: number;
  range_high: number;
  created_at: string;
  created_by: string;
};

export type SavedQuoteList = {
  total: number;
  rows: SavedQuoteSummary[];
};

export type CalibrationPoint = { predicted_low: number; predicted_high: number; actual: number; inside_band: boolean };
export type TrainingRunRow = { run_id: string; trained_at: string; rows: number; overall_mape: number };
export type PerformanceHeadline = {
  overall_mape: number | null;
  within_10_pct: number | null;
  within_20_pct: number | null;
  last_trained_at: string | null;
  rows_at_train: number | null;
};
export type InsightsOverview = {
  active_quotes_30d: number;
  models_trained: number;
  models_target: number;
  overall_mape: number | null;
  calibration_within_band_pct: number | null;
  quotes_activity: [string, number][];
  latest_quotes: SavedQuoteSummary[];
  accuracy_heatmap: (number | null)[][];
  operations: string[];
  quarters: string[];
};
