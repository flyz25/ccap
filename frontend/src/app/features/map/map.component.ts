import { CommonModule } from "@angular/common";
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
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";

import { MapLayer } from "../../core/models";
import { ApiService } from "../../core/services/api.service";

type Row = Record<string, unknown>;

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
    <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">Peta GIS</h1>
        <div class="page-subtitle">Visualisasi titik spatial, taburan ECC dan maklumat kawasan</div>
      </div>
      <div class="page-actions">
        <label class="filter-card">
          <span class="filter-label">Kawasan</span>
          <select class="filter-select" [(ngModel)]="searchText" (ngModelChange)="renderFeatures()">
            <option value="">Semua Kawasan</option>
            <option *ngFor="let area of areaOptions()" [value]="area">{{ area }}</option>
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
        <div><div class="metric-label">Kawasan Dipilih</div><div class="truncate text-2xl font-extrabold text-ccap-navy">{{ selectedAreaLabel() }}</div><div class="text-sm font-semibold text-ccap-steel">Klik titik pada peta</div></div>
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
          <div #mapContainer class="h-[calc(100vh-310px)] min-h-[560px] max-h-[760px] w-full"></div>
          <div class="map-control-stack">
            <button class="map-control" type="button" title="Zum masuk" aria-label="Zum masuk" (click)="zoomIn()">+</button>
            <button class="map-control" type="button" title="Zum keluar" aria-label="Zum keluar" (click)="zoomOut()">-</button>
            <button class="map-control mt-3" type="button" title="Kembali ke paparan penuh" aria-label="Kembali ke paparan penuh" (click)="resetMapView()"><mat-icon>my_location</mat-icon></button>
            <button class="map-control" type="button" title="Togol lapisan titik" aria-label="Togol lapisan titik" (click)="togglePointLayer()"><mat-icon>layers</mat-icon></button>
            <button class="map-control" type="button" title="Cetak peta" aria-label="Cetak peta" (click)="printMap()"><mat-icon>print</mat-icon></button>
          </div>
          <div class="absolute right-5 top-5 z-10 space-y-3">
            <div class="legend-panel w-[176px] !p-3">
              <div class="filter-label">Peta Asas</div>
              <select class="filter-select">
                <option>Topografi</option>
                <option>Jalan</option>
              </select>
            </div>
            <div class="legend-panel flex items-center justify-between gap-3 !p-3">
              <span class="inline-flex items-center gap-2 font-extrabold text-ccap-blue"><mat-icon>layers</mat-icon> Lapisan</span>
              <span class="rounded-full bg-ccap-blue px-2 py-0.5 text-xs font-extrabold text-white">3</span>
            </div>
          </div>
          <div class="legend-panel absolute bottom-6 right-5 z-10 w-[230px]">
            <div class="mb-4 text-sm font-extrabold uppercase text-ccap-navy">Petunjuk ECC</div>
            <div class="space-y-3 text-sm font-semibold text-ccap-steel">
              <div class="flex items-center gap-3"><span class="h-4 w-4 rounded-full bg-[#16a34a]"></span>Sesuai</div>
              <div class="flex items-center gap-3"><span class="h-4 w-4 rounded-full bg-[#FBC02D]"></span>Sederhana</div>
              <div class="flex items-center gap-3"><span class="h-4 w-4 rounded-full bg-[#D32F2F]"></span>Kritikal</div>
            </div>
            <button class="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-ccap-blue">
              <mat-icon class="!text-base">open_in_full</mat-icon>
              Lihat Peta Penuh
            </button>
          </div>
        </div>
      </div>
      <aside class="panel p-5">
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
                <div *ngFor="let item of capacityInfoRows()" class="rounded-md border border-ccap-line bg-ccap-mist p-3"><div class="metric-label">{{ item.label }}</div><div class="text-xl font-extrabold" [ngClass]="item.label === 'ECC' ? 'text-ccap-critical' : 'text-ccap-blue'">{{ item.value }}</div></div>
              </div>
              <div class="mt-4 space-y-2">
                <div class="flex justify-between"><span class="text-ccap-steel">Kesesuaian</span><span class="status-badge" [ngClass]="statusClass(selectedFeature())">{{ statusLabel(selectedFeature()) }}</span></div>
                <div class="flex justify-between"><span class="text-ccap-steel">Tekanan Pembangunan</span><b class="text-ccap-navy">{{ statusLabel(selectedFeature()) === "Kritikal" ? "Tinggi" : "Terkawal" }}</b></div>
              </div>
            </section>
            <section class="rounded-md border border-ccap-line p-4">
              <h3 class="mb-3 font-extrabold text-ccap-navy">Maklumat Demografi</h3>
              <div class="space-y-2">
                <div *ngFor="let item of demographicInfoRows()" class="flex justify-between gap-4"><span class="text-ccap-steel">{{ item.label }}</span><b class="text-right text-ccap-navy">{{ item.value }}</b></div>
              </div>
            </section>
            <section class="rounded-md border border-red-200 bg-red-50 p-4">
              <div class="flex gap-3">
                <mat-icon class="text-ccap-critical">error</mat-icon>
                <div class="font-semibold leading-6 text-ccap-steel">Kapasiti mampu dukung kawasan ini menghampiri tahap tepu. Sebarang pembangunan baharu perlu dinilai dengan lebih terperinci.</div>
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
  private readonly source = new VectorSource();
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

  selectedLayer = "ecc_spk_map";
  searchText = "";
  private map?: OlMap;
  private rawFeatureCollection: Record<string, unknown> | null = null;
  private readonly areaStatus = new Map<string, "Sesuai" | "Sederhana" | "Kritikal">();
  private readonly defaultCenter = fromLonLat([101.38, 4.47]);
  private readonly defaultZoom = 10;

  ngAfterViewInit(): void {
    this.map = new OlMap({
      target: this.mapContainer.nativeElement,
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
    });

    setTimeout(() => this.map?.updateSize());
    this.api.layers().subscribe((layers) => this.layers.set(layers));
    this.loadPoints();
  }

  ngOnDestroy(): void {
    this.map?.setTarget(undefined);
  }

  loadPoints(): void {
    this.api.points(this.selectedLayer).subscribe((collection) => {
      this.rawFeatureCollection = collection;
      this.renderFeatures();
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
    if (features.length === 0) {
      this.map.getView().animate({ center: this.defaultCenter, zoom: this.defaultZoom, duration: 180 });
      return;
    }
    const extent = this.source.getExtent();
    if (extent) {
      this.map.getView().fit(extent, { padding: [60, 60, 60, 60], maxZoom: 13, duration: 250 });
    }
  }

  togglePointLayer(): void {
    this.layer.setVisible(!this.layer.getVisible());
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
    const filtered = search
      ? features.filter((feature) => JSON.stringify(feature).toLowerCase().includes(search))
      : features;
    const collection = { ...this.rawFeatureCollection, features: filtered };
    const parsed = new GeoJSON().readFeatures(collection, { featureProjection: "EPSG:3857" });
    this.source.clear();
    this.source.addFeatures(parsed);
    const properties = filtered.map((feature) => ((feature as Record<string, unknown>)["properties"] ?? {}) as Row);
    this.buildAreaStatus(properties);
    this.layer.changed();
    this.featureCount.set(parsed.length);
    this.averageEcc.set(this.average(properties, "ecc"));
    this.totalPopulation.set(this.sum(properties, "bil_penduduk"));
    this.areaOptions.set([...new Set(properties.map((row) => String(row["area"] || row["kawasan_kajian"] || "")).filter(Boolean))].sort());
    this.selectedFeature.set([...properties].sort((a, b) => this.num(b["ecc"]) - this.num(a["ecc"]))[0] ?? null);
    if (parsed.length > 0) {
      const extent = this.source.getExtent();
      if (extent) {
        this.map?.getView().fit(extent, { padding: [60, 60, 60, 60], maxZoom: 13, duration: 250 });
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
    return this.areaStatus.get(area) ?? this.statusForEcc(this.num(feature["ecc"]));
  }

  statusClass(feature: Row | null): string {
    const status = this.statusLabel(feature);
    return status === "Kritikal" ? "status-critical" : status === "Sederhana" ? "status-moderate" : "status-suitable";
  }

  private pointStyle(feature: FeatureLike): Style {
    const area = String(feature.get("area") || feature.get("kawasan_kajian") || "");
    const status = this.areaStatus.get(area) ?? this.statusForEcc(this.num(feature.get("ecc")));
    const color = status === "Kritikal" ? "#D32F2F" : status === "Sederhana" ? "#FBC02D" : "#2E7D32";
    return new Style({
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({ color }),
        stroke: new Stroke({ color: "#ffffff", width: 2 })
      })
    });
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

  private statusForEcc(ecc: number): "Sesuai" | "Sederhana" | "Kritikal" {
    if (ecc >= 1800) {
      return "Kritikal";
    }
    if (ecc >= 900) {
      return "Sederhana";
    }
    return "Sesuai";
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
