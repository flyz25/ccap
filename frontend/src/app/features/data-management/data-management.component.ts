import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatOptionModule } from "@angular/material/core";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSelectModule } from "@angular/material/select";

import { ImportBatch, PaginatedResponse } from "../../core/models";
import { ApiService } from "../../core/services/api.service";
import { DataTableComponent } from "../../shared/components/data-table.component";

type Row = Record<string, unknown>;

const DATASETS = [
  { id: "ecc", label: "Peta ECC SPK" },
  { id: "zoning", label: "Peta Guna Tanah" },
  { id: "optimum", label: "Peta Optimum" },
  { id: "ketepuan", label: "Ketepuan" },
  { id: "population", label: "Populasi Keseluruhan" }
];

@Component({
  selector: "ccap-data-management",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatOptionModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    DataTableComponent
  ],
  template: `
    <div class="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="page-title">Pengurusan Data</h1>
        <div class="text-sm font-semibold text-ccap-steel">Data import, sejarah kemaskini, muat naik semula dan statistik rekod</div>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <mat-form-field appearance="outline" class="w-[260px]">
          <mat-label>Set Data</mat-label>
          <mat-select [(ngModel)]="selectedDataset" (selectionChange)="loadDataset()">
            <mat-option *ngFor="let dataset of datasets" [value]="dataset.id">{{ dataset.label }}</mat-option>
          </mat-select>
        </mat-form-field>
        <input #fileInput hidden type="file" accept=".xlsx,.xls" (change)="upload($event)" />
        <button mat-flat-button color="primary" (click)="fileInput.click()" [disabled]="uploading()">
          <mat-icon>upload_file</mat-icon>
          Import Semula Excel
        </button>
      </div>
    </div>

    <section class="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
      <div class="panel p-4">
        <div class="metric-label">Jumlah Rekod</div>
        <div class="metric-value">{{ (datasetResponse()?.meta?.total ?? 0) | number }}</div>
        <div class="text-sm font-semibold text-ccap-steel">{{ selectedDatasetLabel() }}</div>
      </div>
      <div class="panel p-4">
        <div class="metric-label">Import Terkini</div>
        <div class="metric-value text-[1.2rem]">{{ statusLabel(history()[0]?.status) || "Tiada Import" }}</div>
        <div class="text-sm font-semibold text-ccap-steel">{{ history()[0]?.finished_at || history()[0]?.started_at || "-" }}</div>
      </div>
      <div class="panel p-4">
        <div class="metric-label">Status Muat Naik</div>
        <div class="metric-value text-[1.2rem]">{{ statusLabel(uploadStatus()) || "Sedia" }}</div>
        <div class="text-sm font-semibold text-ccap-steel">Buku kerja Excel</div>
      </div>
    </section>

    <section class="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_420px]">
      <ccap-data-table
        [title]="selectedDatasetLabel()"
        [rows]="datasetResponse()?.items ?? []"
      />
      <div class="panel overflow-hidden">
        <div class="border-b border-ccap-line px-4 py-3">
          <h2 class="section-title">Sejarah Import</h2>
        </div>
        <div class="max-h-[520px] overflow-auto">
          <div *ngFor="let item of history()" class="border-b border-ccap-line px-4 py-3">
            <div class="flex items-center justify-between gap-3">
              <div class="font-bold text-ccap-navy">#{{ item.id }} {{ statusLabel(item.status) }}</div>
              <div class="text-xs font-bold uppercase text-ccap-steel">{{ item.total_rows | number }} rekod</div>
            </div>
            <div class="mt-1 text-sm font-semibold text-ccap-steel">
              baharu {{ item.inserted_rows | number }} · dikemaskini {{ item.updated_rows | number }} · pendua {{ item.duplicate_rows | number }}
            </div>
            <div class="mt-1 break-words text-xs text-ccap-steel">{{ item.source_file }}</div>
          </div>
        </div>
      </div>
    </section>

    <div *ngIf="loading()" class="fixed inset-x-0 bottom-5 flex justify-center">
      <div class="panel flex items-center gap-3 px-4 py-3">
        <mat-spinner diameter="22" />
        <span class="text-sm font-bold text-ccap-navy">Memuat data</span>
      </div>
    </div>
  `
})
export class DataManagementComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly datasets = DATASETS;
  readonly datasetResponse = signal<PaginatedResponse<Row> | null>(null);
  readonly history = signal<ImportBatch[]>([]);
  readonly loading = signal(false);
  readonly uploading = signal(false);
  readonly uploadStatus = signal("");
  selectedDataset = "ecc";

  ngOnInit(): void {
    this.loadDataset();
    this.loadHistory();
  }

  loadDataset(): void {
    this.loading.set(true);
    this.api.dataset<Row>(this.selectedDataset, { page_size: 100 }).subscribe({
      next: (response) => {
        this.datasetResponse.set(response);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadHistory(): void {
    this.api.importHistory().subscribe((history) => this.history.set(history));
  }

  upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.uploading.set(true);
    this.uploadStatus.set("Importing");
    this.api.uploadExcel(file).subscribe({
      next: (batch) => {
        this.uploadStatus.set(batch.status);
        this.uploading.set(false);
        this.loadDataset();
        this.loadHistory();
        input.value = "";
      },
      error: () => {
        this.uploadStatus.set("Failed");
        this.uploading.set(false);
        input.value = "";
      }
    });
  }

  selectedDatasetLabel(): string {
    return this.datasets.find((dataset) => dataset.id === this.selectedDataset)?.label ?? this.selectedDataset;
  }

  statusLabel(status?: string | null): string {
    const labels: Record<string, string> = {
      completed: "Selesai",
      success: "Selesai",
      failed: "Gagal",
      importing: "Sedang Import",
      Importing: "Sedang Import",
      Failed: "Gagal",
      Ready: "Sedia"
    };
    return status ? labels[status] ?? status : "";
  }
}
