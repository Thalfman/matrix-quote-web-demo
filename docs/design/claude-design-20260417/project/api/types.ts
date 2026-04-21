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
