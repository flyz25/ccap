import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, throwError } from "rxjs";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem("ccap_token");
  const request = token
    ? req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    })
    : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (isUnauthorized(error)) {
        localStorage.removeItem("ccap_token");
        localStorage.removeItem("ccap_user");
        router.navigateByUrl("/login");
      }
      return throwError(() => error);
    })
  );
};

function isUnauthorized(error: unknown): boolean {
  return typeof error === "object" && error !== null && "status" in error && Number((error as { status?: unknown }).status) === 401;
}
