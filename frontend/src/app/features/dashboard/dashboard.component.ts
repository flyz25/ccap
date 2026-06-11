import { CommonModule } from "@angular/common";
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatOptionModule } from "@angular/material/core";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSelectModule } from "@angular/material/select";
import { forkJoin } from "rxjs";
import GeoJSON from "ol/format/GeoJSON";
import OlMap from "ol/Map";
import View from "ol/View";
import type { FeatureLike } from "ol/Feature";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import { fromLonLat } from "ol/proj";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";

import { DashboardOverview, KpiCard } from "../../core/models";
import { ApiService, DatasetQuery } from "../../core/services/api.service";
import { ChartCardComponent } from "../../shared/components/chart-card.component";

type Row = Record<string, unknown>;

interface AssessmentSummary {
  area: string;
  pcc: number;
  rcc: number;
  ecc: number;
  population: number;
  visitors: number;
  status: "Sesuai" | "Sederhana" | "Kritikal";
  statusClass: string;
  recommendation: string;
}

@Component({
  selector: "ccap-dashboard",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatOptionModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    ChartCardComponent
  ],
  template: `
    <div class="page-shell">
    <div class="page-header">
      <div>
        <div class="text-[30px] font-extrabold leading-tight text-[#0f172a]">CCAP <span class="text-lg font-bold">Carrying Capacity Analytics Platform</span></div>
        <h1 class="page-title">Dashboard Eksekutif</h1>
        <div class="page-subtitle">Sistem Analitik Kapasiti Mampu Dukung</div>
      </div>
      <div class="page-actions">
        <label class="filter-card">
          <span class="filter-label">Kawasan</span>
          <select class="filter-select" [(ngModel)]="query.area" (ngModelChange)="load()">
            <option value="">Semua Kawasan</option>
            <option *ngFor="let area of data()?.filters?.areas ?? []" [value]="area">{{ area }}</option>
          </select>
        </label>
        <label class="filter-card">
          <span class="filter-label">Data Terkini</span>
          <select class="filter-select">
            <option>10 Jun 2026, 10:30 AM</option>
          </select>
        </label>
        <button class="action-button !min-h-[56px] !w-[56px] !px-0" type="button" aria-label="Notifikasi">
          <mat-icon>notifications</mat-icon>
        </button>
      </div>
    </div>

    <div *ngIf="loading()" class="flex h-80 items-center justify-center">
      <mat-spinner diameter="42" />
    </div>

    <ng-container *ngIf="data() as overview">
      <section class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 min-[1800px]:grid-cols-5">
        <div *ngFor="let kpi of overview.kpis; let index = index" class="panel kpi-card">
          <span class="kpi-icon" [ngClass]="kpiIconTone(index)">
            <mat-icon>{{ kpiIcon(index) }}</mat-icon>
          </span>
          <div>
            <div class="metric-label">{{ kpiLabel(kpi.label) }}</div>
            <div class="metric-value">{{ kpi.value | number: "1.0-2" }}</div>
            <div class="text-sm font-semibold text-ccap-steel">{{ unitLabel(kpi) }}</div>
          </div>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(360px,1fr)]">
        <div class="panel overflow-hidden">
          <div class="flex flex-col gap-3 border-b border-ccap-line px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="section-title !text-base">Peta Ringkasan ECC</h2>
            </div>
          </div>
          <div class="relative">
            <div #overviewMap class="h-[470px] w-full"></div>
            <div class="map-control-stack">
              <button class="map-control" type="button" title="Zum masuk" aria-label="Zum masuk" (click)="zoomIn()">+</button>
              <button class="map-control" type="button" title="Zum keluar" aria-label="Zum keluar" (click)="zoomOut()">-</button>
              <button class="map-control mt-3" type="button" title="Kembali ke paparan penuh" aria-label="Kembali ke paparan penuh" (click)="resetMapView()"><mat-icon>home</mat-icon></button>
              <button class="map-control" type="button" title="Togol lapisan titik" aria-label="Togol lapisan titik" (click)="togglePointLayer()"><mat-icon>layers</mat-icon></button>
            </div>
            <div class="legend-panel absolute right-8 top-16 z-10 w-[220px]">
              <div class="mb-4 text-sm font-extrabold uppercase text-ccap-navy">Petunjuk ECC</div>
              <div class="space-y-4 text-sm font-semibold text-ccap-steel">
                <div class="flex items-start gap-3"><span class="mt-1 h-4 w-4 rounded-full bg-[#16a34a]"></span><div><b class="text-ccap-blue">Sesuai</b><div>ECC rendah</div></div></div>
                <div class="flex items-start gap-3"><span class="mt-1 h-4 w-4 rounded-full bg-[#FBC02D]"></span><div><b class="text-[#8A6500]">Sederhana</b><div>Perlu kawalan</div></div></div>
                <div class="flex items-start gap-3"><span class="mt-1 h-4 w-4 rounded-full bg-[#D32F2F]"></span><div><b class="text-ccap-critical">Kritikal</b><div>Kawasan tepu</div></div></div>
              </div>
              <button class="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-ccap-blue">
                <mat-icon class="!text-base">open_in_full</mat-icon>
                Lihat Peta Penuh
              </button>
            </div>
            <div *ngIf="selectedFeature() as feature" class="absolute left-[88px] top-4 z-10 max-w-[340px] rounded-md border border-ccap-line bg-white/95 p-3 shadow-panel">
              <div class="text-xs font-extrabold uppercase text-ccap-steel">Popup Kawasan</div>
              <div class="mt-1 font-extrabold text-ccap-navy">{{ featureArea(feature) }}</div>
              <div class="mt-2 grid grid-cols-3 gap-2 text-xs font-bold text-ccap-steel">
                <span>PCC {{ formatNumber(feature["pcc"]) }}</span>
                <span>RCC {{ formatNumber(feature["rcc"]) }}</span>
                <span>ECC {{ formatNumber(feature["ecc"]) }}</span>
              </div>
            </div>
          </div>
        </div>

        <aside class="panel p-5" *ngIf="assessment() as summary">
          <div class="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 class="section-title !text-base">Ringkasan Penilaian</h2>
              <div class="mt-1 text-xs font-semibold text-ccap-steel">Kawasan Dipilih</div>
              <div class="text-lg font-extrabold text-ccap-navy">{{ summary.area }}</div>
            </div>
            <span class="status-badge" [ngClass]="summary.statusClass">
              <span class="h-2 w-2 rounded-full bg-current"></span>
              {{ summary.status }}
            </span>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-md border border-ccap-line bg-ccap-mist p-3">
              <div class="metric-label">PCC</div>
              <div class="text-xl font-extrabold text-ccap-navy">{{ summary.pcc | number: "1.0-2" }}</div>
            </div>
            <div class="rounded-md border border-ccap-line bg-ccap-mist p-3">
              <div class="metric-label">RCC</div>
              <div class="text-xl font-extrabold text-ccap-navy">{{ summary.rcc | number: "1.0-2" }}</div>
            </div>
            <div class="rounded-md border border-ccap-line bg-ccap-mist p-3">
              <div class="metric-label">ECC</div>
              <div class="text-xl font-extrabold text-ccap-navy">{{ summary.ecc | number: "1.0-2" }}</div>
            </div>
            <div class="rounded-md border border-ccap-line bg-ccap-mist p-3">
              <div class="metric-label">Penduduk</div>
              <div class="text-xl font-extrabold text-ccap-navy">{{ summary.population | number: "1.0-0" }}</div>
            </div>
            <div class="rounded-md border border-ccap-line bg-ccap-mist p-3">
              <div class="metric-label">Pengunjung</div>
              <div class="text-xl font-extrabold text-ccap-navy">{{ summary.visitors | number: "1.0-0" }}</div>
            </div>
            <div class="rounded-md border border-ccap-line bg-ccap-mist p-3">
              <div class="metric-label">Titik GIS</div>
              <div class="text-xl font-extrabold text-ccap-navy">{{ mapFeatureCount() | number }}</div>
            </div>
          </div>
          <div class="mt-4 rounded-md border border-ccap-line bg-white p-3 text-sm font-semibold leading-6 text-ccap-steel">
            {{ summary.recommendation }}
          </div>
          <button class="mt-4 h-10 w-full rounded-md border border-ccap-blue text-sm font-extrabold text-ccap-blue">Lihat Laporan Terperinci</button>
        </aside>
      </section>

      <section class="grid grid-cols-1 gap-5 xl:grid-cols-2 min-[1800px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_360px]">
        <ccap-chart-card title="Trend Penduduk" [data]="overview.population_trend" mode="line" />
        <ccap-chart-card title="PCC vs RCC vs ECC" [data]="overview.capacity_comparison" mode="bar" />
        <ccap-chart-card title="Agihan ECC" [data]="overview.ecc_distribution" mode="pie" />
        <ccap-chart-card title="Kedudukan Kawasan (ECC)" [data]="overview.area_ranking" mode="bar" />
      </section>
    </ng-container>
    </div>
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly source = new VectorSource();
  private readonly layer = new VectorLayer({
    source: this.source,
    style: (feature: FeatureLike) => this.pointStyle(feature)
  });

  @ViewChild("overviewMap")
  set overviewMap(ref: ElementRef<HTMLDivElement> | undefined) {
    if (ref && !this.map) {
      this.createMap(ref.nativeElement);
    }
  }

  readonly data = signal<DashboardOverview | null>(null);
  readonly loading = signal(false);
  readonly rows = signal<Row[]>([]);
  readonly assessment = signal<AssessmentSummary | null>(null);
  readonly selectedFeature = signal<Row | null>(null);
  readonly mapFeatureCount = signal(0);
  readonly query: DatasetQuery = {
    area: "",
    development_type: "",
    land_use: ""
  };

  private map?: OlMap;
  private pendingFeatureCollection: Record<string, unknown> | null = null;
  private readonly areaStatus = new Map<string, AssessmentSummary["status"]>();
  private readonly defaultCenter = fromLonLat([101.38, 4.47]);
  private readonly defaultZoom = 10;

  ngOnInit(): void {
    this.load();
  }

  private createMap(target: HTMLDivElement): void {
    this.map = new OlMap({
      target,
      layers: [new TileLayer({ source: new OSM() }), this.layer],
      view: new View({
        center: this.defaultCenter,
        zoom: this.defaultZoom
      })
    });

    this.map.on("singleclick", (event) => {
      const feature = this.map?.forEachFeatureAtPixel(event.pixel, (candidate) => candidate);
      if (!feature) {
        this.selectedFeature.set(null);
        return;
      }
      const props = { ...(feature as { getProperties: () => Row }).getProperties() };
      delete props["geometry"];
      this.selectedFeature.set(props);
      this.assessment.set(this.buildAssessmentForArea(this.rows(), this.featureArea(props)));
    });

    setTimeout(() => this.map?.updateSize());
    if (this.pendingFeatureCollection) {
      this.renderMap(this.pendingFeatureCollection);
    }
  }

  ngOnDestroy(): void {
    this.map?.setTarget(undefined);
  }

  zoomIn(): void {
    this.changeZoom(1);
  }

  zoomOut(): void {
    this.changeZoom(-1);
  }

  resetMapView(): void {
    if (!this.map) {
      return;
    }
    const features = this.source.getFeatures();
    if (features.length === 0) {
      this.map.getView().animate({ center: this.defaultCenter, zoom: this.defaultZoom, duration: 180 });
      return;
    }
    const extent = this.source.getExtent();
    if (extent) {
      this.map.getView().fit(extent, { padding: [48, 48, 48, 48], maxZoom: 13, duration: 250 });
    }
  }

  togglePointLayer(): void {
    this.layer.setVisible(!this.layer.getVisible());
  }

  load(): void {
    this.loading.set(true);
    this.selectedFeature.set(null);
    forkJoin({
      overview: this.api.dashboard(this.query),
      ecc: this.api.dataset<Row>("ecc", { ...this.query, page_size: 500 }),
      points: this.api.points("ecc_spk_map")
    }).subscribe({
      next: ({ overview, ecc, points }) => {
        this.data.set(overview);
        this.rows.set(ecc.items);
        this.buildAreaStatus(ecc.items);
        this.assessment.set(this.buildAssessment(ecc.items));
        this.renderMap(points);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  kpiLabel(label: string): string {
    const labels: Record<string, string> = {
      "Total Population": "Jumlah Penduduk",
      "Total Areas": "Jumlah Kawasan Kajian",
      "Average PCC": "Purata PCC",
      "Average RCC": "Purata RCC",
      "Average ECC": "Purata ECC"
    };
    return labels[label] ?? label;
  }

  unitLabel(kpi: KpiCard): string {
    if (kpi.unit === "people") {
      return `orang · ${kpi.trend ?? "-"}`;
    }
    if (kpi.unit === "areas") {
      return "kawasan";
    }
    return "indeks kapasiti";
  }

  kpiIcon(index: number): string {
    return ["groups", "location_on", "bar_chart", "trending_up", "eco"][index] ?? "analytics";
  }

  kpiIconTone(index: number): string {
    return ["", "kpi-icon-blue", "kpi-icon-indigo", "kpi-icon-teal", "kpi-icon-purple"][index] ?? "";
  }

  featureArea(feature: Row): string {
    return String(feature["area"] || feature["kawasan_kajian"] || "Tidak dikenal pasti");
  }

  formatNumber(value: unknown): string {
    return new Intl.NumberFormat("ms-MY", { maximumFractionDigits: 1 }).format(this.num(value));
  }

  private renderMap(collection: Record<string, unknown>): void {
    this.pendingFeatureCollection = collection;
    if (!this.map) {
      return;
    }
    const features = Array.isArray(collection["features"]) ? collection["features"] : [];
    const filtered = features.filter((feature) => this.matchesQuery(feature as Record<string, unknown>));
    const parsed = new GeoJSON().readFeatures({ ...collection, features: filtered }, { featureProjection: "EPSG:3857" });
    this.source.clear();
    this.source.addFeatures(parsed);
    this.layer.changed();
    this.mapFeatureCount.set(parsed.length);
    if (parsed.length > 0) {
      const extent = this.source.getExtent();
      if (extent) {
        this.map.getView().fit(extent, { padding: [48, 48, 48, 48], maxZoom: 13, duration: 250 });
      }
    }
    setTimeout(() => this.map?.updateSize());
  }

  private changeZoom(delta: number): void {
    const view = this.map?.getView();
    if (!view) {
      return;
    }
    const zoom = view.getZoom() ?? this.defaultZoom;
    view.animate({ zoom: zoom + delta, duration: 160 });
  }

  private matchesQuery(feature: Record<string, unknown>): boolean {
    const props = (feature["properties"] ?? {}) as Row;
    return (
      (!this.query.area || props["area"] === this.query.area || props["kawasan_kajian"] === this.query.area) &&
      (!this.query.development_type || props["jenis_pembangunan"] === this.query.development_type) &&
      (!this.query.land_use || props["guna_tanah"] === this.query.land_use)
    );
  }

  private pointStyle(feature: FeatureLike): Style {
    const status = this.statusForFeature(feature);
    const color = status === "Kritikal" ? "#D32F2F" : status === "Sederhana" ? "#FBC02D" : "#2E7D32";
    return new Style({
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({ color }),
        stroke: new Stroke({ color: "#ffffff", width: 2 })
      })
    });
  }

  private statusForFeature(feature: FeatureLike): AssessmentSummary["status"] {
    const area = String(feature.get("area") || feature.get("kawasan_kajian") || "");
    return this.areaStatus.get(area) ?? this.statusForEcc(this.num(feature.get("ecc")));
  }

  private buildAreaStatus(rows: Row[]): void {
    this.areaStatus.clear();
    const buckets = new Map<string, { sum: number; count: number }>();
    for (const row of rows) {
      const area = String(row["area"] || row["kawasan_kajian"] || "");
      if (!area) {
        continue;
      }
      const current = buckets.get(area) ?? { sum: 0, count: 0 };
      current.sum += this.num(row["ecc"]);
      current.count += 1;
      buckets.set(area, current);
    }
    for (const [area, bucket] of buckets.entries()) {
      this.areaStatus.set(area, this.statusForEcc(bucket.count ? bucket.sum / bucket.count : 0));
    }
  }

  private buildAssessment(rows: Row[]): AssessmentSummary {
    if (this.query.area) {
      return this.buildAssessmentForArea(rows, this.query.area);
    }
    const area = this.topArea(rows) || "Semua Kawasan";
    return this.buildAssessmentForArea(rows, area);
  }

  private buildAssessmentForArea(rows: Row[], area: string): AssessmentSummary {
    const scoped = rows.filter((row) => String(row["area"] || row["kawasan_kajian"] || "") === area);
    const sourceRows = scoped.length ? scoped : rows;
    const pcc = this.average(sourceRows, "pcc");
    const rcc = this.average(sourceRows, "rcc");
    const ecc = this.average(sourceRows, "ecc");
    const population = this.sum(sourceRows, "bil_penduduk");
    const visitors = this.sum(sourceRows, "bil_pengunjung");
    const status = this.statusForEcc(ecc);
    return {
      area,
      pcc,
      rcc,
      ecc,
      population,
      visitors,
      status,
      statusClass: status === "Kritikal" ? "status-critical" : status === "Sederhana" ? "status-moderate" : "status-suitable",
      recommendation: this.recommendation(status)
    };
  }

  private topArea(rows: Row[]): string {
    const totals = new Map<string, number>();
    for (const row of rows) {
      const area = String(row["area"] || row["kawasan_kajian"] || "");
      if (!area) {
        continue;
      }
      totals.set(area, (totals.get(area) ?? 0) + this.num(row["ecc"]));
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  }

  private statusForEcc(ecc: number): AssessmentSummary["status"] {
    if (ecc >= 1800) {
      return "Kritikal";
    }
    if (ecc >= 900) {
      return "Sederhana";
    }
    return "Sesuai";
  }

  private recommendation(status: AssessmentSummary["status"]): string {
    if (status === "Kritikal") {
      return "Kapasiti mampu dukung kawasan ini menghampiri tahap tepu. Sebarang pembangunan baharu perlu dinilai dengan lebih terperinci.";
    }
    if (status === "Sederhana") {
      return "Kawasan ini masih boleh dipertimbangkan untuk pembangunan terpilih, tertakluk kepada kawalan intensiti dan semakan infrastruktur.";
    }
    return "Kawasan ini berada pada tahap sesuai untuk perancangan terkawal dengan pemantauan berkala terhadap perubahan penduduk dan guna tanah.";
  }

  private average(rows: Row[], key: string): number {
    if (rows.length === 0) {
      return 0;
    }
    return Number((this.sum(rows, key) / rows.length).toFixed(2));
  }

  private sum(rows: Row[], key: string): number {
    return rows.reduce((total, row) => total + this.num(row[key]), 0);
  }

  private num(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
