import { HttpClient } from "@angular/common/http";
import { Injectable, computed, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { Observable, tap } from "rxjs";

import { environment } from "../../../environments/environment";
import { TokenResponse, User } from "../models";

const TOKEN_KEY = "ccap_token";
const USER_KEY = "ccap_user";

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly userState = signal<User | null>(this.loadUser());

  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.token));

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  login(username: string, password: string): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>(`${environment.apiUrl}/auth/login`, { username, password })
      .pipe(tap((response) => this.setSession(response)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.userState.set(null);
    this.router.navigateByUrl("/login");
  }

  private setSession(response: TokenResponse): void {
    localStorage.setItem(TOKEN_KEY, response.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    this.userState.set(response.user);
  }

  private loadUser(): User | null {
    if (!this.token) {
      localStorage.removeItem(USER_KEY);
      return null;
    }
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as User;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  }
}
