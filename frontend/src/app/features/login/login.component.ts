import { CommonModule } from "@angular/common";
import { AfterViewInit, Component, ElementRef, HostListener, ViewChild, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "ccap-login",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  template: `
    <main class="relative min-h-screen overflow-hidden bg-[#06150f] text-white">
      <video
        #bgVideo
        class="absolute inset-0 h-full w-full object-cover"
        autoplay
        muted
        [muted]="true"
        loop
        playsinline
        preload="auto"
        aria-hidden="true"
        (loadedmetadata)="playVideo()"
        (loadeddata)="playVideo()"
        (canplay)="playVideo()"
      >
        <source src="assets/CAMERON_HIGHLANDS.mp4" type="video/mp4" />
      </video>
      <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,18,12,0.86),rgba(2,28,18,0.56)_42%,rgba(2,12,9,0.58))]"></div>
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_72%_32%,rgba(129,199,132,0.24),transparent_32%)]"></div>
      <div class="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#06150f] to-transparent"></div>

      <section class="relative z-10 flex min-h-screen flex-col px-5 py-5 sm:px-8 lg:px-14">
        <header class="flex items-center justify-between gap-4">
          <div class="flex h-12 max-w-[230px] items-center overflow-hidden rounded-lg bg-white px-3 shadow-[0_14px_38px_rgba(0,0,0,0.2)] sm:h-14 sm:max-w-[280px]">
            <img src="assets/LOGO_PLANMALAYSIA_LANDING_PAGE-07.png" class="h-full w-full object-contain" alt="PLANMalaysia" />
          </div>
          <div class="hidden rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-extrabold text-white/90 backdrop-blur md:block">
            CCAP
          </div>
        </header>

        <div class="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(400px,500px)] lg:gap-14">
          <div class="max-w-3xl">
            <p class="text-sm font-extrabold uppercase tracking-[0.24em] text-[#9be487]">Sokongan Keputusan GIS</p>
            <h1 class="mt-4 max-w-2xl text-4xl font-black leading-[1.04] tracking-normal sm:text-5xl lg:text-6xl">
              Sistem Kapasiti Mampu Dukung
            </h1>
            <p class="mt-5 max-w-xl text-base font-semibold leading-7 text-white/78 sm:text-lg">
              Platform analitik spatial, populasi, kapasiti dan guna tanah untuk Cameron Highlands.
            </p>
            <div class="mt-8 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              <div class="rounded-lg border border-white/16 bg-white/10 px-4 py-4 backdrop-blur-md">
                <div class="text-xl font-black">466</div>
                <div class="mt-1 text-xs font-bold uppercase tracking-wide text-white/60">Titik GIS</div>
              </div>
              <div class="rounded-lg border border-white/16 bg-white/10 px-4 py-4 backdrop-blur-md">
                <div class="text-xl font-black">PCC RCC ECC</div>
                <div class="mt-1 text-xs font-bold uppercase tracking-wide text-white/60">Indeks Kapasiti</div>
              </div>
              <div class="rounded-lg border border-white/16 bg-white/10 px-4 py-4 backdrop-blur-md">
                <div class="text-xl font-black">2040</div>
                <div class="mt-1 text-xs font-bold uppercase tracking-wide text-white/60">Unjuran Data</div>
              </div>
            </div>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="login-panel w-full rounded-3xl border border-white/20 bg-[#082218]/72 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.36)] backdrop-blur-2xl sm:p-8">
            <div class="mb-7">
              <div class="mb-4 h-1 w-14 rounded-full bg-[#7bd66f]"></div>
              <h2 class="text-3xl font-black leading-tight tracking-normal sm:text-4xl">Log Masuk Selamat</h2>
              <p class="mt-2 text-sm font-semibold text-white/76">Pentadbir, Perancang, Penganalisis, Pemerhati</p>
            </div>

            <div class="space-y-4">
              <div class="space-y-1.5">
                <label for="login-username" class="block text-sm font-extrabold text-white/86">Nama Pengguna <span class="text-[#9be487]">*</span></label>
                <mat-form-field appearance="outline" class="login-field w-full">
                  <mat-icon matPrefix>person</mat-icon>
                  <input id="login-username" matInput formControlName="username" autocomplete="username" placeholder="Nama pengguna" />
                </mat-form-field>
              </div>
              <div class="space-y-1.5">
                <label for="login-password" class="block text-sm font-extrabold text-white/86">Kata Laluan <span class="text-[#9be487]">*</span></label>
                <mat-form-field appearance="outline" class="login-field w-full">
                  <mat-icon matPrefix>lock</mat-icon>
                  <input id="login-password" matInput type="password" formControlName="password" autocomplete="current-password" placeholder="Kata laluan" />
                </mat-form-field>
              </div>
              <div *ngIf="error()" class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {{ error() }}
              </div>
              <button mat-flat-button color="primary" class="!h-12 w-full !rounded-lg !text-base !font-extrabold" [disabled]="form.invalid || loading()">
                <mat-spinner *ngIf="loading()" diameter="20" />
                <span *ngIf="!loading()">Log Masuk</span>
              </button>
            </div>

            <div class="mt-5 flex items-center justify-between gap-3 rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm font-extrabold text-white/88">
              <span>Demo akses</span>
              <span class="text-right text-white/70">admin / password123</span>
            </div>
          </form>
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
      }

      .login-panel {
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.12),
          0 34px 90px rgba(0, 0, 0, 0.38);
      }

      :host ::ng-deep .login-field .mdc-text-field--outlined {
        background: rgba(255, 255, 255, 0.96);
        border-radius: 10px;
      }

      :host ::ng-deep .login-field .mat-mdc-form-field-flex {
        min-height: 56px;
      }

      :host ::ng-deep .login-field .mat-mdc-form-field-subscript-wrapper {
        display: none;
      }

      :host ::ng-deep .login-field .mdc-notched-outline__leading,
      :host ::ng-deep .login-field .mdc-notched-outline__notch,
      :host ::ng-deep .login-field .mdc-notched-outline__trailing {
        border-color: rgba(255, 255, 255, 0.58) !important;
      }

      :host ::ng-deep .login-field .mat-mdc-form-field-infix {
        min-height: 56px;
        padding-top: 16px;
        padding-bottom: 12px;
      }
    `
  ]
})
export class LoginComponent implements AfterViewInit {
  @ViewChild("bgVideo") private readonly bgVideo?: ElementRef<HTMLVideoElement>;

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal("");
  readonly form = this.fb.nonNullable.group({
    username: ["admin", Validators.required],
    password: ["password123", Validators.required]
  });

  ngAfterViewInit(): void {
    window.setTimeout(() => this.playVideo(), 0);
    window.setTimeout(() => this.playVideo(), 350);
    window.setTimeout(() => this.playVideo(), 1000);
  }

  @HostListener("document:pointerdown")
  @HostListener("window:focus")
  playVideo(): void {
    const video = this.bgVideo?.nativeElement;
    if (!video) {
      return;
    }

    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;

    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch(() => undefined);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading.set(true);
    this.error.set("");
    const { username, password } = this.form.getRawValue();
    this.auth.login(username, password).subscribe({
      next: () => this.router.navigateByUrl("/dashboard"),
      error: () => {
        this.error.set("Nama pengguna atau kata laluan tidak sah.");
        this.loading.set(false);
      }
    });
  }
}
