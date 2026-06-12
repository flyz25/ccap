import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatOptionModule } from "@angular/material/core";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSelectModule } from "@angular/material/select";
import { forkJoin } from "rxjs";
import GeoJSON from "ol/format/GeoJSON";
import OlMap from "ol/Map";
import View from "ol/View";
import type Feature from "ol/Feature";
import type { FeatureLike } from "ol/Feature";
import type { Geometry } from "ol/geom";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import { fromLonLat } from "ol/proj";
import VectorSource from "ol/source/Vector";
import XYZ from "ol/source/XYZ";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import { defaults as defaultControls } from "ol/control/defaults";

import { DashboardOverview, KpiCard } from "../../core/models";
import { ApiService, DatasetQuery } from "../../core/services/api.service";
import { ChartCardComponent } from "../../shared/components/chart-card.component";

type Row = Record<string, unknown>;
type StudyAreaFeature = Feature<Geometry>;

interface StudyAreaLegendItem {
  name: string;
  color: string;
}

interface AssessmentSummary {
  area: string;
  pcc: number;
  rcc: number;
  ecc: number;
  population: number;
  visitors: number;
  load: number;
  saturationPct: number;
  capacityBalance: number;
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
            <div class="absolute right-4 top-4 z-10">
              <div class="legend-panel w-[176px] !p-3">
                <div class="filter-label">Peta Asas</div>
                <select class="filter-select" [(ngModel)]="selectedBaseMap" (ngModelChange)="setBaseMap($event)">
                  <option>Satelit</option>
                  <option>Topografi</option>
                  <option>Jalan</option>
                </select>
              </div>
            </div>
            <div class="legend-panel absolute bottom-4 right-4 z-10 w-[238px] !p-3">
              <div class="mb-2 text-xs font-extrabold uppercase text-ccap-navy">Kawasan Kajian</div>
              <div class="grid max-h-[132px] grid-cols-2 gap-1 overflow-auto pr-1 text-xs font-semibold text-ccap-steel">
                <button
                  *ngFor="let item of studyAreaLegend()"
                  class="flex w-full min-w-0 items-center gap-2 rounded px-1.5 py-1 text-left transition hover:bg-white/80"
                  [class.bg-white]="selectedStudyAreaName() === item.name"
                  type="button"
                  (click)="selectStudyAreaByName(item.name)"
                >
                  <span class="h-3 w-3 shrink-0 rounded-sm border border-white shadow" [style.background]="item.color"></span>
                  <span class="truncate">{{ item.name }}</span>
                </button>
              </div>
              <div class="mt-2 border-t border-ccap-line pt-2 text-[11px] font-semibold text-ccap-steel">
                <div class="mb-1 font-extrabold uppercase text-ccap-navy">Titik ECC</div>
                <div class="grid grid-cols-3 gap-1">
                  <span class="inline-flex items-center gap-1"><span class="h-3 w-3 rounded-full bg-[#16a34a]"></span>Sesuai</span>
                  <span class="inline-flex items-center gap-1"><span class="h-3 w-3 rounded-full bg-[#FBC02D]"></span>Sederhana</span>
                  <span class="inline-flex items-center gap-1"><span class="h-3 w-3 rounded-full bg-[#D32F2F]"></span>Kritikal</span>
                </div>
              </div>
              <button class="mt-3 inline-flex items-center gap-1.5 text-xs font-extrabold text-ccap-blue" type="button" (click)="openFullMap()">
                <mat-icon class="!text-sm">open_in_full</mat-icon>
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
              <div class="metric-label">Ketepuan</div>
              <div class="text-xl font-extrabold text-ccap-navy">{{ summary.saturationPct | number: "1.0-2" }}%</div>
            </div>
          </div>
          <div class="mt-4 rounded-md border border-ccap-line bg-ccap-mist p-3">
            <div class="mb-2 flex justify-between text-xs font-extrabold uppercase text-ccap-steel">
              <span>Beban {{ summary.load | number: "1.0-0" }}</span>
              <span>Baki {{ summary.capacityBalance | number: "1.0-0" }}</span>
            </div>
            <div class="h-2 rounded-full bg-slate-200">
              <div class="h-2 rounded-full" [style.background]="statusColor(summary.status)" [style.width.%]="minPercent(summary.saturationPct)"></div>
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
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly studyAreaSource = new VectorSource();
  private readonly source = new VectorSource();
  private readonly studyAreaLayer = new VectorLayer({
    source: this.studyAreaSource,
    style: (feature: FeatureLike) => this.studyAreaStyle(feature)
  });
  private readonly imageryLayer = new TileLayer({
    source: new XYZ({
      attributions: "Tiles © Esri",
      url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    })
  });
  private readonly topoLayer = new TileLayer({
    source: new XYZ({
      attributions: "Topographic © Esri",
      url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
    })
  });
  private readonly streetLayer = new TileLayer({
    source: new XYZ({
      attributions: "Streets © Esri",
      url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
    })
  });
  private readonly boundaryLabelLayer = new TileLayer({
    source: new XYZ({
      attributions: "Labels © Esri",
      url: "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
    })
  });
  private readonly roadLabelLayer = new TileLayer({
    source: new XYZ({
      attributions: "Road labels © Esri",
      url: "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
    })
  });
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
  readonly studyAreaLegend = signal<StudyAreaLegendItem[]>([]);
  readonly selectedStudyAreaName = signal<string | null>(null);
  readonly query: DatasetQuery = {
    area: "",
    development_type: "",
    land_use: ""
  };
  selectedBaseMap: "Satelit" | "Topografi" | "Jalan" = "Satelit";

  private map?: OlMap;
  private pendingFeatureCollection: Record<string, unknown> | null = null;
  private rawStudyAreaCollection: Record<string, unknown> | null = null;
  private readonly areaStatus = new Map<string, AssessmentSummary["status"]>();
  private readonly studyAreaColors = new Map<string, string>();
  private readonly geoStudyNameByKey = new Map<string, string>();
  private readonly defaultCenter = fromLonLat([101.38, 4.47]);
  private readonly defaultZoom = 10;
  private didFitStudyAreas = false;
  private readonly enterprisePalette = [
    "#19A7CE",
    "#7E57C2",
    "#2E7D32",
    "#E3A008",
    "#C2410C",
    "#2563EB",
    "#DB2777",
    "#0F766E",
    "#9333EA",
    "#64748B"
  ];
  private readonly studyAreaAliases: Record<string, string> = {
    "kecil lojing": "Lojing",
    lojing: "Lojing",
    "cameron highland": "Cameron Highlands",
    "cameron highlands": "Cameron Highlands",
    "hulu telom": "Cameron Highlands",
    "tanah rata": "Cameron Highlands",
    ringlet: "Cameron Highlands",
    "batang padang": "Batang Padang",
    kampar: "Kampar",
    teja: "Kampar",
    kinta: "Kinta",
    "hulu kinta": "Kinta",
    "sungai raia": "Kinta",
    lipis: "Lipis",
    "ulu jelai": "Lipis"
  };

  ngOnInit(): void {
    this.loadStudyAreas();
    this.load();
  }

  private createMap(target: HTMLDivElement): void {
    this.imageryLayer.setZIndex(0);
    this.topoLayer.setZIndex(0);
    this.streetLayer.setZIndex(0);
    this.boundaryLabelLayer.setZIndex(2);
    this.roadLabelLayer.setZIndex(3);
    this.studyAreaLayer.setZIndex(5);
    this.layer.setZIndex(10);
    this.setBaseMap(this.selectedBaseMap);
    this.map = new OlMap({
      target,
      layers: [
        this.imageryLayer,
        this.topoLayer,
        this.streetLayer,
        this.boundaryLabelLayer,
        this.roadLabelLayer,
        this.studyAreaLayer,
        this.layer
      ],
      controls: defaultControls({ zoom: false }),
      view: new View({
        center: this.defaultCenter,
        zoom: this.defaultZoom
      })
    });

    this.map.on("singleclick", (event) => {
      const pointFeature = this.map?.forEachFeatureAtPixel(event.pixel, (candidate) => candidate, {
        layerFilter: (candidateLayer) => candidateLayer === this.layer
      });
      if (pointFeature) {
        const props = { ...(pointFeature as { getProperties: () => Row }).getProperties() };
        delete props["geometry"];
        this.selectedFeature.set(props);
        this.assessment.set(this.buildAssessmentForArea(this.rows(), this.featureArea(props)));
        return;
      }
      const studyAreaFeature = this.map?.forEachFeatureAtPixel(event.pixel, (candidate) => candidate, {
        layerFilter: (candidateLayer) => candidateLayer === this.studyAreaLayer
      }) as StudyAreaFeature | undefined;
      if (studyAreaFeature) {
        this.selectStudyAreaFeature(studyAreaFeature, true);
        return;
      }
      if (this.selectedStudyAreaName()) {
        this.selectStudyAreaByName(null);
      } else {
        this.selectedFeature.set(null);
      }
    });

    setTimeout(() => this.map?.updateSize());
    this.renderStudyAreas();
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
    const studyAreaFeatures = this.studyAreaSource.getFeatures();
    if (studyAreaFeatures.length > 0) {
      const extent = this.studyAreaSource.getExtent();
      if (extent) {
        this.map.getView().fit(extent, { padding: [110, 150, 110, 150], maxZoom: 8, duration: 250 });
      }
      return;
    }
    if (features.length === 0) {
      this.map.getView().animate({ center: this.defaultCenter, zoom: this.defaultZoom, duration: 180 });
      return;
    }
    const extent = this.source.getExtent();
    if (extent) {
      this.map.getView().fit(extent, { padding: [80, 80, 80, 80], maxZoom: 12, duration: 250 });
    }
  }

  togglePointLayer(): void {
    this.layer.setVisible(!this.layer.getVisible());
  }

  setBaseMap(baseMap: "Satelit" | "Topografi" | "Jalan"): void {
    this.selectedBaseMap = baseMap;
    this.imageryLayer.setVisible(baseMap === "Satelit");
    this.topoLayer.setVisible(baseMap === "Topografi");
    this.streetLayer.setVisible(baseMap === "Jalan");
    this.boundaryLabelLayer.setVisible(baseMap === "Satelit");
    this.roadLabelLayer.setVisible(baseMap === "Satelit");
  }

  openFullMap(): void {
    this.router.navigateByUrl("/map");
  }

  load(): void {
    this.loading.set(true);
    this.selectedFeature.set(null);
    this.selectedStudyAreaName.set(null);
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
        this.renderStudyAreas();
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
        this.map.getView().fit(extent, { padding: [80, 80, 80, 80], maxZoom: 12, duration: 250 });
      }
    }
    setTimeout(() => this.map?.updateSize());
  }

  selectStudyAreaByName(name: string | null): void {
    this.selectedStudyAreaName.set(name || null);
    this.studyAreaLayer.changed();
    if (this.pendingFeatureCollection) {
      this.renderMap(this.pendingFeatureCollection);
    }
    if (name) {
      this.assessment.set(this.buildAssessmentForStudyArea(this.rows(), name));
      this.fitStudyArea(name);
    } else {
      this.assessment.set(this.buildAssessment(this.rows()));
      this.resetMapView();
    }
  }

  private loadStudyAreas(): void {
    this.http.get<Record<string, unknown>>("assets/geo/malaysia.district.geojson").subscribe({
      next: (collection) => {
        this.rawStudyAreaCollection = collection;
        this.renderStudyAreas();
      },
      error: () => this.studyAreaLegend.set([])
    });
  }

  private renderStudyAreas(): void {
    if (!this.rawStudyAreaCollection || this.rows().length === 0) {
      return;
    }
    const allFeatures = new GeoJSON().readFeatures(this.rawStudyAreaCollection, { featureProjection: "EPSG:3857" }) as StudyAreaFeature[];
    this.geoStudyNameByKey.clear();
    for (const feature of allFeatures) {
      const sourceName = this.studyAreaSourceName(feature);
      const displayName = this.studyAreaDisplayName(feature);
      this.geoStudyNameByKey.set(this.normalize(sourceName), displayName);
      this.geoStudyNameByKey.set(this.normalize(displayName), displayName);
    }
    const targetNames = new Set(this.rows().map((row) => this.studyAreaNameForRow(row)).filter(Boolean));
    const renderedFeatures = allFeatures
      .filter((feature) => targetNames.has(this.studyAreaDisplayName(feature)))
      .sort((a, b) => this.studyAreaDisplayName(a).localeCompare(this.studyAreaDisplayName(b)));
    this.assignStudyAreaColors(renderedFeatures);
    this.studyAreaSource.clear();
    this.studyAreaSource.addFeatures(renderedFeatures);
    this.studyAreaLegend.set(renderedFeatures.map((feature) => {
      const name = this.studyAreaDisplayName(feature);
      return { name, color: this.studyAreaColors.get(name) ?? this.enterprisePalette[0] };
    }));
    this.studyAreaLayer.changed();
    if (!this.didFitStudyAreas && renderedFeatures.length > 0) {
      this.didFitStudyAreas = true;
      const extent = this.studyAreaSource.getExtent();
      if (extent) {
        setTimeout(() => this.map?.getView().fit(extent, { padding: [110, 150, 110, 150], maxZoom: 8, duration: 250 }));
      }
    }
  }

  private selectStudyAreaFeature(feature: StudyAreaFeature, fit = false): void {
    const name = this.studyAreaDisplayName(feature);
    this.selectedStudyAreaName.set(name);
    this.assessment.set(this.buildAssessmentForStudyArea(this.rows(), name));
    this.studyAreaLayer.changed();
    if (this.pendingFeatureCollection) {
      this.renderMap(this.pendingFeatureCollection);
    }
    if (fit) {
      this.fitFeature(feature);
    }
  }

  private fitStudyArea(name: string): void {
    const feature = this.studyAreaSource.getFeatures().find((candidate) => this.studyAreaDisplayName(candidate as StudyAreaFeature) === name) as StudyAreaFeature | undefined;
    if (feature) {
      this.fitFeature(feature);
    }
  }

  private fitFeature(feature: StudyAreaFeature): void {
    const geometry = feature.getGeometry();
    if (geometry) {
      this.map?.getView().fit(geometry.getExtent(), { padding: [95, 95, 95, 95], maxZoom: 10, duration: 280 });
    }
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
      (!this.selectedStudyAreaName() || this.studyAreaNameForRow(props) === this.selectedStudyAreaName()) &&
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

  private studyAreaStyle(feature: FeatureLike): Style {
    const name = this.studyAreaDisplayName(feature as StudyAreaFeature);
    const color = this.studyAreaColors.get(name) ?? this.enterprisePalette[0];
    const selected = this.selectedStudyAreaName() === name;
    return new Style({
      fill: new Fill({ color: this.hexToRgba(color, selected ? 0.76 : 0.52) }),
      stroke: new Stroke({ color: "#FFFFFF", width: selected ? 4 : 2 }),
      zIndex: selected ? 9 : 5
    });
  }

  private statusForFeature(feature: FeatureLike): AssessmentSummary["status"] {
    const area = String(feature.get("area") || feature.get("kawasan_kajian") || "");
    return this.areaStatus.get(area) ?? this.statusForLoad(
      this.num(feature.get("bil_penduduk")) + this.num(feature.get("bil_pengunjung")),
      this.num(feature.get("ecc"))
    );
  }

  private buildAreaStatus(rows: Row[]): void {
    this.areaStatus.clear();
    const buckets = new Map<string, { capacity: number; population: number; visitors: number }>();
    for (const row of rows) {
      const area = String(row["area"] || row["kawasan_kajian"] || "");
      if (!area) {
        continue;
      }
      const current = buckets.get(area) ?? { capacity: 0, population: 0, visitors: 0 };
      current.capacity += this.num(row["ecc"]);
      current.population = Math.max(current.population, this.num(row["bil_penduduk"]));
      current.visitors = Math.max(current.visitors, this.num(row["bil_pengunjung"]));
      buckets.set(area, current);
    }
    for (const [area, bucket] of buckets.entries()) {
      this.areaStatus.set(area, this.statusForLoad(bucket.population + bucket.visitors, bucket.capacity));
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
    const pcc = this.sum(sourceRows, "pcc");
    const rcc = this.sum(sourceRows, "rcc");
    const ecc = this.sum(sourceRows, "ecc");
    const population = this.max(sourceRows, "bil_penduduk");
    const visitors = this.max(sourceRows, "bil_pengunjung");
    const load = population + visitors;
    const saturationPct = this.saturationPct(load, ecc);
    const capacityBalance = ecc - load;
    const status = this.statusForLoad(load, ecc);
    return {
      area,
      pcc,
      rcc,
      ecc,
      population,
      visitors,
      load,
      saturationPct,
      capacityBalance,
      status,
      statusClass: status === "Kritikal" ? "status-critical" : status === "Sederhana" ? "status-moderate" : "status-suitable",
      recommendation: this.recommendation(status, saturationPct, capacityBalance)
    };
  }

  private buildAssessmentForStudyArea(rows: Row[], studyArea: string): AssessmentSummary {
    const scoped = rows.filter((row) => this.studyAreaNameForRow(row) === studyArea);
    return this.buildAssessmentFromRows(scoped.length ? scoped : rows, studyArea);
  }

  private buildAssessmentFromRows(sourceRows: Row[], area: string): AssessmentSummary {
    const pcc = this.sum(sourceRows, "pcc");
    const rcc = this.sum(sourceRows, "rcc");
    const ecc = this.sum(sourceRows, "ecc");
    const population = this.max(sourceRows, "bil_penduduk");
    const visitors = this.max(sourceRows, "bil_pengunjung");
    const load = population + visitors;
    const saturationPct = this.saturationPct(load, ecc);
    const capacityBalance = ecc - load;
    const status = this.statusForLoad(load, ecc);
    return {
      area,
      pcc,
      rcc,
      ecc,
      population,
      visitors,
      load,
      saturationPct,
      capacityBalance,
      status,
      statusClass: status === "Kritikal" ? "status-critical" : status === "Sederhana" ? "status-moderate" : "status-suitable",
      recommendation: this.recommendation(status, saturationPct, capacityBalance)
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

  private assignStudyAreaColors(features: StudyAreaFeature[]): void {
    this.studyAreaColors.clear();
    const assigned = new Map<string, string>();
    for (const feature of features) {
      const name = this.studyAreaDisplayName(feature);
      const preferredIndex = this.hash(name) % this.enterprisePalette.length;
      const orderedPalette = [
        ...this.enterprisePalette.slice(preferredIndex),
        ...this.enterprisePalette.slice(0, preferredIndex)
      ];
      assigned.set(name, orderedPalette.find((color) => ![...assigned.values()].includes(color)) ?? orderedPalette[0]);
    }
    for (const [name, color] of assigned.entries()) {
      this.studyAreaColors.set(name, color);
    }
  }

  private studyAreaNameForRow(row: Row): string {
    const candidates = [row["kawasan_kajian"], row["area"]];
    for (const value of candidates) {
      const resolved = this.resolveStudyAreaName(value);
      if (resolved) {
        return resolved;
      }
    }
    return "";
  }

  private resolveStudyAreaName(value: unknown): string {
    const key = this.normalize(value);
    if (!key) {
      return "";
    }
    if (this.studyAreaAliases[key]) {
      return this.studyAreaAliases[key];
    }
    return this.geoStudyNameByKey.get(key) ?? "";
  }

  private studyAreaSourceName(feature: StudyAreaFeature): string {
    const props = feature.getProperties() as Row;
    return String(props["name"] || props["district"] || props["daerah"] || props["DISTRICT"] || props["NAM"] || "");
  }

  private studyAreaDisplayName(feature: StudyAreaFeature): string {
    const sourceName = this.studyAreaSourceName(feature);
    return this.studyAreaAliases[this.normalize(sourceName)] ?? sourceName;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const value = hex.replace("#", "");
    const red = parseInt(value.slice(0, 2), 16);
    const green = parseInt(value.slice(2, 4), 16);
    const blue = parseInt(value.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  private hash(value: string): number {
    return [...value].reduce((total, char) => ((total << 5) - total + char.charCodeAt(0)) >>> 0, 0);
  }

  private normalize(value: unknown): string {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  minPercent(value: number): number {
    return Math.min(100, Math.max(0, value));
  }

  statusColor(status: AssessmentSummary["status"]): string {
    return status === "Kritikal" ? "#D32F2F" : status === "Sederhana" ? "#FBC02D" : "#16A34A";
  }

  private statusForLoad(load: number, capacity: number): AssessmentSummary["status"] {
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

  private saturationPct(load: number, capacity: number): number {
    return capacity > 0 ? Number(((load / capacity) * 100).toFixed(2)) : 0;
  }

  private recommendation(status: AssessmentSummary["status"], saturationPct: number, capacityBalance: number): string {
    if (status === "Kritikal") {
      return `Kawasan ini melebihi kapasiti tampungan (${saturationPct.toFixed(2)}%). Baki kapasiti ${this.formatNumber(capacityBalance)}; pembangunan baharu perlu ditahan atau diaudit semula.`;
    }
    if (status === "Sederhana") {
      return `Kawasan ini berada pada tahap berjaga-jaga (${saturationPct.toFixed(2)}%). Pembangunan terpilih masih boleh dipertimbang dengan kawalan intensiti.`;
    }
    return `Kawasan ini masih di bawah kapasiti tampungan (${saturationPct.toFixed(2)}%). Teruskan pemantauan berkala terhadap penduduk, pengunjung dan guna tanah.`;
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

  private max(rows: Row[], key: string): number {
    return rows.reduce((highest, row) => Math.max(highest, this.num(row[key])), 0);
  }

  private num(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
