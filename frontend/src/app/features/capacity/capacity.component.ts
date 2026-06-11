import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatOptionModule } from "@angular/material/core";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSelectModule } from "@angular/material/select";
import { forkJoin } from "rxjs";

import { ChartData, DashboardOverview } from "../../core/models";
import { ApiService, DatasetQuery } from "../../core/services/api.service";
import { ChartCardComponent } from "../../shared/components/chart-card.component";
import { DataTableComponent } from "../../shared/components/data-table.component";

type Row = Record<string, unknown>;

@Component({
  selector: "ccap-capacity",
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
        <h1 class="page-title">Analitik Kapasiti</h1>
        <div class="page-subtitle">Perbandingan PCC, RCC, ECC dan kapasiti optimum kawasan</div>
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
          Set Data
        </button>
        <button class="action-button !px-4" type="button" (click)="load()" aria-label="Muat semula">
          <mat-icon>refresh</mat-icon>
        </button>
      </div>
    </div>

    <div *ngIf="loading()" class="flex h-80 items-center justify-center">
      <mat-spinner diameter="42" />
    </div>

    <ng-container *ngIf="!loading()">
      <section class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 min-[1800px]:grid-cols-5">
        <div class="panel kpi-card">
          <span class="kpi-icon kpi-icon-blue"><mat-icon>groups</mat-icon></span>
          <div><div class="metric-label">Purata PCC</div><div class="metric-value">{{ summary().avgPcc | number: "1.0-2" }}</div><div class="text-sm font-semibold text-ccap-steel">indeks kapasiti</div></div>
        </div>
        <div class="panel kpi-card">
          <span class="kpi-icon kpi-icon-teal"><mat-icon>eco</mat-icon></span>
          <div><div class="metric-label">Purata RCC</div><div class="metric-value">{{ summary().avgRcc | number: "1.0-2" }}</div><div class="text-sm font-semibold text-ccap-steel">indeks kapasiti</div></div>
        </div>
        <div class="panel kpi-card">
          <span class="kpi-icon kpi-icon-amber"><mat-icon>spa</mat-icon></span>
          <div><div class="metric-label">Purata ECC Semasa</div><div class="metric-value">{{ summary().avgEcc | number: "1.0-2" }}</div><div class="text-sm font-semibold text-ccap-steel">indeks kapasiti</div></div>
        </div>
        <div class="panel kpi-card">
          <span class="kpi-icon kpi-icon-purple"><mat-icon>gps_fixed</mat-icon></span>
          <div><div class="metric-label">Purata ECC Optimum</div><div class="metric-value">{{ summary().avgOptimum | number: "1.0-2" }}</div><div class="text-sm font-semibold text-ccap-steel">indeks kapasiti</div></div>
        </div>
        <div class="panel kpi-card">
          <span class="kpi-icon kpi-icon-danger"><mat-icon>warning</mat-icon></span>
          <div><div class="metric-label">Kawasan Kritikal</div><div class="metric-value">{{ summary().criticalAreas }}</div><div class="text-sm font-semibold text-ccap-steel">kawasan</div></div>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(340px,3fr)]">
        <ccap-chart-card title="ECC Semasa vs ECC Optimum" caption="Indeks Kapasiti" [data]="currentVsOptimum()" mode="bar" [height]="360" />
        <aside class="panel p-5">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="section-title">Ringkasan Kapasiti</h2>
            <span class="status-badge status-critical">Kritikal</span>
          </div>
          <div class="text-xs font-bold uppercase text-ccap-steel">Kawasan Dipilih</div>
          <div class="mt-1 text-xl font-extrabold text-ccap-navy">{{ summary().selectedArea }}</div>
          <div class="mt-5 grid grid-cols-2 gap-3">
            <div class="rounded-md border border-ccap-line bg-ccap-mist p-3"><div class="metric-label">PCC</div><div class="text-2xl font-extrabold text-ccap-navy">{{ summary().selectedPcc | number: "1.0-2" }}</div></div>
            <div class="rounded-md border border-ccap-line bg-ccap-mist p-3"><div class="metric-label">RCC</div><div class="text-2xl font-extrabold text-ccap-navy">{{ summary().selectedRcc | number: "1.0-2" }}</div></div>
            <div class="rounded-md border border-ccap-line bg-ccap-mist p-3"><div class="metric-label">ECC Semasa</div><div class="text-2xl font-extrabold text-ccap-critical">{{ summary().selectedEcc | number: "1.0-2" }}</div></div>
            <div class="rounded-md border border-ccap-line bg-ccap-mist p-3"><div class="metric-label">ECC Optimum</div><div class="text-2xl font-extrabold text-ccap-blue">{{ summary().selectedOptimum | number: "1.0-2" }}</div></div>
          </div>
          <div class="mt-5">
            <div class="mb-3 text-sm font-extrabold text-ccap-navy">Tahap Kapasiti Mampu Dukung</div>
            <div class="relative h-3 rounded-full bg-gradient-to-r from-[#D32F2F] via-[#FBC02D] to-[#4CAF50]">
              <div class="absolute -top-2 h-7 w-1 rounded bg-ccap-critical" [style.left.%]="summary().capacityLevel"></div>
            </div>
            <div class="mt-3 flex justify-between text-xs font-semibold text-ccap-steel">
              <span>Rendah</span><span>Sederhana</span><span>Kritikal</span><span>Optimum</span>
            </div>
          </div>
          <div class="mt-6 rounded-md border border-red-200 bg-red-50 p-4">
            <div class="flex gap-3">
              <mat-icon class="text-ccap-critical">error</mat-icon>
              <div class="text-sm font-semibold leading-6 text-ccap-steel">
                Kapasiti mampu dukung kawasan ini menghampiri tahap tepu. Sebarang pembangunan baharu perlu dinilai dengan lebih terperinci dan dikawal dengan ketat.
              </div>
            </div>
          </div>
        </aside>
      </section>
      <section class="grid grid-cols-1 gap-5 xl:grid-cols-2 min-[1800px]:grid-cols-3">
        <ccap-chart-card title="Analisis PCC" [data]="pcc()" mode="bar" />
        <ccap-chart-card title="Analisis RCC" [data]="rcc()" mode="bar" />
        <ccap-chart-card title="Analisis ECC" [data]="ecc()" mode="bar" />
      </section>
      <ccap-data-table
        title="Data ECC SPK"
        [rows]="rows()"
        [preferredColumns]="['area', 'jenis_pembangunan', 'ketinggian_tanah', 'guna_tanah', 'pcc', 'rcc', 'ecc', 'bil_penduduk']"
      />
    </ng-container>
    </div>
  `
})
export class CapacityComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly filters = signal<DashboardOverview | null>(null);
  readonly loading = signal(false);
  readonly rows = signal<Row[]>([]);
  readonly pcc = signal<ChartData>({ labels: [], series: [] });
  readonly rcc = signal<ChartData>({ labels: [], series: [] });
  readonly ecc = signal<ChartData>({ labels: [], series: [] });
  readonly currentVsOptimum = signal<ChartData>({ labels: [], series: [] });
  readonly areaRanking = signal<ChartData>({ labels: [], series: [] });
  readonly summary = signal({
    avgPcc: 0,
    avgRcc: 0,
    avgEcc: 0,
    avgOptimum: 0,
    criticalAreas: 0,
    selectedArea: "-",
    selectedPcc: 0,
    selectedRcc: 0,
    selectedEcc: 0,
    selectedOptimum: 0,
    capacityLevel: 0
  });

  readonly query: DatasetQuery = { area: "", development_type: "", land_use: "" };

  ngOnInit(): void {
    this.api.dashboard().subscribe((data) => this.filters.set(data));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      ecc: this.api.dataset("ecc", { ...this.query, page_size: 500 }),
      optimum: this.api.dataset("optimum", { area: this.query.area, land_use: this.query.land_use, page_size: 500 })
    }).subscribe({
      next: ({ ecc, optimum }) => {
        this.rows.set(ecc.items);
        this.buildCharts(ecc.items, optimum.items);
        this.buildSummary(ecc.items, optimum.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private buildCharts(rows: Row[], optimumRows: Row[]): void {
    this.pcc.set(this.averageChart(rows, "guna_tanah", "pcc", "Purata PCC"));
    this.rcc.set(this.averageChart(rows, "guna_tanah", "rcc", "Purata RCC"));
    this.ecc.set(this.averageChart(rows, "guna_tanah", "ecc", "Purata ECC"));

    const current = this.sumBy(rows, "area", "ecc");
    const optimum = this.sumBy(optimumRows, "area", "ecc");
    const labels = [...new Set([...current.keys(), ...optimum.keys()])].slice(0, 12);
    this.currentVsOptimum.set({
      labels,
      series: [
        { name: "ECC Semasa", data: labels.map((label) => current.get(label) ?? 0) },
        { name: "ECC Optimum", data: labels.map((label) => optimum.get(label) ?? 0) }
      ]
    });
    const ranking = [...current.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
    this.areaRanking.set({
      labels: ranking.map(([label]) => label),
      series: [{ name: "Jumlah ECC", data: ranking.map(([, value]) => Number(value.toFixed(2))) }]
    });
  }

  private buildSummary(rows: Row[], optimumRows: Row[]): void {
    const currentByArea = this.sumBy(rows, "area", "ecc");
    const optimumByArea = this.sumBy(optimumRows, "area", "ecc");
    const selectedArea = this.query.area || [...currentByArea.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
    const selectedRows = rows.filter((row) => String(row["area"] ?? "") === selectedArea);
    const scopedRows = selectedRows.length ? selectedRows : rows;
    const selectedOptimum = optimumByArea.get(selectedArea) ?? this.average(optimumRows, "ecc");
    const selectedEcc = this.average(scopedRows, "ecc");
    const capacityLevel = selectedOptimum > 0 ? Math.min(100, Math.max(0, (selectedEcc / selectedOptimum) * 100)) : 0;
    const criticalAreas = [...this.groupAverage(rows, "area", "ecc").values()].filter((value) => value >= 1800).length;
    this.summary.set({
      avgPcc: this.average(rows, "pcc"),
      avgRcc: this.average(rows, "rcc"),
      avgEcc: this.average(rows, "ecc"),
      avgOptimum: this.average(optimumRows, "ecc"),
      criticalAreas,
      selectedArea,
      selectedPcc: this.average(scopedRows, "pcc"),
      selectedRcc: this.average(scopedRows, "rcc"),
      selectedEcc,
      selectedOptimum,
      capacityLevel
    });
  }

  private groupAverage(rows: Row[], labelKey: string, valueKey: string): Map<string, number> {
    const buckets = new Map<string, { sum: number; count: number }>();
    for (const row of rows) {
      const label = String(row[labelKey] ?? "-");
      const current = buckets.get(label) ?? { sum: 0, count: 0 };
      current.sum += this.num(row[valueKey]);
      current.count += 1;
      buckets.set(label, current);
    }
    const averages = new Map<string, number>();
    for (const [label, value] of buckets.entries()) {
      averages.set(label, value.count ? value.sum / value.count : 0);
    }
    return averages;
  }

  private average(rows: Row[], key: string): number {
    if (rows.length === 0) {
      return 0;
    }
    return Number((rows.reduce((total, row) => total + this.num(row[key]), 0) / rows.length).toFixed(2));
  }

  private averageChart(rows: Row[], labelKey: string, valueKey: string, name: string): ChartData {
    const buckets = new Map<string, { sum: number; count: number }>();
    for (const row of rows) {
      const label = String(row[labelKey] ?? "-");
      const current = buckets.get(label) ?? { sum: 0, count: 0 };
      current.sum += this.num(row[valueKey]);
      current.count += 1;
      buckets.set(label, current);
    }
    const sorted = [...buckets.entries()]
      .map(([label, value]) => ({ label, value: value.count ? value.sum / value.count : 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
    return {
      labels: sorted.map((item) => item.label),
      series: [{ name, data: sorted.map((item) => Number(item.value.toFixed(2))) }]
    };
  }

  private sumBy(rows: Row[], labelKey: string, valueKey: string): Map<string, number> {
    const values = new Map<string, number>();
    for (const row of rows) {
      const label = String(row[labelKey] ?? "-");
      values.set(label, (values.get(label) ?? 0) + this.num(row[valueKey]));
    }
    return values;
  }

  private num(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
