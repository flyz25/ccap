import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatOptionModule } from "@angular/material/core";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSelectModule } from "@angular/material/select";

import { ChartData, DashboardOverview } from "../../core/models";
import { ApiService, DatasetQuery } from "../../core/services/api.service";
import { ChartCardComponent } from "../../shared/components/chart-card.component";
import { DataTableComponent } from "../../shared/components/data-table.component";

type Row = Record<string, unknown>;

@Component({
  selector: "ccap-zoning",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatOptionModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    ChartCardComponent,
    DataTableComponent
  ],
  template: `
    <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">Analitik Guna Tanah</h1>
        <div class="page-subtitle">Taburan guna tanah, pembangunan dan zon perancangan kawasan</div>
      </div>
      <div class="page-actions">
        <label class="filter-card">
          <span class="filter-label">Kawasan</span>
          <select class="filter-select" [(ngModel)]="query.area" (ngModelChange)="load()">
            <option value="">Semua Kawasan</option>
            <option *ngFor="let area of filters()?.filters?.areas ?? []" [value]="area">{{ area }}</option>
          </select>
        </label>
        <label class="filter-card">
          <span class="filter-label">Jenis Pembangunan</span>
          <select class="filter-select" [(ngModel)]="query.development_type" (ngModelChange)="load()">
            <option value="">Semua Jenis</option>
            <option *ngFor="let type of filters()?.filters?.development_types ?? []" [value]="type">{{ type }}</option>
          </select>
        </label>
        <label class="filter-card">
          <span class="filter-label">Guna Tanah</span>
          <select class="filter-select" [(ngModel)]="query.land_use" (ngModelChange)="load()">
            <option value="">Semua Guna Tanah</option>
            <option *ngFor="let use of filters()?.filters?.land_uses ?? []" [value]="use">{{ use }}</option>
          </select>
        </label>
        <button class="action-button" type="button">
          <mat-icon>calendar_today</mat-icon>
          10 Jun 2026
        </button>
        <button class="action-button action-button-primary" type="button">
          <mat-icon>download</mat-icon>
          Eksport
        </button>
      </div>
    </div>

    <div *ngIf="loading()" class="flex h-80 items-center justify-center">
      <mat-spinner diameter="42" />
    </div>

    <ng-container *ngIf="!loading()">
      <section class="grid grid-cols-1 gap-4 md:grid-cols-2 min-[1600px]:grid-cols-4">
        <div class="panel kpi-card">
          <span class="kpi-icon"><mat-icon>eco</mat-icon></span>
          <div><div class="metric-label">Guna Tanah Dominan</div><div class="truncate text-2xl font-extrabold text-ccap-navy">{{ dominantLandUse() || "-" }}</div><div class="text-sm font-semibold text-ccap-steel">{{ developedArea() | number: "1.0-2" }} ha</div></div>
        </div>
        <div class="panel kpi-card">
          <span class="kpi-icon kpi-icon-blue"><mat-icon>apartment</mat-icon></span>
          <div><div class="metric-label">Jenis Pembangunan Dominan</div><div class="truncate text-2xl font-extrabold text-ccap-navy">{{ dominantDevelopment() || "-" }}</div><div class="text-sm font-semibold text-ccap-steel">Berdasarkan luas kawasan</div></div>
        </div>
        <div class="panel kpi-card">
          <span class="kpi-icon kpi-icon-danger"><mat-icon>warning</mat-icon></span>
          <div><div class="metric-label">Kawasan Paling Kritikal</div><div class="truncate text-2xl font-extrabold text-ccap-navy">{{ criticalArea() || "-" }}</div><div class="text-sm font-semibold text-ccap-steel">ECC tertinggi</div></div>
        </div>
        <div class="panel kpi-card">
          <span class="kpi-icon kpi-icon-teal"><mat-icon>map</mat-icon></span>
          <div><div class="metric-label">Luas Kawasan Dibangunkan</div><div class="metric-value">{{ developedArea() | number: "1.0-2" }}</div><div class="text-sm font-semibold text-ccap-steel">hektar</div></div>
        </div>
      </section>
      <section class="grid grid-cols-1 gap-5 xl:grid-cols-2 min-[1800px]:grid-cols-3">
        <ccap-chart-card title="Agihan Guna Tanah (Luas Hektar)" [data]="landUseDistribution()" mode="pie" [height]="380" />
        <ccap-chart-card title="Agihan Jenis Pembangunan (Luas Hektar)" [data]="heightDistribution()" mode="bar" [height]="380" />
        <ccap-chart-card title="Perbandingan Zon (Luas Hektar)" [data]="zoningComparison()" mode="bar" [height]="380" />
      </section>
      <section class="panel p-4">
        <h2 class="section-title mb-4 !text-base">Ringkasan Analitik Guna Tanah</h2>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3 min-[1800px]:grid-cols-6">
          <div class="rounded-md bg-green-50 p-4"><div class="metric-label">Guna Tanah Dominan</div><div class="font-extrabold text-ccap-navy">{{ dominantLandUse() }}</div></div>
          <div class="rounded-md bg-blue-50 p-4"><div class="metric-label">Pembangunan Dominan</div><div class="font-extrabold text-ccap-navy">{{ dominantDevelopment() }}</div></div>
          <div class="rounded-md bg-amber-50 p-4"><div class="metric-label">Purata ECC</div><div class="font-extrabold text-ccap-navy">{{ averageEcc() | number: "1.0-2" }}</div></div>
          <div class="rounded-md bg-red-50 p-4"><div class="metric-label">Kawasan Paling Kritikal</div><div class="font-extrabold text-ccap-navy">{{ criticalArea() }}</div></div>
          <div class="rounded-md bg-emerald-50 p-4"><div class="metric-label">Kawasan Terbesar</div><div class="font-extrabold text-ccap-navy">{{ largestArea() }}</div></div>
          <div class="rounded-md bg-purple-50 p-4"><div class="metric-label">Pembangunan Tinggi</div><div class="font-extrabold text-ccap-navy">{{ highDevelopmentArea() }}</div></div>
        </div>
      </section>
      <ccap-data-table
        title="Data Guna Tanah"
        [rows]="rows()"
        [preferredColumns]="['area', 'ketinggian_tanah', 'guna_tanah', 'keluasan_kawasan_ha', 'pcc', 'rcc', 'ecc']"
      />
    </ng-container>
    </div>
  `
})
export class ZoningComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly filters = signal<DashboardOverview | null>(null);
  readonly loading = signal(false);
  readonly rows = signal<Row[]>([]);
  readonly heightDistribution = signal<ChartData>({ labels: [], series: [] });
  readonly landUseDistribution = signal<ChartData>({ labels: [], series: [] });
  readonly zoningComparison = signal<ChartData>({ labels: [], series: [] });
  readonly areaComparison = signal<ChartData>({ labels: [], series: [] });
  readonly dominantLandUse = signal("");
  readonly dominantDevelopment = signal("");
  readonly criticalArea = signal("");
  readonly developedArea = signal(0);
  readonly averageEcc = signal(0);
  readonly largestArea = signal("");
  readonly highDevelopmentArea = signal("");
  readonly query: DatasetQuery = { area: "", development_type: "", land_use: "" };

  ngOnInit(): void {
    this.api.dashboard().subscribe((data) => this.filters.set(data));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.dataset("zoning", { ...this.query, page_size: 500 }).subscribe({
      next: (response) => {
        this.rows.set(response.items);
        this.buildCharts(response.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private buildCharts(rows: Row[]): void {
    this.heightDistribution.set(this.sumChart(rows, "ketinggian_tanah", "keluasan_kawasan_ha", "Luas (ha)"));
    this.landUseDistribution.set(this.sumChart(rows, "guna_tanah", "keluasan_kawasan_ha", "Luas (ha)"));
    this.areaComparison.set(this.sumChart(rows, "area", "ecc", "Jumlah ECC"));
    this.zoningComparison.set(this.multiAverageChart(rows, "guna_tanah", ["pcc", "rcc", "ecc"]));
    this.dominantLandUse.set(this.topBy(rows, "guna_tanah", "keluasan_kawasan_ha"));
    this.dominantDevelopment.set(this.topBy(rows, "ketinggian_tanah", "keluasan_kawasan_ha"));
    this.criticalArea.set(this.topBy(rows, "area", "ecc"));
    this.developedArea.set(Number(this.sum(rows, "keluasan_kawasan_ha").toFixed(2)));
    this.averageEcc.set(this.average(rows, "ecc"));
    this.largestArea.set(this.topBy(rows, "area", "keluasan_kawasan_ha"));
    this.highDevelopmentArea.set(this.topBy(rows, "area", "pcc"));
  }

  private sumChart(rows: Row[], labelKey: string, valueKey: string, name: string): ChartData {
    const totals = new Map<string, number>();
    for (const row of rows) {
      const label = String(row[labelKey] ?? "-");
      totals.set(label, (totals.get(label) ?? 0) + this.num(row[valueKey]));
    }
    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
    return { labels: sorted.map(([label]) => label), series: [{ name, data: sorted.map(([, value]) => Number(value.toFixed(2))) }] };
  }

  private multiAverageChart(rows: Row[], labelKey: string, keys: string[]): ChartData {
    const labels = [...new Set(rows.map((row) => String(row[labelKey] ?? "-")))].slice(0, 12);
    return {
      labels,
      series: keys.map((key) => ({
        name: key.toUpperCase(),
        data: labels.map((label) => {
          const matching = rows.filter((row) => String(row[labelKey] ?? "-") === label);
          const total = matching.reduce((sum, row) => sum + this.num(row[key]), 0);
          return matching.length ? Number((total / matching.length).toFixed(2)) : 0;
        })
      }))
    };
  }

  private topBy(rows: Row[], labelKey: string, valueKey: string): string {
    const totals = new Map<string, number>();
    for (const row of rows) {
      const label = String(row[labelKey] ?? "-");
      totals.set(label, (totals.get(label) ?? 0) + this.num(row[valueKey]));
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  }

  private sum(rows: Row[], key: string): number {
    return rows.reduce((total, row) => total + this.num(row[key]), 0);
  }

  private average(rows: Row[], key: string): number {
    if (rows.length === 0) {
      return 0;
    }
    return Number((this.sum(rows, key) / rows.length).toFixed(2));
  }

  private num(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
