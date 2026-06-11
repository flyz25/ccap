import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

import { ChartData } from "../../core/models";
import { ApiService } from "../../core/services/api.service";
import { ChartCardComponent } from "../../shared/components/chart-card.component";
import { DataTableComponent } from "../../shared/components/data-table.component";

type Row = Record<string, unknown>;

@Component({
  selector: "ccap-population",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule, ChartCardComponent, DataTableComponent],
  template: `
    <div class="page-shell">
    <div class="page-header">
      <div>
      <h1 class="page-title">Analitik Populasi</h1>
        <div class="page-subtitle">Pertumbuhan, perbandingan, agihan dan kedudukan penduduk</div>
      </div>
      <div class="page-actions">
        <label class="filter-card">
          <span class="filter-label">Kawasan</span>
          <select class="filter-select" [(ngModel)]="selectedArea" (ngModelChange)="applyFilters()">
            <option value="">Semua Kawasan</option>
            <option *ngFor="let area of areas()" [value]="area">{{ area }}</option>
          </select>
        </label>
        <label class="filter-card">
          <span class="filter-label">Jenis Pembangunan</span>
          <select class="filter-select">
            <option>Semua Jenis</option>
          </select>
        </label>
        <label class="filter-card">
          <span class="filter-label">Julat Masa</span>
          <select class="filter-select">
            <option>2022 - 2040 (Unjuran)</option>
          </select>
        </label>
        <button class="action-button" type="button">
          <mat-icon>calendar_today</mat-icon>
          Set Data
        </button>
        <button class="action-button !px-4" type="button" (click)="reload()" aria-label="Muat semula">
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
          <span class="kpi-icon"><mat-icon>groups</mat-icon></span>
          <div><div class="metric-label">Jumlah Penduduk ({{ latestYear() }})</div><div class="metric-value">{{ latestTotal() | number: "1.0-0" }}</div><div class="text-sm font-semibold text-ccap-steel">orang</div></div>
        </div>
        <div class="panel kpi-card">
          <span class="kpi-icon kpi-icon-amber"><mat-icon>groups</mat-icon></span>
          <div><div class="metric-label">Pertumbuhan Penduduk (CAGR)</div><div class="metric-value">{{ cagr() | number: "1.1-2" }}%</div><div class="text-sm font-semibold text-ccap-steel">2022 - {{ latestYear() }}</div></div>
        </div>
        <div class="panel kpi-card">
          <span class="kpi-icon"><mat-icon>person_add</mat-icon></span>
          <div><div class="metric-label">Suntikan Penduduk ({{ latestYear() }})</div><div class="metric-value">{{ latestInjected() | number: "1.0-0" }}</div><div class="text-sm font-semibold text-ccap-steel">orang</div></div>
        </div>
        <div class="panel kpi-card">
          <span class="kpi-icon kpi-icon-blue"><mat-icon>trending_up</mat-icon></span>
          <div><div class="metric-label">Unjuran Penduduk (2040)</div><div class="metric-value">{{ projected2040() | number: "1.0-0" }}</div><div class="text-sm font-semibold text-ccap-steel">orang</div></div>
        </div>
        <div class="panel kpi-card">
          <span class="kpi-icon kpi-icon-purple"><mat-icon>apartment</mat-icon></span>
          <div><div class="metric-label">Purata Kepadatan ({{ latestYear() }})</div><div class="metric-value">256</div><div class="text-sm font-semibold text-ccap-steel">orang/km²</div></div>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-5 xl:grid-cols-2 min-[1800px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_420px]">
        <ccap-chart-card title="Trend Pertumbuhan Penduduk" [data]="growth()" mode="line" [height]="360" />
        <ccap-chart-card title="Perbandingan Penduduk Mengikut Kawasan ({{ latestYear() }})" [data]="comparison()" mode="bar" [height]="360" />
        <div class="panel p-4">
          <h2 class="section-title mb-4 !text-base">Kedudukan Penduduk Mengikut Kawasan ({{ latestYear() }})</h2>
          <div class="space-y-3">
            <div *ngFor="let item of rankingRows(); let i = index" class="grid grid-cols-[32px_1fr_90px] items-center gap-3 text-sm">
              <span class="font-bold text-ccap-steel">{{ i + 1 }}</span>
              <div>
                <div class="font-bold text-ccap-navy">{{ item.area }}</div>
                <div class="mt-1 h-2 rounded-full bg-ccap-line"><div class="h-2 rounded-full bg-ccap-blue" [style.width.%]="item.percent"></div></div>
              </div>
              <span class="text-right font-extrabold text-ccap-navy">{{ item.value | number: "1.0-0" }}</span>
            </div>
          </div>
          <div class="mt-5 border-t border-ccap-line pt-3 text-right font-extrabold text-ccap-navy">Jumlah {{ latestTotal() | number: "1.0-0" }}</div>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-5 xl:grid-cols-2 min-[1800px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_420px]">
        <ccap-chart-card title="Pertumbuhan Penduduk Tahunan (%)" [data]="normalAnnual()" mode="line" [height]="300" />
        <ccap-chart-card title="Pertumbuhan Suntikan Penduduk Tahunan (%)" [data]="injectedAnnual()" mode="line" [height]="300" />
        <div class="panel p-5">
          <h2 class="section-title mb-5 !text-base">Unjuran Penduduk (2040)</h2>
          <div class="space-y-4">
            <div *ngFor="let item of projectionRows()" class="flex items-center gap-3">
              <span class="kpi-icon !h-9 !w-9 !flex-[0_0_36px]"><mat-icon class="!text-lg">{{ item.icon }}</mat-icon></span>
              <div><div class="text-sm font-semibold text-ccap-steel">{{ item.label }}</div><div class="font-extrabold text-ccap-navy">{{ item.value | number: "1.0-0" }} orang</div></div>
            </div>
          </div>
          <div class="mt-5 rounded-lg border border-ccap-line bg-ccap-mist p-5">
            <div class="text-sm font-semibold text-ccap-steel">Pertumbuhan {{ latestYear() }} - 2040</div>
            <div class="mt-2 text-4xl font-extrabold text-ccap-blue">{{ projectionGrowth() | number: "1.0-2" }}%</div>
          </div>
        </div>
      </section>
      <ccap-data-table
        title="Data Populasi"
        [rows]="rows()"
        [preferredColumns]="['tahun', 'kawasan_kajian', 'normal_population_growth', 'injected_population_growth']"
      />
    </ng-container>
    </div>
  `
})
export class PopulationComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly loading = signal(false);
  readonly rows = signal<Row[]>([]);
  readonly growth = signal<ChartData>({ labels: [], series: [] });
  readonly comparison = signal<ChartData>({ labels: [], series: [] });
  readonly distribution = signal<ChartData>({ labels: [], series: [] });
  readonly ranking = signal<ChartData>({ labels: [], series: [] });
  readonly normalAnnual = signal<ChartData>({ labels: [], series: [] });
  readonly injectedAnnual = signal<ChartData>({ labels: [], series: [] });
  readonly rankingRows = signal<Array<{ area: string; value: number; percent: number }>>([]);
  readonly projectionRows = signal<Array<{ icon: string; label: string; value: number }>>([]);
  readonly areas = signal<string[]>([]);
  readonly latestYear = signal<number | null>(null);
  readonly latestTotal = signal(0);
  readonly latestInjected = signal(0);
  readonly projected2040 = signal(0);
  readonly projectionGrowth = signal(0);
  readonly cagr = signal(0);
  selectedArea = "";

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.dataset("population", { page_size: 500 }).subscribe({
      next: (response) => {
        this.rows.set(response.items);
        this.buildCharts(response.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  applyFilters(): void {
    this.buildCharts(this.rows());
  }

  private buildCharts(rows: Row[]): void {
    this.areas.set([...new Set(rows.map((row) => String(row["kawasan_kajian"] ?? "")).filter(Boolean))].sort());
    const scopedRows = this.selectedArea ? rows.filter((row) => row["kawasan_kajian"] === this.selectedArea) : rows;
    const byYear = new Map<number, { normal: number; injected: number }>();
    for (const row of scopedRows) {
      const year = Number(row["tahun"]);
      const item = byYear.get(year) ?? { normal: 0, injected: 0 };
      item.normal += this.num(row["normal_population_growth"]);
      item.injected += this.num(row["injected_population_growth"]);
      byYear.set(year, item);
    }
    const years = [...byYear.keys()].sort((a, b) => a - b);
    const normalValues = years.map((year) => byYear.get(year)?.normal ?? 0);
    const injectedValues = years.map((year) => byYear.get(year)?.injected ?? 0);
    this.growth.set({
      labels: years.map(String),
      series: [
        { name: "Pertumbuhan Penduduk", data: normalValues },
        { name: "Suntikan Penduduk", data: injectedValues }
      ]
    });
    this.normalAnnual.set(this.annualChart(years, normalValues, "Pertumbuhan Tahunan"));
    this.injectedAnnual.set(this.annualChart(years, injectedValues, "Suntikan Tahunan"));

    const latestYear = years.at(-1);
    this.latestYear.set(latestYear ?? null);
    const latestRows = scopedRows.filter((row) => Number(row["tahun"]) === latestYear);
    const sorted = [...latestRows]
      .sort((a, b) => this.num(b["injected_population_growth"]) - this.num(a["injected_population_growth"]))
      .slice(0, 12);
    const labels = sorted.map((row) => String(row["kawasan_kajian"] ?? "-"));
    const injected = sorted.map((row) => this.num(row["injected_population_growth"]));
    const normal = sorted.map((row) => this.num(row["normal_population_growth"]));
    this.comparison.set({
      labels,
      series: [
        { name: "Pertumbuhan Penduduk", data: normal },
        { name: "Suntikan Penduduk", data: injected }
      ]
    });
    this.distribution.set({ labels, series: [{ name: "Suntikan Penduduk", data: injected }] });
    this.ranking.set({
      labels,
      series: [{ name: "Suntikan Penduduk", data: injected }]
    });
    const total = normalValues.at(-1) ?? 0;
    const injectedTotal = injectedValues.at(-1) ?? 0;
    this.latestTotal.set(total);
    this.latestInjected.set(injectedTotal);
    const first = normalValues[0] ?? 0;
    const last = total;
    const yearSpan = Math.max(1, (latestYear ?? years[0] ?? 0) - (years[0] ?? 0));
    this.cagr.set(first > 0 ? (Math.pow(last / first, 1 / yearSpan) - 1) * 100 : 0);
    const projected = this.projectValue(years, normalValues, 2040);
    this.projected2040.set(projected);
    this.projectionGrowth.set(total > 0 ? ((projected - total) / total) * 100 : 0);
    this.rankingRows.set(sorted.map((row) => {
      const value = this.num(row["normal_population_growth"]);
      return { area: String(row["kawasan_kajian"] ?? "-"), value, percent: total > 0 ? (value / total) * 100 : 0 };
    }));
    this.projectionRows.set([
      { icon: "groups", label: `Penduduk Semasa (${latestYear ?? "-"})`, value: total },
      { icon: "groups", label: "Unjuran Penduduk (2030)", value: this.projectValue(years, normalValues, 2030) },
      { icon: "groups", label: "Unjuran Penduduk (2035)", value: this.projectValue(years, normalValues, 2035) },
      { icon: "groups", label: "Unjuran Penduduk (2040)", value: projected }
    ]);
  }

  private annualChart(years: number[], values: number[], name: string): ChartData {
    const labels = years.slice(1).map(String);
    const data = values.slice(1).map((value, index) => {
      const previous = values[index] || 0;
      return previous > 0 ? Number((((value - previous) / previous) * 100).toFixed(2)) : 0;
    });
    return { labels, series: [{ name, data }] };
  }

  private projectValue(years: number[], values: number[], targetYear: number): number {
    if (years.length === 0) {
      return 0;
    }
    const existingIndex = years.findIndex((year) => year === targetYear);
    if (existingIndex >= 0) {
      return values[existingIndex] ?? 0;
    }
    const latestYear = years.at(-1) ?? targetYear;
    const latestValue = values.at(-1) ?? 0;
    const annualRate = this.cagr() / 100 || 0.02;
    return Math.round(latestValue * Math.pow(1 + annualRate, Math.max(0, targetYear - latestYear)));
  }

  private num(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
