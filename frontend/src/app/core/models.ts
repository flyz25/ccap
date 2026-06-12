export interface Role {
  id: number;
  name: string;
  description?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  roles: Role[];
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface KpiCard {
  label: string;
  value: number;
  unit?: string;
  trend?: string;
}

export interface ChartSeries {
  name: string;
  data: Array<number | null>;
}

export interface ChartData {
  labels: string[];
  series: ChartSeries[];
}

export interface DatasetFilters {
  areas: string[];
  development_types: string[];
  land_uses: string[];
  height_classes: string[];
}

export interface DashboardOverview {
  kpis: KpiCard[];
  filters: DatasetFilters;
  population_trend: ChartData;
  capacity_comparison: ChartData;
  ecc_distribution: ChartData;
  area_ranking: ChartData;
}

export interface PageMeta {
  page: number;
  page_size: number;
  total: number;
}

export interface PaginatedResponse<T = Record<string, unknown>> {
  meta: PageMeta;
  items: T[];
}

export interface ImportBatch {
  id: number;
  source_file: string;
  status: string;
  started_at: string;
  finished_at?: string | null;
  message?: string | null;
  total_rows: number;
  inserted_rows: number;
  updated_rows: number;
  duplicate_rows: number;
  sheet_summaries?: Record<string, unknown>;
}

export interface CapacityMethodology {
  id: number;
  code: string;
  name: string;
  formula_version: string;
  formula: Record<string, unknown>;
  notes?: string | null;
  is_active: boolean;
}

export interface CapacityFactor {
  id: number;
  methodology_id: number;
  dataset_scope: string;
  area: string;
  correction_factor: number;
  management_capability: number;
  source: string;
  notes?: string | null;
  is_active: boolean;
}

export interface CapacityRun {
  id: number;
  methodology_id: number;
  import_batch_id?: number | null;
  status: string;
  triggered_by: string;
  started_at: string;
  finished_at?: string | null;
  total_rows: number;
  passed_rows: number;
  warning_rows: number;
  failed_rows: number;
  missing_factor_rows: number;
  missing_input_rows: number;
  message?: string | null;
}

export interface CapacityAuditResult {
  id: number;
  run_id: number;
  dataset_scope: string;
  source_table: string;
  source_id: number;
  source_row?: number | null;
  record_area?: string | null;
  record_kawasan_kajian?: string | null;
  stored_pcc?: number | null;
  stored_rcc?: number | null;
  stored_ecc?: number | null;
  calculated_pcc?: number | null;
  calculated_rcc?: number | null;
  calculated_ecc?: number | null;
  correction_factor?: number | null;
  management_capability?: number | null;
  pcc_delta?: number | null;
  rcc_delta?: number | null;
  ecc_delta?: number | null;
  status: string;
  issue_code?: string | null;
}

export interface CapacityRunSummary {
  run: CapacityRun;
  by_dataset: Array<Record<string, unknown>>;
  by_area: Array<Record<string, unknown>>;
}

export interface MapLayer {
  id: string;
  label: string;
  type: string;
  enabled: boolean;
}
