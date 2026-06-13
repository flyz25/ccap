import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
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
    <div class="min-h-screen bg-ccap-mist lg:grid lg:grid-cols-[290px_minmax(0,1fr)]">
      <header class="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur lg:hidden">
        <div class="flex items-center gap-3 px-4 py-3">
          <div class="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-[#0b6b43] p-2 shadow-[0_14px_26px_rgba(0,0,0,0.12)]">
            <img src="assets/LOGO_PLANMALAYSIA_LANDING_PAGE-07.png" class="h-full w-full object-contain" alt="PLANMalaysia" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-extrabold text-ccap-navy">CCAP</div>
            <div class="truncate text-xs font-semibold text-ccap-steel">{{ currentNavLabel() }}</div>
          </div>
          <div class="flex items-center gap-3">
            <span class="h-2.5 w-2.5 rounded-full" [ngClass]="databaseStatus() === 'Aktif' ? 'bg-[#16a34a]' : 'bg-[#f59e0b]'"></span>
            <button
              type="button"
              class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-ccap-navy shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
              [attr.aria-label]="mobileNavOpen() ? 'Tutup navigasi' : 'Buka navigasi'"
              [attr.aria-expanded]="mobileNavOpen()"
              (click)="toggleMobileNav()"
            >
              <mat-icon>{{ mobileNavOpen() ? "close" : "menu" }}</mat-icon>
            </button>
          </div>
        </div>
      </header>

      <button
        *ngIf="mobileNavOpen()"
        type="button"
        class="fixed inset-0 z-50 bg-slate-950/45 lg:hidden"
        aria-label="Tutup menu"
        (click)="closeMobileNav()"
      ></button>

      <aside
        class="fixed inset-y-0 left-0 z-[60] flex w-[88vw] max-w-[320px] flex-col bg-[radial-gradient(circle_at_20%_0%,#0b6b43_0%,#003d2b_36%,#002b1f_100%)] text-white shadow-[0_24px_60px_rgba(0,0,0,0.35)] transition-transform duration-200 lg:hidden"
        [ngClass]="mobileNavOpen() ? 'translate-x-0' : '-translate-x-full'"
      >
        <div class="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white p-2 shadow-[0_14px_26px_rgba(0,0,0,0.18)]">
              <img src="assets/LOGO_PLANMALAYSIA_LANDING_PAGE-07.png" class="h-full w-full object-contain" alt="PLANMalaysia" />
            </div>
            <div>
              <div class="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">CCAP</div>
              <div class="text-sm font-extrabold text-white">Navigasi Sistem</div>
            </div>
          </div>
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white"
            aria-label="Tutup menu"
            (click)="closeMobileNav()"
          >
            <mat-icon>close</mat-icon>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto px-4 py-5">
          <div class="rounded-xl border border-white/15 bg-white/10 p-4 text-white shadow-[0_18px_32px_rgba(0,0,0,0.16)]">
            <div class="text-xs font-bold uppercase tracking-wide text-white/60">Pengguna</div>
            <div class="mt-1 truncate text-sm font-extrabold">{{ auth.user()?.full_name || auth.user()?.username || "Pengguna" }}</div>
            <div class="truncate text-xs font-semibold text-white/65">{{ auth.user()?.email || "Sesi aktif" }}</div>
            <div class="mt-4 grid grid-cols-2 gap-3 text-xs font-semibold">
              <div class="rounded-lg border border-white/10 bg-white/10 p-3">
                <div class="text-white/60">Pangkalan Data</div>
                <div class="mt-1 font-extrabold text-[#9BE68F]">{{ databaseStatus() }}</div>
              </div>
              <div class="rounded-lg border border-white/10 bg-white/10 p-3">
                <div class="text-white/60">Kemaskini</div>
                <div class="mt-1 font-extrabold text-white">{{ updatedDate() }}</div>
              </div>
            </div>
          </div>

          <nav class="mt-5 space-y-2">
            <a
              *ngFor="let item of nav"
              [routerLink]="item.path"
              routerLinkActive
              #mobileRla="routerLinkActive"
              [ngClass]="mobileRla.isActive ? 'bg-white text-[#0b6b43] shadow-[0_14px_24px_rgba(0,0,0,0.18)]' : 'text-white/90 hover:bg-white/10 hover:text-white'"
              class="flex min-h-[52px] items-center gap-3 rounded-xl px-4 text-[15px] font-extrabold no-underline transition"
              [attr.aria-label]="item.label"
              (click)="closeMobileNav()"
            >
              <mat-icon>{{ item.icon }}</mat-icon>
              <span class="min-w-0 truncate">{{ item.label }}</span>
            </a>
          </nav>

          <button
            type="button"
            class="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-extrabold text-white transition hover:bg-white/20"
            aria-label="Log keluar"
            (click)="logout()"
          >
            <mat-icon>logout</mat-icon>
            <span>Log Keluar</span>
          </button>
        </div>
      </aside>

      <aside class="hidden min-h-screen flex-col bg-[radial-gradient(circle_at_20%_0%,#0b6b43_0%,#003d2b_36%,#002b1f_100%)] text-white lg:flex">
        <div class="flex h-[124px] items-center justify-center border-b border-white/10 px-4">
          <div class="flex h-16 w-[236px] items-center justify-center overflow-hidden rounded-lg bg-white px-4 shadow-[0_14px_34px_rgba(0,0,0,0.22)]">
            <img src="assets/LOGO_PLANMALAYSIA_LANDING_PAGE-07.png" class="h-full w-full object-contain" alt="PLANMalaysia" />
          </div>
        </div>
        <nav class="flex-1 px-4 py-7">
          <a
            *ngFor="let item of nav"
            [routerLink]="item.path"
            routerLinkActive="bg-[#158329] text-white shadow-[inset_4px_0_0_rgba(255,255,255,0.95),0_12px_24px_rgba(0,0,0,0.18)]"
            class="mb-3 flex h-[54px] items-center gap-4 rounded-lg px-4 text-[15px] font-extrabold text-white/90 no-underline transition hover:bg-white/10 hover:text-white"
            [attr.aria-label]="item.label"
            [title]="item.label"
          >
            <mat-icon>{{ item.icon }}</mat-icon>
            <span>{{ item.label }}</span>
          </a>
          <div
            class="mb-3 flex h-[54px] items-center gap-4 rounded-lg px-4 text-[15px] font-extrabold text-white/90"
            title="Pentadbiran"
          >
            <mat-icon>settings</mat-icon>
            <span>Pentadbiran</span>
            <span class="flex-1"></span>
            <mat-icon class="!text-lg">expand_more</mat-icon>
          </div>
        </nav>
        <div class="px-4 pb-6">
          <div class="mb-3 rounded-lg border border-white/20 bg-white/10 p-3 text-white">
            <div>
              <div class="text-xs font-bold uppercase tracking-wide text-white/60">Pengguna</div>
              <div class="mt-1 truncate text-sm font-extrabold">{{ auth.user()?.full_name || auth.user()?.username || "Pengguna" }}</div>
              <div class="truncate text-xs font-semibold text-white/65">{{ auth.user()?.email || "Sesi aktif" }}</div>
            </div>
            <button
              type="button"
              class="mt-3 flex h-11 w-full items-center justify-start gap-3 rounded-md border border-white/20 bg-white/10 px-3 text-sm font-extrabold text-white transition hover:bg-white/20"
              title="Log keluar"
              aria-label="Log keluar"
              (click)="logout()"
            >
              <mat-icon>logout</mat-icon>
              <span>Log Keluar</span>
            </button>
          </div>
          <div class="rounded-lg border border-white/20 bg-white/5 p-4 shadow-[0_16px_32px_rgba(0,0,0,0.2)]">
            <div class="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-white">
              <span class="h-2.5 w-2.5 rounded-full bg-[#4CAF50]"></span>
              <span>Status Sistem</span>
            </div>
            <div class="space-y-3 border-t border-white/20 pt-3 text-xs">
              <div class="flex items-center justify-between gap-3">
                <span class="text-white/70">Status Sistem</span>
                <span class="font-extrabold text-[#9BE68F]">Beroperasi</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-white/70">Status Pangkalan Data</span>
                <span class="font-extrabold text-[#9BE68F]">{{ databaseStatus() }}</span>
              </div>
              <div class="border-t border-white/10 pt-3">
                <div class="text-white/70">Tarikh Kemaskini</div>
                <div class="mt-1 text-sm font-extrabold text-white">{{ updatedDate() }}</div>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-white/70">Bilangan Rekod</span>
                <span class="font-extrabold text-white">{{ recordCount() | number }}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <section class="min-w-0 overflow-x-hidden bg-[#F5F7FA]">
        <main class="mx-auto max-w-[1560px] px-3 py-4 sm:px-4 lg:px-7 lg:py-5">
          <router-outlet />
        </main>
      </section>
    </div>
  `
})
export class ShellComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly databaseStatus = signal("Memuat");
  readonly updatedDate = signal("-");
  readonly recordCount = signal(0);
  readonly mobileNavOpen = signal(false);

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

  toggleMobileNav(): void {
    this.mobileNavOpen.update((open) => !open);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  currentNavLabel(): string {
    const current = this.nav.find((item) => this.router.url === item.path || this.router.url.startsWith(`${item.path}/`));
    return current?.label ?? "Dashboard";
  }

  logout(): void {
    this.closeMobileNav();
    this.auth.logout();
  }

  private formatDate(value: string): string {
    return new Intl.DateTimeFormat("ms-MY", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
  }
}
