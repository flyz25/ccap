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

export interface MapLayer {
  id: string;
  label: string;
  type: string;
  enabled: boolean;
}
