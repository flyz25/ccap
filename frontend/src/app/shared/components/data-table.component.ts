import { CommonModule } from "@angular/common";
import { Component, Input, OnChanges } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";

type SortDirection = "asc" | "desc";

@Component({
  selector: "ccap-data-table",
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule],
  template: `
    <div class="panel overflow-hidden">
      <div class="border-b border-ccap-line px-4 py-3">
        <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 class="section-title">{{ title }}</h2>
            <div class="mt-1 text-xs font-semibold text-ccap-steel">
              {{ filteredRows().length | number }} rekod dipaparkan
            </div>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label class="relative block">
              <mat-icon class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ccap-steel">search</mat-icon>
              <input
                [(ngModel)]="searchTerm"
                (ngModelChange)="currentPage = 1"
                class="h-10 w-full rounded-md border border-ccap-line bg-white pl-10 pr-3 text-sm font-semibold text-ccap-navy outline-none transition focus:border-ccap-green sm:w-[260px]"
                placeholder="Cari rekod"
              />
            </label>
            <button mat-stroked-button type="button" (click)="exportCsv()" [disabled]="filteredRows().length === 0">
              <mat-icon>download</mat-icon>
              CSV
            </button>
            <button mat-stroked-button type="button" (click)="exportExcel()" [disabled]="filteredRows().length === 0">
              <mat-icon>table_view</mat-icon>
              Excel
            </button>
          </div>
        </div>
      </div>

      <div class="max-h-[540px] overflow-auto">
        <table class="min-w-[980px] table-fixed border-collapse text-left text-sm">
          <thead class="sticky top-0 z-10 bg-ccap-mist text-xs uppercase tracking-wide text-ccap-steel">
            <tr>
              <th *ngFor="let column of columns()" class="border-b border-ccap-line px-4 py-3 font-extrabold">
                <button
                  type="button"
                  class="flex w-full items-center gap-1 text-left uppercase tracking-wide"
                  (click)="sortBy(column)"
                  [attr.aria-label]="'Susun ikut ' + label(column)"
                >
                  <span class="truncate">{{ label(column) }}</span>
                  <mat-icon class="!h-4 !w-4 !text-base" *ngIf="sortColumn === column">
                    {{ sortDirection === "asc" ? "arrow_upward" : "arrow_downward" }}
                  </mat-icon>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of pagedRows()" class="border-b border-ccap-line/70 hover:bg-ccap-mist/70">
              <td *ngFor="let column of columns()" class="max-w-[320px] truncate px-4 py-3 text-ccap-navy" [title]="formatValue(row[column], column)">
                {{ formatValue(row[column], column) }}
              </td>
            </tr>
            <tr *ngIf="pagedRows().length === 0">
              <td [attr.colspan]="columns().length || 1" class="px-4 py-10 text-center text-sm font-semibold text-ccap-steel">
                Tiada rekod dijumpai.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex flex-col gap-3 border-t border-ccap-line px-4 py-3 text-sm font-semibold text-ccap-steel sm:flex-row sm:items-center sm:justify-between">
        <div>
          Halaman {{ currentPage }} daripada {{ totalPages() }}
        </div>
        <div class="flex items-center gap-2">
          <span>Rekod / halaman</span>
          <select
            [(ngModel)]="pageSize"
            (ngModelChange)="currentPage = 1"
            class="h-9 rounded-md border border-ccap-line bg-white px-2 text-ccap-navy outline-none"
          >
            <option *ngFor="let size of pageSizeOptions" [ngValue]="size">{{ size }}</option>
          </select>
          <button mat-icon-button type="button" aria-label="Halaman sebelumnya" (click)="previousPage()" [disabled]="currentPage <= 1">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <button mat-icon-button type="button" aria-label="Halaman seterusnya" (click)="nextPage()" [disabled]="currentPage >= totalPages()">
            <mat-icon>chevron_right</mat-icon>
          </button>
        </div>
      </div>
    </div>
  `
})
export class DataTableComponent implements OnChanges {
  @Input() title = "Data";
  @Input() rows: Array<Record<string, unknown>> = [];
  @Input() preferredColumns: string[] = [];

  readonly pageSizeOptions = [10, 25, 50, 100];
  searchTerm = "";
  sortColumn = "";
  sortDirection: SortDirection = "asc";
  currentPage = 1;
  pageSize = 25;

  ngOnChanges(): void {
    this.currentPage = 1;
  }

  columns(): string[] {
    if (this.preferredColumns.length > 0) {
      return this.preferredColumns.filter((column) => this.rows.some((row) => column in row));
    }
    const first = this.rows[0];
    if (!first) {
      return [];
    }
    return Object.keys(first)
      .filter((column) => !["raw_data", "source_record_hash", "geom", "import_batch_id"].includes(column))
      .slice(0, 12);
  }

  filteredRows(): Array<Record<string, unknown>> {
    const search = this.searchTerm.trim().toLowerCase();
    const rows = search
      ? this.rows.filter((row) => this.columns().some((column) => String(row[column] ?? "").toLowerCase().includes(search)))
      : [...this.rows];
    if (!this.sortColumn) {
      return rows;
    }
    return rows.sort((a, b) => this.compare(a[this.sortColumn], b[this.sortColumn]) * (this.sortDirection === "asc" ? 1 : -1));
  }

  pagedRows(): Array<Record<string, unknown>> {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRows().slice(start, start + this.pageSize);
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRows().length / this.pageSize));
  }

  previousPage(): void {
    this.currentPage = Math.max(1, this.currentPage - 1);
  }

  nextPage(): void {
    this.currentPage = Math.min(this.totalPages(), this.currentPage + 1);
  }

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
      return;
    }
    this.sortColumn = column;
    this.sortDirection = "asc";
  }

  label(column: string): string {
    const labels: Record<string, string> = {
      area: "Kawasan",
      kawasan_kajian: "Kawasan Kajian",
      jenis_pembangunan: "Jenis Pembangunan",
      ketinggian_tanah: "Ketinggian",
      guna_tanah: "Guna Tanah",
      keluasan_kawasan_ha: "Luas (ha)",
      pcc: "PCC",
      rcc: "RCC",
      ecc: "ECC",
      bil_penduduk: "Penduduk",
      bil_pengunjung: "Pengunjung",
      kesesuaian: "Kesesuaian",
      tahun: "Tahun",
      normal_population_growth: "Pertumbuhan Penduduk",
      injected_population_growth: "Suntikan Penduduk",
      ecc_semasa: "ECC Semasa",
      senario: "Senario",
      dataset_scope: "Set Data",
      record_area: "Kawasan",
      record_kawasan_kajian: "Kawasan Kajian",
      source_row: "Baris Sumber",
      stored_pcc: "PCC Workbook",
      stored_rcc: "RCC Workbook",
      stored_ecc: "ECC Workbook",
      calculated_pcc: "PCC Kiraan",
      calculated_rcc: "RCC Kiraan",
      calculated_ecc: "ECC Kiraan",
      pcc_delta: "Beza PCC",
      rcc_delta: "Beza RCC",
      ecc_delta: "Beza ECC",
      status: "Status",
      issue_code: "Isu"
    };
    return labels[column] ?? column.replaceAll("_", " ");
  }

  formatValue(value: unknown, column = ""): string {
    if (value === null || value === undefined || value === "") {
      return "-";
    }
    if (column === "tahun") {
      const year = Number(value);
      return Number.isFinite(year) ? String(Math.trunc(year)) : String(value);
    }
    if (typeof value === "number") {
      return new Intl.NumberFormat("ms-MY", { maximumFractionDigits: 2 }).format(value);
    }
    return String(value);
  }

  exportCsv(): void {
    const csv = this.toCsv();
    this.download(`${this.fileName()}.csv`, csv, "text/csv;charset=utf-8");
  }

  exportExcel(): void {
    const columns = this.columns();
    const rows = this.filteredRows();
    const table = `
      <table>
        <thead><tr>${columns.map((column) => `<th>${this.escapeHtml(this.label(column))}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows
            .map((row) => `<tr>${columns.map((column) => `<td>${this.escapeHtml(this.formatValue(row[column], column))}</td>`).join("")}</tr>`)
            .join("")}
        </tbody>
      </table>
    `;
    this.download(`${this.fileName()}.xls`, table, "application/vnd.ms-excel;charset=utf-8");
  }

  private toCsv(): string {
    const columns = this.columns();
    const header = columns.map((column) => this.csvCell(this.label(column))).join(",");
    const body = this.filteredRows()
      .map((row) => columns.map((column) => this.csvCell(this.formatValue(row[column], column))).join(","))
      .join("\n");
    return [header, body].filter(Boolean).join("\n");
  }

  private compare(a: unknown, b: unknown): number {
    const aNumber = Number(a);
    const bNumber = Number(b);
    if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
      return aNumber - bNumber;
    }
    return String(a ?? "").localeCompare(String(b ?? ""), "ms-MY", { numeric: true });
  }

  private csvCell(value: string): string {
    return `"${value.replaceAll('"', '""')}"`;
  }

  private escapeHtml(value: string): string {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  }

  private fileName(): string {
    return this.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/(^-|-$)/g, "") || "data";
  }

  private download(name: string, content: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
