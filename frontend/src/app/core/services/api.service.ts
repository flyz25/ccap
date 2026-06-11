import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";

import { environment } from "../../../environments/environment";
import { DashboardOverview, ImportBatch, MapLayer, PaginatedResponse } from "../models";

export interface DatasetQuery {
  page?: number;
  page_size?: number;
  area?: string | null;
  development_type?: string | null;
  land_use?: string | null;
}

@Injectable({ providedIn: "root" })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  dashboard(query: DatasetQuery = {}): Observable<DashboardOverview> {
    return this.http.get<DashboardOverview>(`${this.baseUrl}/dashboard`, { params: this.params(query) });
  }

  dataset<T = Record<string, unknown>>(name: string, query: DatasetQuery = {}): Observable<PaginatedResponse<T>> {
    return this.http.get<PaginatedResponse<T>>(`${this.baseUrl}/${name}`, { params: this.params(query) });
  }

  layers(): Observable<MapLayer[]> {
    return this.http.get<MapLayer[]>(`${this.baseUrl}/map/layers`);
  }

  points(dataset = "ecc_spk_map"): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.baseUrl}/map/points`, {
      params: this.params({ dataset })
    });
  }

  importHistory(): Observable<ImportBatch[]> {
    return this.http.get<ImportBatch[]>(`${this.baseUrl}/upload/history`);
  }

  uploadExcel(file: File): Observable<ImportBatch> {
    const data = new FormData();
    data.append("file", file);
    return this.http.post<ImportBatch>(`${this.baseUrl}/upload/excel`, data);
  }

  private params(query: object): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
      if (value !== undefined && value !== null && value !== "") {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}
