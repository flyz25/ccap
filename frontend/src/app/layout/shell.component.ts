import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";

import { AuthService } from "../core/services/auth.service";
import { ApiService } from "../core/services/api.service";

interface NavItem {
  label: string;
  icon: string;
  path: string;
}

@Component({
  selector: "ccap-shell",
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="grid min-h-screen grid-cols-[82px_minmax(0,1fr)] bg-ccap-mist lg:grid-cols-[290px_minmax(0,1fr)]">
      <aside class="flex min-h-screen flex-col bg-[radial-gradient(circle_at_20%_0%,#0b6b43_0%,#003d2b_36%,#002b1f_100%)] text-white">
        <div class="flex h-[96px] items-center justify-center border-b border-white/10 px-3 lg:h-[124px] lg:px-4">
          <div class="flex h-12 w-16 items-center justify-center overflow-hidden rounded-lg bg-white px-1.5 shadow-[0_14px_34px_rgba(0,0,0,0.22)] lg:h-16 lg:w-[236px] lg:px-4">
            <img src="assets/LOGO_PLANMALAYSIA_LANDING_PAGE-07.png" class="h-full w-full object-contain" alt="PLANMalaysia" />
          </div>
        </div>
        <nav class="flex-1 px-3 py-7 lg:px-4">
          <a
            *ngFor="let item of nav"
            [routerLink]="item.path"
            routerLinkActive="bg-[#158329] text-white shadow-[inset_4px_0_0_rgba(255,255,255,0.95),0_12px_24px_rgba(0,0,0,0.18)]"
            class="mb-3 flex h-[54px] items-center justify-center gap-4 rounded-lg px-4 text-[15px] font-extrabold text-white/90 no-underline transition hover:bg-white/10 hover:text-white lg:justify-start"
            [attr.aria-label]="item.label"
            [title]="item.label"
          >
            <mat-icon>{{ item.icon }}</mat-icon>
            <span class="hidden lg:inline">{{ item.label }}</span>
          </a>
          <div
            class="mb-3 flex h-[54px] items-center justify-center gap-4 rounded-lg px-4 text-[15px] font-extrabold text-white/90 lg:justify-start"
            title="Pentadbiran"
          >
            <mat-icon>settings</mat-icon>
            <span class="hidden lg:inline">Pentadbiran</span>
            <span class="hidden flex-1 lg:inline"></span>
            <mat-icon class="hidden !text-lg lg:inline">expand_more</mat-icon>
          </div>
        </nav>
        <div class="px-3 pb-6 lg:px-4">
          <div class="mb-3 rounded-lg border border-white/20 bg-white/10 p-3 text-white">
            <div class="hidden lg:block">
              <div class="text-xs font-bold uppercase tracking-wide text-white/60">Pengguna</div>
              <div class="mt-1 truncate text-sm font-extrabold">{{ auth.user()?.full_name || auth.user()?.username || "Pengguna" }}</div>
              <div class="truncate text-xs font-semibold text-white/65">{{ auth.user()?.email || "Sesi aktif" }}</div>
            </div>
            <button
              type="button"
              class="mt-0 flex h-11 w-full items-center justify-center gap-3 rounded-md border border-white/20 bg-white/10 px-3 text-sm font-extrabold text-white transition hover:bg-white/20 lg:mt-3 lg:justify-start"
              title="Log keluar"
              aria-label="Log keluar"
              (click)="logout()"
            >
              <mat-icon>logout</mat-icon>
              <span class="hidden lg:inline">Log Keluar</span>
            </button>
          </div>
          <div class="rounded-lg border border-white/20 bg-white/5 p-4 shadow-[0_16px_32px_rgba(0,0,0,0.2)]">
            <div class="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-white">
              <span class="h-2.5 w-2.5 rounded-full bg-[#4CAF50]"></span>
              <span class="hidden lg:inline">Status Sistem</span>
            </div>
            <div class="space-y-3 border-t border-white/20 pt-3 text-xs">
              <div class="flex items-center justify-between gap-3">
                <span class="hidden text-white/70 lg:inline">Status Sistem</span>
                <span class="font-extrabold text-[#9BE68F]">Beroperasi</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="hidden text-white/70 lg:inline">Status Pangkalan Data</span>
                <span class="font-extrabold text-[#9BE68F]">{{ databaseStatus() }}</span>
              </div>
              <div class="hidden border-t border-white/10 pt-3 lg:block">
                <div class="text-white/70">Tarikh Kemaskini</div>
                <div class="mt-1 text-sm font-extrabold text-white">{{ updatedDate() }}</div>
              </div>
              <div class="hidden items-center justify-between gap-3 lg:flex">
                <span class="text-white/70">Bilangan Rekod</span>
                <span class="font-extrabold text-white">{{ recordCount() | number }}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <section class="min-w-0 overflow-x-hidden bg-[#F5F7FA]">
        <main class="mx-auto max-w-[1560px] px-4 py-5 lg:px-7">
          <router-outlet />
        </main>
      </section>
    </div>
  `
})
export class ShellComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  readonly databaseStatus = signal("Memuat");
  readonly updatedDate = signal("-");
  readonly recordCount = signal(0);

  readonly nav: NavItem[] = [
    { label: "Dashboard Eksekutif", icon: "grid_view", path: "/dashboard" },
    { label: "Peta GIS", icon: "map", path: "/map" },
    { label: "Analitik Populasi", icon: "groups", path: "/population" },
    { label: "Analitik Kapasiti", icon: "bar_chart", path: "/capacity" },
    { label: "Analitik Guna Tanah", icon: "layers", path: "/zoning" },
    { label: "Pengurusan Data", icon: "storage", path: "/data" }
  ];

  ngOnInit(): void {
    this.api.dataset("ecc", { page_size: 1 }).subscribe({
      next: (response) => {
        this.databaseStatus.set("Aktif");
        this.recordCount.set(response.meta.total);
      },
      error: () => this.databaseStatus.set("Semak")
    });
    this.api.importHistory().subscribe((history) => {
      const latest = history[0]?.finished_at || history[0]?.started_at;
      this.updatedDate.set(latest ? this.formatDate(latest) : "-");
    });
  }

  logout(): void {
    this.auth.logout();
  }

  private formatDate(value: string): string {
    return new Intl.DateTimeFormat("ms-MY", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
  }
}
