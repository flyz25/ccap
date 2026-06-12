import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatOptionModule } from "@angular/material/core";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSelectModule } from "@angular/material/select";
import { forkJoin } from "rxjs";

import { CapacityFactor, CapacityMethodology, CapacityRun, ChartData, DashboardOverview } from "../../core/models";
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
            <span class="status-badge" [ngClass]="summary().statusClass">{{ summary().selectedStatus }}</span>
          </div>
          <div class="text-xs font-bold uppercase text-ccap-steel">Kawasan Dipilih</div>
          <div class="mt-1 text-xl font-extrabold text-ccap-navy">{{ summary().selectedArea }}</div>
          <div class="mt-5 grid grid-cols-2 gap-3">
            <div class="rounded-md border border-ccap-line bg-ccap-mist p-3"><div class="metric-label">PCC</div><div class="text-2xl font-extrabold text-ccap-navy">{{ summary().selectedPcc | number: "1.0-2" }}</div></div>
            <div class="rounded-md border border-ccap-line bg-ccap-mist p-3"><div class="metric-label">RCC</div><div class="text-2xl font-extrabold text-ccap-navy">{{ summary().selectedRcc | number: "1.0-2" }}</div></div>
            <div class="rounded-md border border-ccap-line bg-ccap-mist p-3"><div class="metric-label">ECC Semasa</div><div class="text-2xl font-extrabold text-ccap-navy">{{ summary().selectedEcc | number: "1.0-2" }}</div></div>
            <div class="rounded-md border border-ccap-line bg-ccap-mist p-3"><div class="metric-label">ECC Optimum</div><div class="text-2xl font-extrabold text-ccap-blue">{{ summary().selectedOptimum | number: "1.0-2" }}</div></div>
          </div>
          <div class="mt-5">
            <div class="mb-3 text-sm font-extrabold text-ccap-navy">Tahap Ketepuan Kapasiti</div>
            <div class="relative h-3 rounded-full bg-gradient-to-r from-[#D32F2F] via-[#FBC02D] to-[#4CAF50]">
              <div
                class="absolute -top-2 h-7 w-1 rounded"
                [ngClass]="{
                  'bg-ccap-critical': summary().selectedStatus === 'Kritikal',
                  'bg-[#FBC02D]': summary().selectedStatus === 'Sederhana',
                  'bg-ccap-blue': summary().selectedStatus === 'Sesuai'
                }"
                [style.left.%]="summary().capacityLevel"
              ></div>
            </div>
            <div class="mt-3 flex justify-between text-xs font-semibold text-ccap-steel">
              <span>&gt;100%</span><span>70%</span><span>30%</span><span>0%</span>
            </div>
          </div>
          <div
            class="mt-6 rounded-md border p-4"
            [ngClass]="{
              'border-red-200 bg-red-50': summary().selectedStatus === 'Kritikal',
              'border-amber-200 bg-amber-50': summary().selectedStatus === 'Sederhana',
              'border-green-200 bg-green-50': summary().selectedStatus === 'Sesuai'
            }"
          >
            <div class="flex gap-3">
              <mat-icon
                [ngClass]="{
                  'text-ccap-critical': summary().selectedStatus === 'Kritikal',
                  'text-[#B7791F]': summary().selectedStatus === 'Sederhana',
                  'text-ccap-blue': summary().selectedStatus === 'Sesuai'
                }"
              >{{ summary().selectedStatus === "Kritikal" ? "error" : summary().selectedStatus === "Sederhana" ? "warning" : "check_circle" }}</mat-icon>
              <div class="text-sm font-semibold leading-6 text-ccap-steel">
                {{ summary().recommendation }}
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

      <section class="space-y-5">
        <div class="panel overflow-hidden">
        <div class="border-b border-ccap-line px-5 py-4">
          <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div class="flex flex-wrap items-center gap-3">
                <h2 class="text-lg font-extrabold text-ccap-navy">Audit Formula</h2>
                <span class="status-badge status-suitable">Audit tersedia</span>
                <span class="status-badge bg-slate-100 text-slate-700">Nilai workbook dikekalkan</span>
              </div>
              <div class="mt-1 text-sm font-semibold text-ccap-steel">
                {{ methodology()?.name || "RW CEKAL Formula Engine" }} · PCC → RCC → ECC dikira semula untuk semakan mismatch.
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <label class="filter-card !min-h-[54px] !w-[190px] !py-2">
                <span class="filter-label">Status Audit</span>
                <select class="filter-select" [(ngModel)]="auditStatus" (ngModelChange)="loadAudit()">
                  <option value="">Semua Status</option>
                  <option value="pass">Lulus</option>
                  <option value="warning">Amaran</option>
                  <option value="fail">Gagal</option>
                  <option value="missing_factor">Tiada Faktor</option>
                  <option value="missing_input">Input Tidak Lengkap</option>
                </select>
              </label>
              <button class="action-button" type="button" (click)="loadAudit()" [disabled]="auditLoading()">
                <mat-icon>refresh</mat-icon>
                Muat Semula
              </button>
              <button class="action-button action-button-primary" type="button" (click)="recalculate()" [disabled]="recalculating()">
                <mat-icon>calculate</mat-icon>
                {{ recalculating() ? "Mengira..." : "Kira Semula" }}
              </button>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 p-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <div class="grid grid-cols-2 gap-3 md:grid-cols-5">
            <div class="rounded-md border border-ccap-line bg-ccap-mist p-3">
              <div class="metric-label">Jumlah Baris</div>
              <div class="text-2xl font-extrabold text-ccap-navy">{{ (latestRun()?.total_rows || 0) | number }}</div>
            </div>
            <div class="rounded-md border border-green-200 bg-green-50 p-3">
              <div class="metric-label">Lulus</div>
              <div class="text-2xl font-extrabold text-green-700">{{ (latestRun()?.passed_rows || 0) | number }}</div>
            </div>
            <div class="rounded-md border border-amber-200 bg-amber-50 p-3">
              <div class="metric-label">Amaran</div>
              <div class="text-2xl font-extrabold text-amber-700">{{ (latestRun()?.warning_rows || 0) | number }}</div>
            </div>
            <div class="rounded-md border border-red-200 bg-red-50 p-3">
              <div class="metric-label">Gagal</div>
              <div class="text-2xl font-extrabold text-red-700">{{ (latestRun()?.failed_rows || 0) | number }}</div>
            </div>
            <div class="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div class="metric-label">Tiada Faktor/Input</div>
              <div class="text-2xl font-extrabold text-slate-700">
                {{ ((latestRun()?.missing_factor_rows || 0) + (latestRun()?.missing_input_rows || 0)) | number }}
              </div>
            </div>
          </div>

          <div class="rounded-md border border-ccap-line p-4">
            <div class="mb-2 flex items-center justify-between gap-3">
              <div class="text-sm font-extrabold text-ccap-navy">Formula Aktif</div>
              <div class="text-xs font-bold uppercase text-ccap-steel">{{ latestRun()?.started_at ? (latestRun()?.started_at | date: "dd MMM y, h:mm a") : "Belum dijalankan" }}</div>
            </div>
            <div class="grid gap-2 text-sm font-semibold text-ccap-steel">
              <div><span class="font-extrabold text-ccap-navy">PCC</span> = ROUND((A_msq / Au) × Rf, 0)</div>
              <div><span class="font-extrabold text-ccap-navy">RCC</span> = ROUND(PCC × CF, 0)</div>
              <div><span class="font-extrabold text-ccap-navy">ECC</span> = ROUND(RCC × MC, 0)</div>
            </div>
          </div>
        </div>

        </div>

        <div class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <ccap-data-table
            title="Audit PCC/RCC/ECC"
            [rows]="auditRows()"
            [preferredColumns]="['dataset_scope', 'record_area', 'record_kawasan_kajian', 'source_row', 'stored_pcc', 'calculated_pcc', 'pcc_delta', 'stored_rcc', 'calculated_rcc', 'rcc_delta', 'stored_ecc', 'calculated_ecc', 'ecc_delta', 'status', 'issue_code']"
          />
          <div class="panel overflow-hidden shadow-none">
            <div class="border-b border-ccap-line px-4 py-3">
              <h3 class="section-title">Faktor CF/MC</h3>
              <div class="mt-1 text-xs font-semibold text-ccap-steel">Master data awal diinfer daripada workbook client.</div>
            </div>
            <div class="max-h-[520px] overflow-auto">
              <div *ngFor="let factor of factors()" class="border-b border-ccap-line px-4 py-3">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <div class="font-extrabold text-ccap-navy">{{ factor.area }}</div>
                    <div class="text-xs font-bold uppercase text-ccap-steel">{{ factor.dataset_scope }}</div>
                  </div>
                  <span class="status-badge" [ngClass]="factor.is_active ? 'status-suitable' : 'bg-slate-100 text-slate-600'">
                    {{ factor.is_active ? "Aktif" : "Tidak aktif" }}
                  </span>
                </div>
                <div class="mt-3 grid grid-cols-2 gap-2">
                  <div class="rounded-md bg-ccap-mist p-2">
                    <div class="metric-label">CF</div>
                    <div class="text-lg font-extrabold text-ccap-navy">{{ factor.correction_factor | number: "1.4-4" }}</div>
                  </div>
                  <div class="rounded-md bg-ccap-mist p-2">
                    <div class="metric-label">MC</div>
                    <div class="text-lg font-extrabold text-ccap-navy">{{ factor.management_capability | number: "1.4-4" }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
  readonly methodology = signal<CapacityMethodology | null>(null);
  readonly factors = signal<CapacityFactor[]>([]);
  readonly runs = signal<CapacityRun[]>([]);
  readonly auditRows = signal<Row[]>([]);
  readonly auditLoading = signal(false);
  readonly recalculating = signal(false);
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
    capacityLevel: 0,
    selectedStatus: "Sesuai",
    statusClass: "status-suitable",
    recommendation: "Kawasan berada di bawah kapasiti tampungan berdasarkan data semasa."
  });

  readonly query: DatasetQuery = { area: "", development_type: "", land_use: "" };
  auditStatus = "";

  ngOnInit(): void {
    this.api.dashboard().subscribe((data) => this.filters.set(data));
    this.loadAudit();
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

  loadAudit(): void {
    this.auditLoading.set(true);
    forkJoin({
      methodology: this.api.capacityMethodology(),
      factors: this.api.capacityFactors(),
      runs: this.api.capacityRuns(10),
      audit: this.api.capacityAudit({ page_size: 100, status: this.auditStatus || null })
    }).subscribe({
      next: ({ methodology, factors, runs, audit }) => {
        this.methodology.set(methodology);
        this.factors.set(factors);
        this.runs.set(runs);
        this.auditRows.set(audit.items as unknown as Row[]);
        this.auditLoading.set(false);
      },
      error: () => this.auditLoading.set(false)
    });
  }

  recalculate(): void {
    this.recalculating.set(true);
    this.api.recalculateCapacity().subscribe({
      next: () => {
        this.recalculating.set(false);
        this.loadAudit();
      },
      error: () => this.recalculating.set(false)
    });
  }

  latestRun(): CapacityRun | null {
    return this.runs()[0] ?? null;
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
    const selectedOptimum = optimumByArea.get(selectedArea) ?? this.sum(optimumRows, "ecc");
    const selectedEcc = this.sum(scopedRows, "ecc");
    const load = this.max(scopedRows, "bil_penduduk") + this.max(scopedRows, "bil_pengunjung");
    const saturationPct = selectedEcc > 0 ? (load / selectedEcc) * 100 : 0;
    const capacityLevel = Math.min(100, Math.max(0, 100 - saturationPct));
    const selectedStatus = this.statusForLoad(load, selectedEcc);
    const criticalAreas = [...this.areaLoadSummary(rows).values()].filter((value) => this.statusForLoad(value.load, value.capacity) === "Kritikal").length;
    this.summary.set({
      avgPcc: this.average(rows, "pcc"),
      avgRcc: this.average(rows, "rcc"),
      avgEcc: this.average(rows, "ecc"),
      avgOptimum: this.average(optimumRows, "ecc"),
      criticalAreas,
      selectedArea,
      selectedPcc: this.sum(scopedRows, "pcc"),
      selectedRcc: this.sum(scopedRows, "rcc"),
      selectedEcc,
      selectedOptimum,
      capacityLevel,
      selectedStatus,
      statusClass: selectedStatus === "Kritikal" ? "status-critical" : selectedStatus === "Sederhana" ? "status-moderate" : "status-suitable",
      recommendation: this.recommendation(selectedStatus, saturationPct, selectedEcc - load)
    });
  }

  private areaLoadSummary(rows: Row[]): Map<string, { load: number; capacity: number }> {
    const buckets = new Map<string, { population: number; visitors: number; capacity: number }>();
    for (const row of rows) {
      const area = String(row["area"] ?? row["kawasan_kajian"] ?? "-");
      const current = buckets.get(area) ?? { population: 0, visitors: 0, capacity: 0 };
      current.population = Math.max(current.population, this.num(row["bil_penduduk"]));
      current.visitors = Math.max(current.visitors, this.num(row["bil_pengunjung"]));
      current.capacity += this.num(row["ecc"]);
      buckets.set(area, current);
    }
    const results = new Map<string, { load: number; capacity: number }>();
    for (const [area, value] of buckets.entries()) {
      results.set(area, { load: value.population + value.visitors, capacity: value.capacity });
    }
    return results;
  }

  private statusForLoad(load: number, capacity: number): "Sesuai" | "Sederhana" | "Kritikal" {
    if (capacity <= 0 && load > 0) {
      return "Kritikal";
    }
    if (capacity <= 0) {
      return "Sesuai";
    }
    const ratio = load / capacity;
    if (ratio >= 1) {
      return "Kritikal";
    }
    if (ratio >= 0.7) {
      return "Sederhana";
    }
    return "Sesuai";
  }

  private recommendation(status: "Sesuai" | "Sederhana" | "Kritikal", saturationPct: number, balance: number): string {
    if (status === "Kritikal") {
      return `Beban kawasan melebihi kapasiti (${saturationPct.toFixed(2)}%). Baki kapasiti ${this.format(balance)}; pembangunan baharu perlu diaudit semula.`;
    }
    if (status === "Sederhana") {
      return `Ketepuan berada pada tahap berjaga-jaga (${saturationPct.toFixed(2)}%). Pembangunan terpilih perlu kawalan intensiti.`;
    }
    return `Ketepuan masih rendah (${saturationPct.toFixed(2)}%). Kawasan berada di bawah kapasiti tampungan semasa.`;
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

  private sum(rows: Row[], key: string): number {
    return Number(rows.reduce((total, row) => total + this.num(row[key]), 0).toFixed(2));
  }

  private max(rows: Row[], key: string): number {
    return rows.reduce((highest, row) => Math.max(highest, this.num(row[key])), 0);
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

  private format(value: number): string {
    return new Intl.NumberFormat("ms-MY", { maximumFractionDigits: 0 }).format(value);
  }
}
