import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatOptionModule } from "@angular/material/core";
import { MatSelectModule } from "@angular/material/select";
import type { FeatureLike } from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import OlMap from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import { fromLonLat } from "ol/proj";
import VectorSource from "ol/source/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import XYZ from "ol/source/XYZ";
import type Feature from "ol/Feature";
import type { Geometry } from "ol/geom";
import { defaults as defaultControls } from "ol/control/defaults";

import { MapLayer } from "../../core/models";
import { ApiService } from "../../core/services/api.service";

type Row = Record<string, unknown>;
type StudyAreaFeature = Feature<Geometry>;

interface StudyAreaLegendItem {
  name: string;
  color: string;
}

interface HoverTooltip {
  name: string;
  x: number;
  y: number;
}

@Component({
  selector: "ccap-map",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatOptionModule,
    MatSelectModule
  ],
  template: `
    <div class="page-shell" [ngClass]="{ 'fixed inset-0 z-50 overflow-auto bg-ccap-mist p-4': fullMapMode() }">
    <div class="page-header" *ngIf="!fullMapMode()">
      <div>
        <h1 class="page-title">Peta GIS</h1>
        <div class="page-subtitle">Visualisasi titik spatial, taburan ECC dan maklumat kawasan</div>
      </div>
      <div class="page-actions">
        <label class="filter-card">
          <span class="filter-label">Kawasan</span>
          <select class="filter-select" [ngModel]="selectedStudyAreaName()" (ngModelChange)="selectStudyAreaByName($event || null)">
            <option value="">Semua Kawasan</option>
            <option *ngFor="let area of studyAreaLegend()" [value]="area.name">{{ area.name }}</option>
          </select>
        </label>
        <label class="filter-card">
          <span class="filter-label">Set Data</span>
          <select class="filter-select" [(ngModel)]="selectedLayer" (ngModelChange)="loadPoints()">
            <option *ngFor="let layer of layers()" [value]="layer.id">{{ layerLabel(layer) }}</option>
          </select>
        </label>
        <label class="filter-card !w-[260px]">
          <span class="filter-label">Carian</span>
          <input class="filter-select" [(ngModel)]="searchText" (ngModelChange)="renderFeatures()" placeholder="Carian kawasan..." />
        </label>
      </div>
    </div>

    <section class="grid grid-cols-1 gap-4 md:grid-cols-2 min-[1600px]:grid-cols-4">
      <div class="panel kpi-card">
        <span class="kpi-icon kpi-icon-blue"><mat-icon>location_on</mat-icon></span>
        <div><div class="metric-label">Jumlah Titik</div><div class="metric-value">{{ featureCount() | number }}</div><div class="text-sm font-semibold text-ccap-steel">{{ layerName() }}</div></div>
      </div>
      <div class="panel kpi-card">
        <span class="kpi-icon kpi-icon-indigo"><mat-icon>polyline</mat-icon></span>
        <div><div class="metric-label">Kawasan Dipilih</div><div class="truncate text-2xl font-extrabold text-ccap-navy">{{ selectedAreaLabel() }}</div><div class="text-sm font-semibold text-ccap-steel">Klik polygon atau titik pada peta</div></div>
      </div>
      <div class="panel kpi-card">
        <span class="kpi-icon kpi-icon-amber"><mat-icon>eco</mat-icon></span>
        <div><div class="metric-label">Purata ECC</div><div class="metric-value">{{ averageEcc() | number: "1.0-2" }}</div><div class="text-sm font-semibold text-ccap-steel">indeks kapasiti</div></div>
      </div>
      <div class="panel kpi-card">
        <span class="kpi-icon"><mat-icon>groups</mat-icon></span>
        <div><div class="metric-label">Penduduk</div><div class="metric-value">{{ totalPopulation() | number: "1.0-0" }}</div><div class="text-sm font-semibold text-ccap-steel">Jumlah rekod dipapar</div></div>
      </div>
    </section>

    <section class="grid gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)]">
      <div class="panel overflow-hidden">
        <div class="relative">
          <div
            #mapContainer
            [ngClass]="fullMapMode() ? 'h-[calc(100vh-2rem)] min-h-[620px] w-full' : 'h-[calc(100vh-310px)] min-h-[560px] max-h-[760px] w-full'"
          ></div>
          <div class="map-control-stack">
            <button class="map-control" type="button" title="Zum masuk" aria-label="Zum masuk" (click)="zoomIn()">+</button>
            <button class="map-control" type="button" title="Zum keluar" aria-label="Zum keluar" (click)="zoomOut()">-</button>
            <button class="map-control mt-3" type="button" title="Kembali ke paparan penuh" aria-label="Kembali ke paparan penuh" (click)="resetMapView()"><mat-icon>my_location</mat-icon></button>
            <button class="map-control" type="button" title="Togol lapisan titik" aria-label="Togol lapisan titik" (click)="togglePointLayer()"><mat-icon>layers</mat-icon></button>
            <button class="map-control" type="button" [title]="fullMapMode() ? 'Keluar peta penuh' : 'Lihat peta penuh'" [attr.aria-label]="fullMapMode() ? 'Keluar peta penuh' : 'Lihat peta penuh'" (click)="toggleFullMap()"><mat-icon>{{ fullMapMode() ? "close_fullscreen" : "open_in_full" }}</mat-icon></button>
            <button class="map-control" type="button" title="Cetak peta" aria-label="Cetak peta" (click)="printMap()"><mat-icon>print</mat-icon></button>
          </div>
          <div class="absolute right-5 top-5 z-10 space-y-3">
            <div class="legend-panel w-[176px] !p-3">
              <div class="filter-label">Peta Asas</div>
              <select class="filter-select" [(ngModel)]="selectedBaseMap" (ngModelChange)="setBaseMap($event)">
                <option>Satelit</option>
                <option>Topografi</option>
                <option>Jalan</option>
              </select>
            </div>
            <div class="legend-panel flex items-center justify-between gap-3 !p-3">
              <span class="inline-flex items-center gap-2 font-extrabold text-ccap-blue"><mat-icon>layers</mat-icon> Lapisan</span>
              <span class="rounded-full bg-ccap-blue px-2 py-0.5 text-xs font-extrabold text-white">3</span>
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
            <button class="mt-3 inline-flex items-center gap-1.5 text-xs font-extrabold text-ccap-blue" type="button" (click)="toggleFullMap()">
              <mat-icon class="!text-sm">{{ fullMapMode() ? "close_fullscreen" : "open_in_full" }}</mat-icon>
              {{ fullMapMode() ? "Keluar Peta Penuh" : "Lihat Peta Penuh" }}
            </button>
          </div>
          <div
            *ngIf="hoverTooltip() as tooltip"
            class="pointer-events-none absolute z-20 rounded-md border border-white/50 bg-slate-950/85 px-3 py-2 text-xs font-extrabold text-white shadow-xl"
            [style.left.px]="tooltip.x"
            [style.top.px]="tooltip.y"
          >
            {{ tooltip.name }}
          </div>
        </div>
      </div>
      <aside class="panel p-5" *ngIf="!fullMapMode()">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="section-title !text-base">Maklumat Kawasan</h2>
          <span *ngIf="selectedFeature()" class="status-badge" [ngClass]="statusClass(selectedFeature())">
            <span class="h-2 w-2 rounded-full bg-current"></span>
            {{ statusLabel(selectedFeature()) }}
          </span>
        </div>
        <ng-container *ngIf="selectedFeature(); else empty">
          <div class="space-y-4 text-sm">
            <section class="rounded-md border border-ccap-line p-4">
              <h3 class="mb-3 font-extrabold text-ccap-navy">Maklumat Umum</h3>
              <div class="space-y-2">
                <div *ngFor="let item of generalInfoRows()" class="flex justify-between gap-4"><span class="text-ccap-steel">{{ item.label }}</span><b class="text-right text-ccap-navy">{{ item.value }}</b></div>
              </div>
            </section>
            <section class="rounded-md border border-ccap-line p-4">
              <h3 class="mb-3 font-extrabold text-ccap-navy">Indeks Kapasiti</h3>
              <div class="grid grid-cols-3 gap-3">
                <div *ngFor="let item of capacityInfoRows()" class="rounded-md border border-ccap-line bg-ccap-mist p-3"><div class="metric-label">{{ item.label }}</div><div class="text-xl font-extrabold text-ccap-blue">{{ item.value }}</div></div>
              </div>
              <div class="mt-4 space-y-2">
                <div class="flex justify-between"><span class="text-ccap-steel">Kesesuaian</span><span class="status-badge" [ngClass]="statusClass(selectedFeature())">{{ statusLabel(selectedFeature()) }}</span></div>
                <div class="flex justify-between"><span class="text-ccap-steel">Tekanan Pembangunan</span><b class="text-ccap-navy">{{ pressureLabel(selectedFeature()) }}</b></div>
              </div>
            </section>
            <section class="rounded-md border border-ccap-line p-4">
              <h3 class="mb-3 font-extrabold text-ccap-navy">Maklumat Demografi</h3>
              <div class="space-y-2">
                <div *ngFor="let item of demographicInfoRows()" class="flex justify-between gap-4"><span class="text-ccap-steel">{{ item.label }}</span><b class="text-right text-ccap-navy">{{ item.value }}</b></div>
              </div>
            </section>
            <section
              class="rounded-md border p-4"
              [ngClass]="{
                'border-red-200 bg-red-50': statusLabel(selectedFeature()) === 'Kritikal',
                'border-amber-200 bg-amber-50': statusLabel(selectedFeature()) === 'Sederhana',
                'border-green-200 bg-green-50': statusLabel(selectedFeature()) === 'Sesuai'
              }"
            >
              <div class="flex gap-3">
                <mat-icon
                  [ngClass]="{
                    'text-ccap-critical': statusLabel(selectedFeature()) === 'Kritikal',
                    'text-[#B7791F]': statusLabel(selectedFeature()) === 'Sederhana',
                    'text-ccap-blue': statusLabel(selectedFeature()) === 'Sesuai'
                  }"
                >{{ statusLabel(selectedFeature()) === "Kritikal" ? "error" : statusLabel(selectedFeature()) === "Sederhana" ? "warning" : "check_circle" }}</mat-icon>
                <div class="font-semibold leading-6 text-ccap-steel">{{ advisoryMessage(selectedFeature()) }}</div>
              </div>
            </section>
          </div>
        </ng-container>
        <ng-template #empty>
          <div class="rounded-md border border-ccap-line bg-ccap-mist p-4 text-sm font-semibold leading-6 text-ccap-steel">
            Pilih satu titik GIS untuk melihat PCC, RCC, ECC, penduduk, jenis pembangunan, guna tanah dan kesesuaian kawasan.
          </div>
        </ng-template>
      </aside>
    </section>
    </div>
  `
})
export class MapComponent implements AfterViewInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
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

  @ViewChild("mapContainer", { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  readonly layers = signal<MapLayer[]>([]);
  readonly selectedFeature = signal<Row | null>(null);
  readonly featureCount = signal(0);
  readonly averageEcc = signal(0);
  readonly totalPopulation = signal(0);
  readonly areaOptions = signal<string[]>([]);
  readonly studyAreaLegend = signal<StudyAreaLegendItem[]>([]);
  readonly selectedStudyAreaName = signal<string | null>(null);
  readonly hoverTooltip = signal<HoverTooltip | null>(null);
  readonly fullMapMode = signal(false);

  selectedLayer = "ecc_spk_map";
  selectedBaseMap: "Satelit" | "Topografi" | "Jalan" = "Satelit";
  searchText = "";
  private map?: OlMap;
  private rawFeatureCollection: Record<string, unknown> | null = null;
  private rawStudyAreaCollection: Record<string, unknown> | null = null;
  private pointRows: Row[] = [];
  private readonly studyAreaColors = new Map<string, string>();
  private readonly geoStudyNameByKey = new Map<string, string>();
  private readonly areaStatus = new Map<string, "Sesuai" | "Sederhana" | "Kritikal">();
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

  ngAfterViewInit(): void {
    this.imageryLayer.setZIndex(0);
    this.topoLayer.setZIndex(0);
    this.streetLayer.setZIndex(0);
    this.boundaryLabelLayer.setZIndex(2);
    this.roadLabelLayer.setZIndex(3);
    this.studyAreaLayer.setZIndex(5);
    this.layer.setZIndex(10);
    this.setBaseMap(this.selectedBaseMap);
    this.map = new OlMap({
      target: this.mapContainer.nativeElement,
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

    this.map.on("pointermove", (event) => {
      const feature = this.map?.forEachFeatureAtPixel(event.pixel, (candidate) => candidate, {
        layerFilter: (candidateLayer) => candidateLayer === this.studyAreaLayer
      }) as StudyAreaFeature | undefined;
      const target = this.map?.getTargetElement();
      if (!feature || event.dragging) {
        this.hoverTooltip.set(null);
        if (target) {
          target.style.cursor = "";
        }
        this.studyAreaLayer.changed();
        return;
      }
      const name = this.studyAreaDisplayName(feature);
      this.hoverTooltip.set({ name, x: event.pixel[0] + 14, y: event.pixel[1] + 14 });
      if (target) {
        target.style.cursor = "pointer";
      }
      this.studyAreaLayer.changed();
    });

    setTimeout(() => this.map?.updateSize());
    this.api.layers().subscribe((layers) => this.layers.set(layers));
    this.loadStudyAreas();
    this.loadPoints();
  }

  ngOnDestroy(): void {
    this.map?.setTarget(undefined);
  }

  loadPoints(): void {
    this.api.points(this.selectedLayer).subscribe((collection) => {
      this.rawFeatureCollection = collection;
      this.selectedStudyAreaName.set(null);
      this.renderFeatures();
    });
  }

  private loadStudyAreas(): void {
    this.http.get<Record<string, unknown>>("assets/geo/malaysia.district.geojson").subscribe({
      next: (collection) => {
        this.rawStudyAreaCollection = collection;
        this.renderStudyAreas();
      },
      error: () => {
        this.studyAreaLegend.set([]);
      }
    });
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
        this.map.getView().fit(extent, { padding: [130, 170, 130, 170], maxZoom: 8, duration: 250 });
      }
      return;
    }
    if (features.length === 0) {
      this.map.getView().animate({ center: this.defaultCenter, zoom: this.defaultZoom, duration: 180 });
      return;
    }
      const extent = this.source.getExtent();
      if (extent) {
        this.map.getView().fit(extent, { padding: [90, 90, 90, 90], maxZoom: 12, duration: 250 });
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

  toggleFullMap(): void {
    this.fullMapMode.update((value) => !value);
    setTimeout(() => {
      this.map?.updateSize();
      this.resetMapView();
    }, 50);
  }

  printMap(): void {
    window.print();
  }

  renderFeatures(): void {
    if (!this.rawFeatureCollection) {
      return;
    }
    const search = this.searchText.trim().toLowerCase();
    const features = Array.isArray(this.rawFeatureCollection["features"]) ? this.rawFeatureCollection["features"] : [];
    const properties = features.map((feature) => ((feature as Record<string, unknown>)["properties"] ?? {}) as Row);
    this.pointRows = properties;
    this.buildAreaStatus(properties);
    this.renderStudyAreas();

    const selectedStudyArea = this.selectedStudyAreaName();
    const filtered = features.filter((feature, index) => {
      const row = properties[index] ?? {};
      const matchesSearch = search ? JSON.stringify(row).toLowerCase().includes(search) : true;
      const matchesStudyArea = selectedStudyArea ? this.studyAreaNameForRow(row) === selectedStudyArea : true;
      return matchesSearch && matchesStudyArea;
    });
    const filteredProperties = filtered.map((feature) => ((feature as Record<string, unknown>)["properties"] ?? {}) as Row);
    const collection = { ...this.rawFeatureCollection, features: filtered };
    const parsed = new GeoJSON().readFeatures(collection, { featureProjection: "EPSG:3857" });
    this.source.clear();
    this.source.addFeatures(parsed);
    this.layer.changed();
    this.featureCount.set(parsed.length);
    this.averageEcc.set(this.average(filteredProperties, "ecc"));
    this.totalPopulation.set(this.sum(filteredProperties, "bil_penduduk"));
    this.areaOptions.set([...new Set(properties.map((row) => String(row["area"] || row["kawasan_kajian"] || "")).filter(Boolean))].sort());
    this.selectedFeature.set([...filteredProperties].sort((a, b) => this.num(b["ecc"]) - this.num(a["ecc"]))[0] ?? null);
    if (parsed.length > 0 && this.studyAreaSource.getFeatures().length === 0) {
      const extent = this.source.getExtent();
      if (extent) {
        this.map?.getView().fit(extent, { padding: [90, 90, 90, 90], maxZoom: 12, duration: 250 });
      }
    }
    setTimeout(() => this.map?.updateSize());
  }

  selectStudyAreaByName(name: string | null): void {
    this.selectedStudyAreaName.set(name || null);
    this.renderFeatures();
    this.studyAreaLayer.changed();
    if (name) {
      this.fitStudyArea(name);
    } else {
      this.resetMapView();
    }
  }

  private renderStudyAreas(): void {
    if (!this.rawStudyAreaCollection) {
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

    const targetNames = new Set(this.pointRows.map((row) => this.studyAreaNameForRow(row)).filter(Boolean));
    const renderedFeatures = allFeatures.filter((feature) => targetNames.has(this.studyAreaDisplayName(feature)));

    const sortedFeatures = [...renderedFeatures].sort((a, b) => this.studyAreaDisplayName(a).localeCompare(this.studyAreaDisplayName(b)));
    this.assignStudyAreaColors(sortedFeatures);
    this.studyAreaSource.clear();
    this.studyAreaSource.addFeatures(sortedFeatures);
    this.studyAreaLegend.set(sortedFeatures.map((feature) => {
      const name = this.studyAreaDisplayName(feature);
      return { name, color: this.studyAreaColors.get(name) ?? this.enterprisePalette[0] };
    }));
    this.studyAreaLayer.changed();

    if (!this.didFitStudyAreas && sortedFeatures.length > 0) {
      this.didFitStudyAreas = true;
      const extent = this.studyAreaSource.getExtent();
      if (extent) {
        setTimeout(() => this.map?.getView().fit(extent, { padding: [130, 170, 130, 170], maxZoom: 8, duration: 250 }));
      }
    }
  }

  private selectStudyAreaFeature(feature: StudyAreaFeature, fit = false): void {
    const name = this.studyAreaDisplayName(feature);
    this.selectedStudyAreaName.set(name);
    this.renderFeatures();
    this.studyAreaLayer.changed();
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
    if (!geometry) {
      return;
    }
    this.map?.getView().fit(geometry.getExtent(), { padding: [120, 120, 120, 120], maxZoom: 10, duration: 280 });
  }

  private changeZoom(delta: number): void {
    const view = this.map?.getView();
    if (!view) {
      return;
    }
    const zoom = view.getZoom() ?? this.defaultZoom;
    view.animate({ zoom: zoom + delta, duration: 160 });
  }

  layerLabel(layer: MapLayer): string {
    const labels: Record<string, string> = {
      "ECC SPK Map": "Peta ECC SPK",
      "Zoning Map": "Peta Guna Tanah",
      "Optimum Map": "Peta Optimum",
      Ketepuan: "Ketepuan"
    };
    return labels[layer.label] ?? layer.label;
  }

  layerName(): string {
    const layer = this.layers().find((item) => item.id === this.selectedLayer);
    return layer ? this.layerLabel(layer) : "Peta ECC SPK";
  }

  selectedAreaLabel(): string {
    const selectedStudyArea = this.selectedStudyAreaName();
    if (selectedStudyArea) {
      return selectedStudyArea;
    }
    const feature = this.selectedFeature();
    return feature ? String(feature["area"] || feature["kawasan_kajian"] || "-") : "-";
  }

  generalInfoRows(): Array<{ label: string; value: string }> {
    const feature = this.selectedFeature();
    if (!feature) {
      return [];
    }
    return [
      { label: "Nama Kawasan", value: String(feature["area"] || feature["kawasan_kajian"] || "-") },
      { label: "Daerah", value: "Cameron Highlands" },
      { label: "Negeri", value: "Pahang" },
      { label: "ID Kawasan", value: String(feature["source_no"] ? `SPK-CH-${feature["source_no"]}` : "SPK-CH") }
    ];
  }

  capacityInfoRows(): Array<{ label: string; value: string }> {
    const feature = this.selectedFeature();
    if (!feature) {
      return [];
    }
    return [
      { label: "PCC", value: this.formatNumber(feature["pcc"]) },
      { label: "RCC", value: this.formatNumber(feature["rcc"]) },
      { label: "ECC", value: this.formatNumber(feature["ecc"]) }
    ];
  }

  demographicInfoRows(): Array<{ label: string; value: string }> {
    const feature = this.selectedFeature();
    if (!feature) {
      return [];
    }
    return [
      { label: "Penduduk", value: this.formatNumber(feature["bil_penduduk"]) },
      { label: "Pengunjung", value: this.formatNumber(feature["bil_pengunjung"]) },
      { label: "Jenis Pembangunan", value: String(feature["jenis_pembangunan"] || "-") },
      { label: "Guna Tanah", value: String(feature["guna_tanah"] || "-") },
      { label: "Ketinggian", value: String(feature["ketinggian_tanah"] || "-") }
    ];
  }

  statusLabel(feature: Row | null): "Sesuai" | "Sederhana" | "Kritikal" {
    if (!feature) {
      return "Sesuai";
    }
    const area = String(feature["area"] || feature["kawasan_kajian"] || "");
    return this.areaStatus.get(area) ?? this.statusForLoad(
      this.num(feature["bil_penduduk"]) + this.num(feature["bil_pengunjung"]),
      this.num(feature["ecc"])
    );
  }

  statusClass(feature: Row | null): string {
    const status = this.statusLabel(feature);
    return status === "Kritikal" ? "status-critical" : status === "Sederhana" ? "status-moderate" : "status-suitable";
  }

  pressureLabel(feature: Row | null): string {
    const status = this.statusLabel(feature);
    if (status === "Kritikal") {
      return "Tinggi";
    }
    if (status === "Sederhana") {
      return "Perlu Pemerhatian";
    }
    return "Terkawal";
  }

  advisoryMessage(feature: Row | null): string {
    const status = this.statusLabel(feature);
    if (status === "Kritikal") {
      return "Beban kawasan melebihi kapasiti. Sebarang pembangunan baharu perlu ditangguh atau dinilai semula dengan audit terperinci.";
    }
    if (status === "Sederhana") {
      return "Kawasan berada pada tahap pemerhatian. Kawal suntikan penduduk dan semak faktor kapasiti sebelum kelulusan baharu.";
    }
    return "Kapasiti kawasan masih berbaki mengikut audit v1. Kekalkan pemantauan berkala dan sahkan input faktor apabila data baharu diterima.";
  }

  private pointStyle(feature: FeatureLike): Style {
    const area = String(feature.get("area") || feature.get("kawasan_kajian") || "");
    const status = this.areaStatus.get(area) ?? this.statusForLoad(
      this.num(feature.get("bil_penduduk")) + this.num(feature.get("bil_pengunjung")),
      this.num(feature.get("ecc"))
    );
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
    const hovered = this.hoverTooltip()?.name === name;
    return new Style({
      fill: new Fill({ color: this.hexToRgba(color, selected ? 0.78 : hovered ? 0.7 : 0.55) }),
      stroke: new Stroke({
        color: selected ? "#F8FAFC" : "#FFFFFF",
        width: selected ? 4 : hovered ? 3 : 2
      }),
      zIndex: selected ? 9 : hovered ? 8 : 5
    });
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

  private assignStudyAreaColors(features: StudyAreaFeature[]): void {
    this.studyAreaColors.clear();
    const assigned = new Map<string, string>();
    for (const feature of features) {
      const name = this.studyAreaDisplayName(feature);
      const neighborColors = new Set<string>();
      const extent = feature.getGeometry()?.getExtent();
      if (extent) {
        for (const other of features) {
          const otherName = this.studyAreaDisplayName(other);
          const otherColor = assigned.get(otherName);
          const otherExtent = other.getGeometry()?.getExtent();
          if (otherColor && otherExtent && this.extentsTouch(extent, otherExtent)) {
            neighborColors.add(otherColor);
          }
        }
      }
      const preferredIndex = this.hash(name) % this.enterprisePalette.length;
      const orderedPalette = [
        ...this.enterprisePalette.slice(preferredIndex),
        ...this.enterprisePalette.slice(0, preferredIndex)
      ];
      assigned.set(name, orderedPalette.find((color) => !neighborColors.has(color)) ?? orderedPalette[0]);
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

  private extentsTouch(a: number[], b: number[]): boolean {
    return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
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

  private average(rows: Row[], key: string): number {
    if (rows.length === 0) {
      return 0;
    }
    return Number((this.sum(rows, key) / rows.length).toFixed(2));
  }

  private sum(rows: Row[], key: string): number {
    return rows.reduce((total, row) => total + this.num(row[key]), 0);
  }

  private formatNumber(value: unknown): string {
    return new Intl.NumberFormat("ms-MY", { maximumFractionDigits: 2 }).format(this.num(value));
  }

  private num(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
